-- Mutable discovery metadata only. Published facts, exact proofs and history stay immutable.
-- A namespace is initialized only after its complete source scan and successful sync.
CREATE TABLE mart.analytics_receivable_dependencies (
 tenant_id text NOT NULL,source_id text NOT NULL,definition_version text NOT NULL,mapping_version text NOT NULL,
 source_object text NOT NULL CHECK(source_object IN ('account_move_line','account_partial_reconcile','account_move','account_payment')),
 source_record_id text NOT NULL CHECK(source_record_id~'^[1-9][0-9]*$'),effective_from date,
 run_id text NOT NULL,cutoff timestamptz NOT NULL,
 PRIMARY KEY(tenant_id,source_id,definition_version,mapping_version,source_object,source_record_id),
 FOREIGN KEY(tenant_id,run_id) REFERENCES mart.analytics_operation_runs
);
CREATE TABLE mart.analytics_receivable_dependency_checkpoints (
 tenant_id text NOT NULL,source_id text NOT NULL,definition_version text NOT NULL,mapping_version text NOT NULL,
 run_id text NOT NULL,cutoff timestamptz NOT NULL,
 PRIMARY KEY(tenant_id,source_id,definition_version,mapping_version),
 FOREIGN KEY(tenant_id,run_id) REFERENCES mart.analytics_operation_runs
);
ALTER TABLE mart.analytics_receivable_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_receivable_dependencies FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.analytics_receivable_dependencies
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
ALTER TABLE mart.analytics_receivable_dependency_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_receivable_dependency_checkpoints FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.analytics_receivable_dependency_checkpoints
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
GRANT SELECT,INSERT ON mart.analytics_receivable_dependencies,mart.analytics_receivable_dependency_checkpoints TO dabboos_ingestor;
GRANT UPDATE(effective_from,run_id,cutoff) ON mart.analytics_receivable_dependencies TO dabboos_ingestor;
GRANT UPDATE(run_id,cutoff) ON mart.analytics_receivable_dependency_checkpoints TO dabboos_ingestor;
REVOKE ALL ON mart.analytics_receivable_dependencies,mart.analytics_receivable_dependency_checkpoints FROM PUBLIC,dabboos_runtime;

-- Transition tables validate each write batch once, rather than querying audit
-- and cursor state once per dependency row during initial population.
CREATE FUNCTION mart.guard_receivable_dependency_cursor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF EXISTS(
   SELECT 1 FROM
   (SELECT tenant_id,source_id,definition_version,mapping_version,min(cutoff) cutoff FROM changed_dependencies GROUP BY 1,2,3,4) current_scope
   JOIN (SELECT tenant_id,source_id,definition_version,mapping_version,max(cutoff) cutoff FROM previous_dependencies GROUP BY 1,2,3,4) previous_scope
   USING(tenant_id,source_id,definition_version,mapping_version)
   WHERE current_scope.cutoff<previous_scope.cutoff
  ) THEN RAISE EXCEPTION 'Receivable dependency cutoff cannot regress'; END IF;
 END IF;
 IF EXISTS(
  SELECT 1 FROM (SELECT DISTINCT tenant_id,source_id,definition_version,mapping_version,run_id,cutoff FROM changed_dependencies) changed
  WHERE NOT EXISTS(
   SELECT 1 FROM mart.analytics_operation_runs run
   JOIN mart.analytics_source_cursors cursor USING(tenant_id,run_id)
   JOIN mart.analytics_baselines baseline USING(tenant_id)
   WHERE run.tenant_id=changed.tenant_id AND run.run_id=changed.run_id
   AND run.kind='sync' AND run.status IN ('passed','unchanged')
   AND run.source_cutoff=changed.cutoff AND cursor.cutoff=changed.cutoff
   AND run.definition_version=changed.definition_version AND run.mapping_version=changed.mapping_version
   AND baseline.source_id=changed.source_id AND baseline.definition_version=changed.definition_version
   AND baseline.mapping_version=changed.mapping_version
  )
 ) THEN RAISE EXCEPTION 'Receivable dependencies require the successful matching source cursor'; END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER receivable_dependency_insert_guard AFTER INSERT ON mart.analytics_receivable_dependencies
 REFERENCING NEW TABLE AS changed_dependencies
 FOR EACH STATEMENT EXECUTE FUNCTION mart.guard_receivable_dependency_cursor();
CREATE TRIGGER receivable_dependency_update_guard AFTER UPDATE ON mart.analytics_receivable_dependencies
 REFERENCING OLD TABLE AS previous_dependencies NEW TABLE AS changed_dependencies
 FOR EACH STATEMENT EXECUTE FUNCTION mart.guard_receivable_dependency_cursor();
CREATE TRIGGER receivable_dependency_checkpoint_insert_guard AFTER INSERT ON mart.analytics_receivable_dependency_checkpoints
 REFERENCING NEW TABLE AS changed_dependencies
 FOR EACH STATEMENT EXECUTE FUNCTION mart.guard_receivable_dependency_cursor();
CREATE TRIGGER receivable_dependency_checkpoint_update_guard AFTER UPDATE ON mart.analytics_receivable_dependency_checkpoints
 REFERENCING OLD TABLE AS previous_dependencies NEW TABLE AS changed_dependencies
 FOR EACH STATEMENT EXECUTE FUNCTION mart.guard_receivable_dependency_cursor();
REVOKE ALL ON FUNCTION mart.guard_receivable_dependency_cursor() FROM PUBLIC;
