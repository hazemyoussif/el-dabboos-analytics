import {createHash} from 'node:crypto';
import type {AnalyticsCursor,AnalyticsJobRequest,AnalyticsSourceSnapshot,AnalyticsPartition,FactRevisionChange,ProductionFact} from '@el-dabboos/domain';
import type {OperationalSnapshot,OperationDetails,ReceivableDependency,LookupDependencyUpdate} from './contracts.ts';
import {ingestOperationalCandidate} from './ingestion.ts';
import {completeReconciliationPartitions} from './reconciliation.ts';
import {reconciliationScope} from './store.ts';
import {operationalFactKey} from './facts.ts';
import {measureOperationalWork} from './progress.ts';
import {summarizeCandidateChanges} from './candidate-change-summary.ts';
import type {SyncContext,StoredSyncCandidate} from './sync-context.ts';

export async function captureSyncCandidate(context:SyncContext,scope:{source:AnalyticsSourceSnapshot;request:AnalyticsJobRequest;identity:{runId:string;startedAt:string};resolveImpact:(changes:readonly FactRevisionChange[])=>readonly AnalyticsPartition[];releaseSource:()=>Promise<void>}){
 return context.transaction(async()=>{
  const {client,tenantId,observe}=context,baseline=await context.baseline();
  const source=operationalSource(scope.source,baseline);
  const row=(await client.query('SELECT cutoff,object_cursors FROM mart.analytics_source_cursors WHERE tenant_id=$1',[tenantId])).rows[0];
  const cursor:AnalyticsCursor|null=row?{cutoff:row.cutoff.toISOString(),objects:row.object_cursors}:null;
  if(cursor&&Date.parse(cursor.cutoff)>Date.parse(source.cutoff))throw new Error('Source cutoff cannot regress');
  const parent=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[tenantId])).rows[0]?.revision_id;
  if(!parent)throw new Error('Trusted baseline required');
  const details:OperationDetails={rowsDiscovered:0,newRows:0,updatedRows:0,canonicalRevisions:0,partitions:[],previousCursor:cursor,newCursor:null,refreshedMonths:[],durations:{}};
  const ingestion=await ingestOperationalCandidate(client,{baseline,source,cursor,details,parent,observeProgress:observe,retainHeads:true});
  validateCapture(tenantId,source.cutoff,ingestion);
  const heads=ingestion.heads;
  if(!heads)throw new Error('Complete captured head index required');
  const partitions=scope.resolveImpact(ingestion.changes);details.partitions=partitions;
  const selected=partitions.length?partitions:ingestion.recordsChanged?await reconciliationScope(client,baseline,'sync'):[];
  const governed=completeReconciliationPartitions(selected,baseline.capabilities.releases.flatMap(release=>release.capabilities));
  const controls=ingestion.recordsChanged?await measureOperationalWork(observe,'source_controls',()=>source.controls(baseline,governed)):[];
  if(ingestion.recordsChanged&&!controls.length)throw new Error('Complete frozen source controls required');
  await scope.releaseSource();
  observeChanges(context,ingestion.changes);
  const candidate:StoredSyncCandidate={tenantId,candidateId:scope.identity.runId,request:scope.request,startedAt:scope.identity.startedAt,
   source:{cutoff:source.cutoff,revision:source.revision,mappingVersion:source.mappingVersion,definitionVersion:source.definitionVersion},
   parent,previousCursor:cursor,cursor:ingestion.cursor,partitions,recordsChanged:ingestion.recordsChanged,details,controls,expectedHeads:heads.size,
   days:changedDays(ingestion.changes),
   receivablePages:dependencyPageCount(ingestion.receivableDependencies),lookupPages:dependencyPageCount(ingestion.lookupDependencies?.dependencies),lookupProjection:ingestion.lookupDependencies?.projectionVersion??null};
  await client.query('INSERT INTO mart.analytics_sync_candidates VALUES($1,$2,$3)',[tenantId,candidate.candidateId,JSON.stringify(candidate)]);
  await stageRevisions(context,ingestion.changes);
  await stageHeads(context,candidate.candidateId,heads);
  await stageDependencies(context,candidate.candidateId,ingestion);
  await client.query('INSERT INTO mart.analytics_sync_seals VALUES($1,$2)',[tenantId,candidate.candidateId]);
  await client.query('INSERT INTO mart.analytics_sync_pending VALUES($1,$2)',[tenantId,candidate.candidateId]);
  await client.query('SELECT mart.assert_sync_candidate_current($1,$2)',[tenantId,candidate.candidateId]);
  return candidate;
 });
}
function operationalSource(source:AnalyticsSourceSnapshot,baseline:{definitionVersion:string;mappingVersion:string}):OperationalSnapshot{
 const adapter=source as OperationalSnapshot;
 if(typeof adapter.records!=='function'||typeof adapter.recordsMonth!=='function'||typeof adapter.controls!=='function'||adapter.definitionVersion!==baseline.definitionVersion||adapter.mappingVersion!==baseline.mappingVersion)throw new Error('Versioned operational source required');
 return adapter;
}
function validateCapture(tenantId:string,cutoff:string,ingestion:{recordsChanged:number;cursor:AnalyticsCursor;changes:readonly FactRevisionChange[]}){
 if(!Number.isSafeInteger(ingestion.recordsChanged)||ingestion.recordsChanged<0||ingestion.cursor.cutoff!==cutoff||(ingestion.recordsChanged===0)!==(ingestion.changes.length===0)||ingestion.changes.some(change=>change.next.tenantId!==tenantId))throw new Error('Incomplete bounded sync capture');
}
function changedDays(changes:readonly FactRevisionChange[]):string[]{
 const days=new Set<string>();
 for(const change of changes){if(change.previous)days.add(change.previous.businessDate);days.add(change.next.businessDate);}
 return [...days];
}
function dependencyPageCount(values:readonly unknown[]|undefined):number{
 // Empty completed dependency captures still have a page; undefined means this family is absent.
 return values===undefined?0:Math.max(1,Math.ceil(values.length/1000));
}
async function stageDependencies(context:SyncContext,candidateId:string,ingestion:{receivableDependencies?:readonly ReceivableDependency[]|undefined;lookupDependencies?:LookupDependencyUpdate|undefined}){
 for(const [kind,values] of [['receivable',ingestion.receivableDependencies],['lookup',ingestion.lookupDependencies?.dependencies]] as const){
  if(values===undefined)continue;
  for(let page=0;page<dependencyPageCount(values);page++){
   const records=values.slice(page*1000,(page+1)*1000);
   await context.client.query('INSERT INTO mart.analytics_sync_dependencies VALUES($1,$2,$3,$4,$5)',[context.tenantId,candidateId,kind,page,JSON.stringify(records)]);
  }
 }
}
async function stageRevisions(context:SyncContext,changes:readonly FactRevisionChange[]){
 for(let offset=0;offset<changes.length;offset+=10000){
  const records=changes.slice(offset,offset+10000).map(({next})=>revision(next));
  await measureOperationalWork(context.observe,'mart_revision_write',()=>context.client.query(`INSERT INTO mart.analytics_fact_revisions(tenant_id,fact_key,revision_id,payload)
   SELECT $1,record.key,record.revision,record.payload FROM jsonb_to_recordset($2::jsonb) record(key text,revision text,payload jsonb)`,[context.tenantId,JSON.stringify(records)]));
 }
}
function revisionId(fact:ProductionFact){return createHash('sha256').update(JSON.stringify(fact)).digest('hex');}
function revision(fact:ProductionFact){return {key:operationalFactKey(fact),revision:revisionId(fact),payload:fact};}
async function stageHeads(context:SyncContext,candidateId:string,heads:ReadonlyMap<string,ProductionFact>){
 let records:{key:string;revision:string}[]=[];
 for(const [key,fact] of heads){
  records.push({key,revision:revisionId(fact)});
  if(records.length===10000){await stageHeadPage(context,candidateId,records);records=[];}
 }
 if(records.length)await stageHeadPage(context,candidateId,records);
}
async function stageHeadPage(context:SyncContext,candidateId:string,records:readonly {key:string;revision:string}[]){
 await context.client.query(`INSERT INTO mart.analytics_sync_heads
   SELECT $1,$2,record.key,record.revision,left(fact.payload->>'businessDate',7),fact.payload->>'measureId',fact.payload->>'status',fact.payload->>'sourceObject',fact.payload->>'sourceRecordId'
   FROM jsonb_to_recordset($3::jsonb) record(key text,revision text)
   JOIN mart.analytics_fact_revisions fact ON fact.tenant_id=$1 AND fact.fact_key=record.key AND fact.revision_id=record.revision`,[context.tenantId,candidateId,JSON.stringify(records)]);
}
function observeChanges(context:SyncContext,changes:readonly FactRevisionChange[]){
 if(!context.observe)return;
 const start=performance.now(),summary=summarizeCandidateChanges(changes);
 context.observe({step:'mart_candidate_changes',state:'completed',durationMs:performance.now()-start,summary});
}
