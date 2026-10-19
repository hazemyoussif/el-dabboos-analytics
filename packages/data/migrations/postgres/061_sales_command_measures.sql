-- Source-backed Sales Command Center operands. No extraction or serving activation.
-- Existing mappings, exact grouped controls, forced RLS and lineage guards remain enforced.
ALTER TABLE mart.fact_revisions ADD COLUMN invoice_document_state text,ADD COLUMN invoice_payment_state text,ADD COLUMN receipt_state text,ADD COLUMN order_state text;
CREATE OR REPLACE VIEW mart.canonical_facts AS
 SELECT r.* FROM mart.fact_revisions r JOIN (
  SELECT DISTINCT ON (links.tenant_id,links.dataset_id,links.fact_key)
    links.tenant_id,links.dataset_id,links.fact_key,links.source_revision
  FROM mart.batch_facts links JOIN mart.ingestion_batches b USING (tenant_id,dataset_id,batch_id)
  LEFT JOIN mart.extraction_runs run ON run.tenant_id=b.tenant_id AND run.extraction_id=b.extraction_id
  WHERE b.status='committed' AND ((b.extraction_id IS NULL AND b.pagination_complete) OR run.status='complete')
  ORDER BY links.tenant_id,links.dataset_id,links.fact_key,links.source_revision DESC
 ) eligible USING (tenant_id,dataset_id,fact_key,source_revision) WHERE r.status='active';
ALTER VIEW mart.canonical_facts SET (security_invoker=true,security_barrier=true);


INSERT INTO mart.measure_definitions VALUES
 ('command_invoice_total','event',true),
 ('command_invoice_count','event',false),
 ('command_invoice_residual','event',true),
 ('command_invoice_settled','event',true),
 ('command_document_count','event',false),
 ('command_document_value','event',true),
 ('command_invoice_refunds','event',true),
 ('command_net_invoices','event',true),
 ('command_cash_received','event',true),
 ('command_receipt_count','event',false),
 ('command_receipt_value','event',true),
 ('command_order_count','event',false),
 ('command_order_value','event',true),
 ('command_order_status_count','event',false),
 ('command_order_status_value','event',true),
 ('command_cancelled_count','event',false),
 ('command_cancelled_value','event',true),
 ('command_decided_orders','event',false),
 ('command_same_day_cash','event',true),
 ('command_customer_balance','snapshot',true),
 ('command_overdue_balance','snapshot',true),
 ('command_future_balance','snapshot',true),
 ('command_unknown_maturity','snapshot',true),
 ('command_overdue_days','snapshot',false);

CREATE OR REPLACE FUNCTION mart.business_partition_exact(selected_tenant text,selected_partition text) RETURNS boolean LANGUAGE sql STABLE AS $$
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
 WHERE extraction.tenant_id=selected_tenant AND extraction.partition_id=selected_partition AND extraction.completed AND part.family='business'
 AND extraction.month=part.month AND part.capabilities IS NOT NULL
 AND ((extraction.mapping->>'mappingId'='business-purpose-v1' AND extraction.mapping->>'mappingVersion'='1')
 OR (extraction.mapping->>'mappingId'='business-purpose-v1-sales-command' AND extraction.mapping->>'mappingVersion' ~ '^[a-f0-9]{64}$'))
 AND (extraction.mapping->>'mappingId'='business-purpose-v1-sales-command' OR NOT EXISTS(
 SELECT 1 FROM jsonb_array_elements(extraction.mapping->'capabilities') capability WHERE left(capability->>'metric',8)='command_') AND NOT EXISTS(
 SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') measure WHERE left(measure->>'measureId',8)='command_'))
 AND part.capabilities->>'tenantId'=selected_tenant AND jsonb_array_length(part.capabilities->'releases')=1
 AND part.capabilities->'releases'->0->>'financeReview'='pending'
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(part.capabilities->'releases'->0->'capabilities') capability
  WHERE capability->>'metric' NOT IN ('invoice_refund_sales_percentage','delivered_customer_quantity','physical_return_rate_quantity','observed_customer_count','supplier_payable_next_month','receivables_due_next_month','invoiced_product_quantity','period_net_sales','period_invoice_sales','period_invoice_refunds','period_cash_collections','period_collection_percentage','customer_period_sales','customer_average_monthly_sales','customer_observed_orders','observed_new_customers','observed_single_order_customers','observed_inactive_customers','customer_last_invoice_date','customer_last_collection_date','review_customer_balance','customer_balance_sales_percentage','receivable_unknown_due','positive_receivable_not_due','positive_due_0_30','positive_due_31_60','positive_due_61_90','positive_due_over_90','internal_stock_quantity','expired_stock_quantity','near_expiry_stock_quantity','unknown_expiry_stock_quantity','negative_stock_positions','physical_return_quantity','internal_transfer_quantity','delivered_unbilled_quantity','received_unbilled_quantity','order_age_exceptions','book_cash_balance','supplier_payable_due','supplier_payable_unknown_due','supplier_advance_balance','command_invoice_total','command_invoice_count','command_invoice_residual','command_invoice_settled','command_document_count','command_document_value','command_invoice_refunds','command_net_invoices','command_cash_received','command_receipt_count','command_receipt_value','command_order_count','command_order_value','command_order_status_count','command_order_status_value','command_cancelled_count','command_cancelled_value','command_cancellation_rate','command_customers','command_same_day_cash','command_same_day_rate','command_customer_balance','command_overdue_balance','command_future_balance','command_unknown_maturity','command_overdue_days')
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'capabilities') mapped WHERE mapped=capability-'summary'-'analyses'))
 AND NOT EXISTS(SELECT 1 FROM mart.review_facts fact WHERE fact.tenant_id=selected_tenant AND fact.partition_id=selected_partition
 AND ((fact.payload->>'measureId') NOT IN ('delivered_customer_quantity','observed_customer_count','supplier_payable_next_month','receivables_due_next_month','invoiced_product_quantity','period_net_sales','period_invoice_sales','period_invoice_refunds','period_cash_collections','customer_period_sales','customer_average_monthly_sales','customer_observed_orders','observed_new_customers','observed_single_order_customers','observed_inactive_customers','customer_last_invoice_date','customer_last_collection_date','review_customer_balance','receivable_unknown_due','positive_receivable_not_due','positive_due_0_30','positive_due_31_60','positive_due_61_90','positive_due_over_90','internal_stock_quantity','expired_stock_quantity','near_expiry_stock_quantity','unknown_expiry_stock_quantity','negative_stock_positions','physical_return_quantity','internal_transfer_quantity','delivered_unbilled_quantity','received_unbilled_quantity','order_age_exceptions','book_cash_balance','supplier_payable_due','supplier_payable_unknown_due','supplier_advance_balance','period_collection_sales','command_invoice_total','command_invoice_count','command_invoice_residual','command_invoice_settled','command_document_count','command_document_value','command_invoice_refunds','command_net_invoices','command_cash_received','command_receipt_count','command_receipt_value','command_order_count','command_order_value','command_order_status_count','command_order_status_value','command_cancelled_count','command_cancelled_value','command_decided_orders','command_same_day_cash','command_customer_balance','command_overdue_balance','command_future_balance','command_unknown_maturity','command_overdue_days') OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') rule
 WHERE rule->>'measureId'=fact.payload->>'measureId' AND rule->>'sourceObject'=fact.payload->>'sourceObject'
 AND NOT EXISTS(SELECT 1 FROM jsonb_object_keys(fact.payload->'dimensions') dimension WHERE NOT rule->'dimensionMappings'?dimension))))
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
