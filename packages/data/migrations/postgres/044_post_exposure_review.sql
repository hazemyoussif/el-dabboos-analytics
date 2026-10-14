-- Post-exposure Finance review shares the existing immutable tenant serving manifest.
INSERT INTO mart.measure_definitions VALUES
 ('customer_cash_collected','event',true),('cash_applied_to_invoices','event',true),
 ('unallocated_customer_receipts','event',true),('collection_amount_days','event',false),
 ('collection_applied_amount','event',false),('order_margin','event',true),
 ('order_untaxed_value','event',false),('receivables_due_for_collection','snapshot',true);
ALTER TABLE mart.analytics_partitions DROP CONSTRAINT analytics_partitions_family_check;
ALTER TABLE mart.analytics_partitions ADD CHECK(family IN ('facts','receivables','review'));
ALTER TABLE mart.analytics_serving_members DROP CONSTRAINT analytics_serving_members_family_check;
ALTER TABLE mart.analytics_serving_members ADD CHECK(family IN ('facts','receivables','review'));
ALTER TABLE mart.analytics_serving_revisions DROP CONSTRAINT analytics_serving_revisions_purpose_check;
ALTER TABLE mart.analytics_serving_revisions ADD CHECK(purpose IN ('operational','adoption','snapshot','review'));
CREATE TABLE mart.review_extractions (
 tenant_id text NOT NULL,partition_id text NOT NULL,month date NOT NULL,source_id text NOT NULL,
 currency text NOT NULL,source_cutoff timestamptz NOT NULL,source_revision text NOT NULL,
 definition_version text NOT NULL,mapping jsonb NOT NULL,completed boolean NOT NULL DEFAULT false,
 PRIMARY KEY(tenant_id,partition_id),FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.analytics_partitions,
 CHECK(month=date_trunc('month',month)::date),CHECK(length(source_revision)>0)
);
CREATE TABLE mart.review_facts (
 tenant_id text NOT NULL,partition_id text NOT NULL,fact_key text NOT NULL,payload jsonb NOT NULL,
 PRIMARY KEY(tenant_id,partition_id,fact_key),FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.review_extractions,
 CHECK(payload->>'tenantId'=tenant_id AND payload->>'status'='active')
);
CREATE TABLE mart.review_controls (
 tenant_id text NOT NULL,partition_id text NOT NULL,measure_id text NOT NULL,scope_key text NOT NULL,
 dimensions jsonb,expected_value numeric(30,6) NOT NULL,expected_count bigint,
 PRIMARY KEY(tenant_id,partition_id,measure_id,scope_key),FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.review_extractions,
 CHECK(expected_count IS NULL OR expected_count>=0),CHECK((scope_key='summary')=(dimensions IS NULL))
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['review_extractions','review_facts','review_controls'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT,INSERT ON mart.%I TO dabboos_ingestor',relation_name);
  EXECUTE format('GRANT SELECT ON mart.%I TO dabboos_runtime',relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
 END LOOP;
END $$;
CREATE FUNCTION mart.review_partition_exact(selected_tenant text,selected_partition text) RETURNS boolean LANGUAGE sql STABLE AS $$
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
 AND NOT EXISTS(SELECT 1 FROM mart.review_controls control WHERE control.tenant_id=selected_tenant AND control.partition_id=selected_partition
  AND (control.expected_value IS DISTINCT FROM (SELECT coalesce(sum((payload->>'value')::numeric),0) FROM mart.review_facts fact
   WHERE fact.tenant_id=selected_tenant AND fact.partition_id=selected_partition AND payload->>'measureId'=control.measure_id
   AND (control.dimensions IS NULL OR payload->'dimensions'=control.dimensions))
   OR (control.expected_count IS NOT NULL AND control.expected_count<>(SELECT count(*) FROM mart.review_facts fact
    WHERE fact.tenant_id=selected_tenant AND fact.partition_id=selected_partition AND payload->>'measureId'=control.measure_id
    AND (control.dimensions IS NULL OR payload->'dimensions'=control.dimensions)))))
 AND NOT EXISTS(SELECT 1 FROM mart.review_facts fact WHERE fact.tenant_id=selected_tenant AND fact.partition_id=selected_partition
  AND NOT EXISTS(SELECT 1 FROM mart.review_controls control WHERE control.tenant_id=selected_tenant AND control.partition_id=selected_partition
   AND control.measure_id=fact.payload->>'measureId' AND control.dimensions=fact.payload->'dimensions'))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') measure
  WHERE NOT EXISTS(SELECT 1 FROM mart.review_controls control WHERE control.tenant_id=selected_tenant AND control.partition_id=selected_partition
   AND control.measure_id=measure->>'measureId' AND control.scope_key='summary')))
$$;
CREATE FUNCTION mart.guard_review_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.family='review' AND NOT mart.review_partition_exact(NEW.tenant_id,NEW.partition_id) THEN RAISE EXCEPTION 'Incomplete or mismatched review extraction'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_member_guard BEFORE INSERT ON mart.analytics_serving_members FOR EACH ROW EXECUTE FUNCTION mart.guard_review_member();
CREATE FUNCTION mart.lock_review_contents() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id) THEN RAISE EXCEPTION 'Exposed review contents are immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_fact_lock BEFORE INSERT ON mart.review_facts FOR EACH ROW EXECUTE FUNCTION mart.lock_review_contents();
CREATE TRIGGER review_control_lock BEFORE INSERT ON mart.review_controls FOR EACH ROW EXECUTE FUNCTION mart.lock_review_contents();
REVOKE ALL ON FUNCTION mart.review_partition_exact(text,text),mart.guard_review_member(),mart.lock_review_contents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.review_partition_exact(text,text) TO dabboos_ingestor,dabboos_runtime;
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
 ELSIF candidate.purpose='review' THEN
  IF candidate.run_id IS NOT NULL OR TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Review exposure requires trusted parent'; END IF;
  IF NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members next JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
   WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.family='review' AND next.month=ANY(candidate.affected_months)) THEN RAISE EXCEPTION 'Complete review membership required'; END IF;
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
     OR (candidate.purpose='snapshot' AND prior.family<>'receivables') OR (candidate.purpose='operational' AND prior.family<>'facts') OR (candidate.purpose='review' AND prior.family<>'review'))))) THEN
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
 IF candidate.purpose='review' AND EXISTS(SELECT 1 FROM mart.analytics_serving_members next LEFT JOIN mart.analytics_serving_members prior
 ON prior.tenant_id=next.tenant_id AND prior.revision_id=candidate.parent_revision AND prior.month=next.month AND prior.family=next.family
 WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.partition_id IS DISTINCT FROM prior.partition_id
 AND (next.family<>'review' OR NOT mart.review_partition_exact(next.tenant_id,next.partition_id))) THEN RAISE EXCEPTION 'Review exposure requires exact independent source controls'; END IF;
 IF candidate.purpose='review' AND EXISTS(SELECT 1 FROM mart.analytics_serving_members next JOIN mart.review_extractions observed USING(tenant_id,partition_id)
  JOIN mart.analytics_serving_members prior ON prior.tenant_id=next.tenant_id AND prior.revision_id=candidate.parent_revision AND prior.month=next.month AND prior.family=next.family
  JOIN mart.review_extractions previous ON previous.tenant_id=prior.tenant_id AND previous.partition_id=prior.partition_id
  WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.family='review' AND next.partition_id<>prior.partition_id
  AND observed.source_cutoff<=previous.source_cutoff) THEN RAISE EXCEPTION 'Newer review source cutoff required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id) THEN RAISE EXCEPTION 'Complete candidate membership required'; END IF;
 RETURN NEW;
END $$;
