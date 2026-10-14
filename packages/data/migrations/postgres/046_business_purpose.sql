-- New dimensions extend the canonical adapter vocabulary; all historical values remain unchanged.
ALTER TABLE mart.fact_revisions ADD COLUMN brand text,ADD COLUMN customer_segment text,ADD COLUMN customer_class text,ADD COLUMN uom text,ADD COLUMN journal text,ADD COLUMN supplier text;
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

-- New business-purpose partitions preserve facts, receivables and the complete review history.
ALTER TABLE mart.analytics_partitions DROP CONSTRAINT analytics_partitions_family_check;
ALTER TABLE mart.analytics_partitions ADD CHECK(family IN('facts','receivables','review','business'));
ALTER TABLE mart.analytics_serving_members DROP CONSTRAINT analytics_serving_members_family_check;
ALTER TABLE mart.analytics_serving_members ADD CHECK(family IN('facts','receivables','review','business'));
ALTER TABLE mart.analytics_serving_revisions DROP CONSTRAINT analytics_serving_revisions_purpose_check;
ALTER TABLE mart.analytics_serving_revisions ADD CHECK(purpose IN('operational','adoption','snapshot','review','business'));
INSERT INTO mart.measure_definitions VALUES
 ('delivered_customer_quantity','event',false),
 ('observed_customer_count','snapshot',false),
 ('supplier_payable_next_month','snapshot',true),
 ('receivables_due_next_month','snapshot',true),
 ('invoiced_product_quantity','event',false),
 ('period_net_sales','event',true),
 ('period_invoice_sales','event',true),
 ('period_invoice_refunds','event',true),
 ('period_cash_collections','event',true),
 ('customer_period_sales','snapshot',true),
 ('customer_average_monthly_sales','snapshot',true),
 ('customer_observed_orders','snapshot',false),
 ('observed_new_customers','snapshot',false),
 ('observed_single_order_customers','snapshot',false),
 ('observed_inactive_customers','snapshot',false),
 ('customer_last_invoice_date','snapshot',false),
 ('customer_last_collection_date','snapshot',false),
 ('review_customer_balance','snapshot',true),
 ('receivable_unknown_due','snapshot',true),
 ('positive_receivable_not_due','snapshot',true),
 ('positive_due_0_30','snapshot',true),
 ('positive_due_31_60','snapshot',true),
 ('positive_due_61_90','snapshot',true),
 ('positive_due_over_90','snapshot',true),
 ('internal_stock_quantity','snapshot',false),
 ('expired_stock_quantity','snapshot',false),
 ('near_expiry_stock_quantity','snapshot',false),
 ('unknown_expiry_stock_quantity','snapshot',false),
 ('negative_stock_positions','snapshot',false),
 ('physical_return_quantity','event',false),
 ('internal_transfer_quantity','event',false),
 ('delivered_unbilled_quantity','snapshot',false),
 ('received_unbilled_quantity','snapshot',false),
 ('order_age_exceptions','snapshot',false),
 ('book_cash_balance','snapshot',true),
 ('supplier_payable_due','snapshot',true),
 ('supplier_payable_unknown_due','snapshot',true),
 ('supplier_advance_balance','snapshot',true),
 ('period_collection_sales','event',false);
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
 AND extraction.mapping->>'mappingId'='business-purpose-v1' AND extraction.mapping->>'mappingVersion'='1'
 AND part.capabilities->>'tenantId'=selected_tenant AND jsonb_array_length(part.capabilities->'releases')=1
 AND part.capabilities->'releases'->0->>'financeReview'='pending'
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(part.capabilities->'releases'->0->'capabilities') capability
  WHERE capability->>'metric' NOT IN ('invoice_refund_sales_percentage','delivered_customer_quantity','physical_return_rate_quantity','observed_customer_count','supplier_payable_next_month','receivables_due_next_month','invoiced_product_quantity','period_net_sales','period_invoice_sales','period_invoice_refunds','period_cash_collections','period_collection_percentage','customer_period_sales','customer_average_monthly_sales','customer_observed_orders','observed_new_customers','observed_single_order_customers','observed_inactive_customers','customer_last_invoice_date','customer_last_collection_date','review_customer_balance','customer_balance_sales_percentage','receivable_unknown_due','positive_receivable_not_due','positive_due_0_30','positive_due_31_60','positive_due_61_90','positive_due_over_90','internal_stock_quantity','expired_stock_quantity','near_expiry_stock_quantity','unknown_expiry_stock_quantity','negative_stock_positions','physical_return_quantity','internal_transfer_quantity','delivered_unbilled_quantity','received_unbilled_quantity','order_age_exceptions','book_cash_balance','supplier_payable_due','supplier_payable_unknown_due','supplier_advance_balance')
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'capabilities') mapped WHERE mapped=capability-'summary'-'analyses'))
 AND NOT EXISTS(SELECT 1 FROM mart.review_facts fact WHERE fact.tenant_id=selected_tenant AND fact.partition_id=selected_partition
 AND ((fact.payload->>'measureId') NOT IN ('delivered_customer_quantity','observed_customer_count','supplier_payable_next_month','receivables_due_next_month','invoiced_product_quantity','period_net_sales','period_invoice_sales','period_invoice_refunds','period_cash_collections','customer_period_sales','customer_average_monthly_sales','customer_observed_orders','observed_new_customers','observed_single_order_customers','observed_inactive_customers','customer_last_invoice_date','customer_last_collection_date','review_customer_balance','receivable_unknown_due','positive_receivable_not_due','positive_due_0_30','positive_due_31_60','positive_due_61_90','positive_due_over_90','internal_stock_quantity','expired_stock_quantity','near_expiry_stock_quantity','unknown_expiry_stock_quantity','negative_stock_positions','physical_return_quantity','internal_transfer_quantity','delivered_unbilled_quantity','received_unbilled_quantity','order_age_exceptions','book_cash_balance','supplier_payable_due','supplier_payable_unknown_due','supplier_advance_balance','period_collection_sales') OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') rule
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

CREATE FUNCTION mart.guard_business_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.family='business' AND NOT mart.business_partition_exact(NEW.tenant_id,NEW.partition_id) THEN RAISE EXCEPTION 'Incomplete or mismatched business extraction'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_member_guard BEFORE INSERT ON mart.analytics_serving_members FOR EACH ROW EXECUTE FUNCTION mart.guard_business_member();
REVOKE ALL ON FUNCTION mart.business_partition_exact(text,text),mart.guard_business_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_partition_exact(text,text) TO dabboos_ingestor,dabboos_runtime;
CREATE OR REPLACE FUNCTION mart.guard_trusted_analytics() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE candidate mart.analytics_serving_revisions; baseline mart.analytics_baselines; run mart.analytics_operation_runs;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('analytics:'||NEW.tenant_id,0));
 SELECT * INTO STRICT candidate FROM mart.analytics_serving_revisions WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id;
 SELECT * INTO baseline FROM mart.analytics_baselines WHERE tenant_id=NEW.tenant_id;
 IF baseline IS NULL THEN RAISE EXCEPTION 'Certified operational baseline required'; END IF;
 IF TG_OP='UPDATE' AND candidate.parent_revision IS DISTINCT FROM OLD.revision_id THEN RAISE EXCEPTION 'Trusted parent conflict'; END IF;
 IF candidate.purpose='adoption' OR (candidate.run_id IS NULL AND TG_OP='INSERT') THEN
  IF NOT pg_has_role(current_user,'dabboos_migrator','MEMBER') THEN RAISE EXCEPTION 'Adoption requires publication operator'; END IF;
 ELSIF candidate.purpose IN('review','business') THEN
  IF candidate.run_id IS NOT NULL OR TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Review exposure requires trusted parent'; END IF;
  IF NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members next JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
   WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.family=candidate.purpose AND next.month=ANY(candidate.affected_months)) THEN RAISE EXCEPTION 'Complete review membership required'; END IF;
 ELSIF candidate.purpose='snapshot' THEN
  IF candidate.run_id IS NOT NULL OR TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Snapshot candidate requires trusted parent'; END IF;
 ELSE
  SELECT * INTO run FROM mart.analytics_operation_runs WHERE tenant_id=NEW.tenant_id AND run_id=candidate.run_id;
  IF run IS NULL OR run.status<>'passed' OR run.mismatch_count<>0 OR run.case_count=0 OR run.serving_release<>NEW.revision_id
  OR run.source_cutoff<>candidate.cutoff OR run.definition_version<>baseline.definition_version OR run.mapping_version<>baseline.mapping_version THEN
   RAISE EXCEPTION 'Trusted promotion requires complete passing operational evidence';
  END IF;
  IF EXISTS(SELECT 1 FROM unnest(candidate.affected_months) changed(month)
   WHERE NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members member WHERE member.tenant_id=NEW.tenant_id AND member.revision_id=NEW.revision_id AND member.month=changed.month AND member.family='facts')
   OR NOT EXISTS(SELECT 1 FROM mart.analytics_exact_cases evidence WHERE evidence.tenant_id=NEW.tenant_id AND evidence.case_id=ANY(run.case_ids)
    AND evidence.partition->>'month'=to_char(changed.month,'YYYY-MM') AND evidence.partition->>'dimension' IS NULL)) THEN
   RAISE EXCEPTION 'Affected refresh lacks exact summary controls';
  END IF;
 END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM mart.analytics_serving_members prior LEFT JOIN mart.analytics_serving_members next
   ON next.tenant_id=prior.tenant_id AND next.revision_id=NEW.revision_id AND next.month=prior.month AND next.family=prior.family
   WHERE prior.tenant_id=NEW.tenant_id AND prior.revision_id=OLD.revision_id AND (next.partition_id IS NULL OR
    (next.partition_id<>prior.partition_id AND (NOT prior.month=ANY(candidate.affected_months)
     OR (candidate.purpose='snapshot' AND prior.family<>'receivables') OR (candidate.purpose='operational' AND prior.family<>'facts') OR (candidate.purpose IN('review','business') AND prior.family<>candidate.purpose))))) THEN
  RAISE EXCEPTION 'Incomplete affected refresh';
 END IF;
 IF EXISTS(SELECT 1 FROM mart.analytics_serving_members next LEFT JOIN mart.analytics_serving_members prior
 ON prior.tenant_id=next.tenant_id AND prior.revision_id=candidate.parent_revision AND prior.month=next.month AND prior.family=next.family
 WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.partition_id IS DISTINCT FROM prior.partition_id
 AND NOT next.month=ANY(candidate.affected_months)) THEN RAISE EXCEPTION 'Changed partition lacks affected scope'; END IF;
 IF candidate.purpose='snapshot' AND EXISTS(SELECT 1 FROM mart.analytics_serving_members next
  LEFT JOIN mart.analytics_serving_members prior ON prior.tenant_id=next.tenant_id AND prior.revision_id=candidate.parent_revision AND prior.month=next.month AND prior.family=next.family
  WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.partition_id IS DISTINCT FROM prior.partition_id AND next.family<>'receivables') THEN
  RAISE EXCEPTION 'Snapshot promotion may only replace snapshot partitions';
 END IF;
 IF candidate.purpose IN('review','business') AND EXISTS(SELECT 1 FROM mart.analytics_serving_members next LEFT JOIN mart.analytics_serving_members prior
 ON prior.tenant_id=next.tenant_id AND prior.revision_id=candidate.parent_revision AND prior.month=next.month AND prior.family=next.family
 WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.partition_id IS DISTINCT FROM prior.partition_id
 AND (next.family<>candidate.purpose OR NOT CASE WHEN next.family='business' THEN mart.business_partition_exact(next.tenant_id,next.partition_id) ELSE mart.review_partition_exact(next.tenant_id,next.partition_id) END)) THEN RAISE EXCEPTION 'Review exposure requires exact independent source controls'; END IF;
 IF candidate.purpose IN('review','business') AND EXISTS(SELECT 1 FROM mart.analytics_serving_members next JOIN mart.review_extractions observed USING(tenant_id,partition_id)
  JOIN mart.analytics_serving_members prior ON prior.tenant_id=next.tenant_id AND prior.revision_id=candidate.parent_revision AND prior.month=next.month AND prior.family=next.family
  JOIN mart.review_extractions previous ON previous.tenant_id=prior.tenant_id AND previous.partition_id=prior.partition_id
  WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.family=candidate.purpose AND next.partition_id<>prior.partition_id
  AND observed.source_cutoff<=previous.source_cutoff) THEN RAISE EXCEPTION 'Newer review source cutoff required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id) THEN RAISE EXCEPTION 'Complete candidate membership required'; END IF;
 RETURN NEW;
END $$;
