import { registerHealthRoutes } from './routes/health.ts';
import { registerDashboardLibraryRoutes } from './routes/dashboard-library.ts';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createRouteContext } from './context.ts';
import type { ApiDependencies } from './context.ts';
import { ApiError, registerErrorHandler } from './errors.ts';
import { registerIdentityRoutes } from './routes/identity.ts';
import { registerMetadataRoutes } from './routes/metadata.ts';
import { registerTemplateRoutes } from './routes/templates.ts';
import { registerAnalyticsRoutes } from './routes/analytics.ts';
import { registerDashboardRoutes } from './routes/dashboards.ts';
import { registerSavedDashboardRoutes } from './routes/saved-dashboards.ts';

export { ApiError };
export type { ApiDependencies };
export async function buildApi(deps: ApiDependencies) {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] });
  const services = createRouteContext(deps);
  registerErrorHandler(app);
  registerHealthRoutes(app, deps);
  registerIdentityRoutes(app, services);
  registerMetadataRoutes(app, services);
  registerTemplateRoutes(app, services);
  registerAnalyticsRoutes(app, services);
  registerDashboardRoutes(app, services);
  registerSavedDashboardRoutes(app, services);
  registerDashboardLibraryRoutes(app, services);
  return app;
}
