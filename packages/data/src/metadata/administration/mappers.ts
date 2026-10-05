import type { AccessControlledDashboardRecord, AccessRole, CustomerAccount, DashboardAccessState, IdentityBinding, ManagedMembership, ManagedTenant, PlatformAssignment, ProductUser, TenantAccessRole } from '@el-dabboos/domain';
import { AccessControlError, compileMembershipScopes, validateAccessRole } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';
type Row = Record<string, unknown>;
const fieldNames: Record<string, string> = { customerId: 'customer_id', displayName: 'display_name', preferredLocale: 'preferred_locale', userId: 'user_id', providerSubject: 'provider_subject', loginHint: 'login_hint', tenantId: 'tenant_id', systemKey: 'system_key', ownerUserId: 'owner_user_id', createdBy: 'created_by', updatedBy: 'updated_by', createdAt: 'created_at', updatedAt: 'updated_at' };
const column = (key: string) => fieldNames[key] ?? key;
function fail(code: string): never { throw new AccessControlError(code); }
export function metadataRows(connection: MetadataConnection) {
    const { one, all, run, insert } = connection;
    const convert = <T>(row: Row): T => Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null).map(([key, value]) => [Object.keys(fieldNames).find(filter => column(filter) === key) ?? key, value])) as T;
    const tenant = (row: Row): ManagedTenant => { const { country_code, default_locale, arabic_dialect, reporting_currency, time_zone, ...rest } = row; return { ...convert<ManagedTenant>(rest), configuration: { countryCode: country_code, defaultLocale: default_locale, arabicDialect: arabic_dialect, reportingCurrency: reporting_currency, timeZone: time_zone } } as ManagedTenant; };
    const dashboard = (row: Row): AccessControlledDashboardRecord => { const { spec_json, ...rest } = row; return { ...convert<AccessControlledDashboardRecord>(rest), spec: JSON.parse(String(spec_json)) }; };
    const getCustomer = async (id: string) => { const record = (await one('SELECT * FROM customers WHERE id=?', id)); return record ? convert<CustomerAccount>(record) : null; };
    const getTenant = async (id: string) => { const record = (await one('SELECT * FROM tenants WHERE id=?', id)); return record ? tenant(record) : null; };
    const getUser = async (id: string) => { const record = (await one('SELECT * FROM users WHERE id=?', id)); return record ? convert<ProductUser>(record) : null; };
    const getRole = async (row: Row) => { const value = { ...convert<AccessRole>(row), protected: row.protected === 1, permissions: (await all('SELECT permission FROM role_permissions WHERE role_id=? ORDER BY permission', String(row.id))).map(storedRow => storedRow.permission), ...(row.scope === 'tenant' ? { metricDomains: (await all('SELECT domain FROM role_metric_domains WHERE role_id=? ORDER BY domain', String(row.id))).map(storedRow => storedRow.domain) } : {}) } as unknown as AccessRole; validateAccessRole(value); return value; };
    const roleValues = async (role: TenantAccessRole) => {
        (await run('DELETE FROM role_permissions WHERE role_id=?', role.id));
        (await run('DELETE FROM role_metric_domains WHERE role_id=?', role.id));
        for (const permission of role.permissions)
            (await insert('role_permissions', { role_id: role.id, permission }));
        for (const domain of role.metricDomains)
            (await insert('role_metric_domains', { role_id: role.id, domain }));
    };
    const membership = async (row: Row) => {
        const scopes = new Map<string, string[]>();
        for (const snapshot of (await all('SELECT dimension,value FROM membership_scopes WHERE tenant_id=? AND membership_id=? ORDER BY dimension,value', String(row.tenant_id), String(row.id))))
            scopes.set(String(snapshot.dimension), [...(scopes.get(String(snapshot.dimension)) ?? []), String(snapshot.value)]);
        const value = { ...convert<ManagedMembership>(row), roleIds: (await all('SELECT role_id FROM membership_roles WHERE tenant_id=? AND membership_id=? ORDER BY role_id', String(row.tenant_id), String(row.id))).map(storedRow => String(storedRow.role_id)), dataScopes: [...scopes].map(([dimension, values]) => ({ dimension, values })) } as ManagedMembership;
        compileMembershipScopes(value.dataScopes);
        return value;
    };
    const getMembership = async (tenant: string, id: string) => { const record = (await one('SELECT * FROM memberships WHERE tenant_id=? AND id=?', tenant, id)); return record ? (await membership(record)) : null; };
    const membershipValues = async (membership: ManagedMembership) => {
        compileMembershipScopes(membership.dataScopes);
        if (!membership.roleIds.length || new Set(membership.roleIds).size !== membership.roleIds.length)
            fail('INVALID_ASSIGNMENT');
        (await run('DELETE FROM membership_roles WHERE tenant_id=? AND membership_id=?', membership.tenantId, membership.id));
        (await run('DELETE FROM membership_scopes WHERE tenant_id=? AND membership_id=?', membership.tenantId, membership.id));
        for (const role_id of membership.roleIds)
            (await insert('membership_roles', { membership_id: membership.id, tenant_id: membership.tenantId, role_id }));
        for (const snapshot of membership.dataScopes)
            for (const value of snapshot.values)
                (await insert('membership_scopes', { membership_id: membership.id, tenant_id: membership.tenantId, dimension: snapshot.dimension, value }));
    };
    const getAssignment = async (id: string) => { const record = (await one('SELECT * FROM platform_assignments WHERE user_id=?', id)); return record ? { ...convert<PlatformAssignment>(record), roleIds: (await all('SELECT role_id FROM platform_assignment_roles WHERE user_id=? ORDER BY role_id', id)).map(storedRow => String(storedRow.role_id)) } : null; };
    const getRecord = async (tenant: string, id: string) => { const record = (await one('SELECT * FROM dashboard_records WHERE tenant_id=? AND id=?', tenant, id)); return record ? dashboard(record) : null; };
    const getAccess = async (tenantId: string, id: string) => { const record = (await getRecord(tenantId, id)); return record ? { tenantId, dashboardId: id, version: record.version, scope: record.scope, grants: (await all('SELECT subject_type,subject_id,access FROM dashboard_grants WHERE tenant_id=? AND dashboard_id=? ORDER BY subject_type,subject_id', tenantId, id)).map(grant => ({ subjectType: grant.subject_type, subjectId: grant.subject_id, access: grant.access })) as DashboardAccessState['grants'] } : null; };
    const referenced = async (tenant: string, id: string) => !!((await one('SELECT 1 FROM membership_roles WHERE tenant_id=? AND role_id=? LIMIT 1', tenant, id)) || (await one('SELECT 1 FROM dashboard_grants WHERE tenant_id=? AND role_id=? LIMIT 1', tenant, id)));
    const identityFor = async (id: string) => { const record = (await one('SELECT * FROM identities WHERE id=?', id)); return record ? convert<IdentityBinding>(record) : null; };
    return { convert, tenant, dashboard, getRole, roleValues, membership, membershipValues, getAccess, getCustomer, getTenant, getUser, getMembership, getRecord, getAssignment, identityFor, referenced };
}
export type MetadataRows = ReturnType<typeof metadataRows>;
