import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { factTransition, productionFactIdentity, validateFactBatch, validateSourceMapping } from '@el-dabboos/domain';
import type { DataQualityReject, IngestionBatch, ProductionFact, SourceMapping } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';
import { factColumns, productionFactFromRow } from './records.ts';

export interface ExtractionEvidence {
  sourceObjects: string[]; requestLimit: number; completeness: 'incremental'|'complete_scope';
  deletionEvidence: 'explicit'|'complete_scope_diff'|'unavailable'; paginationComplete: boolean; cursorStart?: string; watermarkEnd?: string;
}
export type MappedRecord = { facts: ProductionFact[] } | { reject: DataQualityReject };
const canonical = (value: unknown): string => JSON.stringify(value, (_k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k,v[k]])) : v);
async function insert(client: PoolClient, table: string, values: Record<string, unknown>) {
  const columns = Object.keys(values); // Only caller-owned static columns/tables, never user SQL.
  await client.query(`INSERT INTO mart.${table} (${columns.join(',')}) VALUES (${columns.map((_, i) => `$${i+1}`).join(',')})`, Object.values(values));
}
export class PostgresMartWriter {
  constructor(private readonly pool: Pool, private readonly authorizedCompanies: Readonly<Record<string, readonly string[]>>, private readonly clock = () => new Date()) {}
  async commit(batch: IngestionBatch, records: readonly MappedRecord[], evidence: ExtractionEvidence): Promise<IngestionBatch> {
    if (evidence.deletionEvidence === 'complete_scope_diff') throw new Error('Absence deletion requires a future approved enumeration/diff adapter; provide explicit tombstones');
    if (batch.status !== 'running' || records.length > 1000 || batch.rowsRead !== records.length || !evidence.paginationComplete || !Number.isInteger(evidence.requestLimit) || evidence.requestLimit < 1 || evidence.requestLimit > 1000 || records.length > evidence.requestLimit || !evidence.sourceObjects.length || evidence.sourceObjects.length > 64 || evidence.sourceObjects.some(s => !s.trim() || s.length > 200) || !['incremental','complete_scope'].includes(evidence.completeness) || !['explicit','complete_scope_diff','unavailable'].includes(evidence.deletionEvidence)) throw new Error('Invalid complete bounded extraction');
    if (!batch.companyIds.every(id => this.authorizedCompanies[batch.tenantId]?.includes(id))) throw new Error('Unauthorized company scope');
    const fingerprint = createHash('sha256').update(canonical({ batch, records, evidence })).digest('hex');
    return tenantTransaction(this.pool, batch.tenantId, async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([batch.tenantId,batch.datasetId])]);
      const mapping = (await client.query('SELECT specification FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2 AND approval_status=\'approved\'', [batch.tenantId,batch.datasetId])).rows[0]?.specification as SourceMapping | undefined;
      if (!mapping) throw new Error('Unapproved mapping release'); validateSourceMapping(mapping);
      if (mapping.approval.status !== 'approved') throw new Error('Unapproved mapping specification');
      const facts = records.flatMap(r => 'facts' in r ? r.facts : []);
      if (facts.length > 10000 || records.some(r => 'facts' in r && (!r.facts.length || r.facts.length > 64))) throw new Error('Invalid bounded mapping unit');
      validateFactBatch(batch, facts, mapping);
      const priorBatch = (await client.query('SELECT request_fingerprint FROM mart.ingestion_batches WHERE tenant_id=$1 AND batch_id=$2', [batch.tenantId,batch.batchId])).rows[0];
      if (priorBatch) {
        if (priorBatch.request_fingerprint !== fingerprint) throw new Error('Batch replay conflict');
        const row = (await client.query('SELECT * FROM mart.ingestion_batches WHERE tenant_id=$1 AND batch_id=$2 AND status=\'committed\'', [batch.tenantId,batch.batchId])).rows[0];
        if (!row) throw new Error('Incomplete prior batch');
        return { ...batch, status: 'committed', completedAt: row.completed_at.toISOString(), ...(row.watermark_end ? { watermarkEnd: row.watermark_end } : {}), ...Object.fromEntries(['rowsRead','rowsAccepted','rowsRejected','factsInserted','factsUpdated','factsTombstoned','factsReplayed'].map(k => [k,Number(row[k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)])])) };
      }
      // All-or-reject per source record. One accepted unit contains its full current component set plus explicit removals.
      const recordKeys = new Set<string>(); const identities = new Set<string>();
      for (const unit of records) {
        if ('reject' in unit) {
          const r = unit.reject;
          if (Object.keys(r).sort().join(',') !== ['tenantId','batchId','sourceId','safeRecordReference','reason','field','occurredAt'].sort().join(',') || r.tenantId !== batch.tenantId || r.batchId !== batch.batchId || r.sourceId !== batch.sourceId || !/^[a-zA-Z0-9_-]{1,200}$/.test(r.safeRecordReference) || !['invalid_shape','invalid_measure','invalid_date','invalid_numeric','currency','capability','identity_conflict','stale_revision'].includes(r.reason) || !['record','measure','date','value','currency','dimension','identity'].includes(r.field) || !/^\d{4}-\d{2}-\d{2}T/.test(r.occurredAt) || !Number.isFinite(Date.parse(r.occurredAt)) || new Date(r.occurredAt).toISOString() !== r.occurredAt) throw new Error('Invalid safe reject');
          continue;
        }
        const first = unit.facts[0]!; const recordKey = JSON.stringify([first.sourceObject,first.sourceRecordId]);
        if (recordKeys.has(recordKey) || unit.facts.some(f => f.sourceObject !== first.sourceObject || f.sourceRecordId !== first.sourceRecordId || f.sourceRevision !== first.sourceRevision || f.sourceVersion !== first.sourceVersion || !evidence.sourceObjects.includes(f.sourceObject))) throw new Error('Invalid source mapping unit');
        recordKeys.add(recordKey);
        for (const f of unit.facts) { const key = productionFactIdentity(f); if (identities.has(key)) throw new Error('Duplicate batch identity'); identities.add(key); }
        const old = await client.query(`SELECT r.*, r.business_date::text AS business_date, r.rate_date::text AS rate_date FROM mart.fact_heads h JOIN mart.fact_revisions r USING (tenant_id,dataset_id,fact_key,source_revision)
          WHERE r.tenant_id=$1 AND r.dataset_id=$2 AND r.source_object=$3 AND r.source_record_id=$4 AND r.status='active'`, [batch.tenantId,batch.datasetId,first.sourceObject,first.sourceRecordId]);
        if (old.rows.some(r => !unit.facts.some(f => productionFactIdentity(f) === r.fact_key))) throw new Error('Removed component/date requires explicit tombstone');
      }
      await insert(client, 'ingestion_batches', {
        tenant_id: batch.tenantId, batch_id: batch.batchId, dataset_id: batch.datasetId, source_id: batch.sourceId, mapping_id: batch.mappingId, mapping_version: batch.mappingVersion,
        company_ids: batch.companyIds, adapter_version: batch.adapterVersion, started_at: batch.startedAt, source_as_of: batch.sourceAsOf, frozen_revision: batch.frozenRevision, watermark_start: batch.watermarkStart ?? null,
        status: 'running', request_fingerprint: fingerprint, source_objects: evidence.sourceObjects, request_limit: evidence.requestLimit, completeness: evidence.completeness, deletion_evidence: evidence.deletionEvidence, pagination_complete: evidence.paginationComplete, cursor_start: evidence.cursorStart ?? null,
      });
      const counters = { rowsRead: records.length, rowsAccepted: records.filter(r => 'facts' in r).length, rowsRejected: records.filter(r => 'reject' in r).length, factsInserted: 0, factsUpdated: 0, factsTombstoned: 0, factsReplayed: 0 };
      for (const f of [...facts].sort((a,b) => productionFactIdentity(a).localeCompare(productionFactIdentity(b)))) {
        const key = productionFactIdentity(f);
        const old = (await client.query(`SELECT r.*, r.business_date::text AS business_date, r.rate_date::text AS rate_date FROM mart.fact_heads h JOIN mart.fact_revisions r USING (tenant_id,dataset_id,fact_key,source_revision) WHERE h.tenant_id=$1 AND h.dataset_id=$2 AND h.fact_key=$3 FOR UPDATE OF h`, [f.tenantId,f.datasetId,key])).rows[0];
        const transition = factTransition(old ? productionFactFromRow(old, mapping) : undefined, f, mapping);
        if (transition === 'replay') counters.factsReplayed++;
        else {
          await insert(client,'fact_revisions',factColumns(f));
          await client.query('INSERT INTO mart.fact_heads(tenant_id,dataset_id,fact_key,source_revision) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id,dataset_id,fact_key) DO UPDATE SET source_revision=EXCLUDED.source_revision', [f.tenantId,f.datasetId,key,f.sourceRevision]);
          if (f.status === 'tombstone') counters.factsTombstoned++; else if (transition === 'insert') counters.factsInserted++; else counters.factsUpdated++;
          if (f.kind === 'snapshot') {
            await client.query('INSERT INTO mart.snapshot_owners(tenant_id,dataset_id,measure_id,entity_id,effective_date,fact_key) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [f.tenantId,f.datasetId,f.measureId,f.entityId,f.businessDate,key]);
            const owner = (await client.query('SELECT fact_key FROM mart.snapshot_owners WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=$3 AND entity_id=$4 AND effective_date=$5', [f.tenantId,f.datasetId,f.measureId,f.entityId,f.businessDate])).rows[0];
            if (owner?.fact_key !== key) throw new Error('Ambiguous snapshot ownership');
          }
        }
        await insert(client,'batch_facts',{ tenant_id: f.tenantId, dataset_id: f.datasetId, batch_id: batch.batchId, fact_key: key, source_revision: f.sourceRevision });
      }
      for (const unit of records) if ('reject' in unit) {
        const r = unit.reject;
        await insert(client,'data_quality_rejects',{ tenant_id: r.tenantId,batch_id: r.batchId,source_id: r.sourceId,safe_record_reference: r.safeRecordReference,reason: r.reason,field: r.field,occurred_at: r.occurredAt });
      }
      const completed: IngestionBatch = { ...batch, ...counters, status: 'committed', completedAt: this.clock().toISOString(), ...(evidence.watermarkEnd ? { watermarkEnd: evidence.watermarkEnd } : {}) };
      validateFactBatch(completed, facts, mapping);
      await client.query(`UPDATE mart.ingestion_batches SET status='committed',completed_at=$3,watermark_end=$4,rows_read=$5,rows_accepted=$6,rows_rejected=$7,facts_inserted=$8,facts_updated=$9,facts_tombstoned=$10,facts_replayed=$11 WHERE tenant_id=$1 AND batch_id=$2`, [batch.tenantId,batch.batchId,completed.completedAt,completed.watermarkEnd ?? null,...Object.values(counters)]);
      return completed;
    });
  }
}
