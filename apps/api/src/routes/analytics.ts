import { DrillThroughService, DefaultAuthorizationPolicy } from '@el-dabboos/application';
import { DrillUnavailableError } from '@el-dabboos/domain';
import type { DrillRequest } from '@el-dabboos/domain';
import { ApiError } from '../errors.ts';
import { assertPublishedQuery } from '@el-dabboos/application';
import { workspacePublishedCapabilities } from '../published-analytics.ts';
import type { FastifyInstance } from 'fastify';
import { validateQuery } from '@el-dabboos/domain';
import type { AnalyticsQuery } from '@el-dabboos/domain';
import { analyticsContext } from '../context.ts';
import type { RouteContext } from '../context.ts';

export function registerAnalyticsRoutes(app: FastifyInstance, services: RouteContext): void {
  app.post('/api/analytics/drill-through', async request => {
    const { context } = await services.session(request.headers);
    services.authorize(context,'dashboard:view','analytics:query');
    await services.requireData(context.tenant.tenantId);
    const repository=services.deps.drillThroughRepository;
    if(!repository)throw new ApiError(503,'DRILL_NOT_READY','Trusted detail lineage is unavailable.');
    const drill=new DrillThroughService(repository,services.deps.authorizationPolicy??new DefaultAuthorizationPolicy());
    return services.checked(context,'analytics.query',async()=>{
      try {return await drill.execute(request.body as DrillRequest,context);}
      catch(error){
        if(error instanceof DrillUnavailableError)throw new ApiError(error.code==='DRILL_CONTEXT_INVALID'?400:409,error.code,error.code==='DRILL_RELEASE_CHANGED'?'Refresh the summary before opening details.':'Trusted details are unavailable for this context.');
        throw error;
      }
    });
  });
  app.post('/api/analytics/query', async request => {
    const { context } = await services.session(request.headers);
    services.authorize(context, 'analytics:query');
    await services.requireData(context.tenant.tenantId);
    return services.checked(context, 'analytics.query', async () => {
      const query = request.body as AnalyticsQuery;
      validateQuery(query, analyticsContext(context));
      assertPublishedQuery(query,await workspacePublishedCapabilities(services,context));
      return services.analytics.execute(query, context);
    });
  });
}
