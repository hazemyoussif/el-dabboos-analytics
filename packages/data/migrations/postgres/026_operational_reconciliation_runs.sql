-- Operational evidence groups existing exact cases; certification records stay unchanged.
CREATE TABLE mart.analytics_operation_runs (
 tenant_id text NOT NULL,run_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('sync','affected','daily','deep','sweep')),
 actor_id text NOT NULL CHECK(length(btrim(actor_id))>0),trigger_type text NOT NULL CHECK(trigger_type IN ('manual','operator','scheduled')),
 source_cutoff timestamptz NOT NULL,source_revision text NOT NULL,mapping_version text NOT NULL,definition_version text NOT NULL,
 started_at timestamptz NOT NULL,completed_at timestamptz NOT NULL,
 status text NOT NULL CHECK(status IN ('passed','failed','unchanged')),
 records_changed bigint NOT NULL CHECK(records_changed>=0),partitions_affected bigint NOT NULL CHECK(partitions_affected>=0),
 case_ids text[] NOT NULL,case_count integer NOT NULL CHECK(case_count>=0),mismatch_count integer NOT NULL CHECK(mismatch_count>=0 AND mismatch_count<=case_count),
 evidence_hash text NOT NULL,serving_release text,
 PRIMARY KEY(tenant_id,run_id),
 CHECK(completed_at>=started_at),
 CHECK(case_count=cardinality(case_ids)),
 CHECK((status='unchanged' AND records_changed=0 AND case_count=0 AND partitions_affected=0 AND mismatch_count=0)
 OR (status='passed' AND case_count>0 AND mismatch_count=0) OR (status='failed' AND case_count>0 AND mismatch_count>0))
);
CREATE INDEX analytics_operation_latest ON mart.analytics_operation_runs(tenant_id,kind,completed_at DESC,run_id);
ALTER TABLE mart.analytics_operation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_operation_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.analytics_operation_runs
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
GRANT SELECT,INSERT ON mart.analytics_operation_runs TO dabboos_ingestor;
GRANT SELECT ON mart.analytics_operation_runs TO dabboos_runtime;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.analytics_operation_runs FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();

CREATE FUNCTION mart.guard_operational_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE observed_count integer; failed_count integer; observed_hash text;
BEGIN
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
CREATE TRIGGER operational_evidence_guard BEFORE INSERT ON mart.analytics_operation_runs FOR EACH ROW EXECUTE FUNCTION mart.guard_operational_evidence();
REVOKE ALL ON FUNCTION mart.guard_operational_evidence() FROM PUBLIC;

CREATE TABLE mart.analytics_source_cursors (
 tenant_id text PRIMARY KEY,cutoff timestamptz NOT NULL,object_cursors jsonb NOT NULL CHECK(jsonb_typeof(object_cursors)='object'),run_id text NOT NULL,
 FOREIGN KEY(tenant_id,run_id) REFERENCES mart.analytics_operation_runs
);
ALTER TABLE mart.analytics_source_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_source_cursors FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.analytics_source_cursors
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
GRANT SELECT,INSERT,UPDATE ON mart.analytics_source_cursors TO dabboos_ingestor;
GRANT SELECT ON mart.analytics_source_cursors TO dabboos_runtime;
CREATE FUNCTION mart.guard_operational_cursor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.cutoff<OLD.cutoff THEN RAISE EXCEPTION 'Source cursor cannot regress'; END IF;
 IF NOT EXISTS(SELECT 1 FROM mart.analytics_operation_runs run WHERE run.tenant_id=NEW.tenant_id AND run.run_id=NEW.run_id
 AND run.kind='sync' AND run.status IN ('passed','unchanged') AND run.source_cutoff=NEW.cutoff) THEN
  RAISE EXCEPTION 'Source cursor requires successful bounded sync evidence';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER operational_cursor_guard BEFORE INSERT OR UPDATE ON mart.analytics_source_cursors FOR EACH ROW EXECUTE FUNCTION mart.guard_operational_cursor();
REVOKE ALL ON FUNCTION mart.guard_operational_cursor() FROM PUBLIC;
