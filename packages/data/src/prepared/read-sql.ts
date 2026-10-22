import {calendarValueSql} from '../postgres/calendar-sql.ts';
import {compatibleQuantityMetrics,semanticCatalog,requiredMeasures,timeDimensions} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,BusinessMetricId} from '@el-dabboos/domain';
import {groupedValueExpression,groupedUnsafeExpression} from '../postgres/grouped-value.ts';
import {bind} from '../postgres/sql.ts';
import {dimensionLabelField} from '../postgres/display-labels.ts';
import type {PreparedSegment} from './read-plan.ts';
import type {PreparedFamily} from './contracts.ts';

/** Runtime SQL reads only prepared cells. The caller pins and authorizes the published input. */
export function preparedReduction(query:AnalyticsQuery,context:AnalyticsContext,segments:readonly PreparedSegment[],categorical:boolean,family?:PreparedFamily){
 if(query.aggregation&&query.aggregation!=='sum')throw new Error('Uncertified prepared aggregation');
 const semantics=semanticCatalog[query.metric].semantics,metric=semantics.kind==='comparison_derived'?{...query,metric:semantics.base}:query;
 const maximum=semantics.kind==='snapshot'&&semantics.aggregation==='max';
 const params:unknown[]=[context.tenantId,JSON.stringify(segments),requiredMeasures(query.metric)];
 const filters=[...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>`${filterValue(filter.dimension,params)}=ANY(${bind(params,filter.values)}::text[])`);
 const label=dimensionLabelField(query.groupBy),labelOperand=bind(params,label??null);
 const key=categorical?`cell.dimensions->>${bind(params,query.groupBy)}`:'plan.key';
 const value=groupedValueExpression(metric,params),unsafe=groupedUnsafeExpression(metric,params),components=ratioComponents(metric,params,categorical);
 const unitCheck=compatibleQuantityMetrics.includes(query.metric as BusinessMetricId)&&query.groupBy!=='uom';
 const invalid=unitCheck?"(min(base.dimensions->>'uom') FILTER(WHERE base.fact_count>0)) IS DISTINCT FROM (max(base.dimensions->>'uom') FILTER(WHERE base.fact_count>0)) OR coalesce(bool_or(coalesce(base.dimensions->>'uom','unassigned')='unassigned') FILTER(WHERE base.fact_count>0),false)":'false';
 return {params,text:`WITH base AS MATERIALIZED (
 SELECT ${key} key,cell.measure_id,cell.dimensions,${maximum?'cell.maximum':'cell.value'} value,cell.fact_count,
 cell.labels->>${labelOperand} label,${labelOperand}=ANY(cell.conflicting_labels) conflicting_label,cell.data_through
 FROM jsonb_to_recordset($2::jsonb) plan(key text,data_id text,grain_id text,time_grain text,"from" date,"to" date)
 ${family==='business'?'JOIN LATERAL mart.business_prepared_cells($1,plan.data_id,plan.grain_id,plan.time_grain,$3::text[],plan."from",plan."to") cell ON true':'JOIN mart.prepared_cells cell ON cell.tenant_id=$1 AND cell.data_id=plan.data_id AND cell.grain_id=plan.grain_id'}
 AND cell.time_grain=plan.time_grain AND cell.business_date BETWEEN plan."from" AND plan."to"
 WHERE cell.measure_id=ANY($3::text[]) ${filters.length?'AND '+filters.join(' AND '):''}
 ) SELECT base.key,${value} value${components},${unsafe} unsafe,${invalid} invalid,
 CASE WHEN NOT coalesce(bool_or(base.conflicting_label),false) AND min(base.label)=max(base.label) THEN min(base.label) END label,
 max(base.data_through)::text through FROM base ${categorical?'WHERE base.key IS NOT NULL AND base.fact_count>0':''} GROUP BY base.key`};
}
function filterValue(dimension:import('@el-dabboos/domain').DimensionId,params:unknown[]){
 if(!timeDimensions.includes(dimension))return `cell.dimensions->>${bind(params,dimension)}`;
 return calendarValueSql(dimension,'cell.business_date');
}

function ratioComponents(query:AnalyticsQuery,params:unknown[],categorical:boolean){
 const semantics=semanticCatalog[query.metric].semantics;
 if(categorical||semantics.kind!=='ratio'&&semantics.kind!=='duration_derived')return '';
 return `,coalesce(sum(base.value) FILTER(WHERE base.measure_id=${bind(params,semantics.numerator)}),0)::text numerator,coalesce(sum(base.value) FILTER(WHERE base.measure_id=${bind(params,semantics.denominator)}),0)::text denominator`;
}
