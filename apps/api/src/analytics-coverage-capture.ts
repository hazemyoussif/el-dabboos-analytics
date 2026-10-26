import {readFile} from 'node:fs/promises';
import {validateCustomerProductPopulationBasis} from '@el-dabboos/domain';
import {captureCustomerCoverage,createMartPool,createOdooSourcePool,readBaseline,tenantTransaction} from '@el-dabboos/data';
import {analyticsOperatorTrigger} from './analytics-jobs.ts';
import {assertHostedMartUrl} from './hosted-mart-url.ts';
import {resolveOdooSourceConfig} from './source-connections.ts';

export async function executeCoverageCapture(tenantId:string,extra:string[],environment:NodeJS.ProcessEnv){
 if(extra.length!==4||extra[0]!=='--month'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(extra[1]??'')||extra[2]!=='--basis-file'||!extra[3])throw new Error('Explicit --month and --basis-file required');
 analyticsOperatorTrigger(environment);
 const population:unknown=JSON.parse(await readFile(extra[3],'utf8'));validateCustomerProductPopulationBasis(population);
 const mart=createMartPool(assertHostedMartUrl(environment.MART_INGESTOR_URL,environment,'Coverage capture mart configuration required'),1);
 try{
  const baseline=await tenantTransaction(mart,tenantId,client=>readBaseline(client,tenantId),true);
  const config=await resolveOdooSourceConfig(environment,{tenantId,sourceId:baseline.sourceId});
  const owner=createOdooSourcePool(config),reader=createOdooSourcePool(config);
  try{return await captureCustomerCoverage({mart,owner,reader,config,month:extra[1]!,population});}
  finally{await Promise.all([owner.end(),reader.end()]);}
 }finally{await mart.end();}
}
