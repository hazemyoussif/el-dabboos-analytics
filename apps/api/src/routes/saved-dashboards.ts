import { GovernedSavedDashboardService } from '@el-dabboos/application';
import type { FastifyInstance } from 'fastify';
import type { DashboardScope } from '@el-dabboos/domain';
import { analyticsContext } from '../context.ts';
import type { RouteContext } from '../context.ts';
import { ApiError, object } from '../errors.ts';

export function registerSavedDashboardRoutes(app: FastifyInstance, services: RouteContext): void {
  const service = () => {
    if (!services.savedDashboards) throw new ApiError(503, 'DASHBOARD_STORAGE_UNAVAILABLE', 'Saved dashboards are unavailable.');
    return services.savedDashboards;
  };
  app.get('/api/saved-dashboards', async request => {
    const { context } = await services.session(request.headers);
    return services.checked(context, 'dashboard.saved_list', async () => {
      const saved = service();
      if (saved instanceof GovernedSavedDashboardService) {
        const query = request.query as Record<string, unknown>;
        if (Object.keys(query).some(key => key !== 'cursor') || (query.cursor !== undefined && typeof query.cursor !== 'string')) throw new ApiError(400, 'INVALID_BODY', 'Invalid list cursor.');
        const page = await saved.listPage(context, { limit: 100, ...(typeof query.cursor === 'string' ? { cursor: query.cursor } : {}) });
        return { dashboards: page.items, ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}) };
      }
      return { dashboards: await saved.list(context) };
    });
  });
  app.get<{ Params: { id: string } }>('/api/saved-dashboards/:id', async request => {
    const { context } = await services.session(request.headers);
    return services.checked(context, 'dashboard.saved_get', () => service().get(request.params.id, context), request.params.id);
  });
  app.post<{ Params: { id: string } }>('/api/saved-dashboards/:id/execute', async request => {
    const { context, profile } = await services.session(request.headers);
    services.authorize(context, 'dashboard:view', 'analytics:query');
    await services.requireData(context.tenant.tenantId);
    const record = await service().get(request.params.id, context);
    return services.checked(context, 'dashboard.execute', () => services.executor.execute(record.spec, analyticsContext(context), { timeZone: profile.timeZone }), record.id);
  });
  app.post('/api/saved-dashboards', async request => {
    const { context } = await services.session(request.headers);
    return services.checked(context, 'dashboard.saved_create', async () => {
      if (!object(request.body) || Object.keys(request.body).some(key => !['dashboard','scope'].includes(key)) || !object(request.body.dashboard) ||
        (request.body.scope !== undefined && request.body.scope !== 'private' && request.body.scope !== 'tenant' && !(services.deps.administration && request.body.scope === 'restricted')))
        throw new ApiError(400, 'INVALID_BODY', 'dashboard and valid scope are required.');
      const scope: DashboardScope | 'restricted' = request.body.scope === 'restricted' ? 'restricted' : request.body.scope === 'tenant' ? 'tenant' : 'private';
      const saved = service();
      if (scope === 'restricted') { if (!(saved instanceof GovernedSavedDashboardService)) throw new ApiError(400, 'INVALID_BODY', 'Restricted scope is unavailable.'); return saved.create(request.body.dashboard, scope, context); }
      return saved.create(request.body.dashboard, scope, context);
    });
  });
  app.put<{ Params: { id: string } }>('/api/saved-dashboards/:id', async request => {
    const { context } = await services.session(request.headers);
    return services.checked(context, 'dashboard.saved_update', async () => {
      if (!object(request.body) || Object.keys(request.body).some(key => !['dashboard','expectedVersion'].includes(key)) || !object(request.body.dashboard) || !Number.isInteger(request.body.expectedVersion) ||
        Number(request.body.expectedVersion) < 1) throw new ApiError(400, 'INVALID_BODY', 'dashboard and positive expectedVersion are required.');
      return service().update(request.params.id, Number(request.body.expectedVersion), request.body.dashboard, context);
    }, request.params.id);
  });
}
