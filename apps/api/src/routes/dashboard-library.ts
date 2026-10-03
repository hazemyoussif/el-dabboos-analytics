import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../context.ts';
import { ApiError, object } from '../errors.ts';
export function registerDashboardLibraryRoutes(app: FastifyInstance, services: RouteContext): void {
  const service = () => { if (!services.library) throw new ApiError(503, 'LIBRARY_UNAVAILABLE', 'Dashboard library is unavailable.'); return services.library; };
  app.get('/api/dashboard-library', async request => service().list((await services.session(request.headers)).context));
  app.post('/api/dashboard-library/folders', async request => { if (!object(request.body)) throw new ApiError(400,'INVALID_BODY','name is required.'); return service().createFolder(request.body.name,(await services.session(request.headers)).context); });
  app.put<{ Params: { id: string } }>('/api/dashboard-library/folders/:id', async request => { if (!object(request.body)) throw new ApiError(400,'INVALID_BODY','name is required.'); return service().renameFolder(request.params.id,request.body.name,(await services.session(request.headers)).context); });
  app.delete<{ Params: { id: string } }>('/api/dashboard-library/folders/:id', async request => { await service().deleteFolder(request.params.id,(await services.session(request.headers)).context); return { deleted: true }; });
  app.put<{ Params: { id: string } }>('/api/dashboard-library/dashboards/:id', async request => service().setPreference(request.params.id,request.body,(await services.session(request.headers)).context));
}
