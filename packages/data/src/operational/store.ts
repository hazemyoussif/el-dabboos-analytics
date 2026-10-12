import { randomUUID } from 'node:crypto';
import type { Pool,PoolClient } from 'pg';
import type { AnalyticsCursor,AnalyticsJobRequest,AnalyticsJobRun,AnalyticsOperationalStore,AnalyticsOperationalTransaction,AnalyticsPartition,AnalyticsSourceSnapshot,OperationalReconciliation,FactRevisionChange } from '@el-dabboos/domain';
import { tenantTransaction } from '../postgres/session.ts';
import { recordOperationalRun,writeOperationalCursor } from '../postgres/operational-evidence.ts';
import type { OperationDetails,OperationalBaseline,OperationalSnapshot } from './contracts.ts';
import { persistOperationalFact } from './facts.ts';
import { affectedMonths,refreshOperationalMonths } from './aggregates.ts';
import { compareCandidate,persistExactCases,completeReconciliationPartitions } from './reconciliation.ts';
import type { PersistedExactCase } from './reconciliation.ts';
import { sweepOperationalFacts } from './sweep.ts';
import { ingestOperationalCandidate } from './ingestion.ts';
import { readBaseline } from './baseline.ts';
import { snapshotMetric } from './receivables.ts';

export class PostgresOperationalStore implements AnalyticsOperationalStore {
 constructor(private readonly pool:Pool,private readonly runId:string) {}
 transaction<T>(tenantId:string,operation:(transaction:AnalyticsOperationalTransaction)=>Promise<T>) {
  return tenantTransaction(this.pool,tenantId,async client=>{
   if(!(await client.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) locked',[`analytics:${tenantId}`])).rows[0].locked)throw new Error('Tenant analytics operation already running');
   await client.query('SAVEPOINT operational_candidate');
   return operation(new OperationalTransaction(client,await readBaseline(client,tenantId),this.runId));
  });
 }
 recordFailure(request:AnalyticsJobRequest,runId:string,startedAt:string) {
  return tenantTransaction(this.pool,request.tenantId,async client=>{await client.query('INSERT INTO mart.analytics_operation_failures(tenant_id,run_id,kind,actor_id,trigger_type,started_at) VALUES($1,$2,$3,$4,$5,$6)',[request.tenantId,runId,request.kind,request.actorId,request.trigger,startedAt]);});
 }
}
class OperationalTransaction implements AnalyticsOperationalTransaction {
 private changes:readonly FactRevisionChange[]=[];
 private source:OperationalSnapshot|undefined;private cases:PersistedExactCase[]=[];private rejected=false;
 private readonly details:OperationDetails={rowsDiscovered:0,newRows:0,updatedRows:0,canonicalRevisions:0,partitions:[],previousCursor:null,newCursor:null,refreshedMonths:[],durations:{}};
 constructor(private readonly client:PoolClient,private readonly baseline:OperationalBaseline,private readonly runId:string) {}
 async cursor():Promise<AnalyticsCursor|null> {
  const row=(await this.client.query('SELECT cutoff,object_cursors FROM mart.analytics_source_cursors WHERE tenant_id=$1',[this.baseline.tenantId])).rows[0];
  return row?{cutoff:row.cutoff.toISOString(),objects:row.object_cursors}:null;
 }
 async trustedRelease():Promise<string|null> {return (await this.client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[this.baseline.tenantId])).rows[0]?.revision_id??null;}
 async ingest(snapshot:AnalyticsSourceSnapshot,cursor:AnalyticsCursor|null) {
  const source=this.requireSource(snapshot);
  const candidate=await ingestOperationalCandidate(this.client,{baseline:this.baseline,source,cursor,details:this.details,parent:await this.trustedRelease()});
  this.changes=candidate.changes;return candidate;
 }
 async sweep(snapshot:AnalyticsSourceSnapshot) {
  const source=this.requireSource(snapshot);
  const changes=await sweepOperationalFacts(this.client,this.baseline,source);
  for await(const page of source.snapshots(this.baseline,await this.cursor(),true))for(const fact of page.facts){const change=await persistOperationalFact(this.client,this.baseline,fact);if(change)changes.push(change);}
  this.details.canonicalRevisions=changes.length;this.details.updatedRows=new Set(changes.map(change=>JSON.stringify([change.next.sourceObject,change.next.sourceRecordId]))).size;
  this.changes=changes;return changes;
 }
 async reconcile(snapshot:AnalyticsSourceSnapshot,partitions:readonly AnalyticsPartition[],kind:AnalyticsJobRequest['kind']) {
  const source=this.requireSource(snapshot),start=performance.now();
  const selected=partitions.length?partitions:await reconciliationScope(this.client,this.baseline,kind);
  const capabilities=this.baseline.capabilities.releases.flatMap(release=>release.capabilities);
  const governed=completeReconciliationPartitions(selected,capabilities);this.details.partitions=selected;
  const controls=await source.controls(this.baseline,governed);
  this.cases=await compareCandidate(this.client,this.baseline.tenantId,controls);
  const evidence=await persistExactCases(this.client,this.baseline.tenantId,source,this.cases);
  this.details.durations.reconciliationMs=performance.now()-start;return evidence;
 }
 async refresh(partitions:readonly AnalyticsPartition[]) {
  const start=performance.now(),release=randomUUID();
  this.details.refreshedMonths=await refreshOperationalMonths(this.client,{tenantId:this.baseline.tenantId,revisionId:release,parent:await this.trustedRelease(),runId:this.runId,cutoff:this.source!.cutoff,...(this.changes.length?{days:[...new Set(this.changes.flatMap(change=>[...(change.previous?[change.previous.businessDate]:[]),change.next.businessDate]))]}:{})},affectedMonths(partitions));
  this.details.durations.refreshMs=performance.now()-start;return release;
 }
 async promote(release:string,_evidence:OperationalReconciliation) {
  void _evidence;
  await this.client.query('UPDATE mart.analytics_trusted_serving SET revision_id=$2 WHERE tenant_id=$1',[this.baseline.tenantId,release]);
 }
 commitCursor(cursor:AnalyticsCursor){return writeOperationalCursor(this.client,{tenantId:this.baseline.tenantId,runId:this.runId,cursor});}
 async record(run:AnalyticsJobRun,caseIds:readonly string[]) {
  if(this.rejected)await persistExactCases(this.client,this.baseline.tenantId,this.source!,this.cases);
  await recordOperationalRun(this.client,run,caseIds);
  await this.client.query('INSERT INTO mart.analytics_run_details VALUES($1,$2,$3)',[this.baseline.tenantId,run.runId,JSON.stringify(this.details)]);
 }
 async discardCandidate(){await this.client.query('ROLLBACK TO SAVEPOINT operational_candidate');this.rejected=true;}
 private requireSource(snapshot:AnalyticsSourceSnapshot):OperationalSnapshot {
  const source=snapshot as OperationalSnapshot;
  if(typeof source.records!=='function'||typeof source.recordsMonth!=='function'||typeof source.snapshots!=='function'||typeof source.controls!=='function'||typeof source.present!=='function'||typeof source.presence!=='function'||source.mappingVersion!==this.baseline.mappingVersion||source.definitionVersion!==this.baseline.definitionVersion)throw new Error('Versioned operational source required');
  this.source=source;return source;
 }
}
async function reconciliationScope(client:PoolClient,baseline:OperationalBaseline,kind:AnalyticsJobRequest['kind']):Promise<AnalyticsPartition[]> {
 if(kind==='affected')return (await client.query('SELECT details FROM mart.analytics_run_details JOIN mart.analytics_operation_runs USING(tenant_id,run_id) WHERE tenant_id=$1 AND partitions_affected>0 ORDER BY completed_at DESC,run_id DESC LIMIT 1',[baseline.tenantId])).rows[0]?.details.partitions??[];
 const months=(await client.query("SELECT to_char(member.month,'YYYY-MM') AS period FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) WHERE trusted.tenant_id=$1 AND member.family='facts' ORDER BY member.month",[baseline.tenantId])).rows;
 return months.flatMap(row=>baseline.capabilities.releases.flatMap(release=>release.capabilities).filter(capability=>!snapshotMetric(capability.metric)||row.period<=baseline.to.slice(0,7)).map(capability=>({metric:capability.metric,month:row.period,dimension:null,identity:null,dependency:'base' as const})));
}
