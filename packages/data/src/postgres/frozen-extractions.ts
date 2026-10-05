import type { PoolClient } from 'pg';
import type { ReconciliationCase } from '@el-dabboos/domain';

interface FrozenBatch {
  batch_id: string;
  status: string;
  pagination_complete: boolean;
  source_objects: string[];
  company_ids: string[];
  completeness: string;
  frozen_revision: string;
  watermark_start: string | null;
  watermark_end: string | null;
  extraction_id: string | null;
  source_as_of: Date;
  started_at: Date;
}
async function completeRun(client: PoolClient,control: ReconciliationCase,batches: FrozenBatch[],extractionId: string): Promise<FrozenBatch> {
  const run = (await client.query('SELECT * FROM mart.extraction_runs WHERE tenant_id=$1 AND dataset_id=$2 AND extraction_id=$3',[control.tenantId,control.datasetId,extractionId])).rows[0];
  if (!run || run.status!=='complete') throw new Error('Completed logical extraction required');
  const pages = (await client.query('SELECT batch_id FROM mart.ingestion_batches WHERE tenant_id=$1 AND extraction_id=$2 ORDER BY page_number',[control.tenantId,extractionId])).rows.map(row => row.batch_id as string);
  const included = batches.filter(batch => batch.extraction_id===extractionId);
  if (pages.length!==run.page_count || included.length!==pages.length || pages.some(id => !control.batchIds.includes(id))) throw new Error('Frozen extraction omits pages');
  if (control.from<run.specification.from || control.to>run.specification.to) throw new Error('Reconciliation outside extraction period');
  const terminal = included.find(batch => batch.pagination_complete);
  if (!terminal) throw new Error('Terminal extraction page required');
  return { ...terminal,watermark_start: run.specification.watermarkStart ?? null,completeness: run.specification.completeness };
}
export async function validateFrozenExtractions(client: PoolClient,control: ReconciliationCase,sourceObject: string): Promise<void> {
  const batches = (await client.query('SELECT * FROM mart.ingestion_batches WHERE tenant_id=$1 AND dataset_id=$2 AND batch_id=ANY($3::text[]) ORDER BY source_as_of,started_at,batch_id',[control.tenantId,control.datasetId,control.batchIds])).rows as FrozenBatch[];
  if (batches.length!==control.batchIds.length || batches.some(batch => batch.status!=='committed' || !batch.source_objects.includes(sourceObject))) throw new Error('Invalid frozen committed batch set');
  const complete: FrozenBatch[] = batches.filter(batch => batch.extraction_id===null);
  if (complete.some(batch => !batch.pagination_complete)) throw new Error('Completed extraction required');
  for (const extractionId of new Set(batches.flatMap(batch => batch.extraction_id ? [batch.extraction_id] : []))) {
    complete.push(await completeRun(client,control,batches,extractionId));
  }
  complete.sort((left,right) => left.source_as_of.getTime()-right.source_as_of.getTime() || left.started_at.getTime()-right.started_at.getTime() || left.batch_id.localeCompare(right.batch_id));
  const baseline = complete[0];
  if (!baseline || baseline.completeness!=='complete_scope' || complete.at(-1)?.frozen_revision!==control.frozenRevision || complete.some(batch => JSON.stringify(batch.company_ids)!==JSON.stringify(baseline.company_ids) || JSON.stringify(batch.source_objects)!==JSON.stringify(baseline.source_objects))) throw new Error('Frozen baseline/scope required');
  for (let index=1;index<complete.length;index++) {
    if (!complete[index-1]!.watermark_end || complete[index]!.watermark_start!==complete[index-1]!.watermark_end) throw new Error('Frozen batch set omits watermark continuity');
  }
}
