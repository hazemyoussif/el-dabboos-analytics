-- Operational revisions inherit immutable certified semantics; they never alter certificates.
CREATE TABLE mart.analytics_baselines (
 tenant_id text PRIMARY KEY,source_id text NOT NULL,reporting_currency text NOT NULL,
 datasets text[] NOT NULL,definition_version text NOT NULL,mapping_version text NOT NULL,
 specification jsonb NOT NULL,capabilities jsonb NOT NULL,period_from date NOT NULL,period_to date NOT NULL,
 CHECK(period_to>=period_from AND cardinality(datasets)>0)
);
CREATE TABLE mart.analytics_fact_revisions (
 tenant_id text NOT NULL,fact_key text NOT NULL,revision_id text NOT NULL,payload jsonb NOT NULL,
 PRIMARY KEY(tenant_id,fact_key,revision_id),
 CHECK(payload->>'tenantId'=tenant_id AND payload->>'status' IN ('active','tombstone'))
);
CREATE TABLE mart.analytics_fact_heads (
 tenant_id text NOT NULL,fact_key text NOT NULL,revision_id text NOT NULL,
 PRIMARY KEY(tenant_id,fact_key),FOREIGN KEY(tenant_id,fact_key,revision_id) REFERENCES mart.analytics_fact_revisions
);
CREATE TABLE mart.analytics_partitions (
 tenant_id text NOT NULL,partition_id text NOT NULL,month date NOT NULL,
 PRIMARY KEY(tenant_id,partition_id),CHECK(month=date_trunc('month',month)::date)
);
CREATE TABLE mart.analytics_aggregate_bases (
 tenant_id text NOT NULL,partition_id text NOT NULL,measure_id text NOT NULL,kind text NOT NULL,
 business_date date NOT NULL,dimensions jsonb NOT NULL,value numeric(30,6) NOT NULL,fact_count bigint NOT NULL,
 labels jsonb NOT NULL,PRIMARY KEY(tenant_id,partition_id,measure_id,business_date,dimensions),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.analytics_partitions,
 CHECK(kind IN ('event','snapshot') AND fact_count>0)
);
CREATE TABLE mart.analytics_serving_revisions (
 tenant_id text NOT NULL,revision_id text NOT NULL,parent_revision text,run_id text,
 cutoff timestamptz NOT NULL,affected_months date[] NOT NULL,
 PRIMARY KEY(tenant_id,revision_id),FOREIGN KEY(tenant_id,parent_revision) REFERENCES mart.analytics_serving_revisions,
 FOREIGN KEY(tenant_id,run_id) REFERENCES mart.analytics_operation_runs DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE mart.analytics_serving_members (
 tenant_id text NOT NULL,revision_id text NOT NULL,month date NOT NULL,partition_id text NOT NULL,
 PRIMARY KEY(tenant_id,revision_id,month),FOREIGN KEY(tenant_id,revision_id) REFERENCES mart.analytics_serving_revisions,
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.analytics_partitions
);
CREATE TABLE mart.analytics_trusted_serving (
 tenant_id text PRIMARY KEY,revision_id text NOT NULL,
 FOREIGN KEY(tenant_id,revision_id) REFERENCES mart.analytics_serving_revisions
);
CREATE TABLE mart.analytics_exact_cases (
 tenant_id text NOT NULL,case_id text NOT NULL,source_cutoff timestamptz NOT NULL,source_revision text NOT NULL,
 mapping_version text NOT NULL,definition_version text NOT NULL,partition jsonb NOT NULL,
 measure_id text NOT NULL,expected_value numeric(30,6) NOT NULL,actual_value numeric(30,6) NOT NULL,
 expected_count bigint NOT NULL,actual_count bigint NOT NULL,
 PRIMARY KEY(tenant_id,case_id),CHECK(expected_count>=0 AND actual_count>=0)
);
CREATE TABLE mart.analytics_run_details (
 tenant_id text NOT NULL,run_id text NOT NULL,details jsonb NOT NULL,
 PRIMARY KEY(tenant_id,run_id),FOREIGN KEY(tenant_id,run_id) REFERENCES mart.analytics_operation_runs
);
CREATE TABLE mart.analytics_operation_failures (
 tenant_id text NOT NULL,run_id text NOT NULL,kind text NOT NULL,actor_id text NOT NULL,trigger_type text NOT NULL,
 started_at timestamptz NOT NULL,failed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,run_id)
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['analytics_baselines','analytics_fact_revisions','analytics_fact_heads','analytics_partitions','analytics_aggregate_bases','analytics_serving_revisions','analytics_serving_members','analytics_trusted_serving','analytics_exact_cases','analytics_run_details','analytics_operation_failures'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT,INSERT ON mart.%I TO dabboos_ingestor',relation_name);
  IF relation_name NOT IN ('analytics_fact_heads','analytics_trusted_serving') THEN
   EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
  END IF;
 END LOOP;
END $$;
REVOKE INSERT ON mart.analytics_baselines FROM dabboos_ingestor;
GRANT UPDATE ON mart.analytics_fact_heads,mart.analytics_trusted_serving TO dabboos_ingestor;
GRANT SELECT ON mart.analytics_baselines,mart.analytics_partitions,mart.analytics_aggregate_bases,mart.analytics_serving_revisions,mart.analytics_serving_members,mart.analytics_trusted_serving,mart.analytics_run_details,mart.analytics_operation_failures TO dabboos_runtime;
CREATE FUNCTION mart.guard_analytics_baseline() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF cardinality(NEW.datasets)<>(SELECT count(*) FROM mart.certified_serving_scope(NEW.tenant_id) WHERE dataset_id=ANY(NEW.datasets))
 OR EXISTS(SELECT 1 FROM mart.mapping_releases WHERE tenant_id=NEW.tenant_id AND dataset_id=ANY(NEW.datasets)
 AND (source_id<>NEW.source_id OR reporting_currency<>NEW.reporting_currency)) THEN
  RAISE EXCEPTION 'Operational baseline requires the exact certified tenant/source/currency scope';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER analytics_baseline_guard BEFORE INSERT ON mart.analytics_baselines FOR EACH ROW EXECUTE FUNCTION mart.guard_analytics_baseline();
CREATE FUNCTION mart.guard_trusted_analytics() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE candidate mart.analytics_serving_revisions; baseline mart.analytics_baselines; run mart.analytics_operation_runs;
BEGIN
 SELECT * INTO candidate FROM mart.analytics_serving_revisions WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id;
 SELECT * INTO baseline FROM mart.analytics_baselines WHERE tenant_id=NEW.tenant_id;
 IF baseline IS NULL THEN RAISE EXCEPTION 'Certified operational baseline required'; END IF;
 IF candidate.run_id IS NULL THEN
  IF NOT pg_has_role(current_user,'dabboos_migrator','MEMBER') OR TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Bootstrap requires publication operator'; END IF;
 ELSE
  SELECT * INTO run FROM mart.analytics_operation_runs WHERE tenant_id=NEW.tenant_id AND run_id=candidate.run_id;
  IF run IS NULL OR run.status<>'passed' OR run.mismatch_count<>0 OR run.case_count=0 OR run.serving_release<>NEW.revision_id
  OR run.source_cutoff<>candidate.cutoff OR run.definition_version<>baseline.definition_version OR run.mapping_version<>baseline.mapping_version THEN
   RAISE EXCEPTION 'Trusted promotion requires complete passing operational evidence';
  END IF;
  IF TG_OP<>'UPDATE' OR candidate.parent_revision IS DISTINCT FROM OLD.revision_id THEN RAISE EXCEPTION 'Trusted parent conflict'; END IF;
  IF EXISTS(SELECT 1 FROM mart.analytics_serving_members prior LEFT JOIN mart.analytics_serving_members next
   ON next.tenant_id=prior.tenant_id AND next.revision_id=NEW.revision_id AND next.month=prior.month
   WHERE prior.tenant_id=NEW.tenant_id AND prior.revision_id=OLD.revision_id AND
   (next.partition_id IS NULL OR (NOT prior.month=ANY(candidate.affected_months) AND next.partition_id<>prior.partition_id))) THEN
   RAISE EXCEPTION 'Incomplete affected refresh';
  END IF;
  IF EXISTS(SELECT 1 FROM unnest(candidate.affected_months) changed(month)
   WHERE NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
    WHERE member.tenant_id=NEW.tenant_id AND member.revision_id=NEW.revision_id AND member.month=changed.month AND part.month=changed.month)
   OR NOT EXISTS(SELECT 1 FROM mart.analytics_exact_cases evidence WHERE evidence.tenant_id=NEW.tenant_id AND evidence.case_id=ANY(run.case_ids)
    AND evidence.partition->>'month'=to_char(changed.month,'YYYY-MM') AND evidence.partition->>'dimension' IS NULL)) THEN
    RAISE EXCEPTION 'Affected refresh lacks exact summary controls';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER trusted_analytics_guard AFTER INSERT OR UPDATE ON mart.analytics_trusted_serving DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION mart.guard_trusted_analytics();
REVOKE ALL ON FUNCTION mart.guard_analytics_baseline(),mart.guard_trusted_analytics() FROM PUBLIC;

CREATE OR REPLACE FUNCTION mart.guard_operational_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE observed_count integer; failed_count integer; observed_hash text;
BEGIN
 IF EXISTS(SELECT 1 FROM mart.analytics_exact_cases WHERE tenant_id=NEW.tenant_id AND case_id=ANY(NEW.case_ids)) THEN
  SELECT count(*),count(*) FILTER(WHERE expected_value<>actual_value OR expected_count<>actual_count),
   encode(sha256(convert_to(jsonb_agg(to_jsonb(evidence) ORDER BY case_id)::text,'UTF8')),'hex')
   INTO observed_count,failed_count,observed_hash FROM mart.analytics_exact_cases evidence WHERE tenant_id=NEW.tenant_id AND case_id=ANY(NEW.case_ids);
  IF observed_count<>NEW.case_count OR failed_count<>NEW.mismatch_count OR NEW.evidence_hash<>observed_hash
   OR cardinality(NEW.case_ids)<>(SELECT count(DISTINCT value) FROM unnest(NEW.case_ids) value)
   OR EXISTS(SELECT 1 FROM mart.analytics_exact_cases WHERE tenant_id=NEW.tenant_id AND case_id=ANY(NEW.case_ids)
    AND (source_cutoff<>NEW.source_cutoff OR source_revision<>NEW.source_revision OR mapping_version<>NEW.mapping_version OR definition_version<>NEW.definition_version)) THEN
    RAISE EXCEPTION 'Operational evidence requires complete exact source/mart cases';
  END IF;
  RETURN NEW;
 END IF;
 IF cardinality(NEW.case_ids)<>(SELECT count(DISTINCT value) FROM unnest(NEW.case_ids) value) THEN
  RAISE EXCEPTION 'Operational evidence requires unique cases';
 END IF;
 SELECT count(*),count(*) FILTER(WHERE evidence.status<>'passed' OR NOT evidence.group_completeness
 OR (evidence.specification->>'expectedValue')::numeric<>(evidence.specification->>'actualValue')::numeric
 OR (evidence.specification->>'expectedCount')::bigint<>(evidence.specification->>'actualCount')::bigint)
 ,encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(evidence)-'recorded_at' ORDER BY evidence.case_id)::text,'[]'),'UTF8')),'hex')
 INTO observed_count,failed_count,observed_hash FROM mart.reconciliation_evidence evidence
 WHERE evidence.tenant_id=NEW.tenant_id AND evidence.case_id=ANY(NEW.case_ids);
 IF observed_count<>NEW.case_count OR failed_count<>NEW.mismatch_count
 OR (NEW.case_count>0 AND NEW.evidence_hash IS DISTINCT FROM observed_hash)
 OR (NEW.case_count=0 AND NEW.evidence_hash IS DISTINCT FROM 'no-changes')
 OR EXISTS(SELECT 1 FROM unnest(NEW.case_ids) selected(case_id) WHERE NOT EXISTS(SELECT 1 FROM mart.reconciliation_batches link WHERE link.tenant_id=NEW.tenant_id AND link.case_id=selected.case_id))
 OR EXISTS(SELECT 1 FROM mart.reconciliation_batches link JOIN mart.ingestion_batches batch USING(tenant_id,dataset_id,batch_id) WHERE link.tenant_id=NEW.tenant_id AND link.case_id=ANY(NEW.case_ids) AND (batch.source_as_of IS DISTINCT FROM NEW.source_cutoff OR batch.frozen_revision IS DISTINCT FROM NEW.source_revision))
 OR EXISTS(SELECT 1 FROM mart.reconciliation_evidence evidence WHERE evidence.tenant_id=NEW.tenant_id AND evidence.case_id=ANY(NEW.case_ids)
 AND (evidence.specification->>'frozenRevision' IS DISTINCT FROM NEW.source_revision
 OR evidence.specification->>'mappingVersion' IS DISTINCT FROM NEW.mapping_version
 OR evidence.specification->'tolerance'->>'status' IS DISTINCT FROM 'approved'
 OR (evidence.specification->'tolerance'->>'absoluteValue')::numeric<>0
 OR (evidence.specification->'tolerance'->>'absoluteCount')::numeric<>0)) THEN
  RAISE EXCEPTION 'Operational evidence requires complete exact source/mart cases';
 END IF;
 RETURN NEW;
END $$;
