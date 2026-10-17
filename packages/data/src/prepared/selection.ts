import {coverageMetadata,coveredSlot} from '../operational/coverage.ts';
import type {ServingCoverage} from '../operational/coverage.ts';
import type {PoolClient} from 'pg';
import {categoricalDimensions,semanticCatalog,preparedMetricBasis,requiredMeasures,AnalyticsResultLimitError} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,AnalyticsReadOptions,DateRange,AnalyticsRow,AnalyticsResultWindow,AnalyticsResult} from '@el-dabboos/domain';
import {periodKeys,monthEnd} from '../calendar.ts';
import {readServingRevision} from '../postgres/serving-revision.ts';
import {readGroupedSql} from '../postgres/result-window.ts';
import {querySlots} from '../postgres/slot-plan.ts';
import type {QuerySlot} from '../postgres/slot-plan.ts';
import {analyzeRows,compareValues} from '../postgres/query-analysis.ts';
import {numericOutput} from '../postgres/sql.ts';
import {sourceDisplayLabel} from '../postgres/display-labels.ts';
import {planPreparedRead,governedPreparedSlots} from './read-plan.ts';
import type {PreparedBinding} from './read-plan.ts';
import {preparedReduction} from './read-sql.ts';
import type {PreparedFamily} from './contracts.ts';
export interface PreparedReadScope {query:AnalyticsQuery;context:AnalyticsContext;range:DateRange;family:PreparedFamily;maxGroups:number;coverage?:ServingCoverage;timeBuckets:'observed'|'complete'|'closed-months';emptySnapshotValue?:0;read?:AnalyticsReadOptions}
export interface PreparedSelection extends Pick<AnalyticsResult['metadata'],'coverage'|'availability'> {rows:AnalyticsRow[];labels:Record<string,string>;dataThrough:string|null;preparedThrough:string|null;window?:AnalyticsResultWindow;revision:string;sourceAsOf?:string;currency:string|undefined;definitionVersion:string|undefined}
/** Runs inside the owning read-only tenant transaction. Source reconstruction is unavailable here. */
export async function readPreparedSelection(client:PoolClient,scope:PreparedReadScope):Promise<PreparedSelection>{
 const {query,context,range,family,maxGroups,read}=scope;
 const revision=await readServingRevision(client,context.tenantId,read?.revision),kind=preparedMetricBasis(query.metric);
 const sealed=(await client.query('SELECT 1 FROM mart.prepared_revision_seals WHERE tenant_id=$1 AND revision_id=$2',[context.tenantId,revision])).rowCount;
 if(!sealed)throw new Error('Prepared publication not ready');
 const bindings=(await client.query<PreparedBinding>(`SELECT binding.data_id,binding.period::text,binding.statistics,binding.source_cutoff,dataset.configuration
 FROM mart.prepared_bindings binding JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
 WHERE binding.tenant_id=$1 AND binding.revision_id=$2 AND binding.family=$3 AND binding.kind=$4 ORDER BY binding.period`,[context.tenantId,revision,family,kind])).rows;
 const eligible=bindings.filter(binding=>requiredMeasures(query.metric).every(measure=>binding.configuration.measures.includes(measure)));
 if(!eligible.length)throw new Error('Prepared metric coverage unavailable');
 const categorical=Boolean(query.groupBy&&categoricalDimensions.includes(query.groupBy)),effective={...query,dateRange:range};
 const periods=categorical?[null]:query.groupBy?periodKeys(range,query.groupBy):[null];
 const keys=scope.timeBuckets==='closed-months'&&query.groupBy==='month'?periods.filter(key=>monthEnd(key!)<=range.to):periods;
 if(keys.length>maxGroups)throw new AnalyticsResultLimitError(query.groupBy!);
 const slots=querySlots(effective,keys),segments=scopeSegments(scope,eligible,[...slots.current,...slots.prior]);
 const used=eligible.filter(binding=>segments.some(segment=>segment.data_id===binding.data_id));
 const definitions=new Set(used.map(binding=>binding.configuration.definitionVersion)),currencies=new Set(used.map(binding=>binding.configuration.currency));
 if(definitions.size>1||currencies.size>1)throw new Error('Prepared definition or currency mismatch');
 const selected=categorical?await readGroupedSql(client,{query:effective,context,input:preparedReduction(effective,context,segments,true),revision,maxGroups,...(read?{read}:{})}):await readTimeRows(client,populationScope(scope,eligible),eligible,slots);
 const sourceAsOf=used.map(binding=>binding.source_cutoff.toISOString()).sort().at(-1);
 const preparedThrough=scopeSegments(scope,eligible,slots.current).map(segment=>segment.to).sort().at(-1)??null;
 return {...selected,preparedThrough,...preparedCoverage(scope,slots.current,selected.dataThrough,categorical),revision,...(sourceAsOf?{sourceAsOf}:{}),currency:[...currencies][0],definitionVersion:[...definitions][0],labels:Object.fromEntries(Object.entries(selected.labels).map(([key,label])=>[key,sourceDisplayLabel(label,context.locale)]))};
}
async function readTimeRows(client:PoolClient,scope:PreparedReadScope,bindings:PreparedBinding[],slots:ReturnType<typeof querySlots>){
 if(scope.read?.window||scope.read?.outputKeys)throw new Error('Categorical output selection required');
 const eligiblePriors=scope.coverage?slots.prior.filter(slot=>slot.from!==null&&slot.to!==null&&slot.from>=scope.coverage!.from&&slot.to<=scope.coverage!.to):slots.prior;
 const values=await reduceSlots(client,scope,bindings,slots.current),priors=await reduceSlots(client,scope,bindings,eligiblePriors);
 const priorValues=new Map(priors.rows.map(row=>[row.key,row.value]));
 const rows:AnalyticsRow[]=values.rows.map(row=>{
  if(!slots.comparison)return row;
  const changes=compareValues(row.value,priorValues.get(row.key)??null);
  return semanticCatalog[scope.query.metric].semantics.kind==='comparison_derived'?{key:row.key,value:changes.percentageChange}:{...row,...changes};
 });
 return {rows:analyzeRows(rows,scope.query,Boolean(slots.comparison)),dataThrough:values.dataThrough,labels:{} as Record<string,string>};
}
async function reduceSlots(client:PoolClient,scope:PreparedReadScope,bindings:PreparedBinding[],slots:QuerySlot[]){
 if(!slots.length)return {rows:[],dataThrough:null};
 const segments=scopeSegments(scope,bindings,slots),input=preparedReduction(scope.query,scope.context,segments,false);
 const selected=(await client.query<{key:string|null;value:string|null;through:string|null;unsafe:boolean;invalid:boolean;numerator?:string;denominator?:string}>(input.text,input.params)).rows;
 if(selected.some(row=>row.unsafe))throw new Error('Unsafe SQL numeric output');
 if(selected.some(row=>row.invalid))throw new Error('Compatible base UOM required');
 const byKey=new Map(selected.map(row=>[row.key,row]));
 const eligibleSlots=outputSlots(scope,slots,segments,byKey);
 const rows=eligibleSlots.map(slot=>({key:slot.key,value:byKey.has(slot.key)?projectValue(scope.query,byKey.get(slot.key)!):emptyValue(scope.query,segments.some(segment=>segment.key===slot.key),scope.emptySnapshotValue)}));
 return {rows,dataThrough:selected.flatMap(row=>row.through?[row.through]:[]).sort().at(-1)??null};
}
function projectValue(query:AnalyticsQuery,row:{value:string|null;numerator?:string;denominator?:string}){
 const semantics=semanticCatalog[query.metric].semantics;
 if(semantics.kind!=='ratio'&&semantics.kind!=='duration_derived')return numericOutput(row.value);
 if(row.numerator===undefined||row.denominator===undefined)throw new Error('Prepared ratio operands unavailable');
 const denominator=numericOutput(row.denominator)!;
 return denominator===0?null:numericOutput(row.numerator)!/denominator*semantics.scale;
}
function emptyValue(query:AnalyticsQuery,covered:boolean,emptySnapshotValue?:0){
 const semantics=semanticCatalog[query.metric].semantics;
 if(covered&&semantics.kind==='snapshot')return semantics.aggregation==='max'?null:emptySnapshotValue??null;
 return covered&&['additive','distinct_count','comparison_derived'].includes(semantics.kind)?0:null;
}

function preparedCoverage(scope:PreparedReadScope,slots:QuerySlot[],dataThrough:string|null,categorical:boolean){
 if(!scope.coverage)return {};
 const missing=categorical?!coveredSlot(slots[0]!,scope.coverage):slots.some(slot=>slot.from!==null&&slot.to!==null&&slot.from<=scope.coverage!.to&&slot.to>=scope.coverage!.from&&!coveredSlot(slot,scope.coverage!));
 return coverageMetadata(scope.query,scope.coverage,dataThrough,preparedMetricBasis(scope.query.metric)==='event'&&missing);
}

function scopeSegments(scope:PreparedReadScope,bindings:PreparedBinding[],slots:QuerySlot[]){
 const selection=scope.timeBuckets==='closed-months'&&scope.query.groupBy==='month'?'exact':'latest';
 return planPreparedRead(bindings,scope.query,scope.context,governedPreparedSlots(scope.query,slots,scope.coverage),selection);
}
function outputSlots(scope:PreparedReadScope,slots:QuerySlot[],segments:ReturnType<typeof planPreparedRead>,rows:Map<string|null,unknown>){
 if(scope.timeBuckets==='closed-months'&&scope.query.groupBy==='month')return slots.filter(slot=>segments.some(segment=>segment.key===slot.key));
 return scope.timeBuckets==='observed'&&scope.query.groupBy?slots.filter(slot=>rows.has(slot.key)):slots;
}

function populationScope(scope:PreparedReadScope,bindings:PreparedBinding[]):PreparedReadScope{
 return bindings.every(binding=>binding.configuration.snapshotPopulation==='complete')?{...scope,emptySnapshotValue:0}:scope;
}
