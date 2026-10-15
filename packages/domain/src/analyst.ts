import type { RequestContext } from './security.ts';
import type { AnalysisSpec, AnalyticsFilter, AnalyticsQuery, AnalyticsResult, DashboardSpec, DimensionId, MetricId } from './contracts.ts';
export interface AnalyticsSeriesIntent {
  metric: MetricId; comparison?: AnalysisSpec['comparison']; movingAverageWindow?: number;
  runningTotal?: boolean; percentageContribution?: boolean; ranking?: boolean; pareto?: boolean;
  topNDirection?: 'top' | 'bottom'; topNLimit?: number;
}
export interface AnalyticsIntent {
  context: DashboardSpec['filters'];
  analyses: AnalyticsAnalysisIntent[];
}
export interface AnalyticsAnalysisIntent {
  dimension?: DimensionId;
  series: AnalyticsSeriesIntent[];
  context?: DashboardSpec['filters'];
  /** Select an ordinal after deterministic ranking; never guess a display name. */
  rank?: number;
}
export interface AnalyticsConversationState {
  tenantId: string; userId: string; membershipId: string; scopeSignature:string;
  activeContext: AnalyticsIntent['context'];
  viewerFilters: AnalyticsFilter[];
  metrics: MetricId[]; dimensions: DimensionId[];
  entities: {dimension:DimensionId;ids:string[]}[];
  previousIntent: AnalyticsIntent;
  resultReferences: {analysis:number;series:number;release?:string;executedAt:string}[];
  resolvedAmbiguities: MetricId[];
}

export type AnalystAnswerStatus = 'SUPPORTED'|'PARTIAL_COVERAGE'|'DATA_NOT_READY'|'EXECUTION_FAILED'|'AMBIGUOUS'|'UNSUPPORTED_CAPABILITY'|'AI_UNAVAILABLE'|'INVALID_PLAN'|'UNAUTHORIZED';
export interface AnalystPanel {
  status: 'SUPPORTED'|'PARTIAL_COVERAGE'|'DATA_NOT_READY';
  query: AnalyticsQuery; result: AnalyticsResult;
  form: 'scalar'|'ranked_list'|'grouped'|'time_series'|'comparison'|'snapshot';
  summary: {en:string;ar:string}; omittedRows:number; scopeFilters?:AnalyticsFilter[];
}
export interface AnalystAnswer {
  status: AnalystAnswerStatus; panels: AnalystPanel[]; choices?: MetricId[];
  intent?: AnalyticsIntent; conversion: 'available'|'semantic_limit'|'unavailable';
  synthesisReferences?: number[]; failedAnalyses?:number;
  timing: {plannerMs:number;capabilityMs:number;executionMs:number;synthesisMs:number;totalMs:number};
}
export interface AnalystMessage {id:string;question:string;createdAt:string;answer:AnalystAnswer}
export interface AnalystConversation {
  id:string;tenantId:string;userId:string;createdAt:string;updatedAt:string;expiresAt:string;version:number;
  pageContext?:AnalyticsIntent['context']; state?:AnalyticsConversationState; messages:AnalystMessage[];
  pending?: {question:string;choices:MetricId[];context:AnalyticsIntent['context']};
}
export interface AnalystAudit {
  conversationId:string;messageId:string;tenantId:string;userId:string;membershipId:string;timestamp:string;
  effectivePeriods: Array<AnalyticsQuery['dateRange']>;intentHash?:string;
  capabilityStatus:string;executionStatus:AnalystAnswerStatus;
  references:Array<{release?:string;snapshotAsOf?:string;executedAt:string}>;
}
export interface AnalystOwner {tenantId:string;userId:string}
/** The adapter commits the new version and its question audit atomically. No provider work in a transaction. */
export interface AnalystConversationRepository {
  create(conversation:AnalystConversation):Promise<void>;
  get(owner:AnalystOwner,id:string,now:string):Promise<AnalystConversation|null>;
  list(owner:AnalystOwner,now:string):Promise<Array<Pick<AnalystConversation,'id'|'createdAt'|'updatedAt'>>>;
  append(conversation:AnalystConversation,expectedVersion:number,audit:AnalystAudit,actor:RequestContext):Promise<boolean>;
}
