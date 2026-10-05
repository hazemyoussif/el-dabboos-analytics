import type { Pool, PoolClient } from 'pg';
import type { ExtractionRun, IngestionBatch, ReconciliationCase, SourceMapping } from '@el-dabboos/domain';
import { PostgresExtractionRuns } from '../postgres/extractions.ts';
import { PostgresMartWriter } from '../postgres/writer.ts';
import { recordReconciliation } from '../postgres/reconciliation.ts';
import { tenantTransaction } from '../postgres/session.ts';
import type { ReconciliationResult } from '../postgres/reconciliation.ts';
import { mapOdooRecord } from './mapper.ts';
import { OdooPostgresSourceBatchReader } from './reader.ts';
import type { OdooReadScope } from './reader.ts';
import type { OdooSourceConfig } from './config.ts';
import type { OdooSnapshotLease } from './snapshot.ts';
import { readOdooControls } from './controls.ts';

export interface RetainedOdooPilotOptions {
  sourcePool: Pool; martPool: Pool; sourceConfig: OdooSourceConfig;
  mapping: SourceMapping; run: ExtractionRun; snapshot: OdooSnapshotLease;
}
type PilotObject = 'sale_order'|'account_move';
function pilotPosition(cursor: string|undefined): { object: PilotObject; cursor?: string } {
  if (!cursor) return { object: 'sale_order' };
  const position: unknown = JSON.parse(cursor);
  if (!Array.isArray(position) || position.length!==2 || !['sale_order','account_move'].includes(position[0]) || position[1]!==null && typeof position[1]!=='string') throw new Error('Invalid pilot checkpoint');
  return { object: position[0],...(position[1] ? { cursor: position[1] } : {}) };
}
function pilotScope(options: RetainedOdooPilotOptions,object: PilotObject): OdooReadScope {
  const { run,snapshot,mapping } = options;
  return { object,from: run.from,to: run.to,timeZone: mapping.measures[0]!.timeZone,...snapshot.evidence };
}
function validatePilot(options: RetainedOdooPilotOptions): void {
  const { run,mapping,snapshot,sourceConfig } = options;
  snapshot.assertScope(run,sourceConfig);
  if (JSON.stringify(run.sourceObjects)!==JSON.stringify(['sale_order','account_move']) || run.completeness!=='complete_scope' || run.tenantId!==mapping.tenantId || run.sourceId!==mapping.sourceId) throw new Error('Invalid retained pilot scope');
}
/** One logical run owns both objects. Only its final invoice page can publish completion. */
export async function ingestRetainedOdooPilot(options: RetainedOdooPilotOptions) {
  validatePilot(options);
  const { run,mapping,snapshot,sourceConfig } = options;
  await tenantTransaction(options.martPool,run.tenantId,async client => {
    const candidate = (await client.query("SELECT 1 FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2 AND approval_status='pending' AND specification=$3::jsonb",[run.tenantId,run.datasetId,JSON.stringify(mapping)])).rowCount;
    if (!candidate) throw new Error('Exact immutable candidate mapping required');
  },true);
  const runs = new PostgresExtractionRuns(options.martPool,{ [run.tenantId]: sourceConfig.companyIds });
  let checkpoint = await runs.begin(run);
  if (checkpoint.status!=='running') throw new Error('Retained pilot already completed');
  const writer = new PostgresMartWriter(options.martPool,{ [run.tenantId]: sourceConfig.companyIds });
  let reconciliation: ReconciliationResult[] = [];
  while (checkpoint.status==='running') {
    const position = pilotPosition(checkpoint.cursor);
    const reader = new OdooPostgresSourceBatchReader(options.sourcePool,sourceConfig,pilotScope(options,position.object),snapshot);
    const page = await reader.readBatch({ tenantId: run.tenantId,sourceId: run.sourceId,companyIds: run.companyIds,limit: sourceConfig.batchSize,frozenRevision: run.frozenRevision,...(position.cursor ? { cursor: position.cursor } : {}) });
    const terminal = position.object==='account_move' && !page.nextCursor;
    const cursorEnd = !page.nextCursor && position.object==='sale_order' ? JSON.stringify(['account_move',null]) : JSON.stringify([position.object,page.nextCursor ?? page.watermarkEnd ?? position.cursor ?? null]);
    const batchId = `${run.extractionId}-page-${checkpoint.pageCount+1}`;
    const batch: IngestionBatch = { tenantId: run.tenantId,sourceId: run.sourceId,companyIds: run.companyIds,batchId,datasetId: run.datasetId,mappingId: run.mappingId,mappingVersion: run.mappingVersion,adapterVersion: 'odoo18-pg-snapshot-v2',startedAt: new Date().toISOString(),sourceAsOf: run.sourceAsOf,frozenRevision: run.frozenRevision,status: 'running',rowsRead: page.rows.length,rowsAccepted: 0,rowsRejected: 0,factsInserted: 0,factsUpdated: 0,factsTombstoned: 0,factsReplayed: 0 };
    const controls = terminal ? await pilotControls(options) : [];
    await snapshot.assertAlive();
    await writer.commit(batch,page.rows.map(record => ({ facts: mapOdooRecord(record,mapping,batch,{ from: run.from,to: run.to }) })),{ sourceObjects: [...run.sourceObjects],requestLimit: sourceConfig.batchSize,completeness: run.completeness,deletionEvidence: 'unavailable',paginationComplete: terminal,...(checkpoint.cursor ? { cursorStart: checkpoint.cursor } : {}),...(terminal ? { watermarkEnd: cursorEnd } : {}),page: { extractionId: run.extractionId,pageNumber: checkpoint.pageCount+1,cursorEnd } },terminal ? async client => { reconciliation = await certifyPilot(client,options,controls); } : undefined);
    checkpoint = (await runs.resume(run.tenantId,run.extractionId)).checkpoint;
  }
  return { checkpoint,reconciliation,snapshot: snapshot.evidence };
}
async function pilotControls(options: RetainedOdooPilotOptions): Promise<Omit<ReconciliationCase,'batchIds'>[][]> {
  const controls = [];
  for (const object of ['sale_order','account_move'] as const) {
    controls.push(...await readOdooControls(options.sourcePool,{ mapping: options.mapping,source: pilotScope(options,object),companyIds: options.run.companyIds,tolerance: { status: 'approved',absoluteValue: '0.000000',absoluteCount: '0',approvalReference: 'Pilot handoff: exact DB control equality' },reportReference: `DB snapshot pilot ${options.run.extractionId}` },options.snapshot));
  }
  return controls;
}
async function certifyPilot(client: PoolClient,options: RetainedOdooPilotOptions,controls: Omit<ReconciliationCase,'batchIds'>[][]): Promise<ReconciliationResult[]> {
  await options.snapshot.assertAlive();
  const batchIds = (await client.query('SELECT batch_id FROM mart.ingestion_batches WHERE tenant_id=$1 AND extraction_id=$2 ORDER BY page_number',[options.run.tenantId,options.run.extractionId])).rows.map(row => String(row.batch_id));
  const result = [];
  for (const group of controls) result.push(await recordReconciliation(client,group.map(control => ({ ...control,batchIds })),options.mapping.reportingCurrency));
  await options.snapshot.assertAlive();
  return result;
}
