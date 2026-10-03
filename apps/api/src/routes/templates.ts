import type { FastifyInstance } from 'fastify';
import { AuthorizationError, dashboardTemplates, getDashboardTemplate, instantiateDashboardTemplate } from '@el-dabboos/application';
import { analyticsContext } from '../context.ts';
import type { RouteContext } from '../context.ts';
import { ApiError } from '../errors.ts';

export function registerTemplateRoutes(app: FastifyInstance, services: RouteContext): void {
  app.get('/api/dashboard-templates', async request => {
    const { context } = await services.session(request.headers); services.authorize(context, 'dashboard:view');
    return { templates: dashboardTemplates.map(template => ({ ...template, availability: services.templateAllowed(template, context) ? 'available' : 'restricted',
      ...(services.templateAllowed(template, context) ? {} : { reason: 'Contains metrics unavailable to this demo user.' }) })) };
  });
  app.get<{ Params: { id: string } }>('/api/dashboard-templates/:id/instantiate', async request => {
    const { context, profile } = await services.session(request.headers);
    return services.checked(context, 'dashboard.execute', async () => {
      services.authorize(context, 'dashboard:view', 'analytics:query');
      await services.requireData(context.tenant.tenantId);
      const template = getDashboardTemplate(request.params.id);
      if (!template) throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Unknown dashboard template.');
      if (!services.templateAllowed(template, context)) throw new AuthorizationError('TEMPLATE_FORBIDDEN', 'Template contains unavailable metrics.');
      const dashboard = services.ensureDashboard(instantiateDashboardTemplate(template, profile, services.clock(), context.locale), context);
      return { dashboard, execution: await services.executor.execute(dashboard, analyticsContext(context), { timeZone: profile.timeZone }) };
    }, request.params.id);
  });
}
