import {AnalyticsOperationBusy} from '@el-dabboos/domain';
import type {Pool} from 'pg';
import type {AnalyticsJobRequest,AnalyticsSyncCandidate,AnalyticsSyncSession,AnalyticsSyncStore,OperationalReconciliation} from '@el-dabboos/domain';
import {SyncContext} from './sync-context.ts';
import {captureSyncCandidate} from './sync-capture.ts';
import {reconcileSyncCandidate} from './sync-evidence.ts';
import {refreshSyncCandidate,prepareSyncCandidate,checkpoint} from './sync-refresh.ts';
import {finishSyncCandidate} from './sync-acceptance.ts';
import {PostgresOperationalStore} from './store.ts';
import type {OperationalProgressObserver} from './progress.ts';

/** A dedicated connection keeps tenant serialization across checkpoint commits. */
export class PostgresCheckpointedSyncStore implements AnalyticsSyncStore {
 constructor(private readonly pool:Pool,private readonly observe?:OperationalProgressObserver){}
 async session<T>(tenantId:string,operation:(session:AnalyticsSyncSession)=>Promise<T>):Promise<T>{
  const client=await this.pool.connect();
  try {
   const locked=(await client.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) locked',[`analytics:${tenantId}`])).rows[0]?.locked;
   if(!locked)throw new AnalyticsOperationBusy();
   return await operation(new PostgresSyncSession(new SyncContext(client,tenantId,this.observe)));
  }finally{
   // Destroy this session, including its advisory lock, even if rollback failed.
   client.release(true);
  }
 }
 recordFailure(request:AnalyticsJobRequest,runId:string,startedAt:string){
  return new PostgresOperationalStore(this.pool,runId,this.observe).recordFailure(request,runId,startedAt);
 }
}
class PostgresSyncSession implements AnalyticsSyncSession {
 constructor(private readonly context:SyncContext){}
 async pending(){
  const candidate=await this.context.transaction(async()=>{
   const {client,tenantId}=this.context;
   const id=(await client.query('SELECT candidate_id FROM mart.analytics_sync_pending WHERE tenant_id=$1',[tenantId])).rows[0]?.candidate_id;
   if(!id)return null;
   await client.query('SELECT mart.assert_sync_candidate_current($1,$2)',[tenantId,id]);
   return this.context.candidate(id);
  });
  if(candidate)checkpoint(this.context,candidate.candidateId,'resume');
  return candidate;
 }
 async capture(...[source,request,identity,resolveImpact,releaseSource]:Parameters<AnalyticsSyncSession['capture']>){
  const candidate=await captureSyncCandidate(this.context,{source,request,identity,resolveImpact,releaseSource});
  checkpoint(this.context,candidate.candidateId,'capture');return candidate;
 }
 async reconcile(candidate:AnalyticsSyncCandidate){
  const evidence=await this.context.transaction(async()=>reconcileSyncCandidate(this.context,await this.context.candidate(candidate.candidateId)),candidate.candidateId);
  checkpoint(this.context,candidate.candidateId,'reconciliation');return evidence;
 }
 async refresh(candidate:AnalyticsSyncCandidate){await refreshSyncCandidate(this.context,await this.load(candidate));}
 async prepare(candidate:AnalyticsSyncCandidate){await prepareSyncCandidate(this.context,await this.load(candidate));}
 accept(candidate:AnalyticsSyncCandidate,evidence:OperationalReconciliation){return this.finish(candidate,evidence,false);}
 reject(candidate:AnalyticsSyncCandidate,evidence:OperationalReconciliation){return this.finish(candidate,evidence,true);}
 private load(candidate:AnalyticsSyncCandidate){
  if(candidate.tenantId!==this.context.tenantId)throw new Error('Cross-tenant sync candidate');
  return this.context.transaction(()=>this.context.candidate(candidate.candidateId),candidate.candidateId);
 }
 private async finish(candidate:AnalyticsSyncCandidate,evidence:OperationalReconciliation,rejected:boolean){
  const run=await this.context.transaction(async()=>finishSyncCandidate(this.context,await this.context.candidate(candidate.candidateId),evidence,rejected),candidate.candidateId);
  checkpoint(this.context,candidate.candidateId,rejected?'rejection':'acceptance');return run;
 }
}
