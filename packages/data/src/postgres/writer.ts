import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { productionFactIdentity, validateFactBatch, validateSourceMapping } from '@el-dabboos/domain';
import type { DataQualityReject, ExtractionPage, IngestionBatch, ProductionFact, SourceMapping } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';
import { validateExtractionPage, commitExtractionPage } from './extraction-page.ts';
import { validateWriteBoundary, validateMappingUnits } from './writer-validation.ts';
import { replayBatch, beginBatch, finishBatch, writeRejects } from './writer-persistence.ts';
import { writeRevision } from './writer-revisions.ts';

export interface ExtractionEvidence {
  sourceObjects: string[]; requestLimit: number; completeness: 'incremental'|'complete_scope';
  deletionEvidence: 'explicit'|'complete_scope_diff'|'unavailable'; paginationComplete: boolean;
  cursorStart?: string; watermarkEnd?: string; page?: ExtractionPage;
}
export type MappedRecord = { facts: ProductionFact[] } | { reject: DataQualityReject };
const canonical = (value: unknown): string => JSON.stringify(value, (_key,item) => item && typeof item==='object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item);
export class PostgresMartWriter {
  constructor(private readonly pool: Pool,private readonly authorizedCompanies: Readonly<Record<string,readonly string[]>>,private readonly clock = () => new Date()) {}
  async commit(batch: IngestionBatch,records: readonly MappedRecord[],evidence: ExtractionEvidence,certifyTerminal?: (client: PoolClient) => Promise<void>): Promise<IngestionBatch> {
    if (certifyTerminal && (!evidence.page || !evidence.paginationComplete)) throw new Error('Certification requires terminal extraction page');
    const facts = validateWriteBoundary(batch,records,evidence);
    if (!batch.companyIds.every(company => this.authorizedCompanies[batch.tenantId]?.includes(company))) throw new Error('Unauthorized company scope');
    const fingerprint = writeFingerprint(batch,records,evidence);
    return tenantTransaction(this.pool,batch.tenantId,async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([batch.tenantId,batch.datasetId])]);
      const mapping = (await client.query('SELECT specification FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2',[batch.tenantId,batch.datasetId])).rows[0]?.specification as SourceMapping;
      validateSourceMapping(mapping);
      validateFactBatch(batch,facts,mapping);
      const replay = await replayBatch(client,batch,fingerprint);
      if (replay) return replay;
      await validateExtractionPage(client,batch,evidence,facts);
      await validateMappingUnits(client,batch,records,evidence);
      await beginBatch(client,batch,evidence,fingerprint);
      const counters = { rowsRead: records.length,rowsAccepted: records.filter(record => 'facts' in record).length,rowsRejected: records.filter(record => 'reject' in record).length,factsInserted: 0,factsUpdated: 0,factsTombstoned: 0,factsReplayed: 0 };
      for (const fact of [...facts].sort((left,right) => productionFactIdentity(left).localeCompare(productionFactIdentity(right)))) {
        await writeRevision(client,fact,mapping,counters);
      }
      await writeRejects(client,records);
      const completed: IngestionBatch = { ...batch,...counters,status: 'committed',completedAt: this.clock().toISOString(),...(evidence.watermarkEnd ? { watermarkEnd: evidence.watermarkEnd } : {}) };
      validateFactBatch(completed,facts,mapping);
      await finishBatch(client,completed,counters);
      await commitExtractionPage(client,completed,evidence);
      if (certifyTerminal) await certifyTerminal(client);
      return completed;
    });
  }
}
function writeFingerprint(batch: IngestionBatch,records: readonly MappedRecord[],evidence: ExtractionEvidence): string {
  const fingerprintBatch = evidence.page ? { ...batch,startedAt: undefined } : batch;
  // A page retry can begin at a different wall-clock time; immutable payload/scope still must match.
  return createHash('sha256').update(canonical({ batch: fingerprintBatch,records,evidence })).digest('hex');
}
