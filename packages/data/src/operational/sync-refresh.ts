import {affectedMonths,beginOperationalRefresh,refreshOperationalMonth} from './aggregates.ts';
import {prepareChunk,requiredPreparedChunks} from '../prepared/preparation.ts';
import type {PreparedBuildBounds} from '../prepared/contracts.ts';
import type {SyncContext,StoredSyncCandidate} from './sync-context.ts';

/** Each complete month includes both exact proofs and immutable membership. */
export async function refreshSyncCandidate(context:SyncContext,candidate:StoredSyncCandidate){
 const {client,tenantId}=context,id=candidate.candidateId,months=affectedMonths(candidate.partitions);
 if(!months.length)return;
 const scope={tenantId,revisionId:id,runId:id,parent:candidate.parent,cutoff:candidate.source.cutoff,days:candidate.days,candidate:true,observeProgress:context.observe};
 await context.transaction(async()=>{
  if(!(await client.query('SELECT 1 FROM mart.analytics_serving_revisions WHERE tenant_id=$1 AND revision_id=$2',[tenantId,id])).rowCount)await beginOperationalRefresh(client,scope,months);
 },id);
 for(const month of months){
  await context.transaction(async()=>{
   const exists=(await client.query("SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$2 AND month=$3 AND family='facts'",[tenantId,id,`${month}-01`])).rowCount;
   if(!exists)await refreshOperationalMonth(client,scope,month);
  },id);
  checkpoint(context,id,'month',month);
 }
}
/** Uses the existing preparation bounds and per-chunk statement timeout. */
export async function prepareSyncCandidate(context:SyncContext,candidate:StoredSyncCandidate){
 if(!candidate.partitions.length)return;
 const {client,tenantId}=context,id=candidate.candidateId,scope={tenantId,revisionId:id};
 const plan=await context.transaction(async()=>{
  if((await client.query('SELECT 1 FROM mart.prepared_revision_seals WHERE tenant_id=$1 AND revision_id=$2',[tenantId,id])).rowCount)return null;
  const activation=(await client.query('SELECT max_cells_per_chunk,max_chunks FROM mart.prepared_activation WHERE tenant_id=$1',[tenantId])).rows[0];
  if(!activation)return null;
  const bounds:PreparedBuildBounds={maxCellsPerChunk:Number(activation.max_cells_per_chunk),maxChunks:activation.max_chunks};
  return {bounds,chunks:await requiredPreparedChunks(client,scope,bounds)};
 },id);
 if(!plan)return;
 for(const chunk of plan.chunks){
  await context.transaction(()=>prepareChunk(client,scope,chunk,plan.bounds),id,600000);
  checkpoint(context,id,'prepared_chunk',chunk.period);
 }
 await context.transaction(async()=>{await client.query("INSERT INTO mart.prepared_revision_seals VALUES($1,$2,'prepared-v1')",[tenantId,id]);},id);
}
export function checkpoint(context:SyncContext,candidateId:string,phase:'capture'|'resume'|'reconciliation'|'month'|'prepared_chunk'|'acceptance'|'rejection',period?:string){
 context.observe?.({step:'sync_checkpoint',state:'completed',checkpoint:phase,candidateId,...(period?{month:period}:{})});
}
