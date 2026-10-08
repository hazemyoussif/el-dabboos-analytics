import { timeDimensions } from '@el-dabboos/domain';
import type { AnalyticsFilter, DimensionId, MetricId, RequestContext } from '@el-dabboos/domain';
import type { AnalyticsIntent } from './analytics-intent.ts';
import { validateAnalyticsIntent } from './analytics-intent.ts';
import type { AnalyticsIntentResult } from './analytics-execution.ts';

/** Server-owned bounded semantic memory. Fresh membership/policy is still required each turn. */
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
export function analyticsConversationState(result:AnalyticsIntentResult,identity:RequestContext):AnalyticsConversationState {
  const successful = result.analyses.flatMap((analysis,analysisIndex) => analysis.series.flatMap((entry,seriesIndex) => entry.status === 'SUPPORTED' ? [{entry,analysisIndex,seriesIndex}] : []));
  return {tenantId:identity.tenant.tenantId,userId:identity.principal.userId,membershipId:identity.principal.membershipId,scopeSignature:conversationScopeSignature(identity),
    activeContext:effectiveConversationContext(successful[0]?.entry.query,result.intent.context),
    viewerFilters:structuredClone(successful[0]?.entry.query.filters ?? result.intent.context.dimensions ?? []),previousIntent:structuredClone(result.intent),
    metrics:[...new Set(successful.map(item => item.entry.query.metric))],dimensions:[...new Set(successful.flatMap(item => item.entry.query.groupBy ? [item.entry.query.groupBy] : []))],
    entities:successful.flatMap(({entry}) => entry.query.groupBy && !timeDimensions.includes(entry.query.groupBy) ? [{dimension:entry.query.groupBy,ids:entry.result.rows.flatMap(row => row.key === null ? [] : [row.key]).slice(0,100)}] : []),
    resultReferences:successful.map(({entry,analysisIndex,seriesIndex}) => ({analysis:analysisIndex,series:seriesIndex,...(entry.result.metadata.release ? {release:entry.result.metadata.release.datasetId} : {}),executedAt:entry.result.metadata.executedAt})),resolvedAmbiguities:[]};
}
/** Follow-up operators consume stable identities/periods, never a guessed name or replayed chat. */
export function resolveAnalyticsFollowUp(state:AnalyticsConversationState,identity:RequestContext,followUp:{rank:number}|{compareEntities:number;datePreset:'last_6_months'}):AnalyticsIntent {
  assertConversationOwner(state,identity);
  const intent = structuredClone(state.previousIntent);
  intent.context = structuredClone(state.activeContext);
  if ('rank' in followUp) {
    intent.analyses = [intent.analyses[0]!];
    const analysis = intent.analyses[0]!;
    analysis.rank = followUp.rank;
    delete analysis.context;
    for (const series of analysis.series) { delete series.topNDirection;delete series.topNLimit;series.ranking=true; }
  } else {
    const entities = state.entities[0];
    if (!entities || !Number.isInteger(followUp.compareEntities) || followUp.compareEntities < 2 || followUp.compareEntities > entities.ids.length) throw new Error('Unresolved entity references');
    intent.context = {datePreset:followUp.datePreset,dimensions:[...state.viewerFilters.filter(filter => filter.dimension !== entities.dimension),{dimension:entities.dimension,values:entities.ids.slice(0,followUp.compareEntities)}]};
    for (const analysis of intent.analyses) {
      delete analysis.context;delete analysis.rank;
      for (const series of analysis.series) {delete series.topNDirection;delete series.topNLimit;delete series.ranking;}
    }
  }
  validateAnalyticsIntent(intent);
  return intent;
}
export function assertConversationOwner(state:AnalyticsConversationState,identity:RequestContext):void {
  if (state.tenantId !== identity.tenant.tenantId || state.userId !== identity.principal.userId || state.membershipId !== identity.principal.membershipId || state.scopeSignature !== conversationScopeSignature(identity)) throw new Error('Invalid conversation owner');
}

function conversationScopeSignature(identity:RequestContext):string {
  return JSON.stringify({domains:[...identity.authorization.metricDomains].sort(),permissions:[...identity.authorization.permissions].sort(),
    filters:identity.authorization.enforcedFilters.map(filter=>({dimension:filter.dimension,values:[...filter.values].sort()})).sort((left,right)=>JSON.stringify(left).localeCompare(JSON.stringify(right)))});
}
/** Send only semantic references; server identity/policy signatures never enter model context. */
export function analyticsConversationContext(state:AnalyticsConversationState) {
  return {activeContext:state.activeContext,viewerFilters:state.viewerFilters,metrics:state.metrics,dimensions:state.dimensions,
    entities:state.entities,previousIntent:state.previousIntent,resultReferences:state.resultReferences,resolvedAmbiguities:state.resolvedAmbiguities};
}

function effectiveConversationContext(query:import('@el-dabboos/domain').AnalyticsQuery|undefined,fallback:AnalyticsIntent['context']):AnalyticsIntent['context'] {
  if (!query) return structuredClone(fallback);
  return {...(query.dateRange ? {dateRange:structuredClone(query.dateRange)} : {}),...(query.filters ? {dimensions:structuredClone(query.filters)} : {})};
}
