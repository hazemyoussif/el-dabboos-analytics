import { preferredAnalyticsSeries } from './analytics-series.ts';
import type { LLMProvider, PlannerCapabilities, RequestContext, TenantProfile } from '@el-dabboos/domain';
import { analyticsPlannerContext } from './analytics-planner-context.ts';
import { analyticsSemanticContext, analyticsSemanticInstructions } from './analytics-semantic-context.ts';
import { analyticsPlanningSchema, validateAnalyticsPlanningOutcome } from './analytics-intent.ts';
import type { AnalyticsPlanningOutcome } from './analytics-intent.ts';
import { projectProviderSchema } from './provider-schema.ts';
import { DefaultAuthorizationPolicy } from './security.ts';
import { publishedCatalog } from './published-analytics.ts';
import { resolveAnalyticsCapabilities } from './analytics-capability.ts';
import type { AnalyticsConversationState } from './analytics-conversation.ts';
import { analyticsConversationContext, assertConversationOwner, resolveAnalyticsFollowUp } from './analytics-conversation.ts';
import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';

export interface AnalyticsPlanningRequest { prompt:string;identity:RequestContext;profile:TenantProfile;published:PublishedAnalyticsCapabilities;state?:AnalyticsConversationState;pageContext?:import('@el-dabboos/domain').AnalyticsIntent['context'];clarification?:import('@el-dabboos/domain').MetricId }
export interface AnalyticsPlannerOptions {clock?:()=>Date;timer?:()=>number}
export type AnalyticsPlannerResult = {outcome:Exclude<AnalyticsPlanningOutcome,{status:'FOLLOW_UP'}> | {status:'UNAUTHORIZED'|'INVALID_PLAN'};timing:{plannerMs:number;validationMs:number;capabilityMs:number}};
/** Shared series contract, semantic instructions, context and resolver; portable LLMProvider transport. */
export class StructuredAnalyticsPlanner {
  constructor(private readonly provider:LLMProvider,private readonly options:AnalyticsPlannerOptions={}) {}
  async plan(request:AnalyticsPlanningRequest):Promise<AnalyticsPlannerResult> {
    const policy = new DefaultAuthorizationPolicy();
    policy.authorize('ai:generate',request.identity);
    policy.authorize('analytics:query',request.identity);
    if (request.identity.tenant.tenantId !== request.profile.id) throw new Error('Invalid planner workspace');
    if (request.state) assertConversationOwner(request.state,request.identity);
    const catalog = publishedCatalog(request.identity,request.published), now=(this.options.clock ?? (()=>new Date()))();
    if (!catalog.metricIds.length) return {outcome:{status:'DATA_NOT_READY'},timing:{plannerMs:0,validationMs:0,capabilityMs:0}};
    const capabilities:PlannerCapabilities={metricIds:catalog.metricIds,templateIds:[],actions:['ai:generate'],published:catalog.published};
    const schema=structuredClone(analyticsPlanningSchema);
    schema.$defs.series.properties.metric.enum=[...catalog.metricIds];
    const timer=this.options.timer ?? (()=>performance.now()),started=timer();
    const response=await this.provider.generateStructured({locale:request.identity.locale,responseFormat:{name:'analytics_intent',jsonSchema:projectProviderSchema(schema),strict:true},messages:[
      {role:'system',content:`Return a bounded analytics planning outcome JSON only. SUPPORTED contains intent.context and analyses (dimension, series, optional per-analysis context and rank). Reuse the shared analytics series vocabulary. No presentation fields. AMBIGUOUS contains at least two authorized published metric choices; never silently pick a meaning. Unsupported domains return UNSUPPORTED_CAPABILITY; known unpublished data returns DATA_NOT_READY. Empty or ambiguous questions require clarification. Rank is an ordinal selected after full deterministic ranking, not Top-N. Entity selection must include a categorical dimension; sales performance refers to salesperson unless another entity is specified. A rank requires series.ranking=true and cannot combine with Top-N. A single highest or lowest entity requires topNDirection top or bottom and topNLimit 1; ranking alone returns every entity. If pageContext is supplied, omit dates/filters from intent.context unless the question explicitly overrides them; the application inherits the page context. clarification is the canonical user-selected meaning and must be used. For an ordinal follow-up return FOLLOW_UP with operation rank and rank. For a comparison of referenced entities over six months return FOLLOW_UP with operation compare_entities, count and datePreset last_6_months; never generate names or IDs for these references. Follow-ups preserve prior metric, dimension and effective period; entity filters use supplied stable IDs only. ${analyticsSemanticInstructions} Language context: ${JSON.stringify(analyticsSemanticContext)} Context: ${JSON.stringify(analyticsPlannerContext(capabilities,request.profile,()=>now))}`},
      {role:'user',content:JSON.stringify({question:request.prompt,pageContext:request.pageContext,clarification:request.clarification,...(request.state ? {state:analyticsConversationContext(request.state)} : {})})},
    ]});
    const plannerMs=timer()-started,validationStarted=timer();
    try {validateAnalyticsPlanningOutcome(response.output);} catch {return {outcome:{status:'INVALID_PLAN'},timing:{plannerMs,validationMs:timer()-validationStarted,capabilityMs:0}};}
    let outcome:Exclude<AnalyticsPlanningOutcome,{status:'FOLLOW_UP'}>;
    try{outcome=resolvePlannerFollowUp(response.output,request);}catch{return {outcome:{status:'INVALID_PLAN'},timing:{plannerMs,validationMs:timer()-validationStarted,capabilityMs:0}};}
    const validationMs=timer()-validationStarted,capabilityStarted=timer();
    if (outcome.status === 'AMBIGUOUS' && outcome.choices.some(metric=>!catalog.metricIds.includes(metric))) return {outcome:{status:'INVALID_PLAN'},timing:{plannerMs,validationMs,capabilityMs:timer()-capabilityStarted}};
    if (outcome.status === 'SUPPORTED') {
      outcome.intent = {...outcome.intent,context:inheritAnalyticsContext(outcome.intent.context,request.pageContext ?? request.state?.activeContext),analyses:outcome.intent.analyses.map(analysis => ({...analysis,series:analysis.series.map(series => preferredAnalyticsSeries(series,request.profile))}))};
      const resolution=resolveAnalyticsCapabilities(outcome.intent,request.identity,policy,{published:request.published,timeZone:request.profile.timeZone,now});
      if (resolution.status !== 'SUPPORTED') return {outcome:{status:resolution.status},timing:{plannerMs,validationMs,capabilityMs:timer()-capabilityStarted}};
    }
    return {outcome,timing:{plannerMs,validationMs,capabilityMs:timer()-capabilityStarted}};
  }
}

function inheritAnalyticsContext(selection:import('@el-dabboos/domain').AnalyticsIntent['context'],page:import('@el-dabboos/domain').AnalyticsIntent['context']|undefined) {
  const filters=new Map((page?.dimensions??[]).map(filter=>[filter.dimension,filter]));
  for(const filter of selection.dimensions??[])filters.set(filter.dimension,filter);
  const context={...page,...selection,...(filters.size?{dimensions:[...filters.values()]}:{})};
  if(selection.datePreset)delete context.dateRange;
  if(selection.dateRange)delete context.datePreset;
  return context;
}

function resolvePlannerFollowUp(outcome:AnalyticsPlanningOutcome,request:AnalyticsPlanningRequest):Exclude<AnalyticsPlanningOutcome,{status:'FOLLOW_UP'}> {
 if(outcome.status!=='FOLLOW_UP')return outcome;
 if(!request.state)throw new Error('Unresolved follow-up');
 return {status:'SUPPORTED',intent:resolveAnalyticsFollowUp(request.state,request.identity,outcome.operation==='rank'?{rank:outcome.rank}:{compareEntities:outcome.count,datePreset:outcome.datePreset})};
}
