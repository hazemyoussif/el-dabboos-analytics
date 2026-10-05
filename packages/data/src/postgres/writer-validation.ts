import type { PoolClient } from 'pg';
import { productionFactIdentity } from '@el-dabboos/domain';
import type { DataQualityReject, IngestionBatch, ProductionFact } from '@el-dabboos/domain';
import type { ExtractionEvidence, MappedRecord } from './writer.ts';

export function validateWriteBoundary(batch: IngestionBatch,records: readonly MappedRecord[],evidence: ExtractionEvidence): ProductionFact[] {
  if (evidence.deletionEvidence==='complete_scope_diff') throw new Error('Absence deletion requires a future approved enumeration/diff adapter; provide explicit tombstones');
  if (batch.status!=='running' || records.length>1000 || batch.rowsRead!==records.length || records.length>evidence.requestLimit) throw new Error('Invalid complete bounded extraction');
  if (!Number.isInteger(evidence.requestLimit) || evidence.requestLimit<1 || evidence.requestLimit>1000 || (!evidence.paginationComplete && !evidence.page)) throw new Error('Invalid complete bounded extraction');
  validateEvidenceScope(evidence);
  const facts = records.flatMap(record => 'facts' in record ? record.facts : []);
  if (facts.length>10000 || records.some(record => 'facts' in record && (!record.facts.length || record.facts.length>64))) throw new Error('Invalid bounded mapping unit');
  return facts;
}
function validateEvidenceScope(evidence: ExtractionEvidence): void {
  if (!evidence.sourceObjects.length || evidence.sourceObjects.length>64 || evidence.sourceObjects.some(object => !object.trim() || object.length>200) || !['incremental','complete_scope'].includes(evidence.completeness) || !['explicit','unavailable'].includes(evidence.deletionEvidence)) throw new Error('Invalid extraction scope');
  if (evidence.watermarkEnd && !evidence.paginationComplete) throw new Error('Partial extraction cannot publish watermark');
}
function validateReject(reject: DataQualityReject,batch: IngestionBatch): void {
  const keys = ['tenantId','batchId','sourceId','safeRecordReference','reason','field','occurredAt'];
  if (Object.keys(reject).sort().join(',')!==keys.sort().join(',') || reject.tenantId!==batch.tenantId || reject.batchId!==batch.batchId || reject.sourceId!==batch.sourceId) throw new Error('Invalid safe reject');
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(reject.safeRecordReference) || !['invalid_shape','invalid_measure','invalid_date','invalid_numeric','currency','capability','identity_conflict','stale_revision'].includes(reject.reason) || !['record','measure','date','value','currency','dimension','identity'].includes(reject.field)) throw new Error('Invalid safe reject');
  if (!/^\d{4}-\d{2}-\d{2}T/.test(reject.occurredAt) || !Number.isFinite(Date.parse(reject.occurredAt)) || new Date(reject.occurredAt).toISOString()!==reject.occurredAt) throw new Error('Invalid safe reject');
}
export async function validateMappingUnits(client: PoolClient,batch: IngestionBatch,records: readonly MappedRecord[],evidence: ExtractionEvidence): Promise<void> {
  const recordKeys = new Set<string>();
  const identities = new Set<string>();
  for (const unit of records) {
    if ('reject' in unit) { validateReject(unit.reject,batch); continue; }
    const first = unit.facts[0]!;
    const recordKey = JSON.stringify([first.sourceObject,first.sourceRecordId]);
    if (recordKeys.has(recordKey) || unit.facts.some(fact => fact.sourceObject!==first.sourceObject || fact.sourceRecordId!==first.sourceRecordId || fact.sourceRevision!==first.sourceRevision || fact.sourceVersion!==first.sourceVersion || !evidence.sourceObjects.includes(fact.sourceObject))) throw new Error('Invalid source mapping unit');
    recordKeys.add(recordKey);
    for (const fact of unit.facts) {
      const key = productionFactIdentity(fact);
      if (identities.has(key)) throw new Error('Duplicate batch identity');
      identities.add(key);
    }
    const previous = await client.query(`SELECT revision.fact_key FROM mart.fact_heads head JOIN mart.fact_revisions revision USING (tenant_id,dataset_id,fact_key,source_revision)
      WHERE revision.tenant_id=$1 AND revision.dataset_id=$2 AND revision.source_object=$3 AND revision.source_record_id=$4 AND revision.status='active'`,[batch.tenantId,batch.datasetId,first.sourceObject,first.sourceRecordId]);
    if (previous.rows.some(row => !unit.facts.some(fact => productionFactIdentity(fact)===row.fact_key))) throw new Error('Removed component/date requires explicit tombstone');
  }
}
