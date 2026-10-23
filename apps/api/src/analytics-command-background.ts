import {createMartPool,createOdooSourcePool,tenantTransaction,readBaseline,OdooSnapshotUnavailable,runCommandBackgroundUnit} from '@el-dabboos/data';
import {assertHostedMartUrl} from './hosted-mart-url.ts';
import {resolveOdooSourceConfig} from './source-connections.ts';
import {drainCommandBackgroundUnits} from './analytics-background-drain.ts';
import {analyticsOperatorTrigger} from './analytics-jobs.ts';

/** One awaited background unit; the scheduler owns repetition, never an HTTP request. */
export async function executeCommandBackground(tenantId:string,environment:NodeJS.ProcessEnv,sweepAllocations=false){
 const trigger=analyticsOperatorTrigger(environment);
 const mart=createMartPool(assertHostedMartUrl(environment.MART_INGESTOR_URL,environment,'Command background mart configuration required'),2);
 const sourcePools:ReturnType<typeof createOdooSourcePool>[]=[];
 try{
  const baseline=await tenantTransaction(mart,tenantId,client=>readBaseline(client,tenantId),true);
  return await drainCommandBackgroundUnits(()=>runCommandBackgroundUnit({mart,tenantId,actorId:environment.ANALYTICS_OPERATOR_ID??'local-operator',trigger,sweepAllocations,
   freshnessTargetSeconds:Number(environment.ANALYTICS_FRESHNESS_TARGET_SECONDS??'600'),
   openSource:async()=>{
    const config=await resolveOdooSourceConfig(environment,{tenantId,sourceId:baseline.sourceId});
    const owner=createOdooSourcePool(config),reader=createOdooSourcePool(config);
    sourcePools.push(owner,reader);return {owner,reader,config};
   },
   observe:event=>process.stderr.write(JSON.stringify({stage:'command-background',...event})+'\n'),
  }));
 }catch(error){if(error instanceof OdooSnapshotUnavailable)throw error;throw new CommandBackgroundUnavailable(error);}
 finally{await Promise.all(sourcePools.map(pool=>pool.end()));await mart.end();}
}
export class CommandBackgroundUnavailable extends Error {
 constructor(error:unknown){
  const code=error&&typeof error==='object'&&'code' in error&&typeof error.code==='string'&&/^[A-Z0-9]{5}$/.test(error.code)?error.code:'UNAVAILABLE';
  super(`Command background unit unavailable (${code}).`);
 }
}
