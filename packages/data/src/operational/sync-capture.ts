import type {AnalyticsCursor,AnalyticsJobRequest,AnalyticsSourceSnapshot,AnalyticsPartition,FactRevisionChange} from '@el-dabboos/domain';
import type {OperationalSnapshot,OperationDetails} from './contracts.ts';
import {captureOperationalPages} from './capture-ingestion.ts';
import {completeReconciliationPartitions} from './reconciliation.ts';
import {reconciliationScope} from './store.ts';
import {measureOperationalWork} from './progress.ts';
import type {SyncContext,StoredSyncCandidate} from './sync-context.ts';

/** Page payloads live in SQL staging; the complete frozen capture still commits atomically. */
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
  const ingestion=await captureOperationalPages(context,{baseline,source,cursor,details,parent,resolveImpact:scope.resolveImpact});
  if(!Number.isSafeInteger(ingestion.recordsChanged)||ingestion.recordsChanged<0||ingestion.cursor.cutoff!==source.cutoff||
   (ingestion.recordsChanged===0)!==(ingestion.expectedHeads===0))throw new Error('Incomplete bounded sync capture');
  const {partitions}=ingestion;
  const selected=partitions.length?partitions:ingestion.recordsChanged?await reconciliationScope(client,baseline,'sync'):[];
  const governed=completeReconciliationPartitions(selected,baseline.capabilities.releases.flatMap(release=>release.capabilities));
  const controls=ingestion.recordsChanged?await measureOperationalWork(observe,'source_controls',()=>source.controls(baseline,governed)):[];
  if(ingestion.recordsChanged&&!controls.length)throw new Error('Complete frozen source controls required');
  await scope.releaseSource();
  // Acceptance reconstructs audit details; store the partition array only once.
  const candidate:StoredSyncCandidate={tenantId,candidateId:scope.identity.runId,request:scope.request,startedAt:scope.identity.startedAt,
   source:{cutoff:source.cutoff,revision:source.revision,mappingVersion:source.mappingVersion,definitionVersion:source.definitionVersion},
   parent,previousCursor:cursor,cursor:ingestion.cursor,partitions,recordsChanged:ingestion.recordsChanged,details,controls,expectedHeads:ingestion.expectedHeads,
   days:ingestion.days,receivablePages:ingestion.receivablePages,lookupPages:ingestion.lookupPages,lookupProjection:ingestion.lookupProjection};
  await client.query('INSERT INTO mart.analytics_sync_candidates VALUES($1,$2,$3)',[tenantId,candidate.candidateId,JSON.stringify(candidate)]);
  await ingestion.workspace.persist(context,candidate.candidateId);
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
