import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../context.ts';
import { ApiError,object } from '../errors.ts';

export function registerAnalyticsStatusRoutes(app: FastifyInstance, services: RouteContext) {
  app.get('/api/analytics/status', async request => {
    const {context}=await services.session(request.headers);
    services.authorize(context,'analytics:query');
    if(!services.deps.operationalStatus)throw new ApiError(503,'ANALYTICS_OPERATIONS_UNAVAILABLE','Operational status is not configured.');
    const commands=services.deps.operationalCommands,sourceAvailability=commands?.availability?.(context.tenant.tenantId);
    return {...await services.deps.operationalStatus.status(context.tenant.tenantId),commandsConfigured:!!commands,commandsAvailable:!!commands&&sourceAvailability?.sourceAvailable!==false,...(sourceAvailability?{sourceAvailability}:{})};
  });
  app.post('/api/analytics/operations', async request => {
    const {context}=await services.session(request.headers);
    return services.checked(context,'analytics.operation',async()=>{
    services.authorize(context,'analytics:query','tenant:manage');
    const body=request.body;
    if(!object(body)||Object.keys(body).length!==1||typeof body.kind!=='string'||!['sync','affected','daily'].includes(body.kind))throw new ApiError(400,'INVALID_OPERATION','Choose synchronization or reconciliation.');
    if(!services.deps.operationalCommands)throw new ApiError(503,'ANALYTICS_OPERATIONS_UNAVAILABLE','Operational commands are not configured.');
    if(services.deps.operationalCommands.availability?.(context.tenant.tenantId).sourceAvailable===false)throw new ApiError(503,'ANALYTICS_SOURCE_UNAVAILABLE','The source is temporarily unavailable. Trusted reports remain available.');
    try {
      return await services.deps.operationalCommands.run({tenantId:context.tenant.tenantId,actorId:context.principal.userId,trigger:'manual',kind:body.kind as 'sync'|'affected'|'daily'});
    } catch {
      throw new ApiError(503,'ANALYTICS_OPERATION_FAILED','The update could not complete. Previously trusted data remains available.');
    }
    });
  });
}
