import type {PoolClient} from 'pg';
import {requiredMeasures,semanticCatalog} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,AnalyticsReadOptions,AnalyticsResult,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {readGroupedSql} from '../postgres/result-window.ts';
import {groupedValueExpression,groupedUnsafeExpression} from '../postgres/grouped-value.ts';
import {bind} from '../postgres/sql.ts';
import {sourceDisplayLabel} from '../postgres/query-labels.ts';
import {financeSnapshotCandidates} from './finance-selection.ts';

export async function groupedFinanceResult(client:PoolClient,query:AnalyticsQuery,context:AnalyticsContext,capabilities:PublishedAnalyticsCapabilities,options:{maxGroups:number;read?:AnalyticsReadOptions}):Promise<AnalyticsResult>{
 const {maxGroups,read}=options;
 const end=query.dateRange?.to??capabilities.releases[0]!.period!.to;
 const snapshot=(await client.query(`WITH candidates AS (${financeSnapshotCandidates(query,context)}) SELECT candidates.*,snapshot_date::text snapshot_day FROM candidates WHERE snapshot_date<=$2::date ORDER BY snapshot_date DESC,priority DESC LIMIT 1`,[context.tenantId,end])).rows[0];
 const metric=semanticCatalog[query.metric],percentage=Boolean(query.analysis?.percentageContribution);
 const metadata:AnalyticsResult['metadata']={sourceId:'postgres',executedAt:new Date().toISOString(),metricType:percentage?'percentage':metric.type,semantics:metric.semantics.kind,...(query.analysis?{analysis:query.analysis}:{}),...(percentage?{unit:'%'}:metric.presentation.unit?{unit:metric.presentation.unit}:{})};
 if(!snapshot)return {metric:query.metric,groupBy:query.groupBy??null,rows:[],metadata:{...metadata,availability:{state:'DATA_NOT_READY',reason:'no_snapshot'}}};
 const params:unknown[]=[context.tenantId,snapshot.snapshot_id,requiredMeasures(query.metric)];
 const predicates=[...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>{
  if(filter.dimension!=='customer')throw new Error('Uncertified Finance policy dimension');
  return `customer.customer_id=ANY(${bind(params,filter.values)}::text[])`;
 });
 const expression=groupedValueExpression(query,params),unsafe=groupedUnsafeExpression(query,params);
 const text=`WITH base AS (SELECT customer.customer_id,customer.label,operand.key measure_id,operand.value::numeric value
 FROM mart.finance_snapshot_customers customer CROSS JOIN LATERAL jsonb_each_text(customer.actual_values) operand
 WHERE customer.tenant_id=$1 AND customer.snapshot_id=$2 AND operand.key=ANY($3::text[]) ${predicates.length?'AND '+predicates.join(' AND '):''})
 SELECT base.customer_id key,${expression} value,${unsafe} unsafe,min(base.label) label,${bind(params,snapshot.snapshot_day)}::date through,false invalid FROM base GROUP BY 1`;
 const revision=String((await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[context.tenantId])).rows[0]?.revision_id);
 const selected=await readGroupedSql(client,{query,context,input:{text,params},revision,maxGroups,...(read?{read}:{})});
 const asOf=String(snapshot.snapshot_day);
 return {metric:query.metric,groupBy:query.groupBy??null,rows:selected.rows,metadata:{...metadata,servingRevision:revision,
 ...(selected.window?{window:selected.window}:{}),dimensionLabels:Object.fromEntries(Object.entries(selected.labels).map(([key,label])=>[key,sourceDisplayLabel(label,context.locale)])),
 drillReleases:Object.fromEntries(selected.rows.map(row=>[row.key!,snapshot.snapshot_id])),snapshotAsOf:asOf,dataThrough:asOf,sourceAsOf:snapshot.source_cutoff.toISOString(),
 reconciliation:{status:'exact',reference:snapshot.snapshot_id,definitionReference:capabilities.releases[0]!.certificationReference},
 release:{datasetId:snapshot.snapshot_id,sourceId:capabilities.releases[0]!.sourceId,mappingId:'trusted-finance-customer-snapshot',mappingVersion:'1',certificationReference:snapshot.definition_version,outputCertificationReference:`Exact historical snapshot: ${snapshot.snapshot_id}`}}};
}
