import type { Pool,PoolClient } from 'pg';
import { requiredMeasures,semanticCatalog } from '@el-dabboos/domain';
import type { AnalyticsCursor,AnalyticsPartition,ProductionFact } from '@el-dabboos/domain';
import { receivableMeasures } from '../receivable-aging.ts';
import { odooRevision } from '../odoo/cursor.ts';
import { odooIncrementalWindow } from '../odoo/incremental-watermark.ts';
import type { OdooSnapshotLease } from '../odoo/snapshot.ts';
import type { OdooSourceConfig } from '../odoo/config.ts';
import type { OperationalBaseline,ExactControl } from './contracts.ts';
import { receivableSummarySql,receivableReportBaseSql } from './receivable-summary-sql.ts';
import { receivablesControlBaseSql,controlQualitySql } from './receivable-control-sql.ts';
import { odooAgedReportBaseSql } from './receivable-report-sql.ts';
const summaryFields=['total','current','1_30','31_60','61_90','91_120','older','overdue','gross','credit'];
const summarySql=odooAgedReportBaseSql.replace(receivablesControlBaseSql,receivableReportBaseSql)+` SELECT
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
const decimal=(value:bigint)=>`${value<0n?'-':''}${(value<0n?-value:value)/1000000n}.${String((value<0n?-value:value)%1000000n).padStart(6,'0')}`;
async function sourceTransaction<T>(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig,operation:(client:PoolClient)=>Promise<T>) {
 const client=await pool.connect();
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true)",[String(config.statementTimeoutMs)]);
  const result=await operation(client);await lease.assertAlive();await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
/** Poll receivable accounting inputs independently of invoice-header business dates. */
export async function receivableChangedFrom(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig,cursor:AnalyticsCursor|null):Promise<string|null> {
 const lower=odooIncrementalWindow(cursor,lease.evidence.sourceAsOf).modificationFrom;
 return sourceTransaction(pool,lease,config,async client=>{
  const result=await client.query(`SELECT min(date)::text date FROM (
   SELECT line.date FROM account_move_line line JOIN account_account account ON account.id=line.account_id
    WHERE line.company_id=ANY($1::int[]) AND account.account_type='asset_receivable' AND line.write_date>=$2::timestamp AND line.write_date<=$3::timestamptz AT TIME ZONE 'UTC'
   UNION ALL SELECT least(debit.date,credit.date) FROM account_partial_reconcile partial JOIN account_move_line debit ON debit.id=partial.debit_move_id JOIN account_move_line credit ON credit.id=partial.credit_move_id
    WHERE partial.company_id=ANY($1::int[]) AND partial.write_date>=$2::timestamp AND partial.write_date<=$3::timestamptz AT TIME ZONE 'UTC'
   UNION ALL SELECT move.date FROM account_move move WHERE move.company_id=ANY($1::int[]) AND move.write_date>=$2::timestamp AND move.write_date<=$3::timestamptz AT TIME ZONE 'UTC'
   UNION ALL SELECT move.date FROM account_payment payment JOIN account_move move ON move.id=payment.move_id WHERE payment.company_id=ANY($1::int[]) AND payment.write_date>=$2::timestamp AND payment.write_date<=$3::timestamptz AT TIME ZONE 'UTC'
   ) changed`,[config.companyIds,lower,lease.evidence.sourceAsOf]);
  return result.rows[0].date;
 });
}
export async function readReceivableSnapshot(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig,baseline:OperationalBaseline,cutoff:string) {
 if(config.companyIds.join(',')!=='1'||baseline.reportingCurrency!=='IQD'||cutoff>baseline.to)throw new Error('Approved company-1 published snapshot scope required');
 await validateSnapshotQuality(pool,lease,config,baseline.to);
 return sourceTransaction(pool,lease,config,async client=>{
  const values=(await client.query(receivableSummarySql,[1,cutoff])).rows[0];
  const totals=Object.fromEntries(receivableMeasures.map(measure=>[measure,BigInt(values[measure].replace('.',''))])) as Record<typeof receivableMeasures[number],bigint>;
  const expected=(await client.query(summarySql,[1,cutoff])).rows[0];
  const facts=receivableFacts(baseline,lease,cutoff,totals);
  return {facts,expected};
 });
}
function receivableFacts(baseline:OperationalBaseline,lease:OdooSnapshotLease,cutoff:string,totals:Record<typeof receivableMeasures[number],bigint>):ProductionFact[] {
 const mapping=baseline.mappings.find(mapping=>mapping.measures.some(rule=>rule.measureId==='net_aged_receivable'));
 if(!mapping||mapping.measures.some(rule=>Object.keys(rule.dimensionMappings).length))throw new Error('Approved summary snapshot mapping required');
 return receivableMeasures.map(measureId=>({tenantId:baseline.tenantId,datasetId:mapping.datasetId,measureId,kind:'snapshot',businessDate:cutoff,value:decimal(totals[measureId]),entityId:'company-1',dimensions:{},sourceId:mapping.sourceId,sourceObject:'receivable_cutoff',sourceRecordId:'company-1',componentId:'whole',sourceVersion:lease.evidence.frozenRevision,sourceRevision:odooRevision(lease.evidence.sourceAsOf.replace('T',' ').replace('Z','000')),mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,batchId:lease.evidence.freezeReference,sourceAsOf:lease.evidence.sourceAsOf,frozenRevision:lease.evidence.frozenRevision,status:'active',currency:{mode:'native',transactionCurrency:baseline.reportingCurrency,transactionValue:decimal(totals[measureId]),reportingCurrency:baseline.reportingCurrency,policyReference:mapping.measures.find(rule=>rule.measureId===measureId)!.currencyPolicy}}));
}
export function receivableControls(partitions:readonly AnalyticsPartition[],snapshots:ReadonlyMap<string,Record<string,string>>):ExactControl[] {
 return partitions.filter(partition=>snapshotMetric(partition.metric)).flatMap(partition=>requiredMeasures(partition.metric).map(measure=>{
  const index=receivableMeasures.indexOf(measure as typeof receivableMeasures[number]);const expected=snapshots.get(partition.month);
  if(partition.dimension||index<0||!expected)throw new Error('Exact snapshot summary control required');
  return {partition,measure,value:expected[summaryFields[index]!]!,count:'1'};
 }));
}
export function snapshotMetric(metric:AnalyticsPartition['metric']){const semantics=semanticCatalog[metric].semantics;return semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';}
export {monthEnd} from '../calendar.ts';

const qualityChecks=new WeakMap<OdooSnapshotLease,{through:string;check:Promise<void>}>();
export function validateSnapshotQuality(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig,through:string) {
 const cached=qualityChecks.get(lease);if(cached&&cached.through!==through)throw new Error('Conflicting receivable quality scope');
 let check=cached?.check;
 if(!check){check=sourceTransaction(pool,lease,config,async client=>{
  const row=(await client.query(controlQualitySql,[1,through])).rows[0];
  if(['current_residual_mismatches','ambiguous_components','invalid_company_currency'].some(field=>row[field]!=='0'))throw new Error('Receivable source quality mismatch');
  // Check currency completeness for every eligible component, including settled
  // components that can be open at an earlier published cutoff.
  const missing=(await client.query(receivablesControlBaseSql.slice(0,receivablesControlBaseSql.indexOf('), matched AS'))+") SELECT count(*)::text missing FROM eligible LEFT JOIN res_currency transaction_currency ON transaction_currency.id=eligible.currency_id WHERE transaction_currency.name IS NULL",[1,through])).rows[0].missing;
  if(missing!=='0')throw new Error('Receivable source currency required');
 });qualityChecks.set(lease,{through,check});}
 return check;
}
