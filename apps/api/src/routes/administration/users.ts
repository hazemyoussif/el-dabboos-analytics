import type { PlatformAdministrationCommand } from '@el-dabboos/application';
import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../../context.ts';
import { body, status, text, version } from './schemas.ts';
import type { PlatformParams } from './support.ts';
import { administration, cursor } from './support.ts';
export function registerUsersRoutes(app: FastifyInstance, context: RouteContext) {
    app.get<{
        Params: PlatformParams;
    }>('/api/platform/users', async (request) => administration(context).listUsers(await context.identityId(request.headers), cursor(request.query)));
    app.get<{
        Params: PlatformParams;
    }>('/api/platform/users/:id', async (request) => administration(context).getUser(await context.identityId(request.headers), request.params.id));
    app.put<{
        Params: PlatformParams;
        Body: Omit<Extract<PlatformAdministrationCommand, {
            action: 'user.update';
        }>, 'action' | 'id' | 'customerId'>;
    }>('/api/platform/users/:id', { schema: body({ displayName: text, preferredLocale: status(['en', 'ar']), status: status(['invited', 'active', 'suspended']), expectedVersion: version }) }, async (request) => administration(context).updateUser(await context.identityId(request.headers), { ...request.body, id: request.params.id }));
    app.post<{
        Params: PlatformParams;
        Body: Omit<Extract<PlatformAdministrationCommand, {
            action: 'identity.disable';
        }>, 'action' | 'id' | 'customerId'>;
    }>('/api/platform/identities/:id/disable', { schema: body({}) }, async (request) => administration(context).disableIdentity(await context.identityId(request.headers), { id: request.params.id }));
    app.post<{
        Params: PlatformParams;
        Body: {
            expectedVersion: number;
        };
    }>('/api/platform/users/:id/suspend', { schema: body({ expectedVersion: version }) }, async (request) => { const identityId = await context.identityId(request.headers); const current = await administration(context).getUser(identityId, request.params.id); return administration(context).updateUser(identityId, { id: request.params.id, expectedVersion: request.body.expectedVersion, displayName: current.displayName, preferredLocale: current.preferredLocale, status: 'suspended' }); });
}
