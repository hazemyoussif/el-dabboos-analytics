import { correlationId, registerOperationalLogging } from './operational-logging.ts';
import { parseCorsOrigins } from './deployment-config.ts';
import { registerAdministrationRoutes } from './routes/administration.ts';
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
export async function buildApi(deps: ApiDependencies, runtime: { corsOrigins?: readonly string[]; operationalLog?: (line: string) => void } = {}) {
  const app = Fastify({ logger: false, requestIdHeader: false, genReqId: request => correlationId(request.headers['x-request-id']), ajv: { customOptions: { removeAdditional: false } } });
  registerOperationalLogging(app,runtime.operationalLog);
  const origins = runtime.corsOrigins ? parseCorsOrigins(runtime.corsOrigins.join(',')) : parseCorsOrigins(undefined,true);
  await app.register(cors, { origin: origins, exposedHeaders: ['x-request-id'] });
  const services = createRouteContext(deps);
  registerErrorHandler(app);
  registerHealthRoutes(app, deps);
  if (deps.administration) registerAdministrationRoutes(app, services);
  registerIdentityRoutes(app, services);
  registerMetadataRoutes(app, services);
  registerTemplateRoutes(app, services);
  registerAnalyticsRoutes(app, services);
  registerDashboardRoutes(app, services);
  registerSavedDashboardRoutes(app, services);
  registerDashboardLibraryRoutes(app, services);
  return app;
}
