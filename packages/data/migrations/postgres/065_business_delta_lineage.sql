-- Additive mixed-lineage evidence. No extraction, source access or publication.
CREATE TABLE mart.business_delta_origins (
 tenant_id text NOT NULL,partition_id text NOT NULL,parent_revision text NOT NULL,base_partition text NOT NULL,
 PRIMARY KEY(tenant_id,partition_id),CHECK(partition_id<>base_partition),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.review_extractions,
 FOREIGN KEY(tenant_id,base_partition) REFERENCES mart.review_extractions,
 FOREIGN KEY(tenant_id,parent_revision) REFERENCES mart.analytics_serving_revisions
);
CREATE TABLE mart.business_delta_replacements (
 tenant_id text NOT NULL,partition_id text NOT NULL,source_object text NOT NULL,source_record_id text NOT NULL,
 PRIMARY KEY(tenant_id,partition_id,source_object,source_record_id),
 CHECK(length(source_object)>0 AND length(source_record_id)>0),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.business_delta_origins
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['business_delta_origins','business_delta_replacements'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT,INSERT ON mart.%I TO dabboos_ingestor',relation_name);
  EXECUTE format('GRANT SELECT ON mart.%I TO dabboos_runtime',relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
  EXECUTE format('CREATE TRIGGER published_content_lock BEFORE INSERT ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.lock_review_contents()',relation_name);
 END LOOP;
END $$;

CREATE FUNCTION mart.guard_business_delta_origin() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('analytics:'||NEW.tenant_id,0));
 IF NOT EXISTS(
  SELECT 1 FROM mart.analytics_trusted_serving trusted
  JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  JOIN mart.review_extractions previous ON previous.tenant_id=member.tenant_id AND previous.partition_id=member.partition_id
  JOIN mart.review_extractions next ON next.tenant_id=previous.tenant_id AND next.partition_id=NEW.partition_id
  JOIN mart.analytics_partitions part ON part.tenant_id=next.tenant_id AND part.partition_id=next.partition_id
  WHERE trusted.tenant_id=NEW.tenant_id AND trusted.revision_id=NEW.parent_revision
  AND member.partition_id=NEW.base_partition AND member.family='business' AND part.family='business'
  AND previous.completed AND next.completed AND previous.month=next.month AND part.month=next.month
  AND previous.source_id=next.source_id AND previous.currency=next.currency
  AND (previous.mapping=next.mapping OR (
   previous.mapping->>'mappingId'='business-purpose-v1' AND previous.mapping->>'mappingVersion'='1'
   AND next.mapping->>'mappingId'='business-purpose-v1-sales-command'
   AND previous.mapping->>'tenantId'=next.mapping->>'tenantId' AND previous.mapping->>'sourceId'=next.mapping->>'sourceId'
   AND previous.mapping->>'datasetId'=next.mapping->>'datasetId' AND previous.mapping->>'reportingCurrency'=next.mapping->>'reportingCurrency'
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(previous.mapping->'measures') rule
    WHERE NOT next.mapping->'measures' @> jsonb_build_array(rule))
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(previous.mapping->'capabilities') capability
    WHERE NOT next.mapping->'capabilities' @> jsonb_build_array(capability))
  )) AND previous.definition_version=next.definition_version
  AND previous.source_cutoff<next.source_cutoff
 ) THEN RAISE EXCEPTION 'Business delta requires the current compatible accepted partition'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_delta_origin_guard BEFORE INSERT ON mart.business_delta_origins
 FOR EACH ROW EXECUTE FUNCTION mart.guard_business_delta_origin();

CREATE FUNCTION mart.guard_business_delta_replacement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM mart.review_extractions extraction,
  LATERAL jsonb_array_elements(extraction.mapping->'measures') rule
  WHERE extraction.tenant_id=NEW.tenant_id AND extraction.partition_id=NEW.partition_id
  AND rule->>'sourceObject'=NEW.source_object)
 THEN RAISE EXCEPTION 'Governed business recipe identity required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_delta_replacement_guard BEFORE INSERT ON mart.business_delta_replacements
 FOR EACH ROW EXECUTE FUNCTION mart.guard_business_delta_replacement();

CREATE FUNCTION mart.guard_business_delta_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.family<>'business' OR EXISTS(SELECT 1 FROM mart.analytics_serving_members prior
  WHERE prior.tenant_id=NEW.tenant_id AND prior.partition_id=NEW.partition_id
  AND prior.family=NEW.family AND prior.month=NEW.month) THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM mart.business_delta_origins origin
  JOIN mart.analytics_serving_revisions next ON next.tenant_id=origin.tenant_id AND next.revision_id=NEW.revision_id
  WHERE origin.tenant_id=NEW.tenant_id AND origin.partition_id=NEW.partition_id
  AND (next.parent_revision IS DISTINCT FROM origin.parent_revision OR NOT EXISTS(
   SELECT 1 FROM mart.analytics_serving_members base WHERE base.tenant_id=origin.tenant_id
   AND base.revision_id=next.parent_revision AND base.partition_id=origin.base_partition
   AND base.family=NEW.family AND base.month=NEW.month)))
 THEN RAISE EXCEPTION 'Business delta publication parent conflict'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_delta_member_guard BEFORE INSERT ON mart.analytics_serving_members
 FOR EACH ROW EXECUTE FUNCTION mart.guard_business_delta_member();

CREATE FUNCTION mart.business_partition_lineage_exact(selected_tenant text,selected_partition text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH extraction AS MATERIALIZED (
  SELECT * FROM mart.review_extractions WHERE tenant_id=selected_tenant AND partition_id=selected_partition
 ),origin AS MATERIALIZED (
  SELECT * FROM mart.business_delta_origins WHERE tenant_id=selected_tenant AND partition_id=selected_partition
 )
 SELECT EXISTS(SELECT 1 FROM extraction)
 AND NOT EXISTS(
  SELECT 1 FROM mart.review_facts fact CROSS JOIN extraction
  WHERE fact.tenant_id=selected_tenant AND fact.partition_id=selected_partition AND (
   left(fact.payload->>'businessDate',7) IS DISTINCT FROM to_char(extraction.month,'YYYY-MM')
   OR fact.payload->>'sourceId' IS DISTINCT FROM extraction.source_id
   OR CASE WHEN NOT EXISTS(SELECT 1 FROM origin) OR EXISTS(
    SELECT 1 FROM mart.business_delta_replacements changed
    WHERE changed.tenant_id=selected_tenant AND changed.partition_id=selected_partition
    AND changed.source_object=fact.payload->>'sourceObject'
    AND changed.source_record_id=fact.payload->>'sourceRecordId'
   ) THEN
    fact.payload->>'sourceAsOf' IS DISTINCT FROM to_char(extraction.source_cutoff AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    OR fact.payload->>'frozenRevision' IS DISTINCT FROM extraction.source_revision
   ELSE NOT EXISTS(
    SELECT 1 FROM mart.review_facts previous JOIN origin ON origin.tenant_id=previous.tenant_id
    AND origin.base_partition=previous.partition_id
    WHERE previous.fact_key=fact.fact_key AND previous.payload=fact.payload
   ) END
  )
 )
 -- An unchanged identity cannot be omitted even if totals happen to compensate.
 AND NOT EXISTS(
  SELECT 1 FROM mart.review_facts previous JOIN origin ON origin.tenant_id=previous.tenant_id
  AND origin.base_partition=previous.partition_id
  WHERE NOT EXISTS(SELECT 1 FROM mart.business_delta_replacements changed
   WHERE changed.tenant_id=selected_tenant AND changed.partition_id=selected_partition
   AND changed.source_object=previous.payload->>'sourceObject' AND changed.source_record_id=previous.payload->>'sourceRecordId')
  AND NOT EXISTS(SELECT 1 FROM mart.review_facts fact WHERE fact.tenant_id=selected_tenant
   AND fact.partition_id=selected_partition AND fact.fact_key=previous.fact_key AND fact.payload=previous.payload)
 )
$$;
REVOKE ALL ON FUNCTION mart.guard_business_delta_origin(),mart.guard_business_delta_replacement(),mart.guard_business_delta_member(),mart.business_partition_lineage_exact(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_partition_lineage_exact(text,text) TO dabboos_ingestor,dabboos_runtime;

-- Preserve the governed mapping, measure and exact-control checks from 061.
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
 AND mart.business_partition_lineage_exact(selected_tenant,selected_partition)
 AND NOT EXISTS(SELECT 1 FROM comparison WHERE control_measure_id IS NULL
  OR expected_value IS DISTINCT FROM coalesce(actual_value,0)
  OR (expected_count IS NOT NULL AND expected_count<>coalesce(actual_count,0)))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') measure
  WHERE NOT EXISTS(SELECT 1 FROM mart.review_controls control WHERE control.tenant_id=selected_tenant AND control.partition_id=selected_partition
   AND control.measure_id=measure->>'measureId' AND control.scope_key='summary')))
$$;
