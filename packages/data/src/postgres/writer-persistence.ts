import type { PoolClient } from 'pg';
import type { IngestionBatch } from '@el-dabboos/domain';
import type { ExtractionEvidence, MappedRecord } from './writer.ts';
export interface WriteCounters {
  rowsRead: number; rowsAccepted: number; rowsRejected: number;
  factsInserted: number; factsUpdated: number; factsTombstoned: number; factsReplayed: number;
}
export async function insertMartRow(client: PoolClient,table: string,values: Record<string,unknown>): Promise<void> {
  const columns = Object.keys(values); // Caller-owned static identifiers only.
  await client.query(`INSERT INTO mart.${table} (${columns.join(',')}) VALUES (${columns.map((_,index) => `$${index+1}`).join(',')})`,Object.values(values));
}
export async function replayBatch(client: PoolClient,batch: IngestionBatch,fingerprint: string): Promise<IngestionBatch | undefined> {
  const row = (await client.query('SELECT * FROM mart.ingestion_batches WHERE tenant_id=$1 AND batch_id=$2',[batch.tenantId,batch.batchId])).rows[0];
  if (!row) return;
  if (row.request_fingerprint!==fingerprint) throw new Error('Batch replay conflict');
  if (row.status!=='committed') throw new Error('Incomplete prior batch');
  const counters = Object.fromEntries(['rowsRead','rowsAccepted','rowsRejected','factsInserted','factsUpdated','factsTombstoned','factsReplayed'].map(key => [key,Number(row[key.replace(/[A-Z]/g,character => `_${character.toLowerCase()}`)])])) as unknown as WriteCounters;
  return { ...batch,...counters,status: 'committed',startedAt: row.started_at.toISOString(),completedAt: row.completed_at.toISOString(),...(row.watermark_end ? { watermarkEnd: row.watermark_end } : {}) };
}
export async function beginBatch(client: PoolClient,batch: IngestionBatch,evidence: ExtractionEvidence,fingerprint: string): Promise<void> {
  await insertMartRow(client,'ingestion_batches',{
    tenant_id: batch.tenantId,batch_id: batch.batchId,dataset_id: batch.datasetId,source_id: batch.sourceId,mapping_id: batch.mappingId,mapping_version: batch.mappingVersion,
    company_ids: batch.companyIds,adapter_version: batch.adapterVersion,started_at: batch.startedAt,source_as_of: batch.sourceAsOf,frozen_revision: batch.frozenRevision,watermark_start: batch.watermarkStart ?? null,
    status: 'running',request_fingerprint: fingerprint,source_objects: evidence.sourceObjects,request_limit: evidence.requestLimit,completeness: evidence.completeness,deletion_evidence: evidence.deletionEvidence,pagination_complete: evidence.paginationComplete,cursor_start: evidence.cursorStart ?? null,
    extraction_id: evidence.page?.extractionId ?? null,page_number: evidence.page?.pageNumber ?? null,cursor_end: evidence.page?.cursorEnd ?? null,
  });
}
export async function finishBatch(client: PoolClient,batch: IngestionBatch,counters: WriteCounters): Promise<void> {
  await client.query(`UPDATE mart.ingestion_batches SET status='committed',completed_at=$3,watermark_end=$4,rows_read=$5,rows_accepted=$6,rows_rejected=$7,facts_inserted=$8,facts_updated=$9,facts_tombstoned=$10,facts_replayed=$11 WHERE tenant_id=$1 AND batch_id=$2`,[batch.tenantId,batch.batchId,batch.completedAt,batch.watermarkEnd ?? null,...Object.values(counters)]);
}
export async function writeRejects(client: PoolClient,records: readonly MappedRecord[]): Promise<void> {
  for (const unit of records) if ('reject' in unit) {
    const reject = unit.reject;
    await insertMartRow(client,'data_quality_rejects',{ tenant_id: reject.tenantId,batch_id: reject.batchId,source_id: reject.sourceId,safe_record_reference: reject.safeRecordReference,reason: reject.reason,field: reject.field,occurred_at: reject.occurredAt });
  }
}
