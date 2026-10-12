import type { CustomerAccount, ManagedTenant } from '@el-dabboos/domain';
import { scopeDimensions } from '@el-dabboos/domain';
import type { DashboardSummary, MembershipSummary, PlatformUserSummary, RoleSummary } from './page-contracts.ts';
import { asText, many } from './page-contracts.ts';
export interface AdministrationWriteRequest {
    path: string;
    method: string;
    body: unknown;
}
export function roleFormRequest(form: FormData, record: RoleSummary | null, tenantBase: string): AdministrationWriteRequest {
    const id = record?.id ?? '';
    const expectedVersion = record?.version;
    return { path: tenantBase + '/roles' + (id ? '/' + encodeURIComponent(id) : ''), method: id ? 'PUT' : 'POST', body: { name: asText(form, 'name'), description: asText(form, 'description'), permissions: many(form, 'permission'), metricDomains: many(form, 'domain'), ...(id ? { expectedVersion } : {}) } };
}
export function membershipFormRequest(form: FormData, record: MembershipSummary | null, tenantBase: string): AdministrationWriteRequest {
    const id = record?.id ?? '';
    const expectedVersion = record?.version;
    return { path: id ? tenantBase + '/memberships/' + encodeURIComponent(id) + '/roles' : tenantBase + '/memberships', method: id ? 'PUT' : 'POST', body: id ? { expectedVersion, roleIds: many(form, 'role') } : { userId: asText(form, 'userId'), roleIds: many(form, 'role'), dataScopes: [] } };
}
export function workspaceUserFormRequest(form:FormData,tenantBase:string):AdministrationWriteRequest {
    return {path:tenantBase+'/users',method:'POST',body:{displayName:asText(form,'displayName'),preferredLocale:asText(form,'defaultLocale'),email:asText(form,'email'),password:asText(form,'password'),roleIds:many(form,'role')}};
}
export function scopeFormRequest(form: FormData, record: MembershipSummary | null, tenantBase: string): AdministrationWriteRequest {
    const id = record?.id ?? '';
    const expectedVersion = record?.version;
    return { path: tenantBase + '/memberships/' + encodeURIComponent(id) + '/scopes', method: 'PUT', body: { expectedVersion, dataScopes: scopeDimensions.flatMap(dimension => { const selected = many(form, dimension); return selected.length ? [{ dimension, values: selected }] : []; }) } };
}
export function dashboardAccessFormRequest(form: FormData, record: DashboardSummary | null, tenantBase: string): AdministrationWriteRequest {
    const id = record?.id ?? '';
    const expectedVersion = record?.version;
    const scope = asText(form, 'scope');
    const grants = scope === 'restricted' ? [...many(form, 'role').map(subjectId => ({ subjectType: 'role', subjectId, access: 'view' })), ...many(form, 'membership').map(subjectId => ({ subjectType: 'membership', subjectId, access: 'view' }))] : [];
    return { path: tenantBase + '/dashboards/' + encodeURIComponent(id) + '/access', method: 'PUT', body: { expectedVersion, scope, grants } };
}
export function workspaceFormRequest(form: FormData, record: ManagedTenant | null, tenantBase: string): AdministrationWriteRequest {
    const expectedVersion = record?.version;
    return { path: tenantBase + '/tenant', method: 'PUT', body: { expectedVersion, name: asText(form, 'name'), defaultLocale: asText(form, 'defaultLocale') } };
}
export function customerFormRequest(form: FormData, record: CustomerAccount | null): AdministrationWriteRequest {
    const id = record?.id ?? '';
    const expectedVersion = record?.version;
    return { path: '/api/platform/customers' + (id ? '/' + encodeURIComponent(id) : ''), method: id ? 'PUT' : 'POST', body: { name: asText(form, 'name'), ...(id ? { expectedVersion, status: asText(form, 'status') } : {}) } };
}
export function tenantFormRequest(form: FormData, record: ManagedTenant | null, selectedCustomerId: string): AdministrationWriteRequest {
    const id = record?.id ?? '';
    const expectedVersion = record?.version;
    const iq = asText(form, 'market') === 'IQ';
    const configuration = { countryCode: iq ? 'IQ' : 'EG', arabicDialect: iq ? 'iq' : 'eg', reportingCurrency: iq ? 'IQD' : 'EGP', timeZone: iq ? 'Asia/Baghdad' : 'Africa/Cairo', defaultLocale: asText(form, 'defaultLocale') };
    return { path: id ? '/api/platform/tenants/' + encodeURIComponent(id) : '/api/platform/customers/' + encodeURIComponent(selectedCustomerId) + '/tenants', method: id ? 'PUT' : 'POST', body: { name: asText(form, 'name'), configuration, ...(id ? { expectedVersion, status: asText(form, 'status') } : {}) } };
}
export function userFormRequest(form: FormData, record: PlatformUserSummary | null): AdministrationWriteRequest {
    if (!record) return { path: '/api/platform/users', method: 'POST', body: { displayName: asText(form, 'displayName'), preferredLocale: asText(form, 'defaultLocale'), email: asText(form, 'email'), password: asText(form, 'password') } };
    return { path: '/api/platform/users/' + encodeURIComponent(record.id), method: 'PUT', body: { expectedVersion: record.version, displayName: asText(form, 'displayName'), preferredLocale: asText(form, 'defaultLocale'), status: asText(form, 'status') } };
}
