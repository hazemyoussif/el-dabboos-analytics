import {calendarValueSql} from '../postgres/calendar-sql.ts';
import type {PoolClient} from 'pg';
import {requiredMeasures,semanticCatalog,timeDimensions,compatibleQuantityMetrics} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,AnalyticsReadOptions,DateRange} from '@el-dabboos/domain';
import {bind} from '../postgres/sql.ts';
import {dimensionLabelField,sourceDisplayLabel} from '../postgres/query-labels.ts';
import {groupedValueExpression,groupedUnsafeExpression} from '../postgres/grouped-value.ts';
import {readGroupedSql} from '../postgres/result-window.ts';
import {businessDefinitionVersion} from '../business/definitions.ts';
import {reviewDefinitionVersion} from './definitions.ts';
import {groupedReviewBase} from './grouped-base.ts';

export interface ReviewGroupedScope {query:AnalyticsQuery;context:AnalyticsContext;range:DateRange;family:'review'|'business';revision:string;maxGroups:number;read?:AnalyticsReadOptions}
export async function groupedReviewRows(client:PoolClient,scope:ReviewGroupedScope){
 const {query,context,range,family,revision,maxGroups,read}=scope;
 const definitionVersion=(family==='business'?businessDefinitionVersion:reviewDefinitionVersion)();
 const semantics=semanticCatalog[query.metric].semantics,snapshot=semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';
 const params:unknown[]=[context.tenantId,requiredMeasures(query.metric),range.to,...(snapshot?[family,definitionVersion]:[])];
 const filters=[...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>`${timeDimensions.includes(filter.dimension)?calendarValueSql(filter.dimension,'base.business_date::date'):`base.dimensions->>${bind(params,filter.dimension)}`}=ANY(${bind(params,filter.values)}::text[])`);
 const group=bind(params,query.groupBy),label=bind(params,dimensionLabelField(query.groupBy));
 const unsafe=groupedUnsafeExpression(query,params),value=groupedValueExpression(query,params),quantities=compatibleQuantityMetrics.includes(query.metric as import('@el-dabboos/domain').BusinessMetricId)&&query.groupBy!=='uom';
 const invalid=quantities?`min(base.uom) IS DISTINCT FROM max(base.uom) OR bool_or(coalesce(base.uom,'unassigned')='unassigned')`:'false';
 const base=await groupedReviewBase(client,{tenantId:context.tenantId,family,definitionVersion,range,snapshot},params);
 // Reduce full attribution to grouping operands after authorization filters.
 // Single-use event operands may fold into a parallel aggregate; snapshots keep
 // their existing materialization boundary after latest-row selection.
 const distinctDimension=semantics.kind==='distinct_count'?bind(params,semantics.dimension):null;
 const dimensions=distinctDimension?`jsonb_build_object(${distinctDimension}::text,base.dimensions->${distinctDimension}::text)`:"NULL::jsonb";
 const text=`${base},operands AS ${snapshot?'MATERIALIZED':'NOT MATERIALIZED'} (
 SELECT base.dimensions->>${group} key,base.labels->>${label} label,base.value,base.measure_id,base.business_date,
 ${quantities?"base.dimensions->>'uom'":"NULL::text"} uom,${dimensions} dimensions
 FROM base WHERE base.dimensions->>${group} IS NOT NULL ${filters.length?'AND '+filters.join(' AND '):''}
 )
 SELECT base.key,${value} value,${invalid} invalid,${unsafe} unsafe,
 CASE WHEN min(base.label)=max(base.label) THEN min(base.label) END label,max(base.business_date)::date through
 FROM operands base GROUP BY 1`;
 const selected=await readGroupedSql(client,{query,context,input:{text,params},revision,maxGroups,...(read?{read}:{})});
 return {...selected,labels:Object.fromEntries(Object.entries(selected.labels).map(([key,label])=>[key,sourceDisplayLabel(label,context.locale)]))};
}
