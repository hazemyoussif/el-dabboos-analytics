import { assertPublishedQuery } from '@el-dabboos/application';
import { workspacePublishedCapabilities } from '../published-analytics.ts';
import type { FastifyInstance } from 'fastify';
import { validateQuery } from '@el-dabboos/domain';
import type { AnalyticsQuery } from '@el-dabboos/domain';
import { analyticsContext } from '../context.ts';
import type { RouteContext } from '../context.ts';

export function registerAnalyticsRoutes(app: FastifyInstance, services: RouteContext): void {
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
