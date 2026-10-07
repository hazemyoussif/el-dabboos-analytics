-- Snapshot display evidence without invented transaction amounts; identity/policy dimensions remain unchanged.
ALTER TABLE mart.fact_revisions ADD COLUMN display_labels jsonb CHECK (display_labels IS NULL OR jsonb_typeof(display_labels)='object');
CREATE OR REPLACE VIEW mart.canonical_facts AS
 SELECT r.* FROM mart.fact_revisions r JOIN (
  SELECT DISTINCT ON (links.tenant_id,links.dataset_id,links.fact_key)
    links.tenant_id,links.dataset_id,links.fact_key,links.source_revision
  FROM mart.batch_facts links JOIN mart.ingestion_batches b USING (tenant_id,dataset_id,batch_id)
  LEFT JOIN mart.extraction_runs run ON run.tenant_id=b.tenant_id AND run.extraction_id=b.extraction_id
  WHERE b.status='committed' AND ((b.extraction_id IS NULL AND b.pagination_complete) OR run.status='complete')
  ORDER BY links.tenant_id,links.dataset_id,links.fact_key,links.source_revision DESC
 ) eligible USING (tenant_id,dataset_id,fact_key,source_revision) WHERE r.status='active';
ALTER VIEW mart.canonical_facts SET (security_invoker=true,security_barrier=true);
