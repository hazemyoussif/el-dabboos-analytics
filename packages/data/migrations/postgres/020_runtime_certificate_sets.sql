-- Preserve exact membership and all failure predicates without per-case index probes
-- or a collation sort for duplicate detection. Nullable version comparisons retain
-- the original SQL three-valued semantics; missing evidence still fails closed.
CREATE OR REPLACE FUNCTION mart.reconciliation_certified(tenant text,dataset text,version text,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,mart AS $$
 WITH selected AS MATERIALIZED (SELECT value AS case_id FROM unnest(cases) value),
 linked AS MATERIALIZED (
  SELECT links.case_id,links.tenant_id,links.dataset_id,links.batch_id
  FROM mart.reconciliation_batches links JOIN selected USING (case_id)
  WHERE links.tenant_id=tenant
 ),
 batches AS MATERIALIZED (SELECT DISTINCT tenant_id,dataset_id,batch_id FROM linked)
 SELECT tenant=nullif(current_setting('mart.tenant_id',true),'') AND cardinality(cases)>0
 AND cardinality(cases)=(SELECT count(*) FROM (SELECT case_id FROM selected WHERE case_id IS NOT NULL GROUP BY case_id) unique_cases)
 AND NOT EXISTS (
  SELECT case_id FROM selected EXCEPT
  SELECT evidence.case_id FROM mart.reconciliation_evidence evidence
  WHERE evidence.tenant_id=tenant AND evidence.dataset_id=dataset
   AND evidence.status='passed' AND evidence.group_completeness
   AND (evidence.specification->>'mappingVersion'<>version) IS NOT TRUE
 )
 AND NOT EXISTS (SELECT case_id FROM selected EXCEPT SELECT case_id FROM linked)
 AND NOT EXISTS (
  SELECT 1 FROM batches JOIN mart.ingestion_batches b USING (tenant_id,dataset_id,batch_id)
  LEFT JOIN mart.extraction_runs run ON run.tenant_id=b.tenant_id AND run.extraction_id=b.extraction_id
  WHERE b.status<>'committed' OR (b.extraction_id IS NULL AND NOT b.pagination_complete)
   OR (b.extraction_id IS NOT NULL AND run.status<>'complete')
 );
$$;
-- Most runtime requests carry the immutable certificate's original case order.
-- Array equality is a sufficient exact-set proof; retain the order-independent
-- fallback and the existing explicit null rejection for other callers.
CREATE OR REPLACE FUNCTION mart.business_certified(tenant text,dataset text,reference text,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,mart AS $$
 SELECT tenant=nullif(current_setting('mart.tenant_id',true),'') AND cases IS NOT NULL AND EXISTS (
  SELECT 1 FROM mart.release_certifications certificate WHERE certificate.tenant_id=tenant AND certificate.dataset_id=dataset
  AND certificate.reference=reference
  AND NOT EXISTS(SELECT 1 FROM unnest(cases) case_id WHERE case_id IS NULL)
  AND NOT EXISTS(SELECT 1 FROM unnest(certificate.case_ids) case_id WHERE case_id IS NULL)
  AND (certificate.case_ids=cases OR (
   NOT EXISTS(SELECT unnest(certificate.case_ids) EXCEPT SELECT unnest(cases))
   AND NOT EXISTS(SELECT unnest(cases) EXCEPT SELECT unnest(certificate.case_ids)))));
$$;
