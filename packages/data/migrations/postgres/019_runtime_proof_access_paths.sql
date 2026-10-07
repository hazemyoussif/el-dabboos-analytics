-- Completed-revision RLS probes use a fact identity, rather than a batch identity.
CREATE INDEX batch_facts_revision_lookup ON mart.batch_facts
 (tenant_id,dataset_id,fact_key,source_revision) INCLUDE (batch_id);

-- Retain the live technical proof, but check shared batch completion once per batch.
-- The old correlated expression repeated identical batch/run joins for every case.
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
 AND cardinality(cases)=(SELECT count(DISTINCT case_id) FROM selected)
 AND NOT EXISTS (
  SELECT 1 FROM selected
  LEFT JOIN mart.reconciliation_evidence evidence ON evidence.tenant_id=tenant AND evidence.dataset_id=dataset AND evidence.case_id=selected.case_id
  WHERE evidence.case_id IS NULL OR evidence.status<>'passed' OR NOT evidence.group_completeness
    OR evidence.specification->>'mappingVersion'<>version
 )
 AND NOT EXISTS (SELECT 1 FROM selected LEFT JOIN linked USING (case_id) WHERE linked.case_id IS NULL)
 AND NOT EXISTS (
  SELECT 1 FROM batches JOIN mart.ingestion_batches b USING (tenant_id,dataset_id,batch_id)
  LEFT JOIN mart.extraction_runs run ON run.tenant_id=b.tenant_id AND run.extraction_id=b.extraction_id
  WHERE b.status<>'committed' OR (b.extraction_id IS NULL AND NOT b.pagination_complete)
   OR (b.extraction_id IS NOT NULL AND run.status<>'complete')
 );
$$;
