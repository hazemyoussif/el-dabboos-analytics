import type { TenantAdministrationCommand } from '@el-dabboos/application';
import type { ScopeDimension } from '@el-dabboos/domain';
import { AccessControlError,scopeDimensions } from '@el-dabboos/domain';
import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../../context.ts';
import { analyticsContext } from '../../context.ts';
import { ApiError } from '../../errors.ts';
import { body, ids, scopes, status, text, version } from './schemas.ts';
import type { TenantParams } from './support.ts';
import { administration, availableScopes, cursor, tenantActor } from './support.ts';
export function registerMembershipsRoutes(app: FastifyInstance, context: RouteContext) {
    app.post<{Params:TenantParams;Body:import('@el-dabboos/application').WorkspaceUserInput&{password:string}}>(
        '/api/tenants/:tenantId/admin/users',
        {schema:body({displayName:text,preferredLocale:status(['en','ar']),email:{type:'string',minLength:3,maxLength:254},password:{type:'string',minLength:8,maxLength:1024},roleIds:ids})},
        async request=>{
            const actor=await tenantActor(context,request.headers,request.params.tenantId);
            const provision=context.deps.administration?.provisionWorkspaceEmployee;
            if(!provision)throw new ApiError(503,'AUTH_UNAVAILABLE','Local user creation is unavailable.');
            try{return await provision(actor,request.body);}
            catch(error){
                if(error instanceof AccessControlError||error instanceof ApiError)throw error;
                if(!error||typeof error!=='object'||!('code' in error)||error.code!=='23505')throw error;
                throw new ApiError(409,'USER_PROVISIONING_FAILED','Unable to create this user. Review the email and account state.');
            }
        });
    app.get<{
        Params: TenantParams;
    }>('/api/tenants/:tenantId/admin/memberships', async (request) => administration(context).listMemberships(await tenantActor(context, request.headers, request.params.tenantId), cursor(request.query)));
    app.get<{
        Params: TenantParams;
    }>('/api/tenants/:tenantId/admin/candidates', async (request) => administration(context).listAssignmentCandidates(await tenantActor(context, request.headers, request.params.tenantId)));
    app.get<{
        Params: TenantParams;
    }>('/api/tenants/:tenantId/admin/membership-scopes', async (request) => administration(context).listMembershipScopes(await tenantActor(context, request.headers, request.params.tenantId), cursor(request.query)));
    app.get<{
        Params: TenantParams;
    }>('/api/tenants/:tenantId/admin/memberships/:id', async (request) => administration(context).tenantMembership(await tenantActor(context, request.headers, request.params.tenantId), request.params.id));
    app.post<{
        Params: TenantParams;
        Body: Omit<Extract<TenantAdministrationCommand, {
            action: 'membership.create';
        }>, 'action' | 'id'>;
    }>('/api/tenants/:tenantId/admin/memberships', { schema: body({ userId: text, roleIds: ids, dataScopes: scopes }) }, async (request) => { const actor = await tenantActor(context, request.headers, request.params.tenantId); return administration(context).createMembership(actor, { ...request.body }, request.body.dataScopes.length ? await availableScopes(context, actor) : {}); });
    app.put<{
        Params: TenantParams;
        Body: Omit<Extract<TenantAdministrationCommand, {
            action: 'membership.roles';
        }>, 'action' | 'id'>;
    }>('/api/tenants/:tenantId/admin/memberships/:id/roles', { schema: body({ roleIds: ids, expectedVersion: version }) }, async (request) => { const actor = await tenantActor(context, request.headers, request.params.tenantId); return administration(context).changeMembershipRoles(actor, { ...request.body, id: request.params.id }); });
    app.put<{
        Params: TenantParams;
        Body: Omit<Extract<TenantAdministrationCommand, {
            action: 'membership.scopes';
        }>, 'action' | 'id'>;
    }>('/api/tenants/:tenantId/admin/memberships/:id/scopes', { schema: body({ dataScopes: scopes, expectedVersion: version }) }, async (request) => { const actor = await tenantActor(context, request.headers, request.params.tenantId); return administration(context).changeMembershipScopes(actor, { ...request.body, id: request.params.id }, await availableScopes(context, actor)); });
    app.post<{
        Params: TenantParams;
        Body: Omit<Extract<TenantAdministrationCommand, {
            action: 'membership.status';
        }>, 'action' | 'id'>;
    }>('/api/tenants/:tenantId/admin/memberships/:id/suspend', { schema: body({ status: status(['active', 'suspended']), expectedVersion: version }) }, async (request) => { const actor = await tenantActor(context, request.headers, request.params.tenantId); return administration(context).changeMembershipStatus(actor, { ...request.body, id: request.params.id }); });
    app.get<{
        Params: TenantParams & {
            dimension: string;
        };
    }>('/api/tenants/:tenantId/admin/scope-values/:dimension', async (request) => {
        const actor = await tenantActor(context, request.headers, request.params.tenantId), resolved = await administration(context).resolveTenant(actor);
        context.authorize(resolved.context, 'data_scopes:view');
        if (!scopeDimensions.includes(request.params.dimension as ScopeDimension))
            throw new ApiError(400, 'INVALID_ADMIN_INPUT', 'Unsupported scope dimension.');
        await context.requireData(actor.tenantId);
        const values = await context.deps.dimensionValues.listDimensionValues(request.params.dimension as ScopeDimension, analyticsContext(resolved.context));
        return { dimension: request.params.dimension, values: values.map(id => ({ id, label: id })) };
    });
}
