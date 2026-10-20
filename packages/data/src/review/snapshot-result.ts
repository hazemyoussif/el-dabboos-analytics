import type {PoolClient} from 'pg';
import {requiredMeasures,semanticCatalog,timeDimensions,compatibleQuantityMetrics,AnalyticsResultLimitError} from '@el-dabboos/domain';
import type {AnalyticsResult,AnalyticsQuery,AnalyticsContext,DateRange,PublishedAnalyticsRelease} from '@el-dabboos/domain';
import {periodKeys} from '../calendar.ts';
import {querySlots} from '../postgres/slot-plan.ts';
import {analyzeRows} from '../postgres/query-analysis.ts';
import {bind,numericOutput} from '../postgres/sql.ts';
import {groupedValueExpression,groupedUnsafeExpression} from '../postgres/grouped-value.ts';
import {reviewSnapshotBase} from './snapshot-selection.ts';
import {businessDefinitionVersion} from '../business/definitions.ts';
import {reviewDefinitionVersion} from './definitions.ts';
interface SnapshotScope {query:AnalyticsQuery;context:AnalyticsContext;range:DateRange;family:'review'|'business';release:PublishedAnalyticsRelease;revision:string;maxGroups:number}
interface SnapshotOperand {invalid:boolean;value:string|null;through:string|null;observed:boolean;unsafe:boolean;numerator:string|null;denominator:string|null}
/** Complete observations replace populations; exact decimal operands precede JS ratio calculation. */
export async function snapshotReviewResult(client:PoolClient,scope:SnapshotScope):Promise<AnalyticsResult>{
 const {query,range,context,release,revision}=scope;
 const keys=query.groupBy?periodKeys(range,query.groupBy):[null];
 if(keys.length>scope.maxGroups)throw new AnalyticsResultLimitError(query.groupBy!);
 const selected=[];
 for(const slot of querySlots({...query,dateRange:range},keys).current){
  const operand=await snapshotOperand(client,scope,slot.to!);
  if(!query.groupBy||operand.observed)selected.push({key:slot.key,value:snapshotValue(query,operand),through:operand.through});
 }
 const through=selected.flatMap(row=>row.through?[row.through]:[]).sort().at(-1);
 const evidence=(await client.query(`SELECT max(extraction.source_cutoff) cutoff FROM mart.analytics_serving_members member
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 WHERE member.tenant_id=$1 AND member.revision_id=$2 AND member.family=$3 AND member.month<=date_trunc('month',$4::date)`,[context.tenantId,revision,scope.family,range.to])).rows[0];
 const metric=semanticCatalog[query.metric];
 return {metric:query.metric,groupBy:query.groupBy??null,rows:analyzeRows(selected.map(({key,value})=>({key,value})),query,false),metadata:{
  sourceId:'postgres-review',executedAt:new Date().toISOString(),servingRevision:revision,release,
  ...(evidence?.cutoff?{sourceAsOf:evidence.cutoff.toISOString()}:{}),metricType:metric.type,semantics:metric.semantics.kind,
  ...(metric.presentation.unit?{unit:metric.presentation.unit}:{}),...(query.analysis?{analysis:query.analysis}:{}),
  ...(through?{dataThrough:through,snapshotAsOf:through}:{})}};
}
async function snapshotOperand(client:PoolClient,scope:SnapshotScope,through:string):Promise<SnapshotOperand>{
 const {query,context,family}=scope,semantics=semanticCatalog[query.metric].semantics;
 const params:unknown[]=[context.tenantId,requiredMeasures(query.metric),through,family,(family==='business'?businessDefinitionVersion:reviewDefinitionVersion)()];
 const filters=[...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>{
  const value=timeDimensions.includes(filter.dimension)?`to_char(base.business_date::date,${bind(params,({date:'YYYY-MM-DD',month:'YYYY-MM',quarter:'YYYY-"Q"Q',year:'YYYY'} as Record<string,string>)[filter.dimension])})`:`base.dimensions->>${bind(params,filter.dimension)}`;
  return `${value}=ANY(${bind(params,filter.values)}::text[])`;
 });
 const ratio=semantics.kind==='ratio'||semantics.kind==='duration_derived';
 const components=ratio?`,sum(base.value) FILTER(WHERE base.measure_id=${bind(params,semantics.numerator)})::text numerator,sum(base.value) FILTER(WHERE base.measure_id=${bind(params,semantics.denominator)})::text denominator`:`,NULL::text numerator,NULL::text denominator`;
 const value=groupedValueExpression(query,params),unsafe=groupedUnsafeExpression(query,params);
 const quantity=compatibleQuantityMetrics.includes(query.metric as import('@el-dabboos/domain').BusinessMetricId);
 const invalid=quantity?"min(base.dimensions->>'uom') IS DISTINCT FROM max(base.dimensions->>'uom') OR coalesce(bool_or(coalesce(base.dimensions->>'uom','unassigned')='unassigned'),false)":'false';
 return (await client.query<SnapshotOperand>(`${reviewSnapshotBase},visible AS (SELECT * FROM base ${filters.length?'WHERE '+filters.join(' AND '):''})
 SELECT (${value})::text value,${unsafe} unsafe,${invalid} invalid,max(base.business_date)::text through,
 EXISTS(SELECT 1 FROM observations) observed${components} FROM visible base`,params)).rows[0]!;
}
function snapshotValue(query:AnalyticsQuery,operand:SnapshotOperand){
 if(operand.unsafe)throw new Error('Unsafe SQL numeric output');
 if(operand.invalid)throw new Error('Compatible base UOM required');
 const semantics=semanticCatalog[query.metric].semantics;
 if(semantics.kind==='ratio'||semantics.kind==='duration_derived'){
  const denominator=numericOutput(operand.denominator)??0;
  return denominator===0?null:(numericOutput(operand.numerator)??0)/denominator*semantics.scale;
 }
 if(operand.value!==null)return numericOutput(operand.value);
 return operand.observed&&semantics.kind==='snapshot'&&semantics.aggregation!=='max'?0:null;
}
