import type { PlatformAdministrationCommand } from '@el-dabboos/application';
import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../../context.ts';
import { body, status, text, version } from './schemas.ts';
import type { PlatformParams } from './support.ts';
import { administration, cursor } from './support.ts';
export function registerCustomersRoutes(app: FastifyInstance, context: RouteContext) {
    app.get<{
        Params: PlatformParams;
    }>('/api/platform/customers', async (request) => administration(context).listCustomers(await context.identityId(request.headers), cursor(request.query)));
    app.get<{
        Params: PlatformParams;
    }>('/api/platform/customers/:id', async (request) => administration(context).getCustomer(await context.identityId(request.headers), request.params.id));
    app.post<{
        Params: PlatformParams;
        Body: Omit<Extract<PlatformAdministrationCommand, {
            action: 'customer.create';
        }>, 'action' | 'id' | 'customerId'>;
    }>('/api/platform/customers', { schema: body({ name: text }) }, async (request) => administration(context).createCustomer(await context.identityId(request.headers), { ...request.body }));
    app.put<{
        Params: PlatformParams;
        Body: Omit<Extract<PlatformAdministrationCommand, {
            action: 'customer.update';
        }>, 'action' | 'id' | 'customerId'>;
    }>('/api/platform/customers/:id', { schema: body({ name: text, status: status(['active', 'suspended']), expectedVersion: version }) }, async (request) => administration(context).updateCustomer(await context.identityId(request.headers), { ...request.body, id: request.params.id }));
}
