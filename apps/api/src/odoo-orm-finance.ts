import {createMartPool,createOdooSourcePool,openOdooReadLease,readBaseline,tenantTransaction,readFinanceCustomers,readFinanceCompanySummary,publishFinanceSnapshot} from '@el-dabboos/data';
import {resolveOdooSourceConfig} from './source-connections.ts';
import {assertHostedMartUrl} from './hosted-mart-url.ts';

/** Reuses existing independent Finance reconstructions and prepared atomic promotion. */
export async function refreshObservedFinance(tenantId:string,day:string,environment:NodeJS.ProcessEnv){
 const mart=createMartPool(assertHostedMartUrl(environment.MART_MIGRATOR_URL,environment,'Protected Finance publisher required'),1);
 try{
  const baseline=await tenantTransaction(mart,tenantId,client=>readBaseline(client,tenantId),true);
  const config=await resolveOdooSourceConfig(environment,{tenantId,sourceId:baseline.sourceId});
  if(!config.observedCopy)throw new Error('Sealed API copy required for observed Finance refresh');
  const owner=createOdooSourcePool(config),source=createOdooSourcePool(config);
  try{
   const lease=await openOdooReadLease(owner,config);
   try{
    const timeZone=baseline.mappings[0]!.measures[0]!.timeZone;
    const current=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(lease.evidence.sourceAsOf));
    if(day!==current)throw new Error('Finance refresh requires the copy observation day');
    const customers=await readFinanceCustomers(source,lease,config,day);
    const totals=await readFinanceCompanySummary(source,lease,config,day);
    return await publishFinanceSnapshot(mart,{tenantId,date:day,currency:baseline.reportingCurrency,sourceCutoff:lease.evidence.sourceAsOf,sourceRevision:lease.evidence.frozenRevision,totals,customers},()=>lease.assertAlive());
   }finally{await lease.close();}
  }finally{await Promise.all([owner.end(),source.end()]);}
 }finally{await mart.end();}
}
