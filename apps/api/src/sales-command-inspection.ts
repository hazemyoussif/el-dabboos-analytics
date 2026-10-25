import { openOdooReadLease } from '@el-dabboos/data';
import {salesCommandSixWeeks} from '@el-dabboos/domain';
import {resolveRelativeDatePreset,salesCommandWidgets} from '@el-dabboos/application';
import {publishedQueryIssues,validDateRange} from '@el-dabboos/domain';
import type {AnalyticsFilter,DateRange,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {createMartPool,createOdooSourcePool,inspectSalesCommandSource,PublishedAnalyticsRepository,readBaseline,tenantTransaction,verifyMartRuntimeRole} from '@el-dabboos/data';
import {resolveOdooSourceConfig} from './source-connections.ts';
import {assertHostedMartUrl} from './hosted-mart-url.ts';

type InspectionStage='mart_identity'|'mart_baseline'|'publication'|'source_configuration'|'source_snapshot'|'source_inspection';
export class SalesCommandInspectionUnavailable extends Error {
 constructor(readonly stage:InspectionStage,readonly code:string){super(`Sales Command Center inspection unavailable at ${stage} (${code}).`);}
}
async function inspectStep<T>(stage:InspectionStage,operation:()=>Promise<T>):Promise<T>{
 try{return await operation();}catch(error){
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'UNAVAILABLE';
  throw new SalesCommandInspectionUnavailable(stage,/^[A-Z_0-9]{2,40}$/.test(code)?code:'UNAVAILABLE');
 }
}

/** Protected offline inspection: runtime-only mart identity, read-only retained source snapshot, no exposure/promotion. */
export async function executeSalesCommandInspection(tenantId:string,extra:string[],environment:NodeJS.ProcessEnv){
 const period=parseInspectionPeriod(extra),now=new Date();
 const mart=createMartPool(assertHostedMartUrl(environment.MART_RUNTIME_URL,environment,'Read-only mart runtime configuration required'),1);
 try{
  await inspectStep('mart_identity',()=>verifyMartRuntimeRole(mart));
  const baseline=await inspectStep('mart_baseline',()=>tenantTransaction(mart,tenantId,client=>readBaseline(client,tenantId),true));
  const timeZone=baseline.mappings[0]!.measures[0]!.timeZone;
  const repository=new PublishedAnalyticsRepository(mart,{reportingCurrencies:{[tenantId]:baseline.reportingCurrency}}),context={tenantId,locale:'en' as const};
  const scope=await inspectStep('publication',()=>repository.createExecutionScope(context)),published=await inspectStep('publication',()=>repository.getPublishedCapabilities(context));
  const config=await inspectStep('source_configuration',()=>resolveOdooSourceConfig(environment,{tenantId,sourceId:baseline.sourceId}));
  const owner=createOdooSourcePool(config),reader=createOdooSourcePool(config);
  try{
   const lease=await inspectStep('source_snapshot',()=>openOdooReadLease(owner,config));
   try{
    const source=await inspectStep('source_inspection',()=>inspectSalesCommandSource(reader,config,lease,period,timeZone));
    await scope.verifyExecution?.();
    return {stage:'sales-command-inspection',tenantId,sourceId:baseline.sourceId,companyIds:config.companyIds,timeZone,reportingCurrency:baseline.reportingCurrency,servingRevision:scope.servingRevision,source,reportRequirements:reportRequirements(published,{period,timeZone,now}),preparedCellReads:'Not performed; this inspection does not establish query acceptance or performance'};
   }finally{await lease.close();}
  }finally{await Promise.all([owner.end(),reader.end()]);}
 }finally{await mart.end();}
}
export function parseInspectionPeriod(extra:string[]):DateRange {
 if(extra.length!==4||extra[0]!=='--from'||extra[2]!=='--to'||!validDateRange({from:extra[1],to:extra[3]}))throw new Error('Use --from YYYY-MM-DD --to YYYY-MM-DD');
 return {from:extra[1]!,to:extra[3]!};
}
function reportRequirements(published:PublishedAnalyticsCapabilities,scope:{period:DateRange;timeZone:string;now:Date}){
 return salesCommandWidgets.map(definition=>({id:definition.id,definitionStatus:definition.reference,queries:definition.widget?.series.map(series=>{
  const range=definition.period==='selected_range'?scope.period:definition.period==='six_weeks'?salesCommandSixWeeks(resolveRelativeDatePreset('today',scope.timeZone,scope.now).to):resolveRelativeDatePreset(definition.period,scope.timeZone,scope.now);
  const query={metric:series.metric,dateRange:range,...(definition.widget?.dimension?{groupBy:definition.widget.dimension}:{}),...(series.analysis?{analysis:series.analysis}:{})};
  const filters:AnalyticsFilter[][]=[[],[{dimension:'customer',values:['unassigned']}],[{dimension:'salesperson',values:['unassigned']}],[{dimension:'customer',values:['unassigned']},{dimension:'salesperson',values:['unassigned']}]];
  return {query,filterCases:filters.map(selected=>({dimensions:selected.map(filter=>filter.dimension),issues:publishedQueryIssues({...query,filters:selected},published)}))};
 })??[]}));
}
