-- Authorized local serving-policy optimization; reviewed isolated visibility equivalence.
-- Equivalent exact-set comparison without quadratic text-array containment.
CREATE OR REPLACE FUNCTION mart.business_certified(tenant text,dataset text,reference text,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,mart AS $$
 SELECT tenant=nullif(current_setting('mart.tenant_id',true),'') AND cases IS NOT NULL AND EXISTS (
  SELECT 1 FROM mart.release_certifications certificate WHERE certificate.tenant_id=tenant AND certificate.dataset_id=dataset
  AND certificate.reference=reference
  AND NOT EXISTS(SELECT 1 FROM unnest(cases) case_id WHERE case_id IS NULL)
  AND NOT EXISTS(SELECT 1 FROM unnest(certificate.case_ids) case_id WHERE case_id IS NULL)
  AND NOT EXISTS(SELECT unnest(certificate.case_ids) EXCEPT SELECT unnest(cases))
  AND NOT EXISTS(SELECT unnest(cases) EXCEPT SELECT unnest(certificate.case_ids)));
$$;
-- Same tenant, binding, technical and business proof as the current correlated policies.
CREATE OR REPLACE FUNCTION mart.certified_serving_scope(requested_tenant text)
 RETURNS TABLE(tenant_id text,dataset_id text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT mapping.tenant_id,mapping.dataset_id
 FROM mart.mapping_releases mapping JOIN mart.serving_bindings binding USING(tenant_id,dataset_id)
 WHERE requested_tenant=nullif(current_setting('mart.tenant_id',true),'')
 AND mapping.tenant_id=requested_tenant AND mapping.approval_status='approved'
 AND mart.reconciliation_certified(mapping.tenant_id,mapping.dataset_id,mapping.mapping_version,mapping.approval_case_ids)
 AND mart.business_certified(mapping.tenant_id,mapping.dataset_id,mapping.approval_reference,mapping.approval_case_ids)
$$;
REVOKE ALL ON FUNCTION mart.certified_serving_scope(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.certified_serving_scope(text) TO dabboos_runtime;
DO $$
DECLARE relation_name text;
BEGIN
 FOREACH relation_name IN ARRAY ARRAY['mapping_releases','fact_revisions','fact_heads','ingestion_batches','batch_facts','extraction_runs'] LOOP
  EXECUTE format('ALTER POLICY runtime_release ON mart.%I USING (%s (tenant_id,dataset_id) IN (SELECT tenant_id,dataset_id FROM mart.certified_serving_scope(nullif(current_setting(''mart.tenant_id'',true),''''))))',relation_name,
   CASE relation_name WHEN 'mapping_releases' THEN 'approval_status=''approved'' AND' WHEN 'extraction_runs' THEN 'status=''complete'' AND' ELSE '' END);
 END LOOP;
END $$;
-- Existing TO roles, tenant-scope policies, FORCE RLS and completion/revision policies retained.
