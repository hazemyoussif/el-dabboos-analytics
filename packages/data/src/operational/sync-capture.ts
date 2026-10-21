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
  const ingestion=await ingestOperationalCandidate(client,{baseline,source,cursor,details,parent,observeProgress:observe});
  validateCapture(tenantId,source.cutoff,ingestion);
  const partitions=scope.resolveImpact(ingestion.changes);details.partitions=partitions;
  const selected=partitions.length?partitions:ingestion.recordsChanged?await reconciliationScope(client,baseline,'sync'):[];
  const governed=completeReconciliationPartitions(selected,baseline.capabilities.releases.flatMap(release=>release.capabilities));
  const controls=ingestion.recordsChanged?await measureOperationalWork(observe,'source_controls',()=>source.controls(baseline,governed)):[];
  if(ingestion.recordsChanged&&!controls.length)throw new Error('Complete frozen source controls required');
  await scope.releaseSource();
  observeChanges(context,ingestion.changes);
  const heads=new Map(ingestion.changes.map(change=>[operationalFactKey(change.next),change.next]));
  const dependencies=dependencyPages(ingestion);
  const candidate:StoredSyncCandidate={tenantId,candidateId:scope.identity.runId,request:scope.request,startedAt:scope.identity.startedAt,
   source:{cutoff:source.cutoff,revision:source.revision,mappingVersion:source.mappingVersion,definitionVersion:source.definitionVersion},
   parent,previousCursor:cursor,cursor:ingestion.cursor,partitions,recordsChanged:ingestion.recordsChanged,details,controls,expectedHeads:heads.size,
   days:[...new Set(ingestion.changes.flatMap(change=>[...(change.previous?[change.previous.businessDate]:[]),change.next.businessDate]))],
   receivablePages:dependencies.receivables.length,lookupPages:dependencies.lookups.length,lookupProjection:ingestion.lookupDependencies?.projectionVersion??null};
  await client.query('INSERT INTO mart.analytics_sync_candidates VALUES($1,$2,$3)',[tenantId,candidate.candidateId,JSON.stringify(candidate)]);
  await stageRevisions(context,ingestion.changes);
  await stageHeads(context,candidate.candidateId,[...heads.values()]);
  for(const [kind,pages] of [['receivable',dependencies.receivables],['lookup',dependencies.lookups]] as const){
   for(const [index,page] of pages.entries())await client.query('INSERT INTO mart.analytics_sync_dependencies VALUES($1,$2,$3,$4,$5)',[tenantId,candidate.candidateId,kind,index,JSON.stringify(page)]);
  }
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
function dependencyPages(ingestion:{receivableDependencies?:readonly ReceivableDependency[]|undefined;lookupDependencies?:LookupDependencyUpdate|undefined}){
 // Empty completed dependency captures still have a page; undefined means this family is absent.
 return {receivables:pages(ingestion.receivableDependencies),lookups:pages(ingestion.lookupDependencies?.dependencies)};
}
function pages<T>(values:readonly T[]|undefined):T[][]{
 if(!values)return [];if(!values.length)return [[]];
 const result:T[][]=[];for(let offset=0;offset<values.length;offset+=1000)result.push(values.slice(offset,offset+1000));return result;
}
async function stageRevisions(context:SyncContext,changes:readonly FactRevisionChange[]){
 for(let offset=0;offset<changes.length;offset+=10000){
  const records=changes.slice(offset,offset+10000).map(({next})=>revision(next));
  await measureOperationalWork(context.observe,'mart_revision_write',()=>context.client.query(`INSERT INTO mart.analytics_fact_revisions(tenant_id,fact_key,revision_id,payload)
   SELECT $1,record.key,record.revision,record.payload FROM jsonb_to_recordset($2::jsonb) record(key text,revision text,payload jsonb)`,[context.tenantId,JSON.stringify(records)]));
 }
}
function revision(fact:ProductionFact){return {key:operationalFactKey(fact),revision:createHash('sha256').update(JSON.stringify(fact)).digest('hex'),payload:fact};}
async function stageHeads(context:SyncContext,candidateId:string,facts:ProductionFact[]){
 for(let offset=0;offset<facts.length;offset+=10000){
  const records=facts.slice(offset,offset+10000).map(fact=>{const record=revision(fact);return {key:record.key,revision:record.revision};});
  await context.client.query(`INSERT INTO mart.analytics_sync_heads
   SELECT $1,$2,record.key,record.revision,left(fact.payload->>'businessDate',7),fact.payload->>'measureId',fact.payload->>'status',fact.payload->>'sourceObject',fact.payload->>'sourceRecordId'
   FROM jsonb_to_recordset($3::jsonb) record(key text,revision text)
   JOIN mart.analytics_fact_revisions fact ON fact.tenant_id=$1 AND fact.fact_key=record.key AND fact.revision_id=record.revision`,[context.tenantId,candidateId,JSON.stringify(records)]);
 }
}
function observeChanges(context:SyncContext,changes:readonly FactRevisionChange[]){
 if(!context.observe)return;
 const start=performance.now(),summary=summarizeCandidateChanges(changes);
 context.observe({step:'mart_candidate_changes',state:'completed',durationMs:performance.now()-start,summary});
}
