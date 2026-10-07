-- Invalidate once per changed tenant/dataset per SQL statement, not per fact row.
-- Transition tables also cover both old and new scopes on an allowed update.
CREATE OR REPLACE FUNCTION mart.invalidate_proof_results() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE changed_scopes text; result_table text;
BEGIN
 changed_scopes := CASE TG_OP
  WHEN 'INSERT' THEN 'SELECT tenant_id,dataset_id FROM proof_changed_new'
  WHEN 'DELETE' THEN 'SELECT tenant_id,dataset_id FROM proof_changed_old'
  ELSE 'SELECT tenant_id,dataset_id FROM proof_changed_new UNION SELECT tenant_id,dataset_id FROM proof_changed_old' END;
 FOREACH result_table IN ARRAY ARRAY['technical_proof_results','derived_proof_results'] LOOP
  EXECUTE format('DELETE FROM mart.%I WHERE (tenant_id,dataset_id) IN (%s)',result_table,changed_scopes);
 END LOOP;
 RETURN NULL;
END $$;
-- Privileged maintenance truncation must also discard every verified result.
-- Runtime and ingestor have neither TRUNCATE nor direct function privileges.
CREATE FUNCTION mart.truncate_proof_results() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 TRUNCATE mart.technical_proof_results,mart.derived_proof_results;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION mart.truncate_proof_results() FROM PUBLIC;
DO $$
DECLARE relation_name text;
BEGIN
 FOREACH relation_name IN ARRAY ARRAY['mapping_releases','reconciliation_evidence','reconciliation_batches','ingestion_batches','extraction_runs','fact_revisions','batch_facts','release_certifications','derived_metric_certifications'] LOOP
  EXECUTE format('DROP TRIGGER invalidate_proof_results ON mart.%I',relation_name);
  EXECUTE format('CREATE TRIGGER invalidate_insert_proofs AFTER INSERT ON mart.%I REFERENCING NEW TABLE AS proof_changed_new FOR EACH STATEMENT EXECUTE FUNCTION mart.invalidate_proof_results()',relation_name);
  EXECUTE format('CREATE TRIGGER invalidate_update_proofs AFTER UPDATE ON mart.%I REFERENCING NEW TABLE AS proof_changed_new OLD TABLE AS proof_changed_old FOR EACH STATEMENT EXECUTE FUNCTION mart.invalidate_proof_results()',relation_name);
  EXECUTE format('CREATE TRIGGER invalidate_delete_proofs AFTER DELETE ON mart.%I REFERENCING OLD TABLE AS proof_changed_old FOR EACH STATEMENT EXECUTE FUNCTION mart.invalidate_proof_results()',relation_name);
  EXECUTE format('CREATE TRIGGER invalidate_truncated_proofs AFTER TRUNCATE ON mart.%I FOR EACH STATEMENT EXECUTE FUNCTION mart.truncate_proof_results()',relation_name);
 END LOOP;
END $$;
