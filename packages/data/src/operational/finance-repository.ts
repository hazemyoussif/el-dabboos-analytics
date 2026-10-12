import type {Pool} from 'pg';
import {publishedQueryIssues,semanticCatalog,validateQuery,AnalyticsResultLimitError} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,AnalyticsResult,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {numericOutput} from '../postgres/sql.ts';
import {sourceDisplayLabel} from '../postgres/query-labels.ts';
import {analyzeRows} from '../postgres/query-analysis.ts';
import {periodKeys} from '../calendar.ts';
import {monthEnd} from './receivables.ts';
import {receivableMeasures} from '../receivable-aging.ts';
/** Reads persisted exact customer vectors; no source, residual reconstruction or proof execution. */
export class FinanceSnapshotRepository {
 constructor(private readonly pool:Pool,private readonly timeout=15000,private readonly maxGroups=3000){}
 async capabilities(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities|null>{
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const row=(await client.query(`
    SELECT min(publication.snapshot_date)::text first,max(publication.snapshot_date)::text last,
      min(mapping.source_id) source_id,
      min(COALESCE(binding.reference,mapping.approval_reference)) certification_reference
    FROM mart.finance_snapshot_publications publication
    JOIN mart.finance_snapshot_evidence evidence
      ON evidence.tenant_id=publication.tenant_id AND evidence.snapshot_id=publication.snapshot_id
    JOIN mart.mapping_releases mapping
      ON mapping.tenant_id=evidence.tenant_id AND mapping.dataset_id=evidence.anchor_dataset
    LEFT JOIN mart.historical_release_members member
      ON member.tenant_id=evidence.tenant_id AND member.dataset_id=evidence.anchor_dataset AND member.kind='aging'
    LEFT JOIN mart.historical_serving_bindings binding
      ON binding.tenant_id=member.tenant_id AND binding.reference=member.reference
    WHERE publication.tenant_id=$1
   `,[context.tenantId])).rows[0];
   if(!row?.first||!row?.last)return null;
   const customerMetrics=new Set(receivableMeasures.filter(metric=>!['gross_open_receivable_components','credit_balances'].includes(metric)));
   const capabilities=[...receivableMeasures,'overdue_receivable_percentage' as const].map(metric=>({
    metric,summary:true,
    dimensions:[...(customerMetrics.has(metric as typeof receivableMeasures[number])||metric==='overdue_receivable_percentage'?['customer' as const]:[]),'month' as const],
    analyses:['ranking','topN','percentageContribution'] as const
   }));
   return {tenantId:context.tenantId,mode:'certified',releases:[{
    datasetId:'trusted-finance-snapshots',
    sourceId:row.source_id,
    mappingId:'trusted-finance-customer-snapshot',
    mappingVersion:'1',
    certificationReference:row.certification_reference,
    period:{from:row.first,to:row.last},
    selectionSemantics:'latest_snapshot',
    capabilities
   }]};
  },true,this.timeout);
 }
 async execute(query:AnalyticsQuery,context:AnalyticsContext,capabilities:PublishedAnalyticsCapabilities):Promise<AnalyticsResult>{
  validateQuery(query,context);
  if(publishedQueryIssues({...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]},capabilities).length)throw new Error('Uncertified Finance query');
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const params:unknown[]=[context.tenantId];
   const cutoffs=query.groupBy==='month'?periodKeys(query.dateRange!,'month').map(month=>({key:month,end:monthEnd(month)})).filter(slot=>slot.end<=query.dateRange!.to):[{key:null,end:query.dateRange?.to??capabilities.releases[0]!.period!.to}];
   params.push(JSON.stringify(cutoffs));const conditions=financeFilters(query,context,params);
   const expression=financeExpression(query,params),group=query.groupBy==='customer'?'customer.customer_id':'slot.key';
   const result=await client.query(`WITH selected AS MATERIALIZED (
    SELECT slot.key,publication.* FROM jsonb_to_recordset($2::jsonb) slot(key text,"end" date)
    JOIN LATERAL (SELECT * FROM mart.finance_snapshot_publications WHERE tenant_id=$1 AND snapshot_date${query.groupBy==='month'?'=':'<='}slot."end" ORDER BY snapshot_date DESC LIMIT 1) publication ON true)
    SELECT ${group} key,${expression},max(slot.snapshot_date)::text snapshot_date,
     max(evidence.source_cutoff) source_cutoff,min(evidence.anchor_dataset) anchor_dataset,
     min(evidence.source_revision) source_revision,min(slot.snapshot_id) snapshot_id,
     ${query.groupBy==='customer'?'min(customer.label)':'NULL::text'} label
    FROM selected slot
    JOIN mart.finance_snapshot_evidence evidence ON evidence.tenant_id=slot.tenant_id AND evidence.snapshot_id=slot.snapshot_id
    LEFT JOIN mart.finance_snapshot_customers customer ON customer.tenant_id=slot.tenant_id AND customer.snapshot_id=slot.snapshot_id AND ${conditions}
    GROUP BY ${group} ORDER BY ${group} LIMIT ${this.maxGroups+1}`,params);
   if(result.rows.length>this.maxGroups)throw new AnalyticsResultLimitError(query.groupBy!);
   const rows=result.rows.filter(row=>query.groupBy!=='customer'||row.key!==null).map(row=>({key:row.key as string|null,value:financeValue(query,row)}));
   const latest=result.rows.map(row=>row.snapshot_date as string).sort().at(-1),evidence=result.rows.find(row=>row.snapshot_date===latest),metric=semanticCatalog[query.metric];
   const metadata:AnalyticsResult['metadata']={sourceId:'postgres',executedAt:new Date().toISOString(),metricType:query.analysis?.percentageContribution?'percentage':metric.type,semantics:metric.semantics.kind,...(query.analysis?{analysis:query.analysis}:{}),...(query.analysis?.percentageContribution?{unit:'%'}:metric.presentation.unit?{unit:metric.presentation.unit}:{})};
   if(!latest)return {metric:query.metric,groupBy:query.groupBy??null,rows:[{key:null,value:null}],metadata:{...metadata,availability:{state:'DATA_NOT_READY',reason:'no_snapshot'}}};
   return {metric:query.metric,groupBy:query.groupBy??null,rows:analyzeRows(rows,query,false),metadata:{...metadata,drillReleases:Object.fromEntries(result.rows.filter(row=>row.key!==null).map(row=>[row.key,row.snapshot_id])),snapshotAsOf:latest,reconciliation:{status:'exact',reference:evidence!.snapshot_id,definitionReference:capabilities.releases[0]!.certificationReference},dataThrough:latest,sourceAsOf:evidence!.source_cutoff.toISOString(),dimensionLabels:Object.fromEntries(result.rows.filter(row=>row.label).map(row=>[row.key,sourceDisplayLabel(row.label,context.locale)])),release:{datasetId:evidence!.snapshot_id,sourceId:capabilities.releases[0]!.sourceId,mappingId:'trusted-finance-customer-snapshot',mappingVersion:'1',certificationReference:`Standing Finance definition: ${evidence!.anchor_dataset}`,outputCertificationReference:`Exact historical snapshot: ${evidence!.snapshot_id}`}}};
  },true,this.timeout);
 }
}
export function financeMetric(metric:AnalyticsQuery['metric']){return (receivableMeasures as readonly string[]).includes(metric)||metric==='overdue_receivable_percentage';}
export function financeFilters(query:AnalyticsQuery,context:AnalyticsContext,params:unknown[]){
 return [...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>{
  if(filter.dimension!=='customer')throw new Error('Uncertified Finance policy dimension');
  params.push(filter.values);return `customer.customer_id=ANY($${params.length}::text[])`;
 }).join(' AND ')||'true';
}
function financeExpression(query:AnalyticsQuery,params:unknown[]){
 const semantics=semanticCatalog[query.metric].semantics;
 if(semantics.kind==='ratio'){
  params.push(semantics.numerator);const numerator=`$${params.length}`;params.push(semantics.denominator);
  return `coalesce(sum((customer.actual_values->>${numerator})::numeric),0)::text numerator,coalesce(sum((customer.actual_values->>$${params.length})::numeric),0)::text denominator`;
 }
 params.push(query.metric);return `coalesce(sum((customer.actual_values->>$${params.length})::numeric),0)::text value`;
}
function financeValue(query:AnalyticsQuery,row:{value?:string;numerator?:string;denominator?:string}){
 const semantics=semanticCatalog[query.metric].semantics;
 if(semantics.kind!=='ratio')return numericOutput(row.value??null);
 const denominator=numericOutput(row.denominator??null);return denominator===null||denominator===0?null:numericOutput(row.numerator??null)!/denominator*semantics.scale;
}
