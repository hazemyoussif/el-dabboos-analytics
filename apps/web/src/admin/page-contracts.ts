import type { CustomerAccount, DashboardAccessState, Locale, ManagedMembership, ManagedTenant, ProductUser, TenantAccessRole } from '@el-dabboos/domain';
import type { ApiSession } from '../api/client.ts';
export interface AdministrationPageProps {
    session: ApiSession;
    permissions: readonly string[];
    platformPermissions: readonly string[];
}
export interface MembershipSummary extends ManagedMembership {
    user: Pick<ProductUser, 'id' | 'displayName' | 'status'>;
    identities: {
        id: string;
        provider: string;
        status: string;
        loginHint?: string;
    }[];
    roles: {
        id: string;
        name: string;
    }[];
}
export type RoleSummary = TenantAccessRole & {
    membershipCount: number;
};
export type DashboardSummary = DashboardAccessState & {
    id: string;
    title: Record<Locale, string>;
    ownerUserId: string;
};
export type PlatformUserSummary = ProductUser & {
    identities: MembershipSummary['identities'];
    platformAssignment: {
        roleIds: readonly string[];
        status: string;
    } | null;
};
export interface CustomerPageData {
    items?: (CustomerAccount & {
        tenantCount: number;
    })[];
    nextCursor?: string;
}
export interface TenantPageData {
    items?: (ManagedTenant & {
        analyticsReady: boolean;
    })[];
    nextCursor?: string;
}
export interface UserPageData {
    items?: PlatformUserSummary[];
    nextCursor?: string;
}
export interface RolePageData {
    items?: RoleSummary[];
    nextCursor?: string;
    grantablePermissions?: string[];
    grantableMetricDomains?: string[];
}
export interface MembershipPageData {
    items?: MembershipSummary[];
    nextCursor?: string;
}
export interface DashboardPageData {
    items?: DashboardSummary[];
    nextCursor?: string;
}
export interface WorkspacePageData {
    tenant?: ManagedTenant;
    customer?: Pick<CustomerAccount, 'id' | 'name'>;
    analyticsReady?: boolean;
}
export const asText = (form: FormData, name: string) => String(form.get(name) ?? '');
export const many = (form: FormData, name: string) => form.getAll(name).map(String);
