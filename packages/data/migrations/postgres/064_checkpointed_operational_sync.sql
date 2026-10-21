-- Approved unpublished sync checkpoints. Accepted heads/cursor/publication remain atomic.
CREATE TABLE mart.analytics_sync_candidates (
 tenant_id text NOT NULL,candidate_id text NOT NULL,specification jsonb NOT NULL,
 PRIMARY KEY(tenant_id,candidate_id),
 CHECK((specification->>'tenantId'=tenant_id AND specification->>'candidateId'=candidate_id) IS TRUE)
);
CREATE TABLE mart.analytics_sync_heads (
 tenant_id text NOT NULL,candidate_id text NOT NULL,fact_key text NOT NULL,revision_id text NOT NULL,
 business_month text NOT NULL,measure_id text NOT NULL,status text NOT NULL,source_object text NOT NULL,source_record_id text NOT NULL,
 PRIMARY KEY(tenant_id,candidate_id,fact_key),
 FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.analytics_sync_candidates,
 FOREIGN KEY(tenant_id,fact_key,revision_id) REFERENCES mart.analytics_fact_revisions
);
CREATE INDEX sync_candidate_month ON mart.analytics_sync_heads(tenant_id,candidate_id,business_month,measure_id,status);
CREATE TABLE mart.analytics_sync_dependencies (
 tenant_id text NOT NULL,candidate_id text NOT NULL,kind text NOT NULL CHECK(kind IN('receivable','lookup')),
 page integer NOT NULL CHECK(page>=0),payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='array' AND jsonb_array_length(payload)<=1000),
 PRIMARY KEY(tenant_id,candidate_id,kind,page),FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.analytics_sync_candidates
);
CREATE TABLE mart.analytics_sync_seals (
 tenant_id text NOT NULL,candidate_id text NOT NULL,PRIMARY KEY(tenant_id,candidate_id),
 FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.analytics_sync_candidates
);
CREATE TABLE mart.analytics_sync_pending (
 tenant_id text PRIMARY KEY,candidate_id text NOT NULL,
 FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.analytics_sync_seals
);
CREATE TABLE mart.analytics_sync_reconciliations (
 tenant_id text NOT NULL,candidate_id text NOT NULL,evidence jsonb NOT NULL,
 PRIMARY KEY(tenant_id,candidate_id),FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.analytics_sync_seals
);
CREATE TABLE mart.analytics_sync_acceptances (
 tenant_id text NOT NULL,candidate_id text NOT NULL,PRIMARY KEY(tenant_id,candidate_id),
 FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.analytics_sync_seals,
 FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.analytics_operation_runs(tenant_id,run_id) DEFERRABLE INITIALLY DEFERRED
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['analytics_sync_candidates','analytics_sync_heads','analytics_sync_dependencies','analytics_sync_seals','analytics_sync_pending','analytics_sync_reconciliations','analytics_sync_acceptances'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT,INSERT ON mart.%I TO dabboos_ingestor',relation_name);
  IF relation_name<>'analytics_sync_pending' THEN
   EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
  END IF;
 END LOOP;
END $$;
GRANT DELETE ON mart.analytics_sync_pending TO dabboos_ingestor;

CREATE FUNCTION mart.assert_sync_candidate_current(selected_tenant text,selected_candidate text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE captured jsonb; accepted_cursor jsonb; parent text; baseline mart.analytics_baselines;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('analytics:'||selected_tenant,0));
 SELECT specification INTO STRICT captured FROM mart.analytics_sync_candidates JOIN mart.analytics_sync_pending USING(tenant_id,candidate_id)
 WHERE tenant_id=selected_tenant AND candidate_id=selected_candidate;
 SELECT revision_id INTO parent FROM mart.analytics_trusted_serving WHERE tenant_id=selected_tenant;
 SELECT * INTO STRICT baseline FROM mart.analytics_baselines WHERE tenant_id=selected_tenant;
 SELECT jsonb_build_object('cutoff',to_char(cutoff AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'objects',object_cursors)
 INTO accepted_cursor FROM mart.analytics_source_cursors WHERE tenant_id=selected_tenant;
 IF parent IS DISTINCT FROM captured->>'parent'
 OR coalesce(accepted_cursor,'null'::jsonb) IS DISTINCT FROM captured->'previousCursor'
 OR baseline.definition_version IS DISTINCT FROM captured->'source'->>'definitionVersion'
 OR baseline.mapping_version IS DISTINCT FROM captured->'source'->>'mappingVersion' THEN
  RAISE EXCEPTION 'Frozen sync candidate conflicts with accepted parent/cursor/definition';
 END IF;
END $$;

CREATE FUNCTION mart.seal_sync_candidate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE captured jsonb; kind_name text; expected_pages integer; expected_rows bigint;
BEGIN
 SELECT specification INTO STRICT captured FROM mart.analytics_sync_candidates WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id;
 IF (captured->'request'->>'tenantId'=NEW.tenant_id AND captured->'request'->>'kind'='sync'
  AND captured->'cursor'->>'cutoff'=captured->'source'->>'cutoff'
  AND jsonb_typeof(captured->'controls')='array' AND jsonb_typeof(captured->'partitions')='array' AND jsonb_typeof(captured->'days')='array'
  AND (captured->>'recordsChanged')::bigint>=0 AND (captured->>'expectedHeads')::bigint>=0
  AND (captured->>'receivablePages')::integer>=0 AND (captured->>'lookupPages')::integer>=0
  AND ((captured->>'recordsChanged')::bigint=0)=((captured->>'expectedHeads')::bigint=0)
  AND ((captured->>'recordsChanged')::bigint=0)=(jsonb_array_length(captured->'controls')=0)) IS NOT TRUE THEN
  RAISE EXCEPTION 'Complete bounded sync capture required';
 END IF;
 IF (captured->>'expectedHeads')::bigint IS DISTINCT FROM (SELECT count(*) FROM mart.analytics_sync_heads WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id)
 OR EXISTS(SELECT 1 FROM mart.analytics_sync_heads head JOIN mart.analytics_fact_revisions fact USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=NEW.tenant_id AND head.candidate_id=NEW.candidate_id AND
 ROW(head.business_month,head.measure_id,head.status,head.source_object,head.source_record_id)
 IS DISTINCT FROM ROW(left(fact.payload->>'businessDate',7),fact.payload->>'measureId',fact.payload->>'status',fact.payload->>'sourceObject',fact.payload->>'sourceRecordId')) THEN
  RAISE EXCEPTION 'Incomplete frozen candidate heads';
 END IF;
 FOREACH kind_name IN ARRAY ARRAY['receivable','lookup'] LOOP
  expected_pages:=(captured->>(CASE kind_name WHEN 'receivable' THEN 'receivablePages' ELSE 'lookupPages' END))::integer;
  expected_rows:=coalesce((captured->'details'->>(CASE kind_name WHEN 'receivable' THEN 'receivableDependencyRows' ELSE 'lookupDependencyRows' END))::bigint,0);
  IF expected_pages IS DISTINCT FROM (SELECT count(*) FROM mart.analytics_sync_dependencies WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id AND kind=kind_name)
  OR expected_rows IS DISTINCT FROM (SELECT coalesce(sum(jsonb_array_length(payload)),0) FROM mart.analytics_sync_dependencies WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id AND kind=kind_name)
  OR EXISTS(SELECT 1 FROM generate_series(0,expected_pages-1) expected(page) WHERE NOT EXISTS(
   SELECT 1 FROM mart.analytics_sync_dependencies actual WHERE actual.tenant_id=NEW.tenant_id AND actual.candidate_id=NEW.candidate_id AND actual.kind=kind_name AND actual.page=expected.page)) THEN
   RAISE EXCEPTION 'Incomplete frozen candidate dependencies';
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_seal_guard BEFORE INSERT ON mart.analytics_sync_seals FOR EACH ROW EXECUTE FUNCTION mart.seal_sync_candidate();
CREATE FUNCTION mart.freeze_sync_capture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM inserted_rows added JOIN mart.analytics_sync_seals seal USING(tenant_id,candidate_id)) THEN RAISE EXCEPTION 'Frozen source capture is immutable'; END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER sync_capture_freeze AFTER INSERT ON mart.analytics_sync_heads REFERENCING NEW TABLE AS inserted_rows FOR EACH STATEMENT EXECUTE FUNCTION mart.freeze_sync_capture();
CREATE TRIGGER sync_capture_freeze AFTER INSERT ON mart.analytics_sync_dependencies REFERENCING NEW TABLE AS inserted_rows FOR EACH STATEMENT EXECUTE FUNCTION mart.freeze_sync_capture();

-- The ingestion-only overlay never changes accepted heads or the runtime source.
CREATE VIEW mart.analytics_working_heads WITH(security_invoker=true) AS
 SELECT head.tenant_id,head.fact_key,head.revision_id,head.business_month,head.measure_id,head.status,head.source_object,head.source_record_id
 FROM mart.analytics_fact_heads head WHERE NOT EXISTS(
  SELECT 1 FROM mart.analytics_sync_heads changed JOIN mart.analytics_sync_seals seal USING(tenant_id,candidate_id)
  WHERE changed.tenant_id=head.tenant_id AND changed.candidate_id=nullif(current_setting('mart.sync_candidate_id',true),'') AND changed.fact_key=head.fact_key)
 UNION ALL
 SELECT changed.tenant_id,changed.fact_key,changed.revision_id,changed.business_month,changed.measure_id,changed.status,changed.source_object,changed.source_record_id
 FROM mart.analytics_sync_heads changed JOIN mart.analytics_sync_seals seal USING(tenant_id,candidate_id)
 WHERE changed.candidate_id=nullif(current_setting('mart.sync_candidate_id',true),'');
GRANT SELECT ON mart.analytics_working_heads TO dabboos_ingestor;

-- Permit a complete private candidate before its final successful audit exists.
-- Final trusted promotion retains its original successful-run and exact-proof guards.
ALTER TABLE mart.analytics_serving_revisions DROP CONSTRAINT analytics_serving_revisions_tenant_id_run_id_fkey;
CREATE FUNCTION mart.guard_operational_revision_run() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.run_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM mart.analytics_operation_runs WHERE tenant_id=NEW.tenant_id AND run_id=NEW.run_id)
 AND NOT EXISTS(SELECT 1 FROM mart.analytics_sync_candidates candidate JOIN mart.analytics_sync_seals seal USING(tenant_id,candidate_id)
  WHERE candidate.tenant_id=NEW.tenant_id AND candidate.candidate_id=NEW.run_id AND candidate.candidate_id=NEW.revision_id
  AND candidate.specification->>'parent'=NEW.parent_revision AND (candidate.specification->'source'->>'cutoff')::timestamptz=NEW.cutoff AND NEW.purpose='operational') THEN
  RAISE EXCEPTION 'Serving revision requires an accepted run or frozen sync candidate';
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER operational_revision_run AFTER INSERT ON mart.analytics_serving_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION mart.guard_operational_revision_run();

-- Downstream runtime policies follow membership. Candidate membership must remain
-- invisible even though it now survives a failed worker process.
CREATE FUNCTION mart.sync_revision_visible(selected_tenant text,selected_revision text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,mart AS $$
 SELECT selected_tenant=nullif(current_setting('mart.tenant_id',true),'') AND (
 NOT EXISTS(SELECT 1 FROM mart.analytics_sync_candidates WHERE tenant_id=selected_tenant AND candidate_id=selected_revision)
 OR EXISTS(SELECT 1 FROM mart.analytics_sync_acceptances WHERE tenant_id=selected_tenant AND candidate_id=selected_revision))
$$;
REVOKE ALL ON FUNCTION mart.sync_revision_visible(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.sync_revision_visible(text,text) TO dabboos_runtime;
CREATE POLICY accepted_sync_only ON mart.analytics_serving_members AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(mart.sync_revision_visible(tenant_id,revision_id));
CREATE POLICY accepted_sync_only ON mart.analytics_serving_revisions AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(mart.sync_revision_visible(tenant_id,revision_id));
-- Daily bases and partition metadata predate the downstream membership policies.
-- They also need a visible membership before runtime can read committed staging.
CREATE POLICY visible_membership_only ON mart.analytics_aggregate_bases AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.analytics_serving_members member WHERE member.tenant_id=analytics_aggregate_bases.tenant_id AND member.partition_id=analytics_aggregate_bases.partition_id));
CREATE POLICY visible_membership_only ON mart.analytics_partitions AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.analytics_serving_members member WHERE member.tenant_id=analytics_partitions.tenant_id AND member.partition_id=analytics_partitions.partition_id));

CREATE FUNCTION mart.guard_pending_sync_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pending text;
BEGIN
 SELECT candidate_id INTO pending FROM mart.analytics_sync_pending WHERE tenant_id=nullif(current_setting('mart.tenant_id',true),'');
 IF pending IS NOT NULL AND pending IS DISTINCT FROM nullif(current_setting('mart.sync_accepting',true),'') THEN
  RAISE EXCEPTION 'An unpublished sync candidate must finish before accepted state can change';
 END IF;
 -- Setting the acceptance flag cannot bypass atomic acceptance: the first write
 -- registers a deferred guard that must observe the complete accepted state.
 IF pending IS NOT NULL THEN
  INSERT INTO mart.analytics_sync_acceptances VALUES(nullif(current_setting('mart.tenant_id',true),''),pending) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER pending_sync_write BEFORE INSERT OR UPDATE ON mart.analytics_fact_heads FOR EACH STATEMENT EXECUTE FUNCTION mart.guard_pending_sync_write();
CREATE TRIGGER pending_sync_write BEFORE INSERT OR UPDATE ON mart.analytics_trusted_serving FOR EACH STATEMENT EXECUTE FUNCTION mart.guard_pending_sync_write();
CREATE TRIGGER pending_sync_write BEFORE INSERT OR UPDATE ON mart.analytics_source_cursors FOR EACH STATEMENT EXECUTE FUNCTION mart.guard_pending_sync_write();

CREATE FUNCTION mart.guard_sync_reconciliation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE captured jsonb; ids text[];
BEGIN
 SELECT specification INTO STRICT captured FROM mart.analytics_sync_candidates WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id;
 SELECT coalesce(array_agg(value),'{}') INTO ids FROM jsonb_array_elements_text(NEW.evidence->'caseIds');
 IF cardinality(ids)<>jsonb_array_length(captured->'controls') OR cardinality(ids)<>(SELECT count(*) FROM mart.analytics_exact_cases WHERE tenant_id=NEW.tenant_id AND case_id=ANY(ids))
 OR EXISTS(WITH expected AS (
  SELECT control.partition,control.measure,control.value,control.count FROM jsonb_to_recordset(captured->'controls') control(partition jsonb,measure text,value numeric,count bigint)
 ), actual AS (
  SELECT partition,measure_id,expected_value,expected_count FROM mart.analytics_exact_cases WHERE tenant_id=NEW.tenant_id AND case_id=ANY(ids)
 ) SELECT 1 FROM ((SELECT * FROM expected EXCEPT ALL SELECT * FROM actual) UNION ALL (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)) difference)
 OR EXISTS(SELECT 1 FROM mart.analytics_exact_cases WHERE tenant_id=NEW.tenant_id AND case_id=ANY(ids) AND
  (source_cutoff<>(captured->'source'->>'cutoff')::timestamptz OR source_revision<>captured->'source'->>'revision'
   OR definition_version<>captured->'source'->>'definitionVersion' OR mapping_version<>captured->'source'->>'mappingVersion')) THEN
  RAISE EXCEPTION 'Sync reconciliation must cover every frozen source control';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_reconciliation_guard BEFORE INSERT ON mart.analytics_sync_reconciliations FOR EACH ROW EXECUTE FUNCTION mart.guard_sync_reconciliation();

CREATE FUNCTION mart.guard_sync_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE captured jsonb; observed mart.analytics_operation_runs; selected_release text; reconciled jsonb; baseline mart.analytics_baselines;
BEGIN
 SELECT specification INTO STRICT captured FROM mart.analytics_sync_candidates WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id;
 SELECT * INTO STRICT observed FROM mart.analytics_operation_runs WHERE tenant_id=NEW.tenant_id AND run_id=NEW.candidate_id;
 SELECT evidence INTO STRICT reconciled FROM mart.analytics_sync_reconciliations WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id;
 SELECT * INTO STRICT baseline FROM mart.analytics_baselines WHERE tenant_id=NEW.tenant_id;
 selected_release:=CASE WHEN jsonb_array_length(captured->'partitions')>0 THEN NEW.candidate_id ELSE captured->>'parent' END;
 IF observed.status NOT IN('passed','unchanged') OR observed.mismatch_count<>0 OR observed.serving_release IS DISTINCT FROM selected_release
 OR observed.source_cutoff IS DISTINCT FROM (captured->'source'->>'cutoff')::timestamptz
 OR observed.source_revision IS DISTINCT FROM captured->'source'->>'revision'
 OR observed.definition_version IS DISTINCT FROM captured->'source'->>'definitionVersion'
 OR observed.mapping_version IS DISTINCT FROM captured->'source'->>'mappingVersion'
 OR observed.kind<>'sync' OR observed.records_changed IS DISTINCT FROM (captured->>'recordsChanged')::bigint
 OR observed.partitions_affected IS DISTINCT FROM jsonb_array_length(captured->'partitions')
 OR to_jsonb(observed.case_ids) IS DISTINCT FROM reconciled->'caseIds'
 OR NOT EXISTS(SELECT 1 FROM mart.analytics_source_cursors WHERE tenant_id=NEW.tenant_id AND run_id=NEW.candidate_id AND cutoff=observed.source_cutoff AND object_cursors=captured->'cursor'->'objects')
 OR NOT EXISTS(SELECT 1 FROM mart.analytics_trusted_serving WHERE tenant_id=NEW.tenant_id AND revision_id=selected_release)
 OR EXISTS(SELECT 1 FROM mart.analytics_sync_heads staged LEFT JOIN mart.analytics_fact_heads accepted USING(tenant_id,fact_key)
 WHERE staged.tenant_id=NEW.tenant_id AND staged.candidate_id=NEW.candidate_id AND staged.revision_id IS DISTINCT FROM accepted.revision_id) THEN
  RAISE EXCEPTION 'Sync acceptance requires atomic heads, publication, successful audit and cursor';
 END IF;
 IF (captured->>'receivablePages')::integer>0 AND NOT EXISTS(SELECT 1 FROM mart.analytics_receivable_dependency_checkpoints
 WHERE tenant_id=NEW.tenant_id AND source_id=baseline.source_id AND definition_version=baseline.definition_version AND mapping_version=baseline.mapping_version AND run_id=NEW.candidate_id AND cutoff=observed.source_cutoff) THEN
  RAISE EXCEPTION 'Receivable dependency acceptance is incomplete';
 END IF;
 IF (captured->>'lookupPages')::integer>0 AND NOT EXISTS(SELECT 1 FROM mart.analytics_lookup_dependency_checkpoints
 WHERE tenant_id=NEW.tenant_id AND source_id=baseline.source_id AND definition_version=baseline.definition_version AND mapping_version=baseline.mapping_version AND run_id=NEW.candidate_id AND cutoff=observed.source_cutoff AND projection_version=captured->>'lookupProjection') THEN
  RAISE EXCEPTION 'Lookup dependency acceptance is incomplete';
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER sync_acceptance_guard AFTER INSERT ON mart.analytics_sync_acceptances DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION mart.guard_sync_acceptance();
CREATE FUNCTION mart.guard_sync_pending_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM mart.analytics_sync_acceptances WHERE tenant_id=OLD.tenant_id AND candidate_id=OLD.candidate_id)
 AND NOT EXISTS(SELECT 1 FROM mart.analytics_operation_runs run JOIN mart.analytics_sync_reconciliations proof ON proof.tenant_id=run.tenant_id AND proof.candidate_id=run.run_id
  WHERE run.tenant_id=OLD.tenant_id AND run.run_id=OLD.candidate_id AND run.status='failed' AND run.mismatch_count>0 AND to_jsonb(run.case_ids)=proof.evidence->'caseIds') THEN
  RAISE EXCEPTION 'Pending candidate requires acceptance or exact rejection';
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER sync_pending_delete BEFORE DELETE ON mart.analytics_sync_pending FOR EACH ROW EXECUTE FUNCTION mart.guard_sync_pending_delete();
CREATE TRIGGER sync_pending_immutable BEFORE UPDATE ON mart.analytics_sync_pending FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
CREATE FUNCTION mart.pending_sync_candidate(selected_tenant text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,mart AS $$
 SELECT candidate_id FROM mart.analytics_sync_pending WHERE tenant_id=selected_tenant AND selected_tenant=nullif(current_setting('mart.tenant_id',true),'')
$$;
REVOKE ALL ON FUNCTION mart.pending_sync_candidate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.pending_sync_candidate(text) TO dabboos_runtime,dabboos_ingestor;
REVOKE ALL ON FUNCTION mart.assert_sync_candidate_current(text,text),mart.seal_sync_candidate(),mart.freeze_sync_capture(),mart.guard_operational_revision_run(),mart.guard_pending_sync_write(),mart.guard_sync_reconciliation(),mart.guard_sync_acceptance(),mart.guard_sync_pending_delete() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.assert_sync_candidate_current(text,text) TO dabboos_ingestor;

-- Unchanged exact proof against the selected private working population.
CREATE OR REPLACE FUNCTION mart.guard_aggregate_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE baseline mart.analytics_baselines; partition_month date;
BEGIN
 SELECT * INTO baseline FROM mart.analytics_baselines WHERE tenant_id=NEW.tenant_id;
 SELECT month INTO partition_month FROM mart.analytics_partitions WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id;
 IF NEW.definition_version IS DISTINCT FROM baseline.definition_version
 OR NEW.mapping_version IS DISTINCT FROM baseline.mapping_version
 OR NEW.business_timezone IS DISTINCT FROM (baseline.specification->0->'measures'->0->>'timeZone') THEN
  RAISE EXCEPTION 'Aggregate semantic lineage mismatch';
 END IF;
 IF EXISTS(
  WITH canonical AS (
   SELECT payload->>'measureId' measure_id,(payload->>'businessDate')::date business_date,payload->'dimensions' dimensions,
    sum((payload->>'value')::numeric) value,count(*) fact_count
   FROM mart.analytics_working_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
   WHERE head.tenant_id=NEW.tenant_id AND head.business_month=to_char(partition_month,'YYYY-MM') AND head.status='active' AND payload->>'kind'='event'
   GROUP BY 1,2,3
  ), daily AS (
   SELECT measure_id,business_date,dimensions,value,fact_count FROM mart.analytics_aggregate_bases
   WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id AND kind='event'
  ) SELECT * FROM ((SELECT * FROM canonical EXCEPT SELECT * FROM daily) UNION ALL (SELECT * FROM daily EXCEPT SELECT * FROM canonical)) delta
 ) THEN RAISE EXCEPTION 'Daily aggregate differs from canonical events'; END IF;
 IF EXISTS(
  WITH daily AS (
   SELECT measure_id,dimensions,sum(value) value,sum(fact_count)::bigint fact_count,max(business_date) data_through
   FROM mart.analytics_aggregate_bases WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id AND kind='event' GROUP BY 1,2
  ), monthly AS (
   SELECT measure_id,dimensions,value,fact_count,data_through FROM mart.analytics_monthly_bases WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id
  ) SELECT * FROM ((SELECT * FROM daily EXCEPT SELECT * FROM monthly) UNION ALL (SELECT * FROM monthly EXCEPT SELECT * FROM daily)) delta
 ) THEN RAISE EXCEPTION 'Monthly aggregate differs from daily events'; END IF;
 IF NEW.daily_rows<>(SELECT count(*) FROM mart.analytics_aggregate_bases WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id AND kind='event')
 OR NEW.monthly_rows<>(SELECT count(*) FROM mart.analytics_monthly_bases WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id) THEN
  RAISE EXCEPTION 'Aggregate proof row count mismatch';
 END IF;
 RETURN NEW;
END $$;
