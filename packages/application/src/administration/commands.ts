import type { CustomerAccount, DashboardGrant, ManagedDashboardScope, ManagedTenant, MembershipDataScope, ProductUser, ScopeDimension, TenantAccessRole } from '@el-dabboos/domain';
export interface AdministrationActor {
    identityId: string;
    tenantId: string;
    locale: 'en' | 'ar';
}
export type ScopeValues = Readonly<Partial<Record<ScopeDimension, readonly string[]>>>;
export type TenantAdministrationCommand = {
    action: 'role.create';
    name: string;
    description: string;
    permissions: TenantAccessRole['permissions'];
    metricDomains: TenantAccessRole['metricDomains'];
} | {
    action: 'role.update';
    id: string;
    expectedVersion: number;
    name: string;
    description: string;
    permissions: TenantAccessRole['permissions'];
    metricDomains: TenantAccessRole['metricDomains'];
} | {
    action: 'role.delete';
    id: string;
    expectedVersion: number;
} | {
    action: 'membership.create';
    userId: string;
    roleIds: readonly string[];
    dataScopes: readonly MembershipDataScope[];
} | {
    action: 'membership.roles';
    id: string;
    expectedVersion: number;
    roleIds: readonly string[];
} | {
    action: 'membership.status';
    id: string;
    expectedVersion: number;
    status: 'active' | 'suspended';
} | {
    action: 'membership.scopes';
    id: string;
    expectedVersion: number;
    dataScopes: readonly MembershipDataScope[];
} | {
    action: 'tenant.update';
    expectedVersion: number;
    name: string;
    defaultLocale: 'en' | 'ar';
} | {
    action: 'dashboard.access';
    id: string;
    expectedVersion: number;
    scope: ManagedDashboardScope;
    grants: readonly DashboardGrant[];
};
export type PlatformAdministrationCommand = {
    action: 'user.tenant_candidate';
    userId: string;
    tenantId: string;
} | {
    action: 'customer.create';
    name: string;
} | {
    action: 'customer.update';
    id: string;
    expectedVersion: number;
    name: string;
    status: CustomerAccount['status'];
} | {
    action: 'tenant.create';
    customerId: string;
    name: string;
    configuration: ManagedTenant['configuration'];
} | {
    action: 'tenant.update';
    id: string;
    expectedVersion: number;
    name: string;
    status: ManagedTenant['status'];
    configuration: ManagedTenant['configuration'];
} | {
    action: 'user.update';
    id: string;
    expectedVersion: number;
    displayName: string;
    preferredLocale: 'en' | 'ar';
    status: ProductUser['status'];
} | {
    action: 'identity.disable';
    id: string;
};
