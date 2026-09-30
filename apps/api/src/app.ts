import Fastify from 'fastify';
import cors from '@fastify/cors';
import { DashboardExecutor, MockDashboardPlanner, UnsupportedDemoIntentError, demoDashboards } from '@el-dabbous/application';
import { applyDashboardPatch, semanticCatalog, validateDashboardSpec, validateQuery } from '@el-dabbous/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, DashboardPlanner, DashboardSpec, Locale } from '@el-dabbous/domain';

export class ApiError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string) { super(message); }
}
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export interface ApiDependencies { repository: AnalyticsRepository; planner?: DashboardPlanner; clock?: () => Date }
export async function buildApi(deps: ApiDependencies) {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] });
  const clock = deps.clock ?? (() => new Date());
  const planner = deps.planner ?? new MockDashboardPlanner(clock);
  const executor = new DashboardExecutor(deps.repository, clock);
  const context = (headers: Record<string, unknown>): AnalyticsContext => {
    if (headers['x-tenant-id'] !== 'demo') throw new ApiError(headers['x-tenant-id'] ? 403 : 401, headers['x-tenant-id'] ? 'TENANT_FORBIDDEN' : 'TENANT_REQUIRED', 'A valid demo tenant header is required.');
    const locale = headers['x-locale'] ?? 'en';
    if (locale !== 'en' && locale !== 'ar') throw new ApiError(400, 'INVALID_LOCALE', 'Locale must be en or ar.');
    return { tenantId: 'demo', locale: locale as Locale };
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
  app.get('/api/semantic-catalog', async () => ({ metrics: Object.values(semanticCatalog) }));
  app.get('/api/dashboards/demos', async () => ({ dashboards: demoDashboards(clock()) }));
  app.post('/api/analytics/query', async request => {
    const ctx = context(request.headers);
    const query = request.body as AnalyticsQuery;
    validateQuery(query, ctx);
    return deps.repository.execute(query, ctx);
  });
  app.post('/api/dashboards/execute', async request => {
    const ctx = context(request.headers);
    if (!object(request.body) || !object(request.body.dashboard)) throw new ApiError(400, 'INVALID_BODY', 'dashboard is required.');
    const dashboard = request.body.dashboard as unknown;
    validateDashboardSpec(dashboard);
    return executor.execute(dashboard, ctx);
  });
  app.post('/api/dashboards/generate', async request => {
    const ctx = context(request.headers);
    if (!object(request.body) || typeof request.body.prompt !== 'string' || !request.body.prompt.trim()) throw new ApiError(400, 'INVALID_BODY', 'prompt is required.');
    const dashboard = await planner.generate({ prompt: request.body.prompt, locale: ctx.locale, context: ctx });
    validateDashboardSpec(dashboard);
    return { dashboard, execution: await executor.execute(dashboard, ctx) };
  });
  app.post('/api/dashboards/edit', async request => {
    const ctx = context(request.headers);
    if (!object(request.body) || !object(request.body.dashboard) || typeof request.body.instruction !== 'string' || !request.body.instruction.trim()) throw new ApiError(400, 'INVALID_BODY', 'dashboard and instruction are required.');
    const current = request.body.dashboard as unknown as DashboardSpec;
    validateDashboardSpec(current);
    const patch = await planner.edit(current, request.body.instruction);
    const dashboard = applyDashboardPatch(current, patch);
    return { patch, dashboard, execution: await executor.execute(dashboard, ctx) };
  });
  return app;
}
