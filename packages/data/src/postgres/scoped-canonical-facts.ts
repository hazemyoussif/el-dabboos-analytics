/** Parameters: $1 tenant, $2 dataset IDs. Choose the latest completed revision
 * inside that scope before applying status, date, measure or dimension filters.
 * This is the canonical view's projection with scope pushed before deduplication.
 */
export const scopedCanonicalFactCtes=`scoped_eligible AS MATERIALIZED (
 SELECT DISTINCT ON (links.dataset_id,links.fact_key) links.dataset_id,links.fact_key,links.source_revision
 FROM mart.batch_facts links JOIN mart.ingestion_batches batch USING(tenant_id,dataset_id,batch_id)
 LEFT JOIN mart.extraction_runs run ON run.tenant_id=batch.tenant_id AND run.extraction_id=batch.extraction_id
 WHERE links.tenant_id=$1 AND links.dataset_id=ANY($2::text[]) AND batch.status='committed'
 AND ((batch.extraction_id IS NULL AND batch.pagination_complete) OR run.status='complete')
 ORDER BY links.dataset_id,links.fact_key,links.source_revision DESC
), scoped_canonical AS MATERIALIZED (
 SELECT fact.* FROM scoped_eligible JOIN mart.fact_revisions fact USING(dataset_id,fact_key,source_revision)
 WHERE fact.tenant_id=$1 AND fact.status='active'
)`;
