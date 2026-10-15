import type {PoolClient} from 'pg';
import {requiredMeasures,semanticCatalog,compatibleQuantityMetrics} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,AnalyticsReadOptions,DateRange} from '@el-dabboos/domain';
import {bind} from '../postgres/sql.ts';
import {dimensionLabelField,sourceDisplayLabel} from '../postgres/query-labels.ts';
import {groupedValueExpression,groupedUnsafeExpression} from '../postgres/grouped-value.ts';
import {readGroupedSql} from '../postgres/result-window.ts';
import {businessDefinitionVersion} from '../business/definitions.ts';
import {reviewDefinitionVersion} from './definitions.ts';

export interface ReviewGroupedScope {query:AnalyticsQuery;context:AnalyticsContext;range:DateRange;family:'review'|'business';revision:string;maxGroups:number;read?:AnalyticsReadOptions}
export async function groupedReviewRows(client:PoolClient,scope:ReviewGroupedScope){
 const {query,context,range,family,revision,maxGroups,read}=scope;
 const params:unknown[]=[context.tenantId,requiredMeasures(query.metric),range.to,family,family==='business'?businessDefinitionVersion():reviewDefinitionVersion()];
 const semantics=semanticCatalog[query.metric].semantics,snapshot=semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';
 const from=snapshot?null:bind(params,range.from);
 const filters=[...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>`base.dimensions->>${bind(params,filter.dimension)}=ANY(${bind(params,filter.values)}::text[])`);
 const group=bind(params,query.groupBy),label=bind(params,dimensionLabelField(query.groupBy));
 const unsafe=groupedUnsafeExpression(query,params),value=groupedValueExpression(query,params),quantities=compatibleQuantityMetrics.includes(query.metric as import('@el-dabboos/domain').BusinessMetricId)&&query.groupBy!=='uom';
 const invalid=quantities?`count(DISTINCT base.dimensions->>'uom')<>1 OR bool_or(coalesce(base.dimensions->>'uom','unassigned')='unassigned')`:'false';
 const text=`WITH facts AS (
 SELECT fact.measure_id,fact.amount value,fact.dimensions,fact.display_labels labels,fact.business_day business_date,fact.entity_id FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id) JOIN mart.review_facts fact USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family=$4 AND extraction.definition_version=$5 AND fact.measure_id=ANY($2::text[])
 AND member.month<=date_trunc('month',$3::date) ${snapshot?'':`AND member.month>=date_trunc('month',${from}::date)`}
 AND fact.business_day<= $3::text ${snapshot?'':`AND fact.business_day>=${from}::text`}
 ),selected AS (${snapshot?`SELECT DISTINCT ON(measure_id,entity_id) * FROM facts ORDER BY measure_id,entity_id,business_date DESC`:'SELECT * FROM facts'}),
 base AS (SELECT * FROM selected)
 SELECT base.dimensions->>${group} key,${value} value,${invalid} invalid,${unsafe} unsafe,
 CASE WHEN count(DISTINCT base.labels->>${label})=1 THEN min(base.labels->>${label}) END label,max(base.business_date)::date through
 FROM base WHERE base.dimensions->>${group} IS NOT NULL ${filters.length?'AND '+filters.join(' AND '):''} GROUP BY 1`;
 const selected=await readGroupedSql(client,{query,context,input:{text,params},revision,maxGroups,...(read?{read}:{})});
 return {...selected,labels:Object.fromEntries(Object.entries(selected.labels).map(([key,label])=>[key,sourceDisplayLabel(label,context.locale)]))};
}
