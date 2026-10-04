import type { PlatformAdministrationCommand } from '@el-dabboos/application';
import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../../context.ts';
import { body, configuration, status, text, version } from './schemas.ts';
import type { PlatformParams } from './support.ts';
import { administration, cursor } from './support.ts';
export function registerTenantsRoutes(app: FastifyInstance, context: RouteContext) {
    app.get<{
        Params: PlatformParams;
    }>('/api/platform/tenants/:id', async (request) => { const result = await administration(context).getTenant(await context.identityId(request.headers), request.params.id); return { ...result, analyticsReady: await context.deps.administration!.dataReady(request.params.id) }; });
    app.get<{
        Params: PlatformParams;
    }>('/api/platform/customers/:customerId/tenants', async (request) => { const result = await administration(context).customerTenants(await context.identityId(request.headers), request.params.customerId, cursor(request.query)); return { ...result, items: await Promise.all(result.items.map(async (tenant) => ({ ...tenant, analyticsReady: await context.deps.administration!.dataReady(tenant.id) }))) }; });
    app.post<{
        Params: PlatformParams;
        Body: Omit<Extract<PlatformAdministrationCommand, {
            action: 'tenant.create';
        }>, 'action' | 'id' | 'customerId'>;
    }>('/api/platform/customers/:customerId/tenants', { schema: body({ name: text, configuration }) }, async (request) => administration(context).createTenant(await context.identityId(request.headers), { ...request.body, customerId: request.params.customerId }));
    app.put<{
        Params: PlatformParams;
        Body: Omit<Extract<PlatformAdministrationCommand, {
            action: 'tenant.update';
        }>, 'action' | 'id' | 'customerId'>;
    }>('/api/platform/tenants/:id', { schema: body({ name: text, status: status(['provisioning', 'active', 'suspended']), configuration, expectedVersion: version }) }, async (request) => administration(context).updateTenant(await context.identityId(request.headers), { ...request.body, id: request.params.id }));
    app.post<{
        Params: PlatformParams;
        Body: {
            expectedVersion: number;
        };
    }>('/api/platform/tenants/:id/suspend', { schema: body({ expectedVersion: version }) }, async (request) => { const identityId = await context.identityId(request.headers); const current = await administration(context).getTenant(identityId, request.params.id); return administration(context).updateTenant(identityId, { id: request.params.id, expectedVersion: request.body.expectedVersion, name: current.name, configuration: current.configuration, status: 'suspended' }); });
}
