\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='120s';
SET LOCAL lock_timeout='5s';
SET LOCAL TimeZone='UTC';
SELECT set_config('mart.tenant_id', :'tenant_id',true);
SELECT pg_advisory_xact_lock(hashtextextended('analytics:'||current_setting('mart.tenant_id'),0));
CREATE TEMP TABLE retention_scope ON COMMIT DROP AS SELECT current_setting('mart.tenant_id') tenant_id, :'from_date'::date from_date, :'through_date'::date through_date;
DO $$ BEGIN
 IF current_database()<>'el_dabboos_analytics_staging' OR NOT (SELECT rolsuper FROM pg_roles WHERE rolname=current_user)
 OR NOT EXISTS(SELECT 1 FROM retention_scope WHERE tenant_id='el-dabboos-iq' AND from_date='2024-01-01' AND through_date='2025-01-01')
 OR EXISTS(SELECT 1 FROM mart.analytics_sync_pending WHERE tenant_id=current_setting('mart.tenant_id')) THEN
  RAISE EXCEPTION 'Approved staging tenant/year and no pending sync required';
 END IF;
END $$;
CREATE TEMP TABLE retired_partitions ON COMMIT DROP AS SELECT p.tenant_id,p.partition_id FROM mart.analytics_partitions p,retention_scope s WHERE p.tenant_id=s.tenant_id AND p.month>=s.from_date AND p.month<s.through_date;
ALTER TABLE retired_partitions ADD PRIMARY KEY(tenant_id,partition_id);
CREATE TEMP TABLE retired_prepared ON COMMIT DROP AS SELECT d.tenant_id,d.data_id FROM mart.prepared_datasets d,retention_scope s WHERE d.tenant_id=s.tenant_id AND (d.configuration->>'from')::date>=s.from_date AND (d.configuration->>'through')::date<s.through_date;
ALTER TABLE retired_prepared ADD PRIMARY KEY(tenant_id,data_id);
CREATE TEMP TABLE retired_snapshots ON COMMIT DROP AS SELECT e.tenant_id,e.snapshot_id FROM mart.finance_snapshot_evidence e,retention_scope s WHERE e.tenant_id=s.tenant_id AND e.snapshot_date>=s.from_date AND e.snapshot_date<s.through_date;
CREATE TEMP TABLE retired_captures ON COMMIT DROP AS SELECT c.tenant_id,c.candidate_id FROM mart.command_capture_candidates c,retention_scope s WHERE c.tenant_id=s.tenant_id AND c.month>=s.from_date AND c.month<s.through_date;
CREATE TEMP TABLE retired_sync ON COMMIT DROP AS SELECT DISTINCT h.tenant_id,h.candidate_id FROM mart.analytics_sync_heads h,retention_scope s WHERE h.tenant_id=s.tenant_id AND h.business_month>=to_char(s.from_date,'YYYY-MM') AND h.business_month<to_char(s.through_date,'YYYY-MM');
CREATE TEMP TABLE retired_legacy_facts ON COMMIT DROP AS SELECT f.tenant_id,f.dataset_id,f.fact_key,f.source_revision FROM mart.fact_revisions f,retention_scope s WHERE f.tenant_id=s.tenant_id AND f.business_date>=s.from_date AND f.business_date<s.through_date;
ALTER TABLE retired_legacy_facts ADD PRIMARY KEY(tenant_id,dataset_id,fact_key,source_revision);
CREATE TEMP TABLE retired_legacy_cases ON COMMIT DROP AS SELECT e.tenant_id,e.case_id,e.dataset_id FROM mart.reconciliation_evidence e,retention_scope s WHERE e.tenant_id=s.tenant_id AND (e.specification->>'from')::date>=s.from_date AND (e.specification->>'to')::date<s.through_date;
CREATE TEMP TABLE kept_members ON COMMIT DROP AS SELECT m.* FROM mart.analytics_serving_members m,retention_scope s WHERE m.tenant_id=s.tenant_id AND m.month>=s.through_date;
CREATE TEMP TABLE kept_bindings ON COMMIT DROP AS SELECT b.* FROM mart.prepared_bindings b,retention_scope s WHERE b.tenant_id=s.tenant_id AND b.period>=s.through_date;
CREATE TEMP TABLE kept_partitions ON COMMIT DROP AS SELECT p.* FROM mart.analytics_partitions p,retention_scope s WHERE p.tenant_id=s.tenant_id AND p.month>=s.through_date;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.business_delta_origins o JOIN retired_partitions b ON (b.tenant_id,b.partition_id)=(o.tenant_id,o.base_partition) LEFT JOIN retired_partitions c ON (c.tenant_id,c.partition_id)=(o.tenant_id,o.partition_id) WHERE c.partition_id IS NULL)
 OR EXISTS(SELECT 1 FROM mart.business_prepared_origins o JOIN retired_prepared b ON (b.tenant_id,b.data_id)=(o.tenant_id,o.base_data_id) LEFT JOIN retired_prepared c ON (c.tenant_id,c.data_id)=(o.tenant_id,o.data_id) WHERE c.data_id IS NULL)
 OR EXISTS(SELECT 1 FROM mart.command_capture_candidates c JOIN retired_partitions b ON (b.tenant_id,b.partition_id)=(c.tenant_id,c.base_partition) LEFT JOIN retired_captures r ON r.tenant_id=c.tenant_id AND r.candidate_id=c.candidate_id WHERE r.candidate_id IS NULL)
 OR EXISTS(SELECT 1 FROM mart.prepared_bindings b JOIN retired_prepared d USING(tenant_id,data_id),retention_scope s WHERE b.period>=s.through_date)
 OR EXISTS(SELECT 1 FROM mart.review_facts f JOIN retired_partitions p USING(tenant_id,partition_id),retention_scope s WHERE f.business_day::date>=s.through_date)
 THEN RAISE EXCEPTION 'Retained data depends on a proposed 2024 target'; END IF;
END $$;
-- Privileged, owner-authorized retention only. Foreign keys and all proof/security
-- guards remain enabled. Only refuse_history_mutation is suspended on the current
-- delete target, under its transaction-held exclusive lock, then restored.
CREATE FUNCTION pg_temp.retention_delete(target text, predicate text) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE guard record; changed bigint; BEGIN
 FOR guard IN SELECT tgname FROM pg_trigger WHERE tgrelid=format('mart.%I',target)::regclass AND NOT tgisinternal AND tgfoid='mart.refuse_history_mutation'::regproc LOOP
  IF (SELECT tgenabled FROM pg_trigger WHERE tgrelid=format('mart.%I',target)::regclass AND tgname=guard.tgname)<>'O' THEN RAISE EXCEPTION 'Unexpected disabled history guard'; END IF;
  EXECUTE format('ALTER TABLE mart.%I DISABLE TRIGGER %I',target,guard.tgname);
 END LOOP;
 EXECUTE format('DELETE FROM mart.%I WHERE tenant_id=current_setting(''mart.tenant_id'') AND (%s)',target,predicate);
 GET DIAGNOSTICS changed=ROW_COUNT;
 FOR guard IN SELECT tgname FROM pg_trigger WHERE tgrelid=format('mart.%I',target)::regclass AND NOT tgisinternal AND tgfoid='mart.refuse_history_mutation'::regproc LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE TRIGGER %I',target,guard.tgname);
 END LOOP;
 RAISE NOTICE 'Retention removed % rows from mart.%',changed,target;
 RETURN changed;
END $$;
CREATE TEMP TABLE retention_deletions(table_name text PRIMARY KEY,removed bigint) ON COMMIT DROP;
INSERT INTO retention_deletions SELECT 'business_prepared_keys',pg_temp.retention_delete('business_prepared_keys','(tenant_id,data_id) IN(SELECT tenant_id,data_id FROM retired_prepared)');
INSERT INTO retention_deletions SELECT 'business_prepared_origins',pg_temp.retention_delete('business_prepared_origins','(tenant_id,data_id) IN(SELECT tenant_id,data_id FROM retired_prepared)');
INSERT INTO retention_deletions SELECT 'prepared_bindings',pg_temp.retention_delete('prepared_bindings','(tenant_id,data_id) IN(SELECT tenant_id,data_id FROM retired_prepared)');
INSERT INTO retention_deletions SELECT 'prepared_cells',pg_temp.retention_delete('prepared_cells','(tenant_id,data_id) IN(SELECT tenant_id,data_id FROM retired_prepared)');
INSERT INTO retention_deletions SELECT 'prepared_datasets',pg_temp.retention_delete('prepared_datasets','(tenant_id,data_id) IN(SELECT tenant_id,data_id FROM retired_prepared)');
INSERT INTO retention_deletions SELECT 'command_initialization_publications',pg_temp.retention_delete('command_initialization_publications','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_captures)');
INSERT INTO retention_deletions SELECT 'command_initialization_pages',pg_temp.retention_delete('command_initialization_pages','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_captures)');
INSERT INTO retention_deletions SELECT 'command_initializations',pg_temp.retention_delete('command_initializations','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_captures)');
INSERT INTO retention_deletions SELECT 'command_initialization_conflicts',pg_temp.retention_delete('command_initialization_conflicts','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_captures)');
INSERT INTO retention_deletions SELECT 'command_capture_seals',pg_temp.retention_delete('command_capture_seals','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_captures)');
INSERT INTO retention_deletions SELECT 'command_capture_abandoned',pg_temp.retention_delete('command_capture_abandoned','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_captures)');
INSERT INTO retention_deletions SELECT 'command_capture_facts',pg_temp.retention_delete('command_capture_facts','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_captures)');
INSERT INTO retention_deletions SELECT 'command_capture_controls',pg_temp.retention_delete('command_capture_controls','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_captures)');
INSERT INTO retention_deletions SELECT 'command_capture_candidates',pg_temp.retention_delete('command_capture_candidates','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_captures)');
INSERT INTO retention_deletions SELECT 'analytics_sync_acceptances',pg_temp.retention_delete('analytics_sync_acceptances','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_sync)');
INSERT INTO retention_deletions SELECT 'analytics_sync_reconciliations',pg_temp.retention_delete('analytics_sync_reconciliations','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_sync)');
INSERT INTO retention_deletions SELECT 'analytics_sync_seals',pg_temp.retention_delete('analytics_sync_seals','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_sync)');
INSERT INTO retention_deletions SELECT 'analytics_sync_dependencies',pg_temp.retention_delete('analytics_sync_dependencies','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_sync)');
INSERT INTO retention_deletions SELECT 'analytics_sync_heads',pg_temp.retention_delete('analytics_sync_heads','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_sync)');
INSERT INTO retention_deletions SELECT 'analytics_sync_candidates',pg_temp.retention_delete('analytics_sync_candidates','(tenant_id,candidate_id) IN(SELECT tenant_id,candidate_id FROM retired_sync)');
INSERT INTO retention_deletions SELECT 'business_delta_checked_roots',pg_temp.retention_delete('business_delta_checked_roots','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'business_delta_source_evidence',pg_temp.retention_delete('business_delta_source_evidence','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'business_delta_storage',pg_temp.retention_delete('business_delta_storage','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'business_delta_replacements',pg_temp.retention_delete('business_delta_replacements','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'business_delta_origins',pg_temp.retention_delete('business_delta_origins','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'business_recipe_checks',pg_temp.retention_delete('business_recipe_checks','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'business_recipe_observations',pg_temp.retention_delete('business_recipe_observations','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'business_allocation_links',pg_temp.retention_delete('business_allocation_links','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'review_facts',pg_temp.retention_delete('review_facts','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'review_controls',pg_temp.retention_delete('review_controls','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'review_extractions',pg_temp.retention_delete('review_extractions','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'analytics_partition_facts',pg_temp.retention_delete('analytics_partition_facts','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'analytics_aggregate_bases',pg_temp.retention_delete('analytics_aggregate_bases','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'analytics_monthly_bases',pg_temp.retention_delete('analytics_monthly_bases','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'analytics_aggregate_proofs',pg_temp.retention_delete('analytics_aggregate_proofs','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'analytics_drill_partitions',pg_temp.retention_delete('analytics_drill_partitions','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'analytics_serving_members',pg_temp.retention_delete('analytics_serving_members','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'analytics_partitions',pg_temp.retention_delete('analytics_partitions','(tenant_id,partition_id) IN(SELECT tenant_id,partition_id FROM retired_partitions)');
INSERT INTO retention_deletions SELECT 'finance_snapshot_publications',pg_temp.retention_delete('finance_snapshot_publications','(tenant_id,snapshot_id) IN(SELECT tenant_id,snapshot_id FROM retired_snapshots)');
INSERT INTO retention_deletions SELECT 'finance_snapshot_customers',pg_temp.retention_delete('finance_snapshot_customers','(tenant_id,snapshot_id) IN(SELECT tenant_id,snapshot_id FROM retired_snapshots)');
INSERT INTO retention_deletions SELECT 'finance_snapshot_evidence',pg_temp.retention_delete('finance_snapshot_evidence','(tenant_id,snapshot_id) IN(SELECT tenant_id,snapshot_id FROM retired_snapshots)');
INSERT INTO retention_deletions SELECT 'analytics_historical_imports',pg_temp.retention_delete('analytics_historical_imports','month>=(SELECT from_date FROM retention_scope) AND month<(SELECT through_date FROM retention_scope)');
INSERT INTO retention_deletions SELECT 'command_delta_checks',pg_temp.retention_delete('command_delta_checks','month>=(SELECT from_date FROM retention_scope) AND month<(SELECT through_date FROM retention_scope)');
INSERT INTO retention_deletions SELECT 'analytics_exact_cases',pg_temp.retention_delete('analytics_exact_cases','left(partition->>''month'',7)>=(SELECT to_char(from_date,''YYYY-MM'') FROM retention_scope) AND left(partition->>''month'',7)<(SELECT to_char(through_date,''YYYY-MM'') FROM retention_scope)');
INSERT INTO retention_deletions SELECT 'analytics_fact_heads',pg_temp.retention_delete('analytics_fact_heads','business_month>=(SELECT to_char(from_date,''YYYY-MM'') FROM retention_scope) AND business_month<(SELECT to_char(through_date,''YYYY-MM'') FROM retention_scope)');
INSERT INTO retention_deletions SELECT 'analytics_fact_revisions',pg_temp.retention_delete('analytics_fact_revisions','business_date>=(SELECT from_date::text FROM retention_scope) AND business_date<(SELECT through_date::text FROM retention_scope)');
INSERT INTO retention_deletions SELECT 'snapshot_owners',pg_temp.retention_delete('snapshot_owners','(tenant_id,dataset_id,fact_key) IN(SELECT h.tenant_id,h.dataset_id,h.fact_key FROM mart.fact_heads h JOIN retired_legacy_facts f USING(tenant_id,dataset_id,fact_key,source_revision))');
INSERT INTO retention_deletions SELECT 'batch_facts',pg_temp.retention_delete('batch_facts','(tenant_id,dataset_id,fact_key,source_revision) IN(SELECT tenant_id,dataset_id,fact_key,source_revision FROM retired_legacy_facts)');
INSERT INTO retention_deletions SELECT 'fact_heads',pg_temp.retention_delete('fact_heads','(tenant_id,dataset_id,fact_key,source_revision) IN(SELECT tenant_id,dataset_id,fact_key,source_revision FROM retired_legacy_facts)');
INSERT INTO retention_deletions SELECT 'fact_revisions',pg_temp.retention_delete('fact_revisions','(tenant_id,dataset_id,fact_key,source_revision) IN(SELECT tenant_id,dataset_id,fact_key,source_revision FROM retired_legacy_facts)');
INSERT INTO retention_deletions SELECT 'reconciliation_batches',pg_temp.retention_delete('reconciliation_batches','(tenant_id,case_id,dataset_id) IN(SELECT tenant_id,case_id,dataset_id FROM retired_legacy_cases)');
INSERT INTO retention_deletions SELECT 'reconciliation_evidence',pg_temp.retention_delete('reconciliation_evidence','(tenant_id,case_id,dataset_id) IN(SELECT tenant_id,case_id,dataset_id FROM retired_legacy_cases)');
INSERT INTO retention_deletions SELECT 'historical_release_members',pg_temp.retention_delete('historical_release_members','period_from>=(SELECT from_date FROM retention_scope) AND period_to<(SELECT through_date FROM retention_scope)');
INSERT INTO retention_deletions SELECT 'historical_serving_bindings',pg_temp.retention_delete('historical_serving_bindings','period_from>=(SELECT from_date FROM retention_scope) AND period_to<(SELECT through_date FROM retention_scope)');
INSERT INTO retention_deletions SELECT 'derived_metric_certifications',pg_temp.retention_delete('derived_metric_certifications','period_from>=(SELECT from_date FROM retention_scope) AND period_to<(SELECT through_date FROM retention_scope)');
INSERT INTO retention_deletions SELECT 'derived_proof_results',pg_temp.retention_delete('derived_proof_results','period_from>=(SELECT from_date FROM retention_scope) AND period_to<(SELECT through_date FROM retention_scope)');
DO $$ BEGIN
 IF EXISTS(SELECT * FROM kept_members EXCEPT SELECT * FROM mart.analytics_serving_members)
 OR EXISTS(SELECT * FROM kept_bindings EXCEPT SELECT * FROM mart.prepared_bindings)
 OR EXISTS(SELECT * FROM kept_partitions EXCEPT SELECT * FROM mart.analytics_partitions)
 OR EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgfoid='mart.refuse_history_mutation'::regproc AND tgenabled<>'O')
 OR EXISTS(SELECT 1 FROM mart.analytics_partitions p,retention_scope s WHERE p.tenant_id=s.tenant_id AND p.month>=s.from_date AND p.month<s.through_date)
 OR EXISTS(SELECT 1 FROM mart.analytics_trusted_serving t CROSS JOIN LATERAL mart.prepared_required_chunks(t.tenant_id,t.revision_id) required WHERE t.tenant_id=current_setting('mart.tenant_id') AND NOT EXISTS(SELECT 1 FROM mart.prepared_bindings b WHERE b.tenant_id=t.tenant_id AND b.revision_id=t.revision_id AND b.family=required.family AND b.kind=required.kind AND b.period=required.period))
 THEN RAISE EXCEPTION 'Retention integrity assertion failed; all deletions roll back'; END IF;
END $$;
SELECT jsonb_build_object('kind','approved-2024-retention','tenant',current_setting('mart.tenant_id'),'from',(SELECT from_date FROM retention_scope),'through_exclusive',(SELECT through_date FROM retention_scope),'kept_2025_members',(SELECT count(*) FROM kept_members),'kept_2025_bindings',(SELECT count(*) FROM kept_bindings),'removed',(SELECT jsonb_object_agg(table_name,removed) FROM retention_deletions)) AS retention_audit;
COMMIT;
