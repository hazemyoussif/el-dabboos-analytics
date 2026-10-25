import {createMartPool,readBaseline,tenantTransaction} from '@el-dabboos/data';
import {resolveOdooSourceConfig} from './source-connections.ts';
import {assertHostedMartUrl} from './hosted-mart-url.ts';
import {exposeAnalyticsReview} from './analytics-review-exposure.ts';
import {executeOdooOrmSync} from './odoo-orm-sync.ts';
import {refreshObservedFinance} from './odoo-orm-finance.ts';

interface RefreshOperations {
 business:(month:string)=>Promise<unknown>;review:(month:string)=>Promise<unknown>;
 sync:()=>Promise<{status:string}>;finance:(day:string)=>Promise<unknown>;
 observe?:(phase:string)=>void;
}
/** Complete priority publications before starting the remaining report families. */
export async function refreshObservedReportFamilies(day:string,operations:RefreshOperations){
 if(!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day)))throw new Error('Valid observed day required');
 const month=day.slice(0,7),date=new Date(day+'T00:00:00Z');
 const previous=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-1,1)).toISOString().slice(0,7);
 for(const period of [month,previous])await operations.business(period);
 operations.observe?.('priority_publications_prepared');
 await operations.review(month);
 const sync=await operations.sync();
 if(!['passed','unchanged'].includes(sync.status))throw new Error('Observed core sync did not pass');
 await operations.finance(day);
 operations.observe?.('all_family_publications_prepared');
 return {day,month,comparisonMonth:previous,consistency:'api_observed' as const};
}

export async function executeOdooOrmRefresh(args:readonly string[],environment:NodeJS.ProcessEnv){
 if(![2,3].includes(args.length)||args[0]!=='--tenant'||!args[1]||(args[2]!==undefined&&args[2]!=='--accept-observed')||args[1]!==environment.ODOO_ORM_TENANT_ID)throw new Error('Usage: odoo:orm refresh --tenant ID');
 const tenantId=args[1],selected:NodeJS.ProcessEnv={...environment,ANALYTICS_SOURCE_MODE:'odoo-orm-observed'};
 const mart=createMartPool(assertHostedMartUrl(selected.MART_INGESTOR_URL,selected,'Configured mart writer required'),1);
 try{
  const baseline=await tenantTransaction(mart,tenantId,client=>readBaseline(client,tenantId),true);
  const config=await resolveOdooSourceConfig(selected,{tenantId,sourceId:baseline.sourceId});
  if(!config.observedCopy)throw new Error('Sealed API copy required');
  const pinned={...selected,ODOO_API_STAGE_SCHEMA:config.observedCopy.schema};
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:baseline.mappings[0]!.measures[0]!.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(config.observedCopy.sourceAsOf));
  return refreshObservedReportFamilies(day,{
   business:month=>exposeAnalyticsReview(tenantId,month,pinned,'business',true),
   review:month=>exposeAnalyticsReview(tenantId,month,pinned),
   sync:()=>executeOdooOrmSync(args,pinned),finance:date=>refreshObservedFinance(tenantId,date,pinned),
   observe:phase=>process.stderr.write(JSON.stringify({phase})+'\n'),
  });
 }finally{await mart.end();}
}
