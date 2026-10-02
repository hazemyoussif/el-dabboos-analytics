import type { FastifyInstance } from 'fastify';
import { validateQuery } from '@el-dabboos/domain';
import type { AnalyticsQuery } from '@el-dabboos/domain';
import { analyticsContext } from '../context.ts';
import type { RouteContext } from '../context.ts';

export function registerAnalyticsRoutes(app: FastifyInstance, services: RouteContext): void {
  app.post('/api/analytics/query', async request => {
    const { context } = services.session(request.headers);
    return services.checked(context, 'analytics.query', async () => {
      const query = request.body as AnalyticsQuery;
      validateQuery(query, analyticsContext(context));
      return services.analytics.execute(query, context);
    });
  });
}
