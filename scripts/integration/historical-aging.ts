import { openOdooReadLease } from '../../packages/data/src/index.ts';
import type { IngestionBatch, ProductionFact, ReconciliationCase, SourceMapping } from '../../packages/domain/src/index.ts';
import { createMartPool, createOdooSourcePool, mapReceivableSnapshots, OdooSnapshotLease, PostgresExtractionRuns, PostgresMappingReleases, PostgresMartWriter, PostgresReconciliation, receivableMeasures, receivableSummaryCandidate, tenantTransaction } from '../../packages/data/src/index.ts';
import { resolveOdooSourceConfig } from '../../apps/api/src/source-connections.ts';
import type { HistoricalMonth } from '../../apps/api/src/historical-events.ts';
import { validateHistoricalMonth, historicalRatioLedger } from '../../apps/api/src/historical-months.ts';
import { odooAgedReportBaseSql } from './odoo-aged-report-query.ts';
import { controlComponentSql, controlQualitySql } from './receivables-control-query.ts';
type Pool = Parameters<typeof tenantTransaction>[0];
type PoolClient = Parameters<Parameters<typeof tenantTransaction>[2]>[0];
const tenantId = 'el-dabboos-iq';
const summaryFields = ['total','current','1_30','31_60','61_90','91_120','older','overdue','gross','credit'];
const sourceSummarySql = odooAgedReportBaseSql + ` SELECT count(*)::text components,
 coalesce(sum(residual),0)::numeric(30,6)::text total,
 coalesce(sum(residual) FILTER(WHERE bucket='current'),0)::numeric(30,6)::text current,
 coalesce(sum(residual) FILTER(WHERE bucket='1_30'),0)::numeric(30,6)::text "1_30",
 coalesce(sum(residual) FILTER(WHERE bucket='31_60'),0)::numeric(30,6)::text "31_60",
 coalesce(sum(residual) FILTER(WHERE bucket='61_90'),0)::numeric(30,6)::text "61_90",
 coalesce(sum(residual) FILTER(WHERE bucket='91_120'),0)::numeric(30,6)::text "91_120",
 coalesce(sum(residual) FILTER(WHERE bucket='older'),0)::numeric(30,6)::text older,
 coalesce(sum(residual) FILTER(WHERE bucket<>'current'),0)::numeric(30,6)::text overdue,
 coalesce(sum(residual) FILTER(WHERE residual>0),0)::numeric(30,6)::text gross,
 coalesce(sum(residual) FILTER(WHERE residual<0),0)::numeric(30,6)::text credit FROM report_components`;
const decimal = (value: bigint) => `${value < 0n ? '-' : ''}${(value < 0n ? -value : value)/1000000n}.${String((value < 0n ? -value : value)%1000000n).padStart(6,'0')}`;

function agingMapping(period: HistoricalMonth, datasetId: string): SourceMapping {
  return receivableSummaryCandidate({
    tenantId,sourceId:'el-dabboos-odoo18-pg',datasetId,mappingId:'historical-signed-aging-summary',mappingVersion:'1',
    businessOwner:'Finance standing metric-design approval 2026-10-07',reportingCurrency:'IQD',timeZone:'Asia/Baghdad',cutoff:period.to,
  });
}
async function readComponents(client: PoolClient, cutoff: string, snapshot: OdooSnapshotLease) {
  const totals = Object.fromEntries(receivableMeasures.map(measure => [measure,0n])) as Record<typeof receivableMeasures[number],bigint>;
  let cursor = '0', rowsRead = 0;
  const sql = controlComponentSql('open').replace('WHERE residual<>0 ORDER BY reconstructed.id', 'WHERE residual<>0 AND reconstructed.id>$4::bigint ORDER BY reconstructed.id');
  while (true) {
    const rows = (await client.query(sql,[1,cutoff,1000,cursor])).rows;
    if (!rows.length) break;
    const mapped = mapReceivableSnapshots(rows.map(row => ({componentId:row.component_id,customerId:row.customer_id ?? 'unassigned',accountingDate:row.accounting_date,maturityDate:row.due_date,residual:row.residual})),cutoff);
    for (const customer of mapped) for (const measure of receivableMeasures) totals[measure] += BigInt(customer.values[measure].replace('.',''));
    rowsRead += rows.length; cursor = rows.at(-1)!.component_id;
    await snapshot.assertAlive();
    if (rows.length < 1000) break;
  }
  return { totals,rowsRead };
}
async function writeSnapshot(mart: Pool, mapping: SourceMapping, period: HistoricalMonth, snapshot: OdooSnapshotLease, totals: Record<typeof receivableMeasures[number],bigint>) {
  const extractionId = `${mapping.datasetId}-snapshot`, batchId = `${extractionId}-page-1`;
  const sourceObject = 'receivable_cutoff';
  const run = {tenantId,sourceId:mapping.sourceId,companyIds:['1'],datasetId:mapping.datasetId,mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,extractionId,sourceObjects:[sourceObject],from:period.from,to:period.to,sourceAsOf:snapshot.evidence.sourceAsOf,frozenRevision:snapshot.evidence.frozenRevision,freezeReference:snapshot.evidence.freezeReference,completeness:'complete_scope' as const};
  await new PostgresExtractionRuns(mart,{[tenantId]:['1']}).begin(run);
  const batch: IngestionBatch = {tenantId,sourceId:mapping.sourceId,companyIds:['1'],datasetId:mapping.datasetId,mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,sourceAsOf:run.sourceAsOf,frozenRevision:run.frozenRevision,batchId,adapterVersion:'historical-signed-aging-summary-v1',startedAt:new Date().toISOString(),status:'running',rowsRead:1,rowsAccepted:0,rowsRejected:0,factsInserted:0,factsUpdated:0,factsTombstoned:0,factsReplayed:0};
  const facts: ProductionFact[] = receivableMeasures.map(measureId => ({tenantId,datasetId:mapping.datasetId,measureId,kind:'snapshot',businessDate:period.to,value:decimal(totals[measureId]),entityId:'company-1',dimensions:{},sourceId:mapping.sourceId,sourceObject,sourceRecordId:'company-1',componentId:'whole',sourceVersion:snapshot.evidence.frozenRevision,sourceRevision:'1',mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,batchId,sourceAsOf:snapshot.evidence.sourceAsOf,frozenRevision:snapshot.evidence.frozenRevision,status:'active',currency:{mode:'native',transactionCurrency:'IQD',transactionValue:decimal(totals[measureId]),reportingCurrency:'IQD',policyReference:mapping.measures.find(rule=>rule.measureId===measureId)!.currencyPolicy}}));
  await snapshot.assertAlive();
  await new PostgresMartWriter(mart,{[tenantId]:['1']}).commit(batch,[{facts}],{sourceObjects:[sourceObject],requestLimit:1,completeness:'complete_scope',deletionEvidence:'unavailable',paginationComplete:true,page:{extractionId,pageNumber:1}},() => snapshot.assertAlive());
  return batchId;
}
export async function extractHistoricalAging(period: HistoricalMonth, datasetId: string, environment: NodeJS.ProcessEnv) {
  validateHistoricalMonth(period);
  if (!datasetId.startsWith(`el-dabboos-history-${period.month.replace('-','')}-aging-`)) throw new Error('New historical snapshot release required');
  if (!environment.MART_MIGRATOR_URL || !environment.MART_INGESTOR_URL) throw new Error('Historical mart configuration required');
  const migrator = createMartPool(environment.MART_MIGRATOR_URL,1), mart = createMartPool(environment.MART_INGESTOR_URL,1);
  const config = await resolveOdooSourceConfig(environment,{tenantId,sourceId:'el-dabboos-odoo18-pg'});
  const owner = createOdooSourcePool(config), source = createOdooSourcePool(config);
  let snapshot: OdooSnapshotLease | undefined, client: PoolClient | undefined;
  const began = performance.now();
  try {
    const mapping = agingMapping(period,datasetId);
    await new PostgresMappingReleases(migrator).registerCandidate(mapping);
    snapshot = await openOdooReadLease(owner,config);
    client = await source.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await snapshot.importInto(client);
    await client.query("SELECT set_config('statement_timeout','120000',true)");
    const quality = (await client.query(controlQualitySql,[1,period.to])).rows[0];
    if (['current_residual_mismatches','ambiguous_components','missing_transaction_currency','invalid_company_currency'].some(field => quality[field] !== '0')) throw new Error('Historical aging source quality discrepancy');
    const expected = (await client.query(sourceSummarySql,[1,period.to])).rows[0];
    const mapped = await readComponents(client,period.to,snapshot);
    if (String(mapped.rowsRead) !== expected.components) throw new Error('Historical aging component completeness');
    for (const [index,measure] of receivableMeasures.entries()) if (decimal(mapped.totals[measure]) !== expected[summaryFields[index]!]) throw new Error(`Historical aging mapper discrepancy: ${measure}`);
    await client.query('ROLLBACK'); client.release(); client = undefined;
    const batchId = await writeSnapshot(mart,mapping,period,snapshot,mapped.totals);
    const cases: ReconciliationCase[] = receivableMeasures.map((measureId,index) => ({tenantId,datasetId,mappingVersion:mapping.mappingVersion,caseId:`${datasetId}-${measureId}`,measureId,sourceReportReference:`Independent signed aged-ledger reconstruction ${period.to}`,frozenRevision:snapshot!.evidence.frozenRevision,batchIds:[batchId],from:period.from,to:period.to,grouping:null,groupKey:null,expectedValue:expected[summaryFields[index]!],actualValue:'0.000000',expectedCount:'1',actualCount:'0',tolerance:{status:'approved',absoluteValue:'0.000000',absoluteCount:'0',approvalReference:'Existing exact Finance definitions; technical equality only'}}));
    const results = [];
    for (const control of cases) results.push(await new PostgresReconciliation(mart).record([control],'IQD'));
    const result = {status:results.every(group=>group.status==='passed')?'passed':'failed',cases:results.flatMap(group=>group.cases)};
    return {derived:historicalRatioLedger(result.cases,['overdue_receivable_percentage']),month:period.month,datasetId,snapshot:snapshot.evidence,sourceRowCount:mapped.rowsRead,martRowCount:1,martFactCount:receivableMeasures.length,quality,status:result.status,exactCases:result.cases.filter(control=>control.expectedValue===control.actualValue).length,deltaCases:result.cases.filter(control=>control.expectedValue!==control.actualValue).length,cases:result.cases,durationMs:Math.round(performance.now()-began),phase:'A: monthly summary; customer aging deferred',certified:false,published:false};
  } finally { if(client){await client.query('ROLLBACK').catch(()=>{});client.release();} await snapshot?.close();await Promise.all([migrator.end(),mart.end(),owner.end(),source.end()]); }
}
