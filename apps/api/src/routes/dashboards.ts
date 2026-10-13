import type { FastifyInstance } from 'fastify';
import { publishedCatalog,templateCompatibility,assertPublishedDashboard,dashboardTemplates, validateDashboardFilterOverrides } from '@el-dabboos/application';
import { applyDashboardPatch } from '@el-dabboos/domain';
import type { RequestContext } from '@el-dabboos/domain';
import { workspacePublishedCapabilities } from '../published-analytics.ts';
import { analyticsContext } from '../context.ts';
import type { RouteContext } from '../context.ts';
import { ApiError, object } from '../errors.ts';

export function registerDashboardRoutes(app: FastifyInstance, services: RouteContext): void {
  const capabilities = async (context: RequestContext) => {
    const published = await workspacePublishedCapabilities(services,context);
    return { metricIds: publishedCatalog(context,published).metricIds,
      templateIds: dashboardTemplates.filter(template => services.templateAllowed(template,context) && templateCompatibility(template,published).status==='supported').map(template => template.id),
      actions: context.authorization.permissions,published };
  };
  app.post('/api/dashboards/execute', async request => {
    const { context, profile } = await services.session(request.headers);
    return services.checked(context, 'dashboard.execute', async () => {
      services.authorize(context, 'dashboard:view', 'analytics:query');
      await services.requireData(context.tenant.tenantId);
      if (!object(request.body) || !object(request.body.dashboard)) throw new ApiError(400, 'INVALID_BODY', 'dashboard is required.');
      const dashboard = services.ensureDashboard(request.body.dashboard, context);
      if (Object.keys(request.body).some(key => !['dashboard', 'overrides'].includes(key))) throw new ApiError(400, 'INVALID_BODY', 'Unknown execution field.');
      if (request.body.overrides !== undefined) validateDashboardFilterOverrides(request.body.overrides);
      assertPublishedDashboard(dashboard,await workspacePublishedCapabilities(services,context),profile.timeZone,services.clock(),request.body.overrides as import('@el-dabboos/application').DashboardFilterOverrides | undefined);
      return services.executor.execute(dashboard, analyticsContext(context), { timeZone: profile.timeZone, ...(request.body.overrides !== undefined ? { overrides: request.body.overrides } : {}) });
    });
  });
  app.post('/api/dashboards/generate', async request => {
    const { context, profile } = await services.session(request.headers);
    return services.checked(context, 'dashboard.generate', async () => {
      services.authorize(context, 'ai:generate', 'analytics:query', 'dashboard:create');
      await services.requireData(context.tenant.tenantId);
      if (!object(request.body) || typeof request.body.prompt !== 'string' || !request.body.prompt.trim()) throw new ApiError(400, 'INVALID_BODY', 'prompt is required.');
      const planner = (await services.deps.workspaceAi?.(context.tenant.tenantId))?.planner ?? services.planner;
      if (!planner) throw new ApiError(503, 'PLANNER_UNAVAILABLE', 'Dashboard planning is disabled.');
      const dashboard = services.ensureDashboard(await planner.generate({ prompt: request.body.prompt, locale: context.locale, context: analyticsContext(context), tenantProfile: profile,
        capabilities: await capabilities(context) }), context);
      assertPublishedDashboard(dashboard,await workspacePublishedCapabilities(services,context),profile.timeZone,services.clock());
      return { dashboard, execution: await services.executor.execute(dashboard, analyticsContext(context), { timeZone: profile.timeZone }) };
    });
  });
  app.post('/api/dashboards/edit', async request => {
    const { context, profile } = await services.session(request.headers);
    return services.checked(context, 'dashboard.edit', async () => {
      services.authorize(context, 'ai:edit', 'analytics:query', 'dashboard:edit');
      await services.requireData(context.tenant.tenantId);
      if (!object(request.body) || !object(request.body.dashboard) || typeof request.body.instruction !== 'string' || !request.body.instruction.trim()) throw new ApiError(400, 'INVALID_BODY', 'dashboard and instruction are required.');
      const current = services.ensureDashboard(request.body.dashboard, context);
      const planner = (await services.deps.workspaceAi?.(context.tenant.tenantId))?.planner ?? services.planner;
      if (!planner) throw new ApiError(503, 'PLANNER_UNAVAILABLE', 'Dashboard planning is disabled.');
      const patch = await planner.edit(current, request.body.instruction, profile, await capabilities(context));
      const dashboard = services.ensureDashboard(applyDashboardPatch(current, patch), context);
      assertPublishedDashboard(dashboard,await workspacePublishedCapabilities(services,context),profile.timeZone,services.clock());
      return { patch, dashboard, execution: await services.executor.execute(dashboard, analyticsContext(context), { timeZone: profile.timeZone }) };
    });
  });
}
