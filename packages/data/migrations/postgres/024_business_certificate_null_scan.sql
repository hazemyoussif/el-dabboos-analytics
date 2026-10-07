-- Preserve the business exact-set guard, including null rejection and unordered
-- membership. Scan ordinary one-dimensional arrays without materializing unnest;
-- retain the original predicate for multidimensional callers. No proof bypass.
CREATE OR REPLACE FUNCTION mart.business_certified(tenant text,dataset text,reference text,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,mart AS $$
 SELECT tenant=nullif(current_setting('mart.tenant_id',true),'') AND cases IS NOT NULL AND EXISTS (
  SELECT 1 FROM mart.release_certifications certificate WHERE certificate.tenant_id=tenant AND certificate.dataset_id=dataset
  AND certificate.reference=reference
  AND CASE WHEN coalesce(array_ndims(cases),1)=1 THEN array_position(cases,NULL) IS NULL
   ELSE NOT EXISTS(SELECT 1 FROM unnest(cases) case_id WHERE case_id IS NULL) END
  AND CASE WHEN coalesce(array_ndims(certificate.case_ids),1)=1 THEN array_position(certificate.case_ids,NULL) IS NULL
   ELSE NOT EXISTS(SELECT 1 FROM unnest(certificate.case_ids) case_id WHERE case_id IS NULL) END
  AND (certificate.case_ids=cases OR (
   NOT EXISTS(SELECT unnest(certificate.case_ids) EXCEPT SELECT unnest(cases))
   AND NOT EXISTS(SELECT unnest(cases) EXCEPT SELECT unnest(certificate.case_ids)))));
$$;
