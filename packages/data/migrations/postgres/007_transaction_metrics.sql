-- Separately named order/invoice inputs inside a governed comparison release; demo meanings unchanged.
INSERT INTO mart.measure_definitions VALUES
 ('order_revenue','event',true),('net_invoiced_revenue','event',true),('invoiced_revenue','event',true),
 ('refund_value','event',true),('invoice_count','event',false),('refund_count','event',false),('cancelled_orders','event',false);
ALTER TABLE mart.fact_revisions ADD COLUMN business_line text,ADD COLUMN city text,ADD COLUMN state text,ADD COLUMN transaction_evidence jsonb CHECK (transaction_evidence IS NULL OR jsonb_typeof(transaction_evidence)='object');
-- Recreate view to include new canonical columns while preserving completed-run selection and invoker RLS.
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

CREATE INDEX fact_source_identity ON mart.fact_revisions(tenant_id,dataset_id,source_object,source_record_id);

-- Runtime's invoker-view dependencies must also refuse incomplete page history directly.
CREATE POLICY runtime_batch_complete ON mart.ingestion_batches AS RESTRICTIVE TO dabboos_runtime
 USING (status='committed' AND ((extraction_id IS NULL AND pagination_complete) OR EXISTS (
  SELECT 1 FROM mart.extraction_runs run WHERE run.tenant_id=ingestion_batches.tenant_id
   AND run.extraction_id=ingestion_batches.extraction_id AND run.status='complete')));
CREATE POLICY runtime_revision_complete ON mart.fact_revisions AS RESTRICTIVE TO dabboos_runtime
 USING (EXISTS (SELECT 1 FROM mart.batch_facts links JOIN mart.ingestion_batches b USING (tenant_id,dataset_id,batch_id)
  WHERE links.tenant_id=fact_revisions.tenant_id AND links.dataset_id=fact_revisions.dataset_id
   AND links.fact_key=fact_revisions.fact_key AND links.source_revision=fact_revisions.source_revision));
CREATE POLICY runtime_head_complete ON mart.fact_heads AS RESTRICTIVE TO dabboos_runtime
 USING (EXISTS (SELECT 1 FROM mart.fact_revisions revision WHERE revision.tenant_id=fact_heads.tenant_id
  AND revision.dataset_id=fact_heads.dataset_id AND revision.fact_key=fact_heads.fact_key
  AND revision.source_revision=fact_heads.source_revision));
