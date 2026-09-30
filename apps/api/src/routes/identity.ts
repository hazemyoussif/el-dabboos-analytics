import type { FastifyInstance } from 'fastify';
import { getTenantProfile } from '@el-dabbous/domain';
import type { TenantProfile } from '@el-dabbous/domain';
import type { RouteContext } from '../context.ts';

export function registerIdentityRoutes(app: FastifyInstance, services: RouteContext): void {
  app.get('/api/demo-principals', async () => ({ users: services.directory.listUsers().map(user => ({ id: user.id, displayName: user.displayName })) }));
  app.get('/api/tenant-profiles', async request => {
    const user = services.userId(request.headers);
    const profiles = services.directory.membershipsFor(user).map(membership => getTenantProfile(membership.tenantId)).filter((profile): profile is TenantProfile => !!profile);
    return { profiles, defaultTenantId: profiles[0]?.id ?? null };
  });
  app.get('/api/tenant-profile', async request => services.session(request.headers).profile);
  app.get('/api/demo-capabilities', async request => { const { context } = services.session(request.headers); return { permissions: context.authorization.permissions }; });
}
