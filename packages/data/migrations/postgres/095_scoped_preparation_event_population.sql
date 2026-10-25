-- Read selected event members directly. The shared all-history population view
-- must not expand unrelated partitions before the month predicate is applied.
-- Canonical lineage, tenant RLS, values, snapshot selection and budgets stay intact.
CREATE OR REPLACE FUNCTION mart.prepared_work_input_rows(selected_tenant text,selected_revision text,selected_family text,selected_kind text,selected_from date,selected_through date)
RETURNS TABLE(measure_id text,kind text,business_day date,entity_id text,amount numeric,dimensions jsonb,labels jsonb,item_count bigint)
LANGUAGE plpgsql STABLE AS $$
DECLARE selected_partition text;
BEGIN
 IF selected_family IN ('review','business') AND selected_kind='event' THEN
  FOR selected_partition IN
   SELECT member.partition_id FROM mart.analytics_serving_members member
   WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family
   AND member.month BETWEEN date_trunc('month',selected_from)::date AND date_trunc('month',selected_through)::date
  LOOP
   RETURN QUERY SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,
    fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint
   FROM mart.review_effective_facts(selected_tenant,selected_partition) fact
   WHERE fact.payload->>'kind'='event' AND fact.business_day BETWEEN to_char(selected_from,'YYYY-MM-DD') AND to_char(selected_through,'YYYY-MM-DD');
  END LOOP;
 ELSE
  RETURN QUERY SELECT fact.* FROM mart.prepared_input_rows(selected_tenant,selected_revision,selected_family) fact
  WHERE fact.kind=selected_kind AND fact.business_day<=selected_through
  AND (fact.kind='snapshot' OR fact.business_day>=selected_from);
 END IF;
END $$;
