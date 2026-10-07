-- Preserve invalidation while avoiding overhead after results are already absent.
CREATE OR REPLACE FUNCTION mart.invalidate_proof_results() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE changed_scopes text; result_table text;
BEGIN
 -- Most ingestion statements follow the first invalidation. Avoid planning
 -- transition-table deletes again when this tenant has no reusable result.
 IF NOT EXISTS(SELECT 1 FROM mart.technical_proof_results) AND NOT EXISTS(SELECT 1 FROM mart.derived_proof_results) THEN RETURN NULL; END IF;
 changed_scopes := CASE TG_OP
  WHEN 'INSERT' THEN 'SELECT tenant_id,dataset_id FROM proof_changed_new'
  WHEN 'DELETE' THEN 'SELECT tenant_id,dataset_id FROM proof_changed_old'
  ELSE 'SELECT tenant_id,dataset_id FROM proof_changed_new UNION SELECT tenant_id,dataset_id FROM proof_changed_old' END;
 FOREACH result_table IN ARRAY ARRAY['technical_proof_results','derived_proof_results'] LOOP
  EXECUTE format('DELETE FROM mart.%I WHERE (tenant_id,dataset_id) IN (%s)',result_table,changed_scopes);
 END LOOP;
 RETURN NULL;
END $$;
