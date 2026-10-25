import { registerSourceSettingsRoutes } from './administration/source-settings.ts';
import { registerAiSettingsRoutes } from './administration/ai-settings.ts';
import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../context.ts';
import { registerAudiencesRoutes } from './administration/audiences.ts';
import { registerCustomersRoutes } from './administration/customers.ts';
import { registerMembershipsRoutes } from './administration/memberships.ts';
import { registerRolesRoutes } from './administration/roles.ts';
import { administration } from './administration/support.ts';
import { registerTenantsRoutes } from './administration/tenants.ts';
import { registerUsersRoutes } from './administration/users.ts';
import { registerWorkspaceRoutes } from './administration/workspace.ts';
export function registerAdministrationRoutes(app: FastifyInstance, context: RouteContext) {
    registerSourceSettingsRoutes(app, context);
    registerAiSettingsRoutes(app, context);
    registerRolesRoutes(app, context);
    registerMembershipsRoutes(app, context);
    registerWorkspaceRoutes(app, context);
    registerAudiencesRoutes(app, context);
    registerCustomersRoutes(app, context);
    registerTenantsRoutes(app, context);
    registerUsersRoutes(app, context);
    app.get('/api/administration-capabilities', async (request) => {
        const id = await context.identityId(request.headers);
        let platformPermissions: readonly string[] = [];
        try {
            platformPermissions = (await administration(context).resolvePlatform(id)).permissions;
        }
        catch (error) {
            if (!(error instanceof Error && ('code' in error) && ['ACCESS_DENIED', 'PLATFORM_FORBIDDEN'].includes(String(error.code))))
                throw error;
        }
        return { platformPermissions };
    });
}
