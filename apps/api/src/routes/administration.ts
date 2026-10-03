import type { FastifyInstance } from 'fastify';
import { scopeDimensions, tenantPermissions, accessMetricDomains } from '@el-dabboos/domain';
import type { ScopeDimension } from '@el-dabboos/domain';
import type { AdministrationActor, TenantAdministrationCommand, PlatformAdministrationCommand, ScopeValues } from '@el-dabboos/application';
import type { RouteContext } from '../context.ts';
import { ApiError } from '../errors.ts';
import { analyticsContext } from '../context.ts';
const text = { type: 'string', minLength: 1, maxLength: 200 };
const version = { type: 'integer', minimum: 1 };
const status = (values: readonly string[]) => ({ type: 'string', enum: values });
const ids = { type: 'array', items: text, minItems: 1, maxItems: 1000, uniqueItems: true };
const scopes = { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['dimension', 'values'], properties: { dimension: status(scopeDimensions), values: ids } } };
const grants = { type: 'array', maxItems: 1000, items: { type: 'object', additionalProperties: false, required: ['subjectType', 'subjectId', 'access'], properties: { subjectType: status(['role', 'membership']), subjectId: text, access: status(['view']) } } };
const configuration = { type: 'object', additionalProperties: false, required: ['countryCode', 'defaultLocale', 'arabicDialect', 'reportingCurrency', 'timeZone'], properties: { countryCode: status(['IQ', 'EG']), defaultLocale: status(['en', 'ar']), arabicDialect: status(['iq', 'eg']), reportingCurrency: status(['IQD', 'EGP']), timeZone: status(['Asia/Baghdad', 'Africa/Cairo']) } };
const role = { name: text, description: { type: 'string', maxLength: 1000 }, permissions: { type: 'array', maxItems: tenantPermissions.length, uniqueItems: true, items: status(tenantPermissions) }, metricDomains: { type: 'array', maxItems: accessMetricDomains.length, uniqueItems: true, items: status(accessMetricDomains) } };
const body = (properties: Record<string, unknown>) => ({ body: { type: 'object', additionalProperties: false, properties, required: Object.keys(properties) } });
type Params = {
    tenantId: string;
    id: string;
    customerId: string;
    dimension: string;
};
export function registerAdministrationRoutes(app: FastifyInstance, s: RouteContext) {
    const service = () => { if (!s.administration)
        throw new ApiError(503, 'ADMIN_UNAVAILABLE', 'Administration is unavailable.'); return s.administration; };
    const actor = async (headers: Record<string, unknown>, tenantId: string): Promise<AdministrationActor> => { if (headers['x-tenant-id'] !== tenantId)
        throw new ApiError(403, 'ACCESS_DENIED', 'Selected workspace must match the target.'); const locale = headers['x-locale'] ?? 'en'; if (locale !== 'en' && locale !== 'ar')
        throw new ApiError(400, 'INVALID_ADMIN_INPUT', 'Invalid locale.'); return { identityId: await s.identityId(headers), tenantId, locale }; };
    const cursor = (q: unknown) => { if (!q || typeof q !== 'object')
        return undefined; const value = q as Record<string, unknown>; if (Object.keys(value).some(k => k !== 'cursor') || (value.cursor !== undefined && typeof value.cursor !== 'string'))
        throw new ApiError(400, 'INVALID_ADMIN_INPUT', 'Invalid page cursor.'); return value.cursor as string | undefined; };
    const t = '/api/tenants/:tenantId/admin', p = '/api/platform';
    const sourceReady = (id: string) => s.deps.administration!.dataReady(id);
    for (const [path, kind] of [['candidates', 'candidates'], ['roles', 'roles'], ['memberships', 'memberships'], ['membership-scopes', 'scopes'], ['dashboard-access', 'dashboards'], ['tenant', 'tenant']] as const)
        app.get<{
            Params: Params;
        }>(`${t}/${path}`, async (r) => { const result = await service().tenantRead(await actor(r.headers, r.params.tenantId), kind, cursor(r.query)); return kind === 'tenant' ? { ...result, analyticsReady: await sourceReady(r.params.tenantId) } : result; });
    app.get<{
        Params: Params;
    }>(`${t}/memberships/:id`, async (r) => service().tenantMembership(await actor(r.headers, r.params.tenantId), r.params.id));
    app.get<{
        Params: Params;
    }>(`${t}/scope-values/:dimension`, async (r) => {
        const a = await actor(r.headers, r.params.tenantId), resolved = await service().resolveTenant(a);
        s.authorize(resolved.context, 'data_scopes:view');
        if (!scopeDimensions.includes(r.params.dimension as ScopeDimension))
            throw new ApiError(400, 'INVALID_ADMIN_INPUT', 'Unsupported scope dimension.');
        await s.requireData(a.tenantId);
        const values = await s.deps.dimensionValues.listDimensionValues(r.params.dimension as ScopeDimension, analyticsContext(resolved.context));
        return { dimension: r.params.dimension, values: values.map(id => ({ id, label: id })) };
    });
    const tenantMutation = (method: 'POST' | 'PUT' | 'DELETE', path: string, action: TenantAdministrationCommand['action'], properties: Record<string, unknown>) => app.route<{
        Params: Params;
    }>({ method, url: `${t}/${path}`, schema: body(properties), handler: async (r) => {
            const a = await actor(r.headers, r.params.tenantId);
            let available: ScopeValues = {};
            const input = r.body as Record<string, unknown>;
            if (action === 'membership.scopes' || (action === 'membership.create' && Array.isArray(input.dataScopes) && input.dataScopes.length)) {
                const resolved = await service().resolveTenant(a);
                s.authorize(resolved.context, 'data_scopes:manage');
                await s.requireData(a.tenantId);
                available = Object.fromEntries(await Promise.all(scopeDimensions.map(async (d) => [d, await s.deps.dimensionValues.listDimensionValues(d, analyticsContext(resolved.context))])));
            }
            return service().tenantMutate(a, { ...input, action, ...(r.params.id ? { id: r.params.id } : {}) } as TenantAdministrationCommand, available);
        } });
    tenantMutation('POST', 'roles', 'role.create', role);
    tenantMutation('PUT', 'roles/:id', 'role.update', { ...role, expectedVersion: version });
    tenantMutation('DELETE', 'roles/:id', 'role.delete', { expectedVersion: version });
    tenantMutation('POST', 'memberships', 'membership.create', { userId: text, roleIds: ids, dataScopes: scopes });
    tenantMutation('PUT', 'memberships/:id/roles', 'membership.roles', { roleIds: ids, expectedVersion: version });
    tenantMutation('PUT', 'memberships/:id/scopes', 'membership.scopes', { dataScopes: scopes, expectedVersion: version });
    tenantMutation('POST', 'memberships/:id/suspend', 'membership.status', { status: status(['active', 'suspended']), expectedVersion: version });
    tenantMutation('PUT', 'tenant', 'tenant.update', { name: text, defaultLocale: status(['en', 'ar']), expectedVersion: version });
    tenantMutation('PUT', 'dashboards/:id/access', 'dashboard.access', { scope: status(['private', 'tenant', 'restricted']), grants, expectedVersion: version });
    for (const kind of ['customers', 'users'] as const) {
        app.get(`${p}/${kind}`, async (r) => service().platformRead(await s.identityId(r.headers), kind, undefined, cursor(r.query)));
        app.get<{
            Params: Params;
        }>(`${p}/${kind}/:id`, async (r) => service().platformRead(await s.identityId(r.headers), kind, r.params.id));
    }
    app.get<{
        Params: Params;
    }>(`${p}/tenants/:id`, async (r) => { const result = await service().platformRead(await s.identityId(r.headers), 'tenants', r.params.id); return { ...result, analyticsReady: await sourceReady(r.params.id) }; });
    app.get<{
        Params: Params;
    }>(`${p}/customers/:customerId/tenants`, async (r) => { const result = await service().customerTenants(await s.identityId(r.headers), r.params.customerId, cursor(r.query)); return { ...result, items: await Promise.all(result.items.map(async (t) => ({ ...t, analyticsReady: await sourceReady(t.id) }))) }; });
    const platformMutation = (method: 'POST' | 'PUT', path: string, action: PlatformAdministrationCommand['action'], properties: Record<string, unknown>) => app.route<{
        Params: Params;
    }>({ method, url: `${p}/${path}`, schema: body(properties), handler: async (r) => service().platformMutate(await s.identityId(r.headers), { ...(r.body as object), action, ...(r.params.id ? { id: r.params.id } : {}), ...(r.params.customerId ? { customerId: r.params.customerId } : {}) } as PlatformAdministrationCommand) });
    platformMutation('POST', 'customers', 'customer.create', { name: text });
    platformMutation('PUT', 'customers/:id', 'customer.update', { name: text, status: status(['active', 'suspended']), expectedVersion: version });
    platformMutation('POST', 'customers/:customerId/tenants', 'tenant.create', { name: text, configuration });
    platformMutation('PUT', 'tenants/:id', 'tenant.update', { name: text, status: status(['provisioning', 'active', 'suspended']), configuration, expectedVersion: version });
    platformMutation('PUT', 'users/:id', 'user.update', { displayName: text, preferredLocale: status(['en', 'ar']), status: status(['invited', 'active', 'suspended']), expectedVersion: version });
    platformMutation('POST', 'identities/:id/disable', 'identity.disable', {});
    app.post<{
        Params: Params;
    }>(`${p}/users/:id/suspend`, { schema: body({ expectedVersion: version }) }, async (r) => {
        const identity = await s.identityId(r.headers);
        const old = await service().platformRead(identity, 'users', r.params.id);
        if (!('displayName' in old))
            throw new ApiError(404, 'NOT_FOUND', 'User unavailable.');
        return service().platformMutate(identity, { action: 'user.update', id: r.params.id, expectedVersion: (r.body as {
                expectedVersion: number;
            }).expectedVersion, displayName: old.displayName, preferredLocale: old.preferredLocale, status: 'suspended' });
    });
    app.post<{
        Params: Params;
    }>(`${p}/tenants/:id/suspend`, { schema: body({ expectedVersion: version }) }, async (r) => {
        const identity = await s.identityId(r.headers);
        const old = await service().platformRead(identity, 'tenants', r.params.id);
        if (!('configuration' in old))
            throw new ApiError(404, 'NOT_FOUND', 'Tenant unavailable.');
        return service().platformMutate(identity, { action: 'tenant.update', id: r.params.id, expectedVersion: (r.body as {
                expectedVersion: number;
            }).expectedVersion, name: old.name, status: 'suspended', configuration: old.configuration });
    });
    app.get('/api/administration-capabilities', async (r) => { const id = await s.identityId(r.headers); let platformPermissions: readonly string[] = []; try {
        platformPermissions = (await service().resolvePlatform(id)).permissions;
    }
    catch (e) {
        if (!(e instanceof Error && ('code' in e) && ['ACCESS_DENIED', 'PLATFORM_FORBIDDEN'].includes(String(e.code))))
            throw e;
    } return { platformPermissions }; });
}
