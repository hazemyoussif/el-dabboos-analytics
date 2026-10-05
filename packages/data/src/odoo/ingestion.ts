import type { Pool } from 'pg';
import type { ExtractionRun, IngestionBatch, SourceMapping } from '@el-dabboos/domain';
import { PostgresExtractionRuns } from '../postgres/extractions.ts';
import { PostgresMartWriter } from '../postgres/writer.ts';
import type { OdooSourceConfig } from './config.ts';
import { OdooPostgresSourceBatchReader } from './reader.ts';
import type { OdooReadScope } from './reader.ts';
import { mapOdooRecord } from './mapper.ts';
import { verifyOdooSourceIdentity } from './identity.ts';
export interface OdooIngestionOptions {
  sourcePool: Pool; martPool: Pool; sourceConfig: OdooSourceConfig;
  mapping: SourceMapping; run: ExtractionRun; scope: OdooReadScope;
  clock?: () => Date;
}
/** One Odoo extraction, with existing writer ownership and durable resume; no approvals or bindings. */
export async function ingestOdooExtraction(options: OdooIngestionOptions) {
  const { run,mapping,sourceConfig,scope } = options;
  if (run.freezeReference!==scope.freezeReference || run.sourceAsOf!==scope.sourceAsOf || run.frozenRevision!==scope.frozenRevision || run.from!==scope.from || run.to!==scope.to || run.sourceObjects.length!==1 || run.sourceObjects[0]!==scope.object) throw new Error('Odoo extraction freeze/scope conflict');
  if (run.tenantId!==sourceConfig.tenantId || run.sourceId!==sourceConfig.sourceId) throw new Error('Odoo extraction configuration scope');
  await verifyOdooSourceIdentity(options.sourcePool);
  const runs = new PostgresExtractionRuns(options.martPool,{ [run.tenantId]: sourceConfig.companyIds });
  let checkpoint = await runs.begin(run);
  const reader = new OdooPostgresSourceBatchReader(options.sourcePool,sourceConfig,{ ...scope,mode: run.completeness==='incremental' ? 'incremental' : 'backfill' });
  const clock = options.clock ?? (() => new Date());
  const writer = new PostgresMartWriter(options.martPool,{ [run.tenantId]: sourceConfig.companyIds },clock);
  while (checkpoint.status==='running') {
    const page = await reader.readBatch({ tenantId: run.tenantId,sourceId: run.sourceId,companyIds: run.companyIds,limit: sourceConfig.batchSize,frozenRevision: run.frozenRevision,...(checkpoint.cursor ? { cursor: checkpoint.cursor } : {}) });
    const batchId = `${run.extractionId}-page-${checkpoint.pageCount+1}`;
    const batch: IngestionBatch = { tenantId: run.tenantId,sourceId: run.sourceId,companyIds: run.companyIds,batchId,datasetId: run.datasetId,mappingId: run.mappingId,mappingVersion: run.mappingVersion,adapterVersion: 'odoo18-pg-v1',startedAt: clock().toISOString(),sourceAsOf: run.sourceAsOf,frozenRevision: run.frozenRevision,status: 'running',rowsRead: page.rows.length,rowsAccepted: 0,rowsRejected: 0,factsInserted: 0,factsUpdated: 0,factsTombstoned: 0,factsReplayed: 0 };
    const pageEvidence = extractionPageEvidence(run,checkpoint,page,sourceConfig.batchSize);
    await writer.commit(batch,page.rows.map(record => ({ facts: mapOdooRecord(record,mapping,batch,{ from: run.from,to: run.to }) })),pageEvidence);
    checkpoint = (await runs.resume(run.tenantId,run.extractionId)).checkpoint;
  }
  return checkpoint;
}
function extractionPageEvidence(run: ExtractionRun,checkpoint: import('@el-dabboos/domain').ExtractionCheckpoint,page: import('@el-dabboos/domain').SourceBatch<import('./rows.ts').OdooSourceRow>,limit: number): import('../postgres/writer.ts').ExtractionEvidence {
  const cursor = page.nextCursor ?? page.watermarkEnd ?? checkpoint.cursor;
    return { sourceObjects: [...run.sourceObjects],requestLimit: limit,completeness: run.completeness,deletionEvidence: 'unavailable',paginationComplete: !page.nextCursor,
      ...(checkpoint.cursor ? { cursorStart: checkpoint.cursor } : {}),...(!page.nextCursor ? { watermarkEnd: cursor ?? `empty:${run.frozenRevision}` } : {}),page: { extractionId: run.extractionId,pageNumber: checkpoint.pageCount+1,...(cursor ? { cursorEnd: cursor } : {}) } };
}
