import {randomUUID} from 'node:crypto';
import {createMartPool,createOdooSourcePool,tenantTransaction,readBaseline,OdooSnapshotLease,reviewMapping,OdooReviewReader,exposeReviewMonth} from '@el-dabboos/data';
import {resolveOdooSourceConfig} from './source-connections.ts';
import {assertHostedMartUrl} from './hosted-mart-url.ts';
/** Explicit operator month exposure; no Finance approval record is required or fabricated. */
export async function exposeAnalyticsReview(tenantId:string,month:string,environment:NodeJS.ProcessEnv) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Explicit YYYY-MM month required');
 const mart=createMartPool(assertHostedMartUrl(environment.MART_INGESTOR_URL,environment,'Configured mart writer required'),1);
 try{
  const baseline=await tenantTransaction(mart,tenantId,client=>readBaseline(client,tenantId),true);
  const config=await resolveOdooSourceConfig(environment,{tenantId,sourceId:baseline.sourceId});
  const owner=createOdooSourcePool(config),reader=createOdooSourcePool(config);
  try{
   const lease=await OdooSnapshotLease.open(owner,config,config.snapshotMaxDurationMs,config.credentialPolicy);
   try{
    const mapping=reviewMapping({tenantId,sourceId:baseline.sourceId,currency:baseline.reportingCurrency,timeZone:baseline.mappings[0]!.measures[0]!.timeZone,datasetId:`review:${month}:${randomUUID()}`});
    const source=new OdooReviewReader(reader,config,lease,{month,mapping});
    return await exposeReviewMonth(mart,{tenantId,month,mapping,cutoff:lease.evidence.sourceAsOf,revision:lease.evidence.frozenRevision,facts:source.facts(),controls:()=>source.controls(),assertAlive:()=>lease.assertAlive()});
   }finally{await lease.close();}
  }finally{await Promise.all([owner.end(),reader.end()]);}
 }finally{await mart.end();}
}
