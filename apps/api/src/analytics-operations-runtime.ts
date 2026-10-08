import {CachedSourceAvailability} from './analytics-source-availability.ts';
import {probeAnalyticsSource} from './analytics-source-probe.ts';
import { createMartPool } from '@el-dabboos/data';
import type { AnalyticsJobRequest } from '@el-dabboos/domain';
import { runConfiguredAnalyticsJob } from './analytics-jobs.ts';
/** Opt-in command composition; trusted report/status reads retain their separate runtime/RLS pool. */
export function manualAnalyticsCommands(provider:string,environment:NodeJS.ProcessEnv) {
 const mode=environment.ANALYTICS_MANUAL_OPERATIONS;
 if(mode===undefined||mode==='disabled')return undefined;
 if(mode!=='enabled'||provider!=='postgres'||!environment.MART_INGESTOR_URL)throw new Error('Manual analytics operations require explicit PostgreSQL writer configuration');
 const writerUrl=environment.MART_INGESTOR_URL;
 const tenantId=environment.ANALYTICS_SOURCE_TENANT_ID??'',sourceId=environment.ANALYTICS_SOURCE_ID??'';
 const availability=new CachedSourceAvailability(tenantId,()=>probeAnalyticsSource(environment,{tenantId,sourceId}));
 availability.start();
 return {availability:(tenantId:string)=>availability.snapshot(tenantId),close:()=>availability.close(),run:async(request:AnalyticsJobRequest)=>{
  const writer=createMartPool(writerUrl,1);
  try {
   const {run,details}=await runConfiguredAnalyticsJob(writer,request,environment);
   return {run,canonicalRevisions:Number(details.canonicalRevisions),servingUpdated:run.status==='passed'&&run.partitionsAffected>0};
  } finally {await writer.end();}
 }};
}
