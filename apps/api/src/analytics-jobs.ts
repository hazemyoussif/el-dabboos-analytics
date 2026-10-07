import { randomUUID } from 'node:crypto';
import { AnalyticsOperations } from '@el-dabboos/application';
import { createMartPool,createOdooSourcePool,tenantTransaction } from '@el-dabboos/data';
import type { AnalyticsJobRequest } from '@el-dabboos/domain';
import { resolveOdooSourceConfig } from './source-connections.ts';
import { OdooOperationalSource } from '../../../packages/data/src/operational/source.ts';
import { PostgresOperationalStore } from '../../../packages/data/src/operational/store.ts';
import { readBaseline,bootstrapOperationalServing } from '../../../packages/data/src/operational/baseline.ts';

export async function executeAnalyticsJob(command:string,tenantId:string,mode:string|undefined,environment:NodeJS.ProcessEnv) {
 const url=command==='bootstrap'?environment.MART_MIGRATOR_URL:environment.MART_INGESTOR_URL;
 if(!url||!['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname))throw new Error('Local operational mart configuration required');
 const mart=createMartPool(url,1);
 try {
  if(command==='bootstrap')return await bootstrapOperationalServing(mart,tenantId);
  const kind=jobKind(command,mode),baseline=await tenantTransaction(mart,tenantId,client=>readBaseline(client,tenantId),true);
  const config=await resolveOdooSourceConfig(environment,{tenantId,sourceId:baseline.sourceId});
  const owner=createOdooSourcePool(config),reader=createOdooSourcePool(config),runId=randomUUID();
  try {
   const source=new OdooOperationalSource(owner,reader,config,baseline);
   const operations=new AnalyticsOperations({store:new PostgresOperationalStore(mart,runId),source,runId:()=>runId,clock:()=>new Date(),impact:{through:baseline.to,movingAverageWindows:[],runningTotals:false,yearOverYear:false,contribution:false,snapshotDependencies:()=>[]}});
   const run=await operations.run({tenantId,kind,actorId:environment.ANALYTICS_OPERATOR_ID??'local-operator',trigger:'operator'});
   const details=await tenantTransaction(mart,tenantId,async client=>(await client.query('SELECT details FROM mart.analytics_run_details WHERE tenant_id=$1 AND run_id=$2',[tenantId,run.runId])).rows[0].details,true);
   return {run,details};
  }finally{await Promise.all([owner.end(),reader.end()]);}
 }finally{await mart.end();}
}
function jobKind(command:string,mode:string|undefined):AnalyticsJobRequest['kind'] {
 if(command==='sync'||command==='sweep'){if(mode)throw new Error('Unexpected reconciliation mode');return command;}
 if(command==='reconcile'&&(mode==='affected'||mode==='daily'||mode==='deep'))return mode;
 throw new Error('Usage: analytics sync|sweep --tenant ID; analytics reconcile --tenant ID --mode affected|daily|deep');
}
