import {AnalyticsOperationBusy,resolveAnalyticsImpact} from '@el-dabboos/domain';
import type {AnalyticsJobRequest,AnalyticsOperationalSource,AnalyticsSourceSnapshot,AnalyticsSyncStore,ImpactPolicy} from '@el-dabboos/domain';
import type {AnalyticsOperationPhase} from './analytics-operations.ts';
import {validateEvidence} from './analytics-operations.ts';

/** Capture once; resume exact offline preparation without reopening the source. */
export class CheckpointedAnalyticsSync {
 constructor(private readonly options:{store:AnalyticsSyncStore;source:AnalyticsOperationalSource;impact:ImpactPolicy;runId:()=>string;clock:()=>Date},private readonly observe?:(phase:AnalyticsOperationPhase)=>void){}
 async run(request:AnalyticsJobRequest){
  if(request.kind!=='sync'||![request.tenantId,request.actorId].every(value=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=200)||!['manual','operator','scheduled'].includes(request.trigger))throw new Error('Invalid sync request');
  const identity={runId:this.options.runId(),startedAt:this.options.clock().toISOString()};
  let source:AnalyticsSourceSnapshot|undefined;
  try {
   return await this.options.store.session(request.tenantId,async session=>{
    let candidate=await session.pending();
    if(!candidate){
     this.observe?.('source_open');source=await this.options.source.open(request.tenantId);
     this.observe?.('source_read');
     candidate=await session.capture(source,request,identity,changes=>resolveAnalyticsImpact(changes,this.options.impact),
      async()=>{this.observe?.('source_handoff');await source!.close();source=undefined;});
    }
    this.observe?.('offline_reconciliation');const evidence=await session.reconcile(candidate);
    validateEvidence(evidence,candidate.recordsChanged===0);
    if(evidence.mismatchCount)return session.reject(candidate,evidence);
    this.observe?.('offline_refresh');await session.refresh(candidate);
    this.observe?.('prepare_and_publish');await session.prepare(candidate);
    this.observe?.('audit');return session.accept(candidate,evidence);
   });
  }catch(error){if(!(error instanceof AnalyticsOperationBusy))await this.options.store.recordFailure(request,identity.runId,identity.startedAt);throw error;}
  finally{await source?.close();}
 }
}
