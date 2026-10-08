import type { AnalystAnswer, AnalystAudit, AnalystConversation, AnalystConversationRepository, AnalyticsIntent, LLMProvider, MetricId, RequestContext, TenantProfile } from '@el-dabboos/domain';
import { validateAnalyticsIntent } from './analytics-intent.ts';
import { analyticsConversationState, assertConversationOwner } from './analytics-conversation.ts';
import type { AnalyticsIntentExecutor } from './analytics-execution.ts';
import type { StructuredAnalyticsPlanner, AnalyticsPlanningRequest } from './analytics-planner.ts';
import { emptyAnalystTiming, renderAnalystAnswer } from './analyst-answer.ts';
import { synthesizeAnalystHighlights } from './analyst-synthesis.ts';
export class AnalystConversationError extends Error {
  constructor(readonly code:'NOT_FOUND'|'SCOPE_CHANGED'|'CONFLICT'|'INVALID_MESSAGE'|'INVALID_CHOICE') {super(code);}
}
export interface AnalystTurn {question?:string;pageContext?:AnalyticsIntent['context'];choice?:MetricId;expectedVersion:number}
export interface AnalystConversationRuntime {
  repository:AnalystConversationRepository;planner?:StructuredAnalyticsPlanner;executor:AnalyticsIntentExecutor;
  clock:()=>Date;synthesis?:LLMProvider;
}
const owner=(identity:RequestContext)=>({tenantId:identity.tenant.tenantId,userId:identity.principal.userId});
export class AnalystConversations {
  constructor(private readonly runtime:AnalystConversationRuntime) {}
  async create(identity:RequestContext):Promise<AnalystConversation> {
    const now=this.runtime.clock();
    const conversation:AnalystConversation={id:globalThis.crypto.randomUUID(),...owner(identity),createdAt:now.toISOString(),updatedAt:now.toISOString(),expiresAt:new Date(now.getTime()+30*86400000).toISOString(),version:1,messages:[]};
    await this.runtime.repository.create(conversation);return conversation;
  }
  list(identity:RequestContext) {return this.runtime.repository.list(owner(identity),this.runtime.clock().toISOString());}
  async get(identity:RequestContext,id:string) {
    const conversation=await this.runtime.repository.get(owner(identity),id,this.runtime.clock().toISOString());
    if(!conversation)throw new AnalystConversationError('NOT_FOUND');
    if(conversation.state)try{assertConversationOwner(conversation.state,identity);}catch{throw new AnalystConversationError('SCOPE_CHANGED');}
    return conversation;
  }
  async message(request:Omit<AnalyticsPlanningRequest,'prompt'|'state'> & {id:string;turn:AnalystTurn;refreshIdentity:()=>Promise<RequestContext>}) {
    const started=performance.now(),conversation=await this.get(request.identity,request.id);
    if(request.turn.expectedVersion!==conversation.version)throw new AnalystConversationError('CONFLICT');
    const question=turnQuestion(conversation,request.turn);
    const pageContext=request.turn.choice?conversation.pending?.context:request.turn.pageContext;
    if(pageContext)conversation.pageContext=structuredClone(pageContext);
    if(pageContext)validateAnalyticsIntent({context:pageContext,analyses:[{series:[{metric:'order_revenue'}]}]});
    let answer:AnalystAnswer={status:'AI_UNAVAILABLE',panels:[],conversion:'unavailable',timing:emptyAnalystTiming()};
    let planning:Awaited<ReturnType<StructuredAnalyticsPlanner['plan']>>|undefined;
    const planningStarted=performance.now();
    if(this.runtime.planner)try {
      planning=await this.runtime.planner.plan({...request,prompt:question,...(conversation.state?{state:conversation.state}:{}),...(pageContext?{pageContext}:{}),...(request.turn.choice?{clarification:request.turn.choice}:{})});
    }catch{ /* Provider errors remain safe and do not affect ordinary analytics. */ }
    if(!planning && this.runtime.planner)answer.timing.plannerMs=performance.now()-planningStarted;
    const fresh=await request.refreshIdentity();assertFreshOwner(conversation,request.identity,fresh);
    if(planning)answer=await this.continueConversation({planning,profile:request.profile,identity:fresh,conversation,choice:request.turn.choice});
    retainClarification(conversation,answer,question,pageContext);
    await this.synthesize(answer,fresh.locale);
    const latest=await request.refreshIdentity();assertFreshOwner(conversation,fresh,latest);
    answer.timing.totalMs=performance.now()-started;
    const timestamp=this.runtime.clock().toISOString(),message={id:globalThis.crypto.randomUUID(),question,createdAt:timestamp,answer};
    conversation.messages=[...conversation.messages,message].slice(-20);conversation.updatedAt=timestamp;conversation.version++;
    trimConversationDisplay(conversation);
    const audit=await questionAudit(conversation,message,latest);
    if(!await this.runtime.repository.append(conversation,conversation.version-1,audit,latest))throw new AnalystConversationError('CONFLICT');
    return conversation;
  }
  private async continueConversation(request:{planning:Awaited<ReturnType<StructuredAnalyticsPlanner['plan']>>;profile:TenantProfile;identity:RequestContext;conversation:AnalystConversation;choice:MetricId|undefined}) {
    const {planning,profile,identity,conversation,choice}=request;
    if(planning.outcome.status==='SUPPORTED' && (planning.outcome.intent.analyses.reduce((count,analysis)=>count+analysis.series.length,0)>24 || JSON.stringify(planning.outcome.intent).length>16384))planning.outcome={status:'INVALID_PLAN'};
    if(choice && planning.outcome.status==='SUPPORTED' && planning.outcome.intent.analyses.some(analysis=>analysis.series.some(series=>series.metric!==choice)))planning.outcome={status:'INVALID_PLAN'};
    const executed=await this.executePlanning(planning,profile,identity,conversation);
    if(executed.state)conversation.state=executed.state;
    if(choice && conversation.state)conversation.state.resolvedAmbiguities=[...new Set([...conversation.state.resolvedAmbiguities,choice])].slice(-8);
    return executed.answer;
  }
  private async executePlanning(planning:Awaited<ReturnType<StructuredAnalyticsPlanner['plan']>>,profile:TenantProfile,identity:RequestContext,conversation:AnalystConversation) {
    const outcome=planning.outcome;
    let answer:AnalystAnswer={status:outcome.status,panels:[],conversion:'unavailable',timing:emptyAnalystTiming(),...(outcome.status==='AMBIGUOUS'?{choices:outcome.choices}:{})};
    if(outcome.status==='SUPPORTED') {
      const result=await this.runtime.executor.execute(outcome.intent,identity);
      if('analyses' in result) {
        answer=renderAnalystAnswer(result,profile);
        for(const panel of answer.panels)panel.scopeFilters=structuredClone(identity.authorization.enforcedFilters) as import('@el-dabboos/domain').AnalyticsFilter[];
        const state=analyticsConversationState(result,identity,conversation.state);
        answer.timing.plannerMs=planning.timing.plannerMs;answer.timing.capabilityMs+=planning.timing.capabilityMs;
        return {answer,state};
      }
      answer={...answer,status:result.status};
    }
    answer.timing.plannerMs=planning.timing.plannerMs;answer.timing.capabilityMs+=planning.timing.capabilityMs;
    return {answer};
  }
  private async synthesize(answer:AnalystAnswer,locale:'en'|'ar') {
    if(!this.runtime.synthesis||answer.panels.length<3)return;
    const started=performance.now();
    try{answer.synthesisReferences=await synthesizeAnalystHighlights(this.runtime.synthesis,answer,locale);}catch{ /* Deterministic answer survives unavailable or ungrounded synthesis. */ }
    answer.timing.synthesisMs=performance.now()-started;
  }
}
function turnQuestion(conversation:AnalystConversation,turn:AnalystTurn) {
  if(turn.choice) {
    if(!conversation.pending?.choices.includes(turn.choice))throw new AnalystConversationError('INVALID_CHOICE');
    return conversation.pending.question;
  }
  if(typeof turn.question!=='string'||!turn.question.trim()||turn.question.length>2000)throw new AnalystConversationError('INVALID_MESSAGE');
  return turn.question.trim();
}
function assertFreshOwner(conversation:AnalystConversation,previous:RequestContext,fresh:RequestContext) {
  if(JSON.stringify(previous)!==JSON.stringify(fresh))throw new AnalystConversationError('SCOPE_CHANGED');
  if(conversation.state)try{assertConversationOwner(conversation.state,fresh);}catch{throw new AnalystConversationError('SCOPE_CHANGED');}
}
async function questionAudit(conversation:AnalystConversation,message:AnalystConversation['messages'][number],identity:RequestContext):Promise<AnalystAudit> {
  const answer=message.answer;
  return {conversationId:conversation.id,messageId:message.id,...owner(identity),membershipId:identity.principal.membershipId,timestamp:message.createdAt,
    effectivePeriods:answer.panels.map(panel=>panel.query.dateRange),...(answer.intent?{intentHash:await intentHash(answer.intent)}:{}),
    capabilityStatus:answer.panels.length?'SUPPORTED':answer.status,executionStatus:answer.status,
    references:answer.panels.map(panel=>({...(panel.result.metadata.release?{release:panel.result.metadata.release.datasetId}:{}),...(panel.result.metadata.snapshotAsOf?{snapshotAsOf:panel.result.metadata.snapshotAsOf}:{}),executedAt:panel.result.metadata.executedAt}))};
}

function retainClarification(conversation:AnalystConversation,answer:AnalystAnswer,question:string,pageContext:AnalyticsIntent['context']|undefined) {
 if(answer.status==='AMBIGUOUS')conversation.pending={question,choices:answer.choices!,context:pageContext??conversation.state?.activeContext??{}};
 else delete conversation.pending;
}

async function intentHash(intent:AnalyticsIntent) {
 const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(intent)));
 return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

/** Keep semantic memory and the latest evidence; discard oldest display turns before a record becomes a dataset cache. */
function trimConversationDisplay(conversation:AnalystConversation) {
 while(conversation.messages.length>1 && new TextEncoder().encode(JSON.stringify(conversation)).byteLength>1048576)conversation.messages.shift();
}
