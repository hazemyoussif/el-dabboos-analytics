import { openOdooReadLease } from '@el-dabboos/data';
import {randomUUID} from 'node:crypto';
import {createMartPool,createOdooSourcePool,tenantTransaction,readBaseline,reviewMapping,OdooReviewReader,OdooBusinessReader,businessMapping,withSalesCommandMapping,exposeReviewMonth} from '@el-dabboos/data';
import {resolveOdooSourceConfig} from './source-connections.ts';
import {assertHostedMartUrl} from './hosted-mart-url.ts';
/** Explicit operator month exposure; no Finance approval record is required or fabricated. */
export async function exposeAnalyticsReview(tenantId:string,month:string,environment:NodeJS.ProcessEnv,family:'review'|'business'='review',salesCommand=false) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Explicit YYYY-MM month required');
 const mart=createMartPool(assertHostedMartUrl(environment.MART_INGESTOR_URL,environment,'Configured mart writer required'),1);
 try{
  const baseline=await tenantTransaction(mart,tenantId,client=>readBaseline(client,tenantId),true);
  const config=await resolveOdooSourceConfig(environment,{tenantId,sourceId:baseline.sourceId});
  const owner=createOdooSourcePool(config),reader=createOdooSourcePool(config);
  try{
   const lease=await openOdooReadLease(owner,config);
   try{
    const baseMapping=(family==='business'?businessMapping:reviewMapping)({tenantId,sourceId:baseline.sourceId,currency:baseline.reportingCurrency,timeZone:baseline.mappings[0]!.measures[0]!.timeZone,datasetId:`${family}:${month}:${randomUUID()}`,current:month===new Intl.DateTimeFormat('en-CA',{timeZone:baseline.mappings[0]!.measures[0]!.timeZone,year:'numeric',month:'2-digit'}).format(new Date(lease.evidence.sourceAsOf)).slice(0,7)});
    const mapping=salesCommand?withSalesCommandMapping(baseMapping,month===new Intl.DateTimeFormat('en-CA',{timeZone:baseline.mappings[0]!.measures[0]!.timeZone,year:'numeric',month:'2-digit'}).format(new Date(lease.evidence.sourceAsOf)).slice(0,7)):baseMapping;
    const source=new (family==='business'?OdooBusinessReader:OdooReviewReader)(reader,config,lease,{month,mapping});
    return await exposeReviewMonth(mart,{tenantId,month,mapping,cutoff:lease.evidence.sourceAsOf,revision:lease.evidence.frozenRevision,facts:source.facts(),controls:()=>source.controls(),assertAlive:()=>lease.assertAlive(),completeSourceRead:async()=>{await lease.assertAlive();await lease.close();}},family);
   }finally{await lease.close();}
  }finally{await Promise.all([owner.end(),reader.end()]);}
 }finally{await mart.end();}
}
