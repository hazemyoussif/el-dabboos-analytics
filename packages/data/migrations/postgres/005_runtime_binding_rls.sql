-- Raw dependencies required by security-invoker views also honor the active serving binding.
-- Restrictive policies intersect (never OR-widen) the mandatory tenant policy.
CREATE POLICY runtime_release ON mart.mapping_releases AS RESTRICTIVE TO dabboos_runtime
USING (approval_status='approved' AND EXISTS (
  SELECT 1 FROM mart.serving_bindings b WHERE b.tenant_id=mapping_releases.tenant_id AND b.dataset_id=mapping_releases.dataset_id));
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fact_revisions','fact_heads','ingestion_batches'] LOOP
    EXECUTE format('CREATE POLICY runtime_release ON mart.%I AS RESTRICTIVE TO dabboos_runtime USING (EXISTS (SELECT 1 FROM mart.serving_bindings b JOIN mart.mapping_releases m USING (tenant_id,dataset_id) WHERE b.tenant_id=%I.tenant_id AND b.dataset_id=%I.dataset_id AND m.approval_status=''approved''))', t,t,t);
  END LOOP;
END $$;
