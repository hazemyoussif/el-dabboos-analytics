import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AuthorizedAnalyticsService, AuthorizationError, DefaultAuthorizationPolicy, DemoIdentityProvider, DashboardExecutor, InMemoryAuditSink, MockDashboardPlanner, UnsupportedDemoIntentError, analyticsContext, authorizedCatalog, dashboardTemplates, getDashboardTemplate, instantiateDashboardTemplate } from '@el-dabbous/application';
import { applyDashboardPatch, getTenantProfile, validateDashboardSpec, validateQuery } from '@el-dabbous/domain';
import type { AnalyticsQuery, AnalyticsRepository, AuditAction, AuditSink, AuthorizationPolicy, DashboardPlanner, DashboardSpec, DimensionId, DimensionValueRepository, DemoIdentityDirectory, IdentityProvider, Locale, Permission, RequestContext, TenantProfile } from '@el-dabbous/domain';

export class ApiError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string) { super(message); }
}
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export interface ApiDependencies { analyticsRepository: AnalyticsRepository; dimensionValues: DimensionValueRepository; planner?: DashboardPlanner | null; identityProvider?: IdentityProvider; demoDirectory?: DemoIdentityDirectory; authorizationPolicy?: AuthorizationPolicy; auditSink?: AuditSink; clock?: () => Date }
export async function buildApi(deps: ApiDependencies) {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] });
  const clock = deps.clock ?? (() => new Date());
  const planner = deps.planner === undefined ? new MockDashboardPlanner(clock) : deps.planner;
  const demoIdentity = new DemoIdentityProvider();
  const identity = deps.identityProvider ?? demoIdentity;
  const directory = deps.demoDirectory ?? demoIdentity;
  const policy = deps.authorizationPolicy ?? new DefaultAuthorizationPolicy();
  const audit = deps.auditSink ?? new InMemoryAuditSink();
  const executor = new DashboardExecutor(deps.analyticsRepository, clock);
  const analytics = new AuthorizedAnalyticsService(deps.analyticsRepository, policy);
  const userId = (headers: Record<string, unknown>) => {
    const value = headers['x-demo-user-id'];
    if (typeof value !== 'string' || !value) throw new ApiError(401, 'DEMO_USER_REQUIRED', 'A controlled demo user header is required.');
    if (!directory.listUsers().some(user => user.id === value)) throw new ApiError(401, 'UNKNOWN_USER', 'Unknown demo user.');
    return value;
  };
  const session = (headers: Record<string, unknown>): { context: RequestContext; profile: TenantProfile } => {
    const user = userId(headers);
    const tenant = headers['x-tenant-id'];
    if (typeof tenant !== 'string' || !tenant) throw new ApiError(401, 'TENANT_REQUIRED', 'A controlled demo tenant header is required.');
    const profile = getTenantProfile(tenant);
    if (!profile) throw new ApiError(403, 'TENANT_FORBIDDEN', 'Unknown demo tenant.');
    const locale = headers['x-locale'] ?? profile.defaultLocale;
    if (locale !== 'en' && locale !== 'ar') throw new ApiError(400, 'INVALID_LOCALE', 'Locale must be en or ar.');
    return { context: identity.resolve(user, tenant, locale as Locale), profile };
  };
  const authorize = (context: RequestContext, ...permissions: Permission[]) => permissions.forEach(permission => policy.authorize(permission, context));
  const ensureDashboard = (spec: unknown, context: RequestContext): DashboardSpec => {
    validateDashboardSpec(spec);
    policy.authorizeDashboard(spec, context);
    return spec;
  };
  const record = (context: RequestContext, action: AuditAction, result: 'allowed' | 'denied' | 'error', dashboardId?: string) =>
    audit.record({ tenantId: context.tenant.tenantId, userId: context.principal.userId, membershipId: context.principal.membershipId,
      action, timestamp: clock().toISOString(), result, ...(dashboardId ? { dashboardId } : {}) });
  const checked = async <T>(context: RequestContext, action: AuditAction, operation: () => Promise<T>, dashboardId?: string): Promise<T> => {
    try { const output = await operation(); record(context, action, 'allowed', dashboardId); return output; }
    catch (error) { record(context, action, error instanceof AuthorizationError ? 'denied' : 'error', dashboardId); throw error; }
  };
  const templateAllowed = (template: (typeof dashboardTemplates)[number], context: RequestContext): boolean => {
    try { policy.authorizeDashboard({ schemaVersion: 2, id: template.id, title: template.name, locale: context.locale,
      filters: {}, layout: template.layout, widgets: template.widgets }, context); return true; }
    catch (error) { if (error instanceof AuthorizationError) return false; throw error; }
  };
  app.setErrorHandler((error, _request, reply) => {
    const rawStatus = object(error) ? error.statusCode : undefined;
    const parserStatus = typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 500 ? rawStatus : undefined;
    const status = error instanceof ApiError ? error.statusCode : error instanceof AuthorizationError ? 403 : error instanceof UnsupportedDemoIntentError ? 422 :
      parserStatus ?? (error instanceof Error && /Invalid|Unknown|Unsupported|requires|Duplicate|Incompatible/i.test(error.message) ? 400 : 500);
    const code = error instanceof ApiError || error instanceof AuthorizationError ? error.code : error instanceof UnsupportedDemoIntentError ? error.code : status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
    reply.status(status).send({ error: { code, message: status === 500 ? 'Internal server error' : error instanceof Error ? error.message : String(error) } });
  });
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/demo-principals', async () => ({ users: directory.listUsers().map(user => ({ id: user.id, displayName: user.displayName })) }));
  app.get('/api/tenant-profiles', async request => {
    const user = userId(request.headers);
    const profiles = directory.membershipsFor(user).map(membership => getTenantProfile(membership.tenantId)).filter((profile): profile is TenantProfile => !!profile);
    return { profiles, defaultTenantId: profiles[0]?.id ?? null };
  });
  app.get('/api/tenant-profile', async request => session(request.headers).profile);
  app.get('/api/demo-capabilities', async request => { const { context } = session(request.headers); return { permissions: context.authorization.permissions }; });
  app.get('/api/semantic-catalog', async request => {
    const { context } = session(request.headers); authorize(context, 'analytics:query');
    return authorizedCatalog(context);
  });
  app.get('/api/dashboard-templates', async request => {
    const { context } = session(request.headers); authorize(context, 'dashboard:view');
    return { templates: dashboardTemplates.map(template => ({ ...template, availability: templateAllowed(template, context) ? 'available' : 'restricted',
      ...(templateAllowed(template, context) ? {} : { reason: 'Contains metrics unavailable to this demo user.' }) })) };
  });
  app.get<{ Params: { dimension: string } }>('/api/dimensions/:dimension/values', async request => {
    const { context, profile } = session(request.headers); authorize(context, 'analytics:query');
    const dimension = request.params.dimension;
    if (!['branch', 'region', 'salesperson', 'product_category', 'warehouse'].includes(dimension))
      throw new ApiError(400, 'UNSUPPORTED_DIMENSION', 'Dimension values are unavailable.');
    const ids = await deps.dimensionValues.listDimensionValues(dimension as DimensionId, analyticsContext(context));
    return { dimension, values: ids.map(id => ({ id, label: dimension === 'branch' ? profile.branchLabels[id]?.[context.locale] ?? id : id.replaceAll('_', ' ') })) };
  });
  app.get<{ Params: { id: string } }>('/api/dashboard-templates/:id/instantiate', async request => {
    const { context, profile } = session(request.headers);
    return checked(context, 'dashboard.execute', async () => {
      authorize(context, 'dashboard:view', 'analytics:query');
      const template = getDashboardTemplate(request.params.id);
      if (!template) throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Unknown dashboard template.');
      if (!templateAllowed(template, context)) throw new AuthorizationError('TEMPLATE_FORBIDDEN', 'Template contains unavailable metrics.');
      const dashboard = ensureDashboard(instantiateDashboardTemplate(template, profile, clock(), context.locale), context);
      return { dashboard, execution: await executor.execute(dashboard, analyticsContext(context)) };
    }, request.params.id);
  });
  app.post('/api/analytics/query', async request => {
    const { context } = session(request.headers);
    return checked(context, 'analytics.query', async () => {
      const query = request.body as AnalyticsQuery;
      validateQuery(query, analyticsContext(context));
      return analytics.execute(query, context);
    });
  });
  app.post('/api/dashboards/execute', async request => {
    const { context } = session(request.headers);
    return checked(context, 'dashboard.execute', async () => {
      authorize(context, 'dashboard:view', 'analytics:query');
      if (!object(request.body) || !object(request.body.dashboard)) throw new ApiError(400, 'INVALID_BODY', 'dashboard is required.');
      const dashboard = ensureDashboard(request.body.dashboard, context);
      return executor.execute(dashboard, analyticsContext(context));
    });
  });
  app.post('/api/dashboards/generate', async request => {
    const { context, profile } = session(request.headers);
    return checked(context, 'dashboard.generate', async () => {
      authorize(context, 'ai:generate', 'analytics:query', 'dashboard:create');
      if (!object(request.body) || typeof request.body.prompt !== 'string' || !request.body.prompt.trim()) throw new ApiError(400, 'INVALID_BODY', 'prompt is required.');
      if (!planner) throw new ApiError(503, 'PLANNER_UNAVAILABLE', 'Dashboard planning is disabled.');
      const allowed = authorizedCatalog(context);
      const dashboard = ensureDashboard(await planner.generate({ prompt: request.body.prompt, locale: context.locale, context: analyticsContext(context), tenantProfile: profile,
        capabilities: { metricIds: allowed.metricIds, templateIds: dashboardTemplates.filter(template => templateAllowed(template, context)).map(template => template.id), actions: context.authorization.permissions } }), context);
      return { dashboard, execution: await executor.execute(dashboard, analyticsContext(context)) };
    });
  });
  app.post('/api/dashboards/edit', async request => {
    const { context, profile } = session(request.headers);
    return checked(context, 'dashboard.edit', async () => {
      authorize(context, 'ai:edit', 'analytics:query', 'dashboard:edit');
      if (!object(request.body) || !object(request.body.dashboard) || typeof request.body.instruction !== 'string' || !request.body.instruction.trim()) throw new ApiError(400, 'INVALID_BODY', 'dashboard and instruction are required.');
      const current = ensureDashboard(request.body.dashboard, context);
      if (!planner) throw new ApiError(503, 'PLANNER_UNAVAILABLE', 'Dashboard planning is disabled.');
      const allowed = authorizedCatalog(context);
      const patch = await planner.edit(current, request.body.instruction, profile,
        { metricIds: allowed.metricIds, templateIds: dashboardTemplates.filter(template => templateAllowed(template, context)).map(template => template.id), actions: context.authorization.permissions });
      const dashboard = ensureDashboard(applyDashboardPatch(current, patch), context);
      return { patch, dashboard, execution: await executor.execute(dashboard, analyticsContext(context)) };
    });
  });
  return app;
}
