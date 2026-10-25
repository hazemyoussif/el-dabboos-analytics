import * as sourceSettings from './administration/source-settings.ts';
import * as aiSettings from './administration/ai-settings.ts';
import * as actors from './administration/actors.ts';
import * as audiences from './administration/audiences.ts';
import * as customers from './administration/customers.ts';
import * as memberships from './administration/memberships.ts';
import * as roles from './administration/roles.ts';
import { AdministrationRuntime } from './administration/runtime.ts';
import * as tenants from './administration/tenants.ts';
import * as users from './administration/users.ts';
import * as workspace from './administration/workspace.ts';
import * as workspaceUsers from './administration/workspace-users.ts';
export {normalizeWorkspaceUser} from './administration/workspace-users.ts';
export type {WorkspaceUserInput} from './administration/workspace-users.ts';
export type { AdministrationActor, PlatformAdministrationCommand, ScopeValues, TenantAdministrationCommand } from './administration/commands.ts';
export function createAdministration(...dependencies: ConstructorParameters<typeof AdministrationRuntime>) {
    const runtime = new AdministrationRuntime(...dependencies);
    return { getTenantSourceSettings: sourceSettings.getTenantSourceSettings.bind(null, runtime), saveTenantSourceSettings: sourceSettings.saveTenantSourceSettings.bind(null, runtime), getWorkspaceAiSettings: aiSettings.getWorkspaceAiSettings.bind(null, runtime), saveWorkspaceAiSettings: aiSettings.saveWorkspaceAiSettings.bind(null, runtime), failureAuditEvents: runtime.failureAuditEvents,
        authorizeWorkspaceUserCreation:workspaceUsers.authorizeWorkspaceUserCreation.bind(null,runtime),
        createWorkspaceUser:workspaceUsers.createWorkspaceUser.bind(null,runtime),
        listAssignmentCandidates: memberships.listAssignmentCandidates.bind(null, runtime),
        listRoles: roles.listRoles.bind(null, runtime),
        getWorkspace: workspace.getWorkspace.bind(null, runtime),
        listDashboardAccess: audiences.listDashboardAccess.bind(null, runtime),
        listMemberships: memberships.listMemberships.bind(null, runtime),
        listMembershipScopes: memberships.listMembershipScopes.bind(null, runtime),
        listCustomers: customers.listCustomers.bind(null, runtime),
        getCustomer: customers.getCustomer.bind(null, runtime),
        getTenant: tenants.getTenant.bind(null, runtime),
        listUsers: users.listUsers.bind(null, runtime),
        getUser: users.getUser.bind(null, runtime),
        resolveTenant: actors.resolveTenant.bind(null, runtime),
        resolvePlatform: actors.resolvePlatform.bind(null, runtime),
        customerTenants: tenants.customerTenants.bind(null, runtime),
        tenantMembership: memberships.tenantMembership.bind(null, runtime),
        createRole: roles.createRole.bind(null, runtime),
        updateRole: roles.updateRole.bind(null, runtime),
        deleteRole: roles.deleteRole.bind(null, runtime),
        createMembership: memberships.createMembership.bind(null, runtime),
        changeMembershipRoles: memberships.changeMembershipRoles.bind(null, runtime),
        changeMembershipStatus: memberships.changeMembershipStatus.bind(null, runtime),
        changeMembershipScopes: memberships.changeMembershipScopes.bind(null, runtime),
        updateWorkspace: workspace.updateWorkspace.bind(null, runtime),
        changeDashboardAccess: audiences.changeDashboardAccess.bind(null, runtime),
        createCustomer: customers.createCustomer.bind(null, runtime),
        updateCustomer: customers.updateCustomer.bind(null, runtime),
        createTenant: tenants.createTenant.bind(null, runtime),
        updateTenant: tenants.updateTenant.bind(null, runtime),
        provisionUserForTenant: users.provisionUserForTenant.bind(null, runtime),
        updateUser: users.updateUser.bind(null, runtime),
        disableIdentity: users.disableIdentity.bind(null, runtime),
    };
}
