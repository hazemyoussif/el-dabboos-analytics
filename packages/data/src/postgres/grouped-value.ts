import {semanticCatalog,requiredMeasures} from '@el-dabboos/domain';
import type {AnalyticsQuery} from '@el-dabboos/domain';
import {bind} from './sql.ts';
/** Operands are reduced at the source grain before any output window is selected. */
export function groupedValueExpression(query:AnalyticsQuery,params:unknown[]){
 const semantics=semanticCatalog[query.metric].semantics;
 if(semantics.kind==='comparison_derived')throw new Error('Categorical comparison is unavailable');
 if(semantics.kind==='ratio'||semantics.kind==='duration_derived'){
  const numerator=bind(params,semantics.numerator),denominator=bind(params,semantics.denominator),scale=bind(params,semantics.scale);
  return `coalesce(sum(base.value) FILTER(WHERE base.measure_id=${numerator}),0)/nullif(sum(base.value) FILTER(WHERE base.measure_id=${denominator}),0)*${scale}::numeric`;
 }
 if(semantics.kind==='distinct_count')return `count(DISTINCT nullif(base.dimensions->>${bind(params,semantics.dimension)},'unassigned'))::numeric`;
 const aggregation=semantics.kind==='snapshot'?semantics.aggregation??'sum':query.aggregation??'sum';
 const functionName={sum:'sum',count:'count',average:'avg',min:'min',max:'max'}[aggregation];
 return `${functionName}(base.value)`;
}
/** Preserve the existing six-decimal safe-number boundary for every aggregate operand. */
export function groupedUnsafeExpression(query:AnalyticsQuery,params:unknown[]){
 const semantics=semanticCatalog[query.metric].semantics;
 if(semantics.kind==='distinct_count')return 'false';
 const aggregation=semantics.kind==='snapshot'&&semantics.aggregation==='max'?'max':'sum';
 return requiredMeasures(query.metric).map(measure=>{
  const operand=`${aggregation}(base.value) FILTER(WHERE base.measure_id=${bind(params,measure)})`,normalized=`trim_scale(coalesce((${operand}),0))`;
  return `(scale(${normalized})>6 OR abs(${normalized})*power(10::numeric,scale(${normalized}))>${Number.MAX_SAFE_INTEGER}::numeric)`;
 }).join(' OR ');
}
