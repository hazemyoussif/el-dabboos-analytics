import type { AnalyticsFilter, DashboardSpec, Locale, MetricId, TenantProfile } from './contracts.ts';
import type { MetricDomain } from './metric-registry.ts';

export type Permission = 'dashboard:view' | 'dashboard:create' | 'dashboard:edit' | 'dashboard:share' | 'analytics:query' | 'ai:generate' | 'ai:edit' | 'tenant:manage' | 'users:manage';
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
export type DashboardScope = 'private' | 'tenant';
export interface DashboardRecord { id: string; tenantId: string; ownerUserId: string; scope: DashboardScope; spec: DashboardSpec; createdBy: string; updatedBy: string }
export type AuditAction = 'analytics.query' | 'dashboard.execute' | 'dashboard.generate' | 'dashboard.edit' | 'dashboard.builder_edit';
export interface AuditEvent { tenantId: string; userId: string; membershipId: string; action: AuditAction; timestamp: string; result: 'allowed' | 'denied' | 'error'; dashboardId?: string; providerId?: string; modelId?: string; traceId?: string }
export interface AuditSink { record(event: AuditEvent): void }
