import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../context.ts';
import { ApiError } from '../errors.ts';

export function registerAnalyticsStatusRoutes(app: FastifyInstance, services: RouteContext) {
  app.get('/api/analytics/status', async request => {
    const {context}=await services.session(request.headers);
    services.authorize(context,'analytics:query');
    if(!services.deps.operationalStatus)throw new ApiError(503,'ANALYTICS_OPERATIONS_UNAVAILABLE','Operational status is not configured.');
    return services.deps.operationalStatus.status(context.tenant.tenantId);
  });
}
