-- Exact summary and tuple reconciliation in bounded scans, rather than a fact scan per control.
-- Preserve lineage, capability, count, completeness and zero-input controls from version 044.
CREATE OR REPLACE FUNCTION mart.review_partition_exact(selected_tenant text,selected_partition text) RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH scoped AS MATERIALIZED (
  SELECT payload->>'measureId' measure_id,payload->'dimensions' dimensions,(payload->>'value')::numeric value
  FROM mart.review_facts WHERE tenant_id=selected_tenant AND partition_id=selected_partition
 ),actual AS (
  SELECT measure_id,dimensions,grouping(dimensions)=1 is_summary,sum(value) actual_value,count(*) actual_count
  FROM scoped GROUP BY GROUPING SETS ((measure_id,dimensions),(measure_id))
 ),comparison AS (
  SELECT control.measure_id control_measure_id,control.expected_value,control.expected_count,
   actual.actual_value,actual.actual_count
  FROM actual FULL JOIN (SELECT * FROM mart.review_controls WHERE tenant_id=selected_tenant AND partition_id=selected_partition) control
  ON control.measure_id=actual.measure_id AND (control.dimensions IS NULL)=actual.is_summary
  AND coalesce(control.dimensions,'null'::jsonb)=coalesce(actual.dimensions,'null'::jsonb)
 )
 SELECT EXISTS(SELECT 1 FROM mart.review_extractions extraction JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 WHERE extraction.tenant_id=selected_tenant AND extraction.partition_id=selected_partition AND extraction.completed AND part.family='review'
 AND extraction.month=part.month AND part.capabilities IS NOT NULL
 AND part.capabilities->>'tenantId'=selected_tenant AND jsonb_array_length(part.capabilities->'releases')=1
 AND part.capabilities->'releases'->0->>'financeReview'='pending'
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(part.capabilities->'releases'->0->'capabilities') capability
  WHERE capability->>'metric' NOT IN ('customer_cash_collected','cash_applied_to_invoices','unallocated_customer_receipts','customer_collection_ratio',
   'weighted_collection_days','receivables_due_for_collection','order_margin','order_margin_percentage','net_invoiced_revenue','invoiced_revenue','refund_value')
  OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(capability->'dimensions') dimension
   WHERE dimension NOT IN ('date','month','quarter','year','customer','salesperson','business_line','product','product_category')
   OR (capability->>'metric' IN ('customer_cash_collected','cash_applied_to_invoices','unallocated_customer_receipts','customer_collection_ratio','weighted_collection_days','receivables_due_for_collection')
    AND dimension NOT IN ('date','month','quarter','year','customer'))
   OR (capability->>'metric' IN ('order_margin','order_margin_percentage') AND dimension IN ('product','product_category'))))
 AND NOT EXISTS(SELECT 1 FROM mart.review_facts fact WHERE fact.tenant_id=selected_tenant AND fact.partition_id=selected_partition
  AND (left(fact.payload->>'businessDate',7)<>to_char(extraction.month,'YYYY-MM') OR fact.payload->>'sourceId'<>extraction.source_id
   OR fact.payload->>'sourceAsOf'<>to_char(extraction.source_cutoff AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
   OR fact.payload->>'frozenRevision'<>extraction.source_revision))
 AND NOT EXISTS(SELECT 1 FROM comparison WHERE control_measure_id IS NULL
  OR expected_value IS DISTINCT FROM coalesce(actual_value,0)
  OR (expected_count IS NOT NULL AND expected_count<>coalesce(actual_count,0)))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') measure
  WHERE NOT EXISTS(SELECT 1 FROM mart.review_controls control WHERE control.tenant_id=selected_tenant AND control.partition_id=selected_partition
   AND control.measure_id=measure->>'measureId' AND control.scope_key='summary')))
$$;
