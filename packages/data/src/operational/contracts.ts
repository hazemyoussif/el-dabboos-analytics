import type {OdooLookupDependency} from '../odoo/lookup-types.ts';
import type { AnalyticsCursor, AnalyticsPartition, AnalyticsSourceSnapshot, FactMeasureId, ProductionFact, SourceMapping, PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
export interface OperationalBaseline {
 tenantId:string;sourceId:string;reportingCurrency:string;datasets:string[];mappingVersion:string;definitionVersion:string;
 coveredMonths?:readonly string[];mappings:SourceMapping[];capabilities:PublishedAnalyticsCapabilities;from:string;to:string;
}
export interface ExactControl {partition:AnalyticsPartition;measure:FactMeasureId;value:string;count:string}
/** Source identities and effective dates only; no balances, labels or credentials. */
export interface AllocationLinks {debitLineId:string;creditLineId:string;debitMoveId:string;creditMoveId:string}
export interface RecordedAllocationDeletion {
 id:string;from:string;allocationLinks:AllocationLinks|null;
 dependencyCutoff:string;linksCutoff:string|null;
}
export interface ReceivableDependency {
 object:'account_move_line'|'account_partial_reconcile'|'account_move'|'account_payment';
 id:string;from:string|null;
 /** UTC source creation time distinguishes a new input from an unknown old footprint. */
 createdAt?:string|null;
 /** Observed source links, not inferred from balances or prepared totals. */
 allocationLinks?:AllocationLinks|null;
}
export interface ReceivableDependencyContext {
 initialized:boolean;
 previousFrom(dependencies:readonly ReceivableDependency[]):Promise<string|null>;
}
export interface LookupDependencyContext {
 initialized:boolean;projectionVersion:string|null;
 changed(dependencies:readonly OdooLookupDependency[]):Promise<readonly OdooLookupDependency[]>;
}
export interface LookupDependencyUpdate {dependencies:readonly OdooLookupDependency[];projectionVersion:string}
export interface OperationalPage {
 object:string;cursor?:string|undefined;facts:ProductionFact[];rows:number;
 retired?:readonly {object:string;id:string;version:string;revision:string;updatedAt:string}[];
 receivableDependencies?:readonly ReceivableDependency[];
 receivableDependenciesComplete?:boolean;
 lookupDependencies?:readonly OdooLookupDependency[];
 lookupProjectionVersion?:string;
}
export interface OperationalSnapshot extends AnalyticsSourceSnapshot {
 records(baseline:OperationalBaseline,cursor:AnalyticsCursor|null,dependencies?:ReceivableDependencyContext,lookups?:LookupDependencyContext):AsyncIterable<OperationalPage>;
 recordsMonth(baseline:OperationalBaseline,month:string):AsyncIterable<{object:string;facts:ProductionFact[];rows:number}>;
 snapshots(baseline:OperationalBaseline,cursor:AnalyticsCursor|null,force?:boolean,dependencies?:ReceivableDependencyContext,forcedFrom?:string):AsyncIterable<OperationalPage>;
 controls(baseline:OperationalBaseline,partitions:readonly AnalyticsPartition[]):Promise<ExactControl[]>;
 presence(object:string,pages:AsyncIterable<readonly string[]>):AsyncIterable<{ids:readonly string[];present:readonly string[]}>;
 present(object:string,ids:readonly string[]):Promise<readonly string[]>;
}
export interface OperationDetails {
 allocationSweep?:{checked:number;missing:number;affectedFrom:string|null;coverage:'recorded-identities-only'};
 lookupDependencyRows?:number;
 receivableDependencyRows?:number;receivableDependencyInitialization?:boolean;
 outsideCoverageFacts?:number;partitionRowsSeeded?:number;rowsDiscovered:number;newRows:number;updatedRows:number;canonicalRevisions:number;partitions:readonly AnalyticsPartition[];
 previousCursor:AnalyticsCursor|null;newCursor:AnalyticsCursor|null;refreshedMonths:string[];
 durations:Record<string,number>;
}
