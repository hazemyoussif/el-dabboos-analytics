import type { FastifyInstance } from 'fastify';
import { analyticsContext, AnalystConversations, AnalystConversationError, AnalyticsIntentExecutor, DefaultAuthorizationPolicy, analyticsResultDrillRequest, compileDashboardFromAnalyticsIntent, assertPublishedDashboard } from '@el-dabboos/application';
import type { AnalystTurn } from '@el-dabboos/application';
import type { RequestContext } from '@el-dabboos/domain';
import type { RouteContext } from '../context.ts';
import { workspacePublishedCapabilities } from '../published-analytics.ts';
import { ApiError, object } from '../errors.ts';
export function registerAnalystRoutes(app:FastifyInstance,services:RouteContext) {
  async function service(headers:Record<string,unknown>) {
    const {context,profile}=await services.session(headers);services.authorize(context,'ai:generate','analytics:query');
    if(!services.deps.analystRepository)throw new ApiError(503,'AI_UNAVAILABLE','Ask Business is unavailable.');
    // The executor refreshes publication evidence independently of planning. No source adapters participate.
    const executor=new AnalyticsIntentExecutor(services.deps.analyticsRepository,{getPublishedCapabilities:async()=>{
      const fresh=(await services.session(headers)).context;services.authorize(fresh,'ai:generate','analytics:query');
      if(JSON.stringify(fresh)!==JSON.stringify(context))throw new ApiError(403,'SCOPE_CHANGED','Start a new conversation after an access change.');
      return workspacePublishedCapabilities(services,fresh);
    }},services.deps.authorizationPolicy??new DefaultAuthorizationPolicy(),{timeZone:profile.timeZone,clock:services.clock,...(services.deps.executionConcurrency?{maxConcurrency:services.deps.executionConcurrency}:{})});
    return {context,profile,instance:new AnalystConversations({repository:services.deps.analystRepository!,executor,clock:services.clock,...(services.deps.analystPlanner?{planner:services.deps.analystPlanner}:{}),...(services.deps.analystSynthesis?{synthesis:services.deps.analystSynthesis}:{})})};
  }
  app.post('/api/ai-analyst/conversations',async request=>{const {context,instance}=await service(request.headers);return instance.create(context);});
  app.get('/api/ai-analyst/conversations',async request=>{const {context,instance}=await service(request.headers);return {conversations:await instance.list(context)};});
  app.get<{Params:{id:string}}>('/api/ai-analyst/conversations/:id',async request=>{const {context,instance}=await service(request.headers);return governed(()=>instance.get(context,request.params.id));});
  app.post<{Params:{id:string}}>('/api/ai-analyst/conversations/:id/messages',async request=>{
    const {context,profile,instance}=await service(request.headers);
    return services.checked(context,'analyst.question',async()=>{
      if(!object(request.body)||Object.keys(request.body).some(key=>!['question','pageContext','choice','expectedVersion'].includes(key))||!Number.isInteger(request.body.expectedVersion))throw new ApiError(400,'INVALID_MESSAGE','Enter a valid question.');
      const published=await workspacePublishedCapabilities(services,context);
      return governed(()=>instance.message({identity:context,profile,published,id:request.params.id,turn:request.body as unknown as AnalystTurn,
        refreshIdentity:async()=>{const fresh=await services.session(request.headers);services.authorize(fresh.context,'ai:generate','analytics:query');return fresh.context;}}));
    });
  });
  app.post<{Params:{id:string;messageId:string}}>('/api/ai-analyst/conversations/:id/messages/:messageId/dashboard',async request=>{
    const {context,profile,instance}=await service(request.headers);services.authorize(context,'dashboard:create');
    return services.checked(context,'dashboard.generate',async()=>{
      const answer=await savedAnswer(instance,context,request.params);
      if(!answer.intent||answer.conversion!=='available')throw new ApiError(409,'CONVERSION_UNSUPPORTED','This answer cannot be converted without changing its meaning.');
      const dashboard=services.ensureDashboard(compileDashboardFromAnalyticsIntent(answer.intent,{titleEn:'Business analysis',titleAr:'تحليل الأعمال'},profile,context.locale,services.clock()),context);
      assertPublishedDashboard(dashboard,await workspacePublishedCapabilities(services,context),profile.timeZone,services.clock());
      return {dashboard,execution:await services.executor.execute(dashboard,analyticsContext(context),{timeZone:profile.timeZone})};
    });
  });
  app.post<{Params:{id:string;messageId:string}}>('/api/ai-analyst/conversations/:id/messages/:messageId/details',async request=>{
    const {context,instance}=await service(request.headers);
    const answer=await savedAnswer(instance,context,request.params);
    if(!object(request.body)||!Number.isInteger(request.body.panel)||request.body.key!==null&&typeof request.body.key!=='string')throw new ApiError(400,'INVALID_BODY','Select an answer row.');
    const panel=answer.panels[Number(request.body.panel)];
    const selection=panel?analyticsResultDrillRequest(panel,request.body.key as string|null):null;
    if(!selection||!services.deps.drillThroughRepository)throw new ApiError(409,'DETAILS_UNAVAILABLE','Details are unavailable for this answer.');
    return {selection};
  });
}
async function savedAnswer(instance:AnalystConversations,context:RequestContext,params:{id:string;messageId:string}) {
  const conversation=await governed(()=>instance.get(context,params.id)),answer=conversation.messages.find(message=>message.id===params.messageId)?.answer;
  if(!answer)throw new ApiError(404,'ANSWER_NOT_FOUND','Answer unavailable.');return answer;
}
async function governed<Output>(operation:()=>Promise<Output>) {
  try{return await operation();}catch(error){
    if(error instanceof AnalystConversationError)throw new ApiError(error.code==='NOT_FOUND'?404:error.code==='SCOPE_CHANGED'?403:error.code==='CONFLICT'?409:400,error.code,'Conversation unavailable. Start a new conversation or refresh.');
    throw error;
  }
}
