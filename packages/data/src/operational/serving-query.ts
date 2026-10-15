import type { PoolClient } from 'pg';
import { semanticCatalog,requiredMeasures,timeDimensions } from '@el-dabboos/domain';
import type { AnalyticsContext,AnalyticsQuery,AnalyticsRow,MetricSemantics,AnalyticsReadOptions } from '@el-dabboos/domain';
import {groupedServingRows} from './grouped-query.ts';
import { periodKeys } from '../calendar.ts';
import { querySlots } from '../postgres/query-slots.ts';
import type { QuerySlot } from '../postgres/query-slots.ts';
import { numericOutput } from '../postgres/sql.ts';
import { coveredSlot,isSnapshotQuery,coverageMetadata } from './coverage.ts';
import type { ServingCoverage } from './coverage.ts';
import { analyzeRows,compareValues } from '../postgres/query-analysis.ts';
import {trustedRangePartitions} from './range-plan.ts';
import type {TrustedRangePartition} from './range-plan.ts';
import {plannedEventValues} from './planned-values.ts';
import {operationalServingInput as input,servingFilters} from './serving-scope.ts';
export {operationalServingInput,servingFilters} from './serving-scope.ts';
export interface ServingReadBounds {maxGroups:number;revision:string;read?:AnalyticsReadOptions}
export async function servingRows(client:PoolClient,query:AnalyticsQuery,context:AnalyticsContext,coverage:ServingCoverage,bounds:number|ServingReadBounds) {
 const options=typeof bounds==='number'?{maxGroups:bounds,revision:''}:bounds;
 const maxGroups=options.maxGroups;
 validateServingAnalysis(query);
 if(query.groupBy&&!timeDimensions.includes(query.groupBy))return groupedServingRows(client,{query,context,coverage,options});
 const params:unknown[]=[context.tenantId,requiredMeasures(query.metric)];
 const predicates=servingFilters(query,context,params);
 const sql={params,predicates,maxGroups,partitions:isSnapshotQuery(query)?[]:await trustedRangePartitions(client,context.tenantId)};
 const keys=!query.groupBy?[null]:query.dateRange?periodKeys(query.dateRange,query.groupBy):[];
 if(query.analysis?.movingAverage&&keys.length<query.analysis.movingAverage.window)throw new Error('Insufficient historical moving-average coverage');
 const slots=querySlots(query,keys);
 const eligiblePriors=slots.prior.filter(slot=>slot.from!==null&&slot.to!==null&&slot.from>=coverage.from&&slot.to<=coverage.to);
 const values=await slotValues(client,query,slots.current,sql,coverage),priors=await slotValues(client,query,eligiblePriors,sql,coverage);
 const priorValues=new Map(eligiblePriors.map((slot,index)=>[slot.key,priors[index]?.value??null]));
 const derived=semanticCatalog[query.metric].semantics.kind==='comparison_derived';
 const rows:AnalyticsRow[]=keys.map((key,index)=>{
  const value=values[index]?.value??null;if(!slots.comparison)return {key,value};
  const changes=compareValues(value,priorValues.get(key)??null);return derived?{key,value:changes.percentageChange}:{key,value,...changes};
 });
 const dates=values.flatMap(row=>row.through?[row.through]:[]).sort();
 return {rows:analyzeRows(rows,query,!!slots.comparison),dataThrough:dates.at(-1)??null,...coverageMetadata(query,coverage,dates.at(-1)??null,slots.current.some(slot=>!isSnapshotQuery(query)&&slot.from!==null&&slot.to!==null&&slot.from<=coverage.to&&slot.to>=coverage.from&&!coveredSlot(slot,coverage)))};
}
async function slotValues(client:PoolClient,query:AnalyticsQuery,slots:QuerySlot[],sql:{params:unknown[];predicates:string;partitions:TrustedRangePartition[]},coverage:ServingCoverage) {
 if(!slots.length)return [];
 const metric=semanticCatalog[query.metric].semantics;const semantics=metric.kind==='comparison_derived'?semanticCatalog[metric.base].semantics:metric;
 const snapshot=semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';
 const eligible=snapshot?slots:slots.flatMap(slot=>{const covered=coveredSlot(slot,coverage);return covered?[covered]:[];});
 if(!eligible.length)return slots.map(()=>({value:null,through:null}));
 const params=[...sql.params];
 if(snapshot)params.push(JSON.stringify(eligible));const slot=`$${params.length}`;
 const expression=servingExpression(semantics,params);
 let group='';
 if(snapshot&&query.groupBy&&!timeDimensions.includes(query.groupBy)){params.push(query.groupBy);group=`AND base.dimensions->>$${params.length}=slot.match_key`;}
 const range=snapshot?`AND base.business_date=(SELECT max(selected.business_date) FROM ${input.replace(/\bbase\b/g,'selected')} WHERE trusted.tenant_id=$1 AND selected.measure_id=ANY($2::text[]) AND selected.business_date<=slot."to")`:'AND base.business_date BETWEEN slot."from" AND slot."to"';
 const result=snapshot?await client.query(`SELECT slot.key,values.* FROM jsonb_to_recordset(${slot}::jsonb) slot(key text,"from" date,"to" date,match_key text) CROSS JOIN LATERAL
  (SELECT ${expression},max(base.business_date)::text through FROM ${input} WHERE trusted.tenant_id=$1 AND base.measure_id=ANY($2::text[]) AND ${sql.predicates} ${range} ${group}) values`,params):await plannedEventValues(client,{query,slots:eligible,partitions:sql.partitions},{params,predicates:sql.predicates,expression});
 const byKey=new Map(result.rows.map(row=>[row.key,row]));
 return slots.map(item=>{
  const row=byKey.get(item.key);if(!row)return {value:!snapshot&&eligible.some(slot=>slot.key===item.key)&&semantics.kind!=='ratio'&&semantics.kind!=='duration_derived'?0:null,through:null};
  if(semantics.kind==='ratio'||semantics.kind==='duration_derived'){const denominator=numericOutput(row.denominator)!;return {value:denominator===0?null:numericOutput(row.numerator)!/denominator*semantics.scale,through:row.through as string|null};}
  return {value:numericOutput(row.value),through:row.through as string|null};
 });
}
function servingExpression(semantics:MetricSemantics,params:unknown[]) {
 if(semantics.kind==='ratio'||semantics.kind==='duration_derived'){
  params.push(semantics.numerator);const numerator=`$${params.length}`;params.push(semantics.denominator);
  return `coalesce(sum(base.value) FILTER(WHERE measure_id=${numerator}),0)::text numerator,coalesce(sum(base.value) FILTER(WHERE measure_id=$${params.length}),0)::text denominator`;
 }
 if(semantics.kind==='distinct_count'){params.push(semantics.dimension);return `count(DISTINCT nullif(base.dimensions->>$${params.length},'unassigned'))::text value`;}
 return `coalesce(sum(base.value),${semantics.kind==='snapshot'?'NULL':'0'})::text value`;
}

export function validateServingAnalysis(query:AnalyticsQuery) {
 if(!query.analysis?.comparison&&!query.analysis?.movingAverage)return;
 if(query.groupBy!=='month')throw new Error('Historical analyses require monthly buckets');
 if(query.analysis.movingAverage&&![3,6].includes(query.analysis.movingAverage.window))throw new Error('Historical moving average requires three or six monthly buckets');
 const range=query.dateRange;if(!range)throw new Error('Historical analyses require date range');
 const end=new Date(`${range.to}T00:00:00Z`),last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).toISOString().slice(0,10);
 if(!range.from.endsWith('-01')||range.to!==last)throw new Error('Historical monthly analyses require complete months');
}
