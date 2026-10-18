import type {DimensionId,FactMeasureId,PreparedTimeGrain} from '@el-dabboos/domain';
export type PreparedFamily='facts'|'receivables'|'review'|'business';
export interface PreparedChunk {family:PreparedFamily;kind:'event'|'snapshot';period:string;through:string}
export interface PreparedConfiguration {
 family:PreparedFamily;kind:'event'|'snapshot';from:string;through:string;currency:string;
 definitionVersion:string;registryVersion:string;snapshotPopulation:'complete'|'delta';measures:FactMeasureId[];
 grains:Array<{id:string;dimensions:DimensionId[]}>;
}
export interface PreparedCell {
 time_grain:PreparedTimeGrain;grain_id:string;business_date:string;measure_id:FactMeasureId;
 dimensions:Partial<Record<DimensionId,string>>;value:string;fact_count:string;minimum:string|null;maximum:string|null;
 data_through:string;labels:Record<string,string>;conflicting_labels:string[];
}
export interface PreparedBuildBounds {maxCellsPerChunk:number;maxChunks:number;maxPopulationRows?:number}
export interface PreparedStepEvent {
 step:'configuration'|'signature'|'reuse'|'population'|'aggregation'|'validation'|'workspace_seal'|'fingerprint'|'persistence'|'binding';
 status:'started'|'completed'|'failed';elapsedMs?:number;grain?:string;validationStep?:string;chunk?:PreparedChunk;
 code?:string;reason?:'statement_timeout'|'query_cancelled'|'other';
}
export interface PreparedBuildScope {tenantId:string;revisionId:string;observeStep?:(event:PreparedStepEvent)=>void}
export interface PreparedChunkResult extends PreparedChunk {dataId:string;rows:number;reused:boolean}
