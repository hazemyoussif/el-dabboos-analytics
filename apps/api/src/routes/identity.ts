import type { TenantProfile } from '@el-dabboos/domain';
import { getTenantProfile } from '@el-dabboos/domain';
import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../context.ts';
export function registerIdentityRoutes(app: FastifyInstance, services: RouteContext): void {
    app.get('/api/demo-principals', async () => ({ users: services.deps.administration ? services.deps.administration.principals ? await services.deps.administration.principals() : [] : services.directory.listUsers().map(user => ({ id: user.id, displayName: user.displayName })) }));
    app.get('/api/tenant-profiles', async (request) => {
        if (services.deps.administration) {
            const identity = await services.identityId(request.headers);
            const memberships = await services.deps.administration.directory.listActiveMemberships(identity);
            const profiles = (await Promise.all(memberships.map(membership => services.deps.administration!.profiles.get(membership.tenantId, 'en')))).filter((page): page is TenantProfile => !!page);
            return { profiles, defaultTenantId: profiles[0]?.id ?? null };
        }
        const user = services.userId(request.headers);
        const profiles = services.directory.membershipsFor(user).map(membership => getTenantProfile(membership.tenantId)).filter((profile): profile is TenantProfile => !!profile);
        return { profiles, defaultTenantId: profiles[0]?.id ?? null };
    });
    app.get('/api/tenant-profile', async (request) => (await services.session(request.headers)).profile);
    app.get('/api/demo-capabilities', async (request) => { const { context } = await services.session(request.headers); return { permissions: context.authorization.permissions }; });
}
