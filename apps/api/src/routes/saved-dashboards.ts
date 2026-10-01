import type { FastifyInstance } from 'fastify';
import type { DashboardScope } from '@el-dabbous/domain';
import type { RouteContext } from '../context.ts';
import { ApiError, object } from '../errors.ts';

export function registerSavedDashboardRoutes(app: FastifyInstance, services: RouteContext): void {
  const service = () => {
    if (!services.savedDashboards) throw new ApiError(503, 'DASHBOARD_STORAGE_UNAVAILABLE', 'Saved dashboards are unavailable.');
    return services.savedDashboards;
  };
  app.get('/api/saved-dashboards', async request => {
    const { context } = services.session(request.headers);
    return services.checked(context, 'dashboard.saved_list', async () => ({ dashboards: await service().list(context) }));
  });
  app.get<{ Params: { id: string } }>('/api/saved-dashboards/:id', async request => {
    const { context } = services.session(request.headers);
    return services.checked(context, 'dashboard.saved_get', () => service().get(request.params.id, context), request.params.id);
  });
  app.post('/api/saved-dashboards', async request => {
    const { context } = services.session(request.headers);
    return services.checked(context, 'dashboard.saved_create', async () => {
      if (!object(request.body) || !object(request.body.dashboard) ||
        (request.body.scope !== undefined && request.body.scope !== 'private' && request.body.scope !== 'tenant'))
        throw new ApiError(400, 'INVALID_BODY', 'dashboard and valid scope are required.');
      const scope: DashboardScope = request.body.scope === 'tenant' ? 'tenant' : 'private';
      return service().create(request.body.dashboard, scope, context);
    });
  });
  app.put<{ Params: { id: string } }>('/api/saved-dashboards/:id', async request => {
    const { context } = services.session(request.headers);
    return services.checked(context, 'dashboard.saved_update', async () => {
      if (!object(request.body) || !object(request.body.dashboard) || !Number.isInteger(request.body.expectedVersion) ||
        Number(request.body.expectedVersion) < 1) throw new ApiError(400, 'INVALID_BODY', 'dashboard and positive expectedVersion are required.');
      return service().update(request.params.id, Number(request.body.expectedVersion), request.body.dashboard, context);
    }, request.params.id);
  });
}
