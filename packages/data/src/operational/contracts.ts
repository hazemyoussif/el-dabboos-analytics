import type { AnalyticsCursor, AnalyticsPartition, AnalyticsSourceSnapshot, FactMeasureId, ProductionFact, SourceMapping, PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
export interface OperationalBaseline {
 tenantId:string;sourceId:string;reportingCurrency:string;datasets:string[];mappingVersion:string;definitionVersion:string;
 mappings:SourceMapping[];capabilities:PublishedAnalyticsCapabilities;from:string;to:string;
}
export interface ExactControl {partition:AnalyticsPartition;measure:FactMeasureId;value:string;count:string}
export interface OperationalSnapshot extends AnalyticsSourceSnapshot {
 records(baseline:OperationalBaseline,cursor:AnalyticsCursor|null):AsyncIterable<{object:string;cursor?:string|undefined;facts:ProductionFact[];rows:number;retired?:readonly {object:string;id:string;version:string;revision:string;updatedAt:string}[]}>;
 recordsMonth(baseline:OperationalBaseline,month:string):AsyncIterable<{object:string;facts:ProductionFact[];rows:number}>;
 snapshots(baseline:OperationalBaseline,cursor:AnalyticsCursor|null,force?:boolean):AsyncIterable<{object:string;facts:ProductionFact[];rows:number}>;
 controls(baseline:OperationalBaseline,partitions:readonly AnalyticsPartition[]):Promise<ExactControl[]>;
 presence(object:string,pages:AsyncIterable<readonly string[]>):AsyncIterable<{ids:readonly string[];present:readonly string[]}>;
 present(object:string,ids:readonly string[]):Promise<readonly string[]>;
}
export interface OperationDetails {
 partitionRowsSeeded?:number;rowsDiscovered:number;newRows:number;updatedRows:number;canonicalRevisions:number;partitions:readonly AnalyticsPartition[];
 previousCursor:AnalyticsCursor|null;newCursor:AnalyticsCursor|null;refreshedMonths:string[];
 durations:Record<string,number>;
}
