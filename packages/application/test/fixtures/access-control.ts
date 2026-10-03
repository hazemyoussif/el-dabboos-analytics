import { accessMetricDomains, platformPermissions, tenantPermissions } from '@el-dabboos/domain';
import type { AccessControlledDashboardRecord, DashboardAccessState, PlatformAccessSnapshot, TenantAccessRole, TenantAccessSnapshot } from '@el-dabboos/domain';
export const metadata = { version: 1, createdAt: '2026-10-03T00:00:00.000Z', updatedAt: '2026-10-03T00:00:00.000Z' };
export const agentRole: TenantAccessRole = { ...metadata, id: 'system-agent-manager', name: 'Agent Manager', description: 'Synthetic sales and CRM', scope: 'tenant', protected: true, systemKey: 'agent_manager', permissions: ['dashboard:view', 'analytics:query'], metricDomains: ['sales', 'crm'] };
export const adminRole: TenantAccessRole = { ...metadata, id: 'system-tenant-admin', name: 'Tenant Admin', description: 'Tenant administration', scope: 'tenant', protected: true, systemKey: 'tenant_admin', permissions: tenantPermissions, metricDomains: accessMetricDomains };
export const customRole: TenantAccessRole & { protected: false } = { ...metadata, id: 'custom-sales', name: 'Custom Sales', description: 'Tenant-owned synthetic role', scope: 'tenant', protected: false, tenantId: 'workspace-iq-1', permissions: ['dashboard:create'], metricDomains: ['sales'] };
export function tenantSnapshot(): TenantAccessSnapshot {
  return structuredClone({
    customer: { ...metadata, id: 'customer-1', name: 'Synthetic customer', status: 'active' },
    tenant: { ...metadata, id: 'workspace-iq-1', customerId: 'customer-1', name: 'Iraq Production (synthetic)', status: 'active', configuration: { countryCode: 'IQ', defaultLocale: 'ar', arabicDialect: 'iq', reportingCurrency: 'IQD', timeZone: 'Asia/Baghdad' } },
    user: { ...metadata, id: 'ahmed', displayName: 'Baghdad Agent Manager', preferredLocale: 'ar', status: 'active' },
    identity: { id: 'synthetic-ahmed', userId: 'ahmed', provider: 'synthetic', providerSubject: 'ahmed', status: 'active' },
    membership: { ...metadata, id: 'membership-1', userId: 'ahmed', tenantId: 'workspace-iq-1', status: 'active', roleIds: [agentRole.id], dataScopes: [{ dimension: 'branch', values: ['baghdad'] }, { dimension: 'salesperson', values: ['synthetic-agent-17', 'synthetic-agent-21'] }] },
    roles: [agentRole],
  });
}
export function platformSnapshot(): PlatformAccessSnapshot {
  const s = tenantSnapshot();
  return { user: s.user, identity: s.identity, assignment: { ...metadata, userId: s.user.id, roleIds: ['system-platform-admin'], status: 'active' },
    roles: [{ ...metadata, id: 'system-platform-admin', name: 'Platform Admin', description: 'Synthetic staff', scope: 'platform', protected: true, systemKey: 'platform_admin', permissions: platformPermissions }] };
}
export function dashboardFixture(): { record: AccessControlledDashboardRecord; access: DashboardAccessState } {
  const record: AccessControlledDashboardRecord = { ...metadata, id: 'agent-dashboard', tenantId: 'workspace-iq-1', ownerUserId: 'someone-else', scope: 'restricted', createdBy: 'someone-else', updatedBy: 'someone-else', spec: {
    schemaVersion: 2, id: 'portable-spec', title: { en: 'Agent sales', ar: 'مبيعات' }, locale: 'en', filters: {}, layout: { columns: 1 }, widgets: [{ id: 'sales', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }],
  } };
  return { record, access: { dashboardId: record.id, tenantId: record.tenantId, version: 1, scope: 'restricted', grants: [{ subjectType: 'role', subjectId: agentRole.id, access: 'view' }] } };
}
