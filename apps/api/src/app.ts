import Fastify from 'fastify';
import cors from '@fastify/cors';
import { DashboardExecutor, MockDashboardPlanner, UnsupportedDemoIntentError, dashboardTemplates, getDashboardTemplate, instantiateDashboardTemplate } from '@el-dabbous/application';
import { applyDashboardPatch, getTenantProfile, productMetricCatalog, semanticCatalog, tenantProfiles, validateDashboardSpec, validateQuery } from '@el-dabbous/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, DashboardPlanner, DashboardSpec, Locale, TenantProfile } from '@el-dabbous/domain';

export class ApiError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string) { super(message); }
}
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export interface ApiDependencies { repository: AnalyticsRepository; planner?: DashboardPlanner | null; clock?: () => Date }
export async function buildApi(deps: ApiDependencies) {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] });
  const clock = deps.clock ?? (() => new Date());
  const planner = deps.planner === undefined ? new MockDashboardPlanner(clock) : deps.planner;
  const executor = new DashboardExecutor(deps.repository, clock);
  const session = (headers: Record<string, unknown>): { context: AnalyticsContext; profile: TenantProfile } => {
    const tenant = headers['x-tenant-id'];
    if (typeof tenant !== 'string' || !tenant) throw new ApiError(401, 'TENANT_REQUIRED', 'A controlled demo tenant header is required.');
    const profile = getTenantProfile(tenant);
    if (!profile) throw new ApiError(403, 'TENANT_FORBIDDEN', 'Unknown demo tenant.');
    const locale = headers['x-locale'] ?? profile.defaultLocale;
    if (locale !== 'en' && locale !== 'ar') throw new ApiError(400, 'INVALID_LOCALE', 'Locale must be en or ar.');
    return { context: { tenantId: profile.id, locale: locale as Locale }, profile };
  };
  app.setErrorHandler((error, _request, reply) => {
    const rawStatus = object(error) ? error.statusCode : undefined;
    const parserStatus = typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 500 ? rawStatus : undefined;
    const status = error instanceof ApiError ? error.statusCode : error instanceof UnsupportedDemoIntentError ? 422 :
      parserStatus ?? (error instanceof Error && /Invalid|Unknown|Unsupported|requires|Duplicate|Incompatible/i.test(error.message) ? 400 : 500);
    const code = error instanceof ApiError ? error.code : error instanceof UnsupportedDemoIntentError ? error.code : status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
    reply.status(status).send({ error: { code, message: status === 500 ? 'Internal server error' : error instanceof Error ? error.message : String(error) } });
  });
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/tenant-profiles', async () => ({ profiles: Object.values(tenantProfiles), defaultTenantId: 'demo-iq' }));
  app.get('/api/tenant-profile', async request => session(request.headers).profile);
  app.get('/api/semantic-catalog', async () => ({ metrics: Object.values(semanticCatalog), registry: productMetricCatalog }));
  app.get('/api/dashboard-templates', async () => ({ templates: dashboardTemplates }));
  app.get<{ Params: { id: string } }>('/api/dashboard-templates/:id/instantiate', async request => {
    const { context, profile } = session(request.headers);
    const template = getDashboardTemplate(request.params.id);
    if (!template) throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Unknown dashboard template.');
    const dashboard = instantiateDashboardTemplate(template, profile, clock(), context.locale);
    return { dashboard, execution: await executor.execute(dashboard, context) };
  });
  app.post('/api/analytics/query', async request => {
    const { context } = session(request.headers);
    const query = request.body as AnalyticsQuery;
    validateQuery(query, context);
    return deps.repository.execute(query, context);
  });
  app.post('/api/dashboards/execute', async request => {
    const { context } = session(request.headers);
    if (!object(request.body) || !object(request.body.dashboard)) throw new ApiError(400, 'INVALID_BODY', 'dashboard is required.');
    const dashboard = request.body.dashboard;
    validateDashboardSpec(dashboard);
    return executor.execute(dashboard, context);
  });
  app.post('/api/dashboards/generate', async request => {
    const { context, profile } = session(request.headers);
    if (!object(request.body) || typeof request.body.prompt !== 'string' || !request.body.prompt.trim()) throw new ApiError(400, 'INVALID_BODY', 'prompt is required.');
    if (!planner) throw new ApiError(503, 'PLANNER_UNAVAILABLE', 'Dashboard planning is disabled.');
    const dashboard = await planner.generate({ prompt: request.body.prompt, locale: context.locale, context, tenantProfile: profile });
    validateDashboardSpec(dashboard);
    return { dashboard, execution: await executor.execute(dashboard, context) };
  });
  app.post('/api/dashboards/edit', async request => {
    const { context, profile } = session(request.headers);
    if (!object(request.body) || !object(request.body.dashboard) || typeof request.body.instruction !== 'string' || !request.body.instruction.trim()) throw new ApiError(400, 'INVALID_BODY', 'dashboard and instruction are required.');
    const current = request.body.dashboard as unknown as DashboardSpec;
    validateDashboardSpec(current);
    if (!planner) throw new ApiError(503, 'PLANNER_UNAVAILABLE', 'Dashboard planning is disabled.');
    const patch = await planner.edit(current, request.body.instruction, profile);
    const dashboard = applyDashboardPatch(current, patch);
    return { patch, dashboard, execution: await executor.execute(dashboard, context) };
  });
  return app;
}
