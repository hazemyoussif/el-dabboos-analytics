import type { TenantAdministrationCommand } from '@el-dabboos/application';
import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../../context.ts';
import { body, status, text, version } from './schemas.ts';
import type { TenantParams } from './support.ts';
import { administration, tenantActor } from './support.ts';
export function registerWorkspaceRoutes(app: FastifyInstance, context: RouteContext) {
    app.get<{
        Params: TenantParams;
    }>('/api/tenants/:tenantId/admin/tenant', async (request) => { const result = await administration(context).getWorkspace(await tenantActor(context, request.headers, request.params.tenantId)); return { ...result, analyticsReady: await context.deps.administration!.dataReady(request.params.tenantId) }; });
    app.put<{
        Params: TenantParams;
        Body: Omit<Extract<TenantAdministrationCommand, {
            action: 'tenant.update';
        }>, 'action' | 'id'>;
    }>('/api/tenants/:tenantId/admin/tenant', { schema: body({ name: text, defaultLocale: status(['en', 'ar']), expectedVersion: version }) }, async (request) => { const actor = await tenantActor(context, request.headers, request.params.tenantId); return administration(context).updateWorkspace(actor, { ...request.body }); });
}
