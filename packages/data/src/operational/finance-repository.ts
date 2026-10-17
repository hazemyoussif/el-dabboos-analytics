import {FinanceSummaryReads,financeSummaryValue} from './finance-summary.ts';
import {readServingRevision} from '../postgres/serving-revision.ts';
import {groupedFinanceResult} from './finance-grouped-query.ts';
import type {AnalyticsReadOptions} from '@el-dabboos/domain';
import type {Pool} from 'pg';
import {publishedQueryIssues,semanticCatalog,validateQuery,AnalyticsResultLimitError} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,AnalyticsResult,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {sourceDisplayLabel} from '../postgres/query-labels.ts';
import {analyzeRows} from '../postgres/query-analysis.ts';
import {periodKeys} from '../calendar.ts';
import {monthEnd} from './receivables.ts';
import {financeCapabilities} from './finance-capabilities.ts';
/** Reads persisted exact customer vectors; no source, residual reconstruction or proof execution. */
export class FinanceSnapshotRepository {
 constructor(private readonly pool:Pool,private readonly timeout=15000,private readonly maxGroups=3000,private readonly summaries?:FinanceSummaryReads){}
 async capabilities(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities|null>{
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   return financeCapabilities(client,context);
  },true,this.timeout);
 }
 async execute(query:AnalyticsQuery,context:AnalyticsContext,capabilities:PublishedAnalyticsCapabilities,read?:AnalyticsReadOptions):Promise<AnalyticsResult>{
  validateQuery(query,context);
  if(publishedQueryIssues({...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]},capabilities).length)throw new Error('Uncertified Finance query');
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const revision=await readServingRevision(client,context.tenantId,read?.revision);
   if(query.groupBy==='customer')return groupedFinanceResult(client,query,context,capabilities,{maxGroups:this.maxGroups,...(read?{read}:{})});
   const params:unknown[]=[context.tenantId];
   const cutoffs=query.groupBy==='month'?periodKeys(query.dateRange!,'month').map(month=>({key:month,end:monthEnd(month)})).filter(slot=>slot.end<=query.dateRange!.to):[{key:null,end:query.dateRange?.to??capabilities.releases[0]!.period!.to}];
   params.push(JSON.stringify(cutoffs));const conditions=financeFilters(query,context,params);
   const selected=await (this.summaries??new FinanceSummaryReads()).read(client,{query,context,params,conditions,maxGroups:this.maxGroups});
   if(selected.length>this.maxGroups)throw new AnalyticsResultLimitError(query.groupBy!);
   const rows=selected.map(row=>({key:row.key,value:financeSummaryValue(query,row)}));
   const latest=selected.map(row=>row.snapshot_date as string).sort().at(-1),evidence=selected.find(row=>row.snapshot_date===latest),metric=semanticCatalog[query.metric];
   const metadata:AnalyticsResult['metadata']={sourceId:'postgres',executedAt:new Date().toISOString(),servingRevision:revision,metricType:query.analysis?.percentageContribution?'percentage':metric.type,semantics:metric.semantics.kind,...(query.analysis?{analysis:query.analysis}:{}),...(query.analysis?.percentageContribution?{unit:'%'}:metric.presentation.unit?{unit:metric.presentation.unit}:{})};
   if(!latest)return {metric:query.metric,groupBy:query.groupBy??null,rows:[{key:null,value:null}],metadata:{...metadata,availability:{state:'DATA_NOT_READY',reason:'no_snapshot'}}};
   return {metric:query.metric,groupBy:query.groupBy??null,rows:analyzeRows(rows,query,false),metadata:{...metadata,drillReleases:Object.fromEntries(selected.filter(row=>row.key!==null).map(row=>[row.key,row.snapshot_id])),snapshotAsOf:latest,reconciliation:{status:'exact',reference:evidence!.snapshot_id,definitionReference:capabilities.releases[0]!.certificationReference},dataThrough:latest,sourceAsOf:evidence!.source_cutoff.toISOString(),dimensionLabels:Object.fromEntries(selected.filter(row=>row.label).map(row=>[row.key,sourceDisplayLabel(row.label!,context.locale)])),release:{datasetId:evidence!.snapshot_id,sourceId:capabilities.releases[0]!.sourceId,mappingId:'trusted-finance-customer-snapshot',mappingVersion:'1',certificationReference:evidence!.definition_version,outputCertificationReference:`Exact historical snapshot: ${evidence!.snapshot_id}`}}};
  },true,this.timeout);
 }
}
export {financeMetric} from './finance-capabilities.ts';
export function financeFilters(query:AnalyticsQuery,context:AnalyticsContext,params:unknown[]){
 return [...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>{
  if(filter.dimension!=='customer')throw new Error('Uncertified Finance policy dimension');
  params.push(filter.values);return `customer.customer_id=ANY($${params.length}::text[])`;
 }).join(' AND ')||'true';
}
