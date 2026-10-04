import type { TenantAdministrationCommand } from '@el-dabboos/application';
import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../../context.ts';
import { body, role, version } from './schemas.ts';
import type { TenantParams } from './support.ts';
import { administration, tenantActor } from './support.ts';
export function registerRolesRoutes(app: FastifyInstance, context: RouteContext) {
    app.get<{
        Params: TenantParams;
    }>('/api/tenants/:tenantId/admin/roles', async (request) => administration(context).listRoles(await tenantActor(context, request.headers, request.params.tenantId)));
    app.post<{
        Params: TenantParams;
        Body: Omit<Extract<TenantAdministrationCommand, {
            action: 'role.create';
        }>, 'action' | 'id'>;
    }>('/api/tenants/:tenantId/admin/roles', { schema: body(role) }, async (request) => { const actor = await tenantActor(context, request.headers, request.params.tenantId); return administration(context).createRole(actor, { ...request.body }); });
    app.put<{
        Params: TenantParams;
        Body: Omit<Extract<TenantAdministrationCommand, {
            action: 'role.update';
        }>, 'action' | 'id'>;
    }>('/api/tenants/:tenantId/admin/roles/:id', { schema: body({ ...role, expectedVersion: version }) }, async (request) => { const actor = await tenantActor(context, request.headers, request.params.tenantId); return administration(context).updateRole(actor, { ...request.body, id: request.params.id }); });
    app.delete<{
        Params: TenantParams;
        Body: Omit<Extract<TenantAdministrationCommand, {
            action: 'role.delete';
        }>, 'action' | 'id'>;
    }>('/api/tenants/:tenantId/admin/roles/:id', { schema: body({ expectedVersion: version }) }, async (request) => { const actor = await tenantActor(context, request.headers, request.params.tenantId); return administration(context).deleteRole(actor, { ...request.body, id: request.params.id }); });
}
