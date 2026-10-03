import type { AnalyticsFilter, DashboardSpec, Locale, MetricId, TenantProfile } from './contracts.ts';
import type { MetricDomain } from './metric-registry.ts';

/** Tenant vocabulary only. Platform capabilities never enter RequestContext. */
export const tenantPermissions = ['dashboard:view', 'dashboard:create', 'dashboard:edit', 'dashboard:share',
  'analytics:query', 'ai:generate', 'ai:edit', 'tenant:view', 'tenant:manage', 'users:view', 'users:manage',
  'users:invite', 'roles:view', 'roles:manage', 'data_scopes:view', 'data_scopes:manage',
  'dashboard_access:view', 'dashboard_access:manage'] as const;
export type Permission = typeof tenantPermissions[number];
export interface User { id: string; displayName: string; email?: string }
export interface Tenant { id: string; profile?: TenantProfile }
export interface Role { id: string; permissions: readonly Permission[] }
export interface TenantMembership { id: string; userId: string; tenantId: Tenant['id']; roleIds: readonly string[]; metricDomains: readonly MetricDomain[]; enforcedFilters?: readonly AnalyticsFilter[] }
export interface AuthorizationContext { permissions: readonly Permission[]; metricDomains: readonly MetricDomain[]; enforcedFilters: readonly AnalyticsFilter[] }
export interface RequestContext {
  principal: { userId: string; membershipId: string };
  tenant: { tenantId: Tenant['id'] };
  locale: Locale;
  authorization: AuthorizationContext;
}
export interface IdentityProvider { resolve(userId: string, tenantId: string, locale: Locale): RequestContext }
/** Local demo discovery only; a production identity adapter need not enumerate users. */
export interface DemoIdentityDirectory { listUsers(): readonly User[]; membershipsFor(userId: string): readonly TenantMembership[] }
export interface AuthorizationPolicy {
  authorize(action: Permission, context: RequestContext): void;
  authorizeMetric(metric: MetricId, context: RequestContext): void;
  authorizeDashboard(spec: DashboardSpec, context: RequestContext): void;
}
export type AuditAction = 'analytics.query' | 'dashboard.execute' | 'dashboard.generate' | 'dashboard.edit' | 'dashboard.builder_edit' | 'dashboard.saved_list' | 'dashboard.saved_get' | 'dashboard.saved_create' | 'dashboard.saved_update';
export interface AuditEvent { tenantId: string; userId: string; membershipId: string; action: AuditAction; timestamp: string; result: 'allowed' | 'denied' | 'error'; dashboardId?: string; providerId?: string; modelId?: string; traceId?: string }
export interface AuditSink { record(event: AuditEvent): void }
