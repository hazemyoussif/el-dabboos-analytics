import { randomUUID } from 'node:crypto';
import { AnalyticsOperations } from '@el-dabboos/application';
import { createMartPool,createOdooSourcePool,tenantTransaction,OdooOperationalSource,PostgresOperationalStore,readBaseline,bootstrapOperationalServing } from '@el-dabboos/data';
import type { AnalyticsJobRequest } from '@el-dabboos/domain';
import { resolveOdooSourceConfig } from './source-connections.ts';
import { assertHostedMartUrl } from './hosted-mart-url.ts';

export async function executeAnalyticsJob(command:string,tenantId:string,mode:string|undefined,environment:NodeJS.ProcessEnv) {
 const trigger=analyticsOperatorTrigger(environment);
 const url=assertHostedMartUrl(command==='bootstrap'?environment.MART_MIGRATOR_URL:environment.MART_INGESTOR_URL,environment,'Local operational mart configuration required');
 const mart=createMartPool(url,1);
 try {
  if(command==='bootstrap')return await bootstrapOperationalServing(mart,tenantId);
  return await runConfiguredAnalyticsJob(mart,{tenantId,kind:jobKind(command,mode),actorId:environment.ANALYTICS_OPERATOR_ID??'local-operator',trigger},environment);
 }finally{await mart.end();}
}
function jobKind(command:string,mode:string|undefined):AnalyticsJobRequest['kind'] {
 if(command==='sync'||command==='sweep'){if(mode)throw new Error('Unexpected reconciliation mode');return command;}
 if(command==='reconcile'&&(mode==='affected'||mode==='daily'||mode==='deep'))return mode;
 throw new Error('Usage: analytics sync|sweep --tenant ID; analytics reconcile --tenant ID --mode affected|daily|deep');
}

/** Shared CLI/HTTP composition; the application lifecycle owns every pipeline step and durable audit. */
export async function runConfiguredAnalyticsJob(mart:ReturnType<typeof createMartPool>,request:AnalyticsJobRequest,environment:NodeJS.ProcessEnv) {
 const runId=randomUUID(),startedAt=new Date().toISOString(),store=new PostgresOperationalStore(mart,runId);
 let lifecycleStarted=false;
 try {
  const baseline=await tenantTransaction(mart,request.tenantId,client=>readBaseline(client,request.tenantId),true);
  const config=await resolveOdooSourceConfig(environment,{tenantId:request.tenantId,sourceId:baseline.sourceId});
  const owner=createOdooSourcePool(config),reader=createOdooSourcePool(config);
  try {
   const operations=new AnalyticsOperations({store,source:new OdooOperationalSource(owner,reader,config,baseline),runId:()=>runId,clock:()=>new Date(),impact:{through:baseline.to,movingAverageWindows:[],runningTotals:false,yearOverYear:false,contribution:false,snapshotDependencies:()=>[]}});
   lifecycleStarted=true;
   const run=await operations.run(request);
   const details=await tenantTransaction(mart,request.tenantId,async client=>(await client.query('SELECT details FROM mart.analytics_run_details WHERE tenant_id=$1 AND run_id=$2',[request.tenantId,run.runId])).rows[0].details,true);
   return {run,details};
  }finally{await Promise.all([owner.end(),reader.end()]);}
 }catch(error){
  if(!lifecycleStarted)await store.recordFailure(request,runId,startedAt);
  throw error;
 }
}

/** Scheduled invocations retain their origin in the existing durable job audit. */
export function analyticsOperatorTrigger(environment:NodeJS.ProcessEnv):'operator'|'scheduled' {
 const trigger=environment.ANALYTICS_JOB_TRIGGER??'operator';
 if(trigger!=='operator'&&trigger!=='scheduled')throw new Error('Invalid analytics operator trigger');
 return trigger;
}
