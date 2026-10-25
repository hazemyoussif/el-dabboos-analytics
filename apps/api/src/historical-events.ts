import { openOdooReadLease } from '@el-dabboos/data';
import type { ExtractionRun, SourceMapping } from '@el-dabboos/domain';
import { createMartPool, createOdooSourcePool, ingestRetainedOdooPilot, odooComparisonCandidate, OdooSnapshotLease, PostgresMappingReleases, tenantTransaction, readHistoricalSourceQuality } from '@el-dabboos/data';
import { resolveOdooSourceConfig } from './source-connections.ts';
import { reconciliationLedger, validateHistoricalMonth, historicalRatioLedger, verifyGroupedSums } from './historical-months.ts';
import { validateOdooPilotManifest } from './odoo-pilot.ts';
import type { OdooPilotManifest } from './odoo-pilot.ts';

export interface HistoricalMonth { month: string; from: string; to: string }
/** No certification or serving mutation. A completed month has its own immutable release. */
export async function extractHistoricalEvents(manifest: OdooPilotManifest, period: HistoricalMonth, environment: NodeJS.ProcessEnv) {
  validateHistoricalMonth(period); validateOdooPilotManifest(manifest);
  if (!manifest.mapping.datasetId.startsWith(`el-dabboos-history-${period.month.replace('-','')}-events-`)) throw new Error('New historical event release required');
  if (!environment.MART_MIGRATOR_URL || !environment.MART_INGESTOR_URL) throw new Error('Historical mart configuration required');
  const mapping = odooComparisonCandidate(manifest.mapping);
  const migrator = createMartPool(environment.MART_MIGRATOR_URL,1);
  try {
    const prior = await tenantTransaction(migrator,mapping.tenantId,async client => (await client.query('SELECT specification,approval_status FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2',[mapping.tenantId,mapping.datasetId])).rows[0],true);
    if (prior && (prior.approval_status !== 'pending')) throw new Error('Historical candidate conflict');
    if (prior) {
      const sorted = (value: unknown): string => JSON.stringify(value, (_key,item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item);
      if (sorted(prior.specification) !== sorted(mapping)) throw new Error('Immutable historical mapping conflict');
    } else await new PostgresMappingReleases(migrator).registerCandidate(mapping);
  }
  finally { await migrator.end(); }
  return extractMonth(mapping, manifest.extractionId, period, environment);
}
async function extractMonth(mapping: SourceMapping, extractionId: string, period: HistoricalMonth, environment: NodeJS.ProcessEnv) {
  const config = await resolveOdooSourceConfig(environment, mapping);
  if (config.companyIds.join(',') !== '1') throw new Error('Historical company scope');
  const owner = createOdooSourcePool(config), source = createOdooSourcePool(config);
  const mart = createMartPool(environment.MART_INGESTOR_URL!,1);
  let snapshot: OdooSnapshotLease | undefined;
  const began = performance.now();
  try {
    snapshot = await openOdooReadLease(owner,config);
    const run: ExtractionRun = { tenantId: mapping.tenantId,sourceId: mapping.sourceId,companyIds: ['1'],datasetId: mapping.datasetId,mappingId: mapping.mappingId,mappingVersion: mapping.mappingVersion,extractionId,sourceObjects: ['sale_order','account_move'],from: period.from,to: period.to,sourceAsOf: snapshot.evidence.sourceAsOf,frozenRevision: snapshot.evidence.frozenRevision,freezeReference: snapshot.evidence.freezeReference,completeness: 'complete_scope' };
    const sourceQuality = await readHistoricalSourceQuality(source,period,snapshot);
    const result = await ingestRetainedOdooPilot({ sourcePool: source,martPool: mart,sourceConfig: config,mapping,run,snapshot,groupings: [null,'business_line','salesperson','customer'],progress:progress=>console.log(JSON.stringify({month:period.month,kind:'events',stage:'extraction-page',...progress})) });
    const cases = result.reconciliation.flatMap(group => group.cases);
    verifyGroupedSums(cases);
    const derived = historicalRatioLedger(cases,['average_confirmed_order_value','average_invoice_value']);
    return { derived,durations:result.durations,month: period.month,datasetId: mapping.datasetId,mappingVersion: mapping.mappingVersion,semanticVersion: 'existing-september-event-definitions',snapshot: result.snapshot,sourceQuality,sourceRowCount: result.checkpoint.rowCount,martRowCount: result.checkpoint.rowCount,ledger: reconciliationLedger(cases),unmatchedGroups: result.reconciliation.reduce((count, group) => count + group.missingGroups.length + group.unexpectedGroups.length,0),status: result.reconciliation.every(group => group.status === 'passed') ? 'reconciled' : 'failed',durationMs: Math.round(performance.now()-began),peakRssBytes: process.resourceUsage().maxRSS*1024,certified: false,published: false,cases };
  } finally { await snapshot?.close(); await Promise.all([owner.end(),source.end(),mart.end()]); }
}
