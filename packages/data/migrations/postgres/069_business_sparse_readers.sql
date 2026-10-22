-- Approved shared-reader change. Complete partitions resolve to their original
-- rows; sparse Business partitions inherit the accepted baseline by reference.
CREATE OR REPLACE FUNCTION mart.prepared_input_rows(selected_tenant text,selected_revision text,selected_family text)
RETURNS TABLE(measure_id text,kind text,business_day date,entity_id text,amount numeric,dimensions jsonb,labels jsonb,item_count bigint)
LANGUAGE sql STABLE AS $$
 SELECT fact.payload->>'measureId',fact.payload->>'kind',(fact.payload->>'businessDate')::date,
 fact.payload->>'entityId',(fact.payload->>'value')::numeric,fact.payload->'dimensions',
 coalesce(fact.payload->'displayLabels',fact.payload->'transaction'->'labels','{}'::jsonb),1::bigint
 FROM mart.analytics_serving_members member JOIN mart.analytics_partition_facts link ON link.tenant_id=member.tenant_id AND link.partition_id=member.partition_id
 JOIN mart.analytics_fact_revisions fact ON fact.tenant_id=link.tenant_id AND fact.fact_key=link.fact_key AND fact.revision_id=link.revision_id
 WHERE selected_family='facts' AND member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='facts'
 UNION ALL
 SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint
 FROM mart.analytics_serving_members member JOIN mart.review_fact_population fact USING(tenant_id,partition_id)
 WHERE selected_family IN ('review','business') AND member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family
 UNION ALL
 SELECT operand.key,'snapshot',evidence.snapshot_date,customer.customer_id,operand.value::numeric,
 jsonb_build_object('customer',customer.customer_id),jsonb_strip_nulls(jsonb_build_object('customer',customer.label)),1::bigint
 FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 JOIN mart.finance_snapshot_evidence evidence ON evidence.tenant_id=part.tenant_id AND evidence.snapshot_id=part.snapshot_id
 JOIN mart.finance_snapshot_customers customer ON customer.tenant_id=evidence.tenant_id AND customer.snapshot_id=evidence.snapshot_id
 CROSS JOIN LATERAL jsonb_each_text(customer.actual_values) operand
 WHERE selected_family='receivables' AND member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='receivables'
$$;

CREATE OR REPLACE FUNCTION mart.prepared_work_input_rows(selected_tenant text,selected_revision text,selected_family text,selected_kind text,selected_from date,selected_through date)
RETURNS TABLE(measure_id text,kind text,business_day date,entity_id text,amount numeric,dimensions jsonb,labels jsonb,item_count bigint)
LANGUAGE sql STABLE AS $$
 SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint
 FROM mart.analytics_serving_members member JOIN mart.review_fact_population fact USING(tenant_id,partition_id)
 WHERE selected_family IN ('review','business') AND selected_kind='event'
 AND member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family
 AND member.month BETWEEN date_trunc('month',selected_from)::date AND date_trunc('month',selected_through)::date
 AND fact.payload->>'kind'='event' AND fact.business_day::date BETWEEN selected_from AND selected_through
 UNION ALL
 SELECT * FROM mart.prepared_input_rows(selected_tenant,selected_revision,selected_family) fact
 WHERE NOT (selected_family IN ('review','business') AND selected_kind='event')
 AND fact.kind=selected_kind AND fact.business_day<=selected_through
 AND (fact.kind='snapshot' OR fact.business_day>=selected_from)
$$;

CREATE OR REPLACE FUNCTION mart.prepared_work_complete_snapshot_rows(selected_tenant text,selected_revision text,selected_family text,selected_through date)
RETURNS TABLE(measure_id text,kind text,business_day date,entity_id text,amount numeric,dimensions jsonb,labels jsonb,item_count bigint)
LANGUAGE sql STABLE AS $$
 WITH observations AS MATERIALIZED (
  SELECT DISTINCT ON(measure_id) measure_id,business_day
  FROM mart.prepared_snapshot_observations(selected_tenant,selected_revision,selected_family)
  WHERE selected_family IN ('review','business') AND business_day<=selected_through
  ORDER BY measure_id,business_day DESC
 )
 SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint
 FROM observations JOIN mart.analytics_serving_members member
 ON member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family
 AND member.month=date_trunc('month',observations.business_day)::date
 JOIN mart.review_fact_population fact ON fact.tenant_id=member.tenant_id AND fact.partition_id=member.partition_id
 AND fact.measure_id=observations.measure_id AND fact.business_day::date=observations.business_day
 WHERE fact.payload->>'kind'='snapshot'
$$;
