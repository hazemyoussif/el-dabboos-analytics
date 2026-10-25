import {createMartPool,createOdooSourcePool,tenantTransaction,readBaseline,observeInventoryAvailability} from '@el-dabboos/data';
import {assertHostedMartUrl} from './hosted-mart-url.ts';
import {resolveOdooSourceConfig} from './source-connections.ts';
import {analyticsOperatorTrigger} from './analytics-jobs.ts';

/** Explicit protected operator; normal report refresh only reads prepared data. */
export async function executeInventoryObservation(tenantId:string,month:string,environment:NodeJS.ProcessEnv){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Explicit inventory observation month required');
 analyticsOperatorTrigger(environment);
 const mart=createMartPool(assertHostedMartUrl(environment.MART_INGESTOR_URL,environment,'Inventory observation mart configuration required'),1);
 try{
  const baseline=await tenantTransaction(mart,tenantId,client=>readBaseline(client,tenantId),true);
  const config=await resolveOdooSourceConfig(environment,{tenantId,sourceId:baseline.sourceId});
  const owner=createOdooSourcePool(config),reader=createOdooSourcePool(config);
  try{return await observeInventoryAvailability({mart,owner,reader,config,month});}
  finally{await Promise.all([owner.end(),reader.end()]);}
 }finally{await mart.end();}
}
