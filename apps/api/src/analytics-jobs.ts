import { randomUUID } from 'node:crypto';
import { AnalyticsOperations,CheckpointedAnalyticsSync } from '@el-dabboos/application';
import type { AnalyticsOperationPhase } from '@el-dabboos/application';
import { createMartPool,createOdooSourcePool,tenantTransaction,OdooOperationalSource,PostgresOperationalStore,PostgresCheckpointedSyncStore,readBaseline,bootstrapOperationalServing } from '@el-dabboos/data';
import type {OperationalProgressObserver} from '@el-dabboos/data';
import {analyticsJobObservation} from './analytics-job-observation.ts';
import type { AnalyticsJobRequest,AnalyticsOperationalSource } from '@el-dabboos/domain';
import { resolveOdooSourceConfig } from './source-connections.ts';
import { assertHostedMartUrl } from './hosted-mart-url.ts';

type AnalyticsJobSetupStage = 'mart_baseline' | 'report_sync';
export class AnalyticsJobSetupUnavailable extends Error {
 constructor(readonly stage:AnalyticsJobSetupStage,readonly code:string){super(`Analytics job setup unavailable at ${stage} (${code}).`);}
}
async function setupStep<T>(stage:AnalyticsJobSetupStage,operation:()=>Promise<T>):Promise<T>{
 try{return await operation();}catch(error){
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'UNAVAILABLE';
  throw new AnalyticsJobSetupUnavailable(stage,/^[A-Z_0-9]{2,40}$/.test(code)?code:'UNAVAILABLE');
 }
}

export async function executeAnalyticsJob(command:string,tenantId:string,mode:string|undefined,environment:NodeJS.ProcessEnv) {
 const trigger=analyticsOperatorTrigger(environment);
 const url=assertHostedMartUrl(command==='bootstrap'?environment.MART_MIGRATOR_URL:environment.MART_INGESTOR_URL,environment,'Local operational mart configuration required');
 const mart=createMartPool(url,1);
 try {
  if(command==='bootstrap')return await bootstrapOperationalServing(mart,tenantId);
  const observation=analyticsJobObservation();
  try {
   return await runConfiguredAnalyticsJob(mart,{tenantId,kind:jobKind(command,mode),actorId:environment.ANALYTICS_OPERATOR_ID??'local-operator',trigger,...(command==='sweep'&&mode==='allocations'?{sweepScope:'allocations' as const}:{})},environment,observation.phase,observation.progress);
  }finally{observation.finish();}
 }finally{await mart.end();}
}
function jobKind(command:string,mode:string|undefined):AnalyticsJobRequest['kind'] {
 if(command==='sweep'&&mode==='allocations')return 'sweep';
 if(command==='sync'||command==='sweep'){if(mode)throw new Error('Unexpected reconciliation mode');return command;}
 if(command==='reconcile'&&(mode==='affected'||mode==='daily'||mode==='deep'))return mode;
 throw new Error('Usage: analytics sync|sweep --tenant ID; analytics sweep --tenant ID --mode allocations; analytics reconcile --tenant ID --mode affected|daily|deep');
}

/** Shared CLI/HTTP composition; the application lifecycle owns every pipeline step and durable audit. */
export async function runConfiguredAnalyticsJob(mart:ReturnType<typeof createMartPool>,request:AnalyticsJobRequest,environment:NodeJS.ProcessEnv,observePhase?:(phase:AnalyticsOperationPhase)=>void,observeProgress?:OperationalProgressObserver) {
 if(request.kind==='sweep'&&request.sweepScope==='allocations')throw new AnalyticsJobSetupUnavailable('report_sync','BACKGROUND_WORKER_REQUIRED');
 const runId=randomUUID(),startedAt=new Date().toISOString(),store=new PostgresOperationalStore(mart,runId,observeProgress);
 const sourcePools:ReturnType<typeof createOdooSourcePool>[]=[];
 let lifecycleStarted=false;
 try {
  const baseline=await setupStep('mart_baseline',()=>tenantTransaction(mart,request.tenantId,client=>readBaseline(client,request.tenantId),true));
  // A sealed candidate resumes offline, without resolving source credentials.
  const source:AnalyticsOperationalSource={open:async tenantId=>{
   if(environment.ANALYTICS_SOURCE_MODE&&!['odoo-postgres','odoo-orm-observed'].includes(environment.ANALYTICS_SOURCE_MODE))throw new Error('Unknown analytics source mode');
   const config=await resolveOdooSourceConfig(environment,{tenantId,sourceId:baseline.sourceId});
   const owner=createOdooSourcePool(config);sourcePools.push(owner);
   const reader=createOdooSourcePool(config);sourcePools.push(reader);
   return new OdooOperationalSource(owner,reader,config,baseline,observeProgress).open(tenantId);
  }};
  const options={source,runId:()=>runId,clock:()=>new Date(),impact:{through:baseline.to,movingAverageWindows:[],runningTotals:false,yearOverYear:false,contribution:false,snapshotDependencies:()=>[]}};
  const operations=request.kind==='sync'
   ?new CheckpointedAnalyticsSync({...options,store:new PostgresCheckpointedSyncStore(mart,observeProgress)},observePhase)
   :new AnalyticsOperations({...options,store},observePhase);
  lifecycleStarted=true;
  const run=await operations.run(request);
  const details=await tenantTransaction(mart,request.tenantId,async client=>(await client.query('SELECT details FROM mart.analytics_run_details WHERE tenant_id=$1 AND run_id=$2',[request.tenantId,run.runId])).rows[0].details,true);
  return {run,details,business:{state:request.kind==='sync'||request.kind==='sweep'?'background_managed' as const:'not_requested' as const}};
 }catch(error){
  if(!lifecycleStarted)await store.recordFailure(request,runId,startedAt);
  throw error;
 }finally{await Promise.all(sourcePools.map(pool=>pool.end()));}
}

/** Scheduled invocations retain their origin in the existing durable job audit. */
export function analyticsOperatorTrigger(environment:NodeJS.ProcessEnv):'operator'|'scheduled' {
 const trigger=environment.ANALYTICS_JOB_TRIGGER??'operator';
 if(trigger!=='operator'&&trigger!=='scheduled')throw new Error('Invalid analytics operator trigger');
 return trigger;
}
