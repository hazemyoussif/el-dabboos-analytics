import type { AnalyticsPartition, FactRevisionChange, ImpactPolicy } from './analytics-impact.ts';

export type AnalyticsJobKind = 'sync' | 'affected' | 'daily' | 'deep' | 'sweep';
export interface AnalyticsJobRequest {
  tenantId: string; actorId: string; trigger: 'manual' | 'operator' | 'scheduled'; kind: AnalyticsJobKind;
}
export interface AnalyticsCursor {
  /** Last committed bounded snapshot cutoff, independent of business dates. */
  cutoff: string;
  objects: Readonly<Record<string, string>>;
}
export interface AnalyticsJobRun extends AnalyticsJobRequest {
  runId: string; sourceCutoff: string; sourceRevision: string;
  mappingVersion: string; definitionVersion: string;
  startedAt: string; completedAt: string;
  status: 'passed' | 'failed' | 'unchanged';
  recordsChanged: number; partitionsAffected: number; caseCount: number; mismatchCount: number;
  evidenceHash: string; servingRelease: string | null;
}
export interface OperationalReconciliation {
  caseIds: readonly string[]; caseCount: number; mismatchCount: number;
  /** Hash of durable exact source/mart evidence, not a model judgment. */
  evidenceHash: string;
}
export interface AnalyticsSourceSnapshot {
  cutoff: string; revision: string; mappingVersion: string; definitionVersion: string;
  close(): Promise<void>;
}
export interface AnalyticsOperationalTransaction {
  cursor(): Promise<AnalyticsCursor | null>;
  trustedRelease(): Promise<string | null>;
  ingest(snapshot: AnalyticsSourceSnapshot, cursor: AnalyticsCursor | null): Promise<{ changes: readonly FactRevisionChange[]; cursor: AnalyticsCursor; recordsChanged: number }>;
  sweep(snapshot: AnalyticsSourceSnapshot): Promise<readonly FactRevisionChange[]>;
  reconcile(snapshot: AnalyticsSourceSnapshot, partitions: readonly AnalyticsPartition[], kind: AnalyticsJobKind): Promise<OperationalReconciliation>;
  refresh(partitions: readonly AnalyticsPartition[]): Promise<string>;
  promote(release: string, evidence: OperationalReconciliation): Promise<void>;
  commitCursor(cursor: AnalyticsCursor): Promise<void>;
  record(run: AnalyticsJobRun, caseIds: readonly string[]): Promise<void>;
  /** Rejected candidate facts are kept outside trusted serving and the durable cursor. */
  discardCandidate(): Promise<void>;
}
export interface AnalyticsOperationalStore {
  /** Serialize by tenant; every write and audit uses this owner's transaction. */
  transaction<T>(tenantId: string, operation: (transaction: AnalyticsOperationalTransaction) => Promise<T>): Promise<T>;
  recordFailure(request: AnalyticsJobRequest, runId: string, startedAt: string): Promise<void>;
}
export interface AnalyticsOperationalSource {
  open(tenantId: string): Promise<AnalyticsSourceSnapshot>;
}
export interface AnalyticsOperationsOptions {
  store: AnalyticsOperationalStore; source: AnalyticsOperationalSource;
  impact: ImpactPolicy; clock: () => Date; runId: () => string;
}

export interface OperationalRunSummary {
  kind:AnalyticsJobKind; runId:string; status:AnalyticsJobRun['status']; sourceCutoff:string; completedAt:string;
  recordsChanged:number; partitionsAffected:number; caseCount:number; mismatchCount:number; servingRelease:string|null;
}
export interface AnalyticsOperationalStatus {
  tenantId:string; freshnessTargetSeconds:number;
  cursor:AnalyticsCursor|null; latest:OperationalRunSummary[]; lastSuccessfulSync:OperationalRunSummary|null;
  trustedCertificationRelease:string|null; historicalCoverage:{reference:string;from:string;to:string}|null;
}
export interface OperationalStatusProvider {
  /** Read-only projection of stored evidence. Never opens the source or reconstructs proof. */
  status(tenantId: string): Promise<AnalyticsOperationalStatus>;
}
