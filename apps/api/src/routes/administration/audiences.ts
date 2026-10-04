import type { TenantAdministrationCommand } from '@el-dabboos/application';
import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../../context.ts';
import { body, grants, status, version } from './schemas.ts';
import type { TenantParams } from './support.ts';
import { administration, cursor, tenantActor } from './support.ts';
export function registerAudiencesRoutes(app: FastifyInstance, context: RouteContext) {
    app.get<{
        Params: TenantParams;
    }>('/api/tenants/:tenantId/admin/dashboard-access', async (request) => administration(context).listDashboardAccess(await tenantActor(context, request.headers, request.params.tenantId), cursor(request.query)));
    app.put<{
        Params: TenantParams;
        Body: Omit<Extract<TenantAdministrationCommand, {
            action: 'dashboard.access';
        }>, 'action' | 'id'>;
    }>('/api/tenants/:tenantId/admin/dashboards/:id/access', { schema: body({ scope: status(['private', 'tenant', 'restricted']), grants, expectedVersion: version }) }, async (request) => { const actor = await tenantActor(context, request.headers, request.params.tenantId); return administration(context).changeDashboardAccess(actor, { ...request.body, id: request.params.id }); });
}
