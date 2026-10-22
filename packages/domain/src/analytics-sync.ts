import type {AnalyticsJobRequest,AnalyticsJobRun,AnalyticsSourceSnapshot,OperationalReconciliation} from './analytics-operations.ts';
import type {AnalyticsPartition,FactRevisionChange} from './analytics-impact.ts';

/** A completed frozen source capture. It is not a serving release or an accepted cursor. */
export interface AnalyticsSyncCandidate {
 tenantId:string;candidateId:string;request:AnalyticsJobRequest;startedAt:string;
 source:Pick<AnalyticsSourceSnapshot,'cutoff'|'revision'|'mappingVersion'|'definitionVersion'>;
 partitions:readonly AnalyticsPartition[];recordsChanged:number;
}
export interface AnalyticsSyncSession {
 pending():Promise<AnalyticsSyncCandidate|null>;
 /** Impact is the union of bounded page results, including each change's old/new footprint. */
 capture(source:AnalyticsSourceSnapshot,request:AnalyticsJobRequest,identity:{runId:string;startedAt:string},
  resolveImpact:(changes:readonly FactRevisionChange[])=>readonly AnalyticsPartition[],releaseSource:()=>Promise<void>):Promise<AnalyticsSyncCandidate>;
 reconcile(candidate:AnalyticsSyncCandidate):Promise<OperationalReconciliation>;
 refresh(candidate:AnalyticsSyncCandidate):Promise<void>;
 prepare(candidate:AnalyticsSyncCandidate):Promise<void>;
 accept(candidate:AnalyticsSyncCandidate,evidence:OperationalReconciliation):Promise<AnalyticsJobRun>;
 reject(candidate:AnalyticsSyncCandidate,evidence:OperationalReconciliation):Promise<AnalyticsJobRun>;
}
export interface AnalyticsSyncStore {
 /** Session-wide tenant lock; individual unpublished checkpoints commit independently. */
 session<T>(tenantId:string,operation:(session:AnalyticsSyncSession)=>Promise<T>):Promise<T>;
 recordFailure(request:AnalyticsJobRequest,runId:string,startedAt:string):Promise<void>;
}
