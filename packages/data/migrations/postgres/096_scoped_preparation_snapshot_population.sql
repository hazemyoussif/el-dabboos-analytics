-- Snapshot preparation needs summary controls and the selected canonical roots,
-- not a broad join between recursive lineage estimates and every fact row.
CREATE INDEX review_control_summary_access
 ON mart.review_controls(tenant_id,partition_id,measure_id)
 INCLUDE(expected_value,expected_count) WHERE scope_key='summary';

CREATE OR REPLACE FUNCTION mart.prepared_work_complete_snapshot_rows(selected_tenant text,selected_revision text,selected_family text,selected_through date)
RETURNS TABLE(measure_id text,kind text,business_day date,entity_id text,amount numeric,dimensions jsonb,labels jsonb,item_count bigint)
LANGUAGE plpgsql STABLE AS $$
DECLARE observation record;
BEGIN
 FOR observation IN
  WITH observations AS MATERIALIZED (
   SELECT DISTINCT ON(source.measure_id) source.measure_id,source.business_day
   FROM mart.prepared_snapshot_observations(selected_tenant,selected_revision,selected_family) source
   WHERE selected_family IN ('review','business') AND source.business_day<=selected_through
   ORDER BY source.measure_id,source.business_day DESC
  )
  SELECT member.partition_id,observed.business_day,array_agg(observed.measure_id ORDER BY observed.measure_id) measure_ids
  FROM observations observed JOIN mart.analytics_serving_members member
   ON member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family
   AND member.month=date_trunc('month',observed.business_day)::date
  GROUP BY member.partition_id,observed.business_day
 LOOP
  RETURN QUERY SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,
   fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint
  FROM mart.review_effective_facts(selected_tenant,observation.partition_id,NULL,observation.measure_ids) fact
  WHERE fact.payload->>'kind'='snapshot' AND fact.business_day=to_char(observation.business_day,'YYYY-MM-DD');
 END LOOP;
END $$;
