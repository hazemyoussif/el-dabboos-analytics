import type {AnalyticsJobRun,OperationalReconciliation} from '@el-dabboos/domain';
import {recordOperationalRun,writeOperationalCursor} from '../postgres/operational-evidence.ts';
import {writeReceivableDependencies} from './receivable-dependency-store.ts';
import {writeLookupDependencies} from './lookup-dependency-store.ts';
import {readSyncEvidence} from './sync-evidence.ts';
import {measureOperationalWork} from './progress.ts';
import {affectedMonths} from './aggregates.ts';
import type {SyncContext,StoredSyncCandidate} from './sync-context.ts';

/** The sole transaction that makes a frozen candidate accepted state. */
export async function finishSyncCandidate(context:SyncContext,candidate:StoredSyncCandidate,evidence:OperationalReconciliation,rejected:boolean):Promise<AnalyticsJobRun>{
 const checked=await readSyncEvidence(context,candidate);
 if(!checked||checked.evidenceHash!==evidence.evidenceHash||checked.caseCount!==evidence.caseCount||checked.mismatchCount!==evidence.mismatchCount||JSON.stringify(checked.caseIds)!==JSON.stringify(evidence.caseIds)||Boolean(checked.mismatchCount)!==rejected)throw new Error('Sync acceptance requires its exact reconciliation');
 const run=completedRun(candidate,checked,rejected);
 await recordOperationalRun(context.client,run,checked.caseIds);
 if(!rejected)await acceptState(context,candidate);
 await context.client.query('INSERT INTO mart.analytics_run_details VALUES($1,$2,$3)',[context.tenantId,candidate.candidateId,JSON.stringify({...candidate.details,refreshedMonths:rejected?[]:affectedMonths(candidate.partitions)})]);
 if(!rejected)await context.client.query('INSERT INTO mart.analytics_sync_acceptances VALUES($1,$2) ON CONFLICT DO NOTHING',[context.tenantId,candidate.candidateId]);
 await context.client.query('DELETE FROM mart.analytics_sync_pending WHERE tenant_id=$1 AND candidate_id=$2',[context.tenantId,candidate.candidateId]);
 return run;
}
function completedRun(candidate:StoredSyncCandidate,evidence:OperationalReconciliation,rejected:boolean):AnalyticsJobRun{
 return {...candidate.request,runId:candidate.candidateId,startedAt:candidate.startedAt,completedAt:new Date().toISOString(),
  sourceCutoff:candidate.source.cutoff,sourceRevision:candidate.source.revision,mappingVersion:candidate.source.mappingVersion,definitionVersion:candidate.source.definitionVersion,
  status:rejected?'failed':candidate.recordsChanged?'passed':'unchanged',recordsChanged:candidate.recordsChanged,partitionsAffected:candidate.partitions.length,
  caseCount:evidence.caseCount,mismatchCount:evidence.mismatchCount,evidenceHash:evidence.evidenceHash,
  servingRelease:!rejected&&candidate.partitions.length?candidate.candidateId:candidate.parent};
}
async function acceptState(context:SyncContext,candidate:StoredSyncCandidate){
 const {client,tenantId}=context,id=candidate.candidateId;
 await client.query("SELECT set_config('mart.sync_accepting',$1,true)",[id]);
 await acceptHeads(context,id);
 if(candidate.partitions.length){
  const changed=await client.query('UPDATE mart.analytics_trusted_serving SET revision_id=$2 WHERE tenant_id=$1 AND revision_id=$3',[tenantId,id,candidate.parent]);
  if(changed.rowCount!==1)throw new Error('Sync publication parent changed');
 }
 await writeOperationalCursor(client,{tenantId,runId:id,cursor:candidate.cursor});
 await acceptDependencies(context,candidate);
}
async function acceptHeads(context:SyncContext,candidateId:string){
 let after='';
 for(;;){
  const page=await measureOperationalWork(context.observe,'mart_head_write',()=>context.client.query(`WITH selected AS MATERIALIZED (
   SELECT tenant_id,fact_key,revision_id FROM mart.analytics_sync_heads WHERE tenant_id=$1 AND candidate_id=$2 AND fact_key>$3 ORDER BY fact_key LIMIT 10000
  ), accepted AS (
   INSERT INTO mart.analytics_fact_heads(tenant_id,fact_key,revision_id) SELECT tenant_id,fact_key,revision_id FROM selected
   ON CONFLICT(tenant_id,fact_key) DO UPDATE SET revision_id=EXCLUDED.revision_id RETURNING fact_key
  ) SELECT max(fact_key) last_key FROM accepted`,[context.tenantId,candidateId,after]));
  const last=page.rows[0]?.last_key;if(!last)return;after=last;
 }
}
async function acceptDependencies(context:SyncContext,candidate:StoredSyncCandidate){
 const scope={baseline:await context.baseline(),runId:candidate.candidateId,cutoff:candidate.cursor.cutoff};
 // Every page and its checkpoint is inside the same final acceptance transaction.
 // A failure on any page rolls back the entire dependency family and the cursor.
 for(const kind of ['receivable','lookup'] as const){
  const count=kind==='receivable'?candidate.receivablePages:candidate.lookupPages;
  for(let page=0;page<count;page++){
   const row=(await context.client.query('SELECT payload FROM mart.analytics_sync_dependencies WHERE tenant_id=$1 AND candidate_id=$2 AND kind=$3 AND page=$4',[context.tenantId,candidate.candidateId,kind,page])).rows[0];
   if(!row)throw new Error('Frozen dependency page missing');
   if(kind==='receivable')await writeReceivableDependencies(context.client,scope,row.payload);
   else {
    if(!candidate.lookupProjection)throw new Error('Frozen lookup projection missing');
    await writeLookupDependencies(context.client,scope,{dependencies:row.payload,projectionVersion:candidate.lookupProjection});
   }
  }
 }
}
