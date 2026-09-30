import { productMetricCatalog, semanticCatalog } from '@el-dabbous/domain';
import type { AnalyticsContext, AnalyticsRepository, AnalyticsQuery, AnalyticsResult, AuditEvent, AuditSink, AuthorizationPolicy, DashboardSpec, IdentityProvider, Locale, MetricId, Permission, RequestContext, Role, TenantMembership, User } from '@el-dabbous/domain';
import type { MetricDomain } from '@el-dabbous/domain';

export class AuthorizationError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}
const allPermissions: readonly Permission[] = ['dashboard:view', 'dashboard:create', 'dashboard:edit', 'dashboard:share', 'analytics:query', 'ai:generate', 'ai:edit', 'tenant:manage', 'users:manage'];
const allDomains: readonly MetricDomain[] = ['sales', 'crm', 'finance', 'inventory', 'purchasing', 'customers', 'maintenance'];
export const demoRoles: readonly Role[] = [
  { id: 'admin', permissions: allPermissions },
  { id: 'analyst', permissions: ['dashboard:view', 'dashboard:create', 'dashboard:edit', 'analytics:query', 'ai:generate', 'ai:edit'] },
  { id: 'manager', permissions: ['dashboard:view', 'dashboard:create', 'dashboard:edit', 'analytics:query'] },
  { id: 'sales-analyst', permissions: ['dashboard:view', 'dashboard:create', 'dashboard:edit', 'analytics:query', 'ai:generate', 'ai:edit'] },
];
export const demoUsers: readonly User[] = [
  { id: 'demo-iq-admin', displayName: 'Iraq Admin' }, { id: 'demo-iq-analyst', displayName: 'Iraq Analyst' },
  { id: 'demo-iq-baghdad-manager', displayName: 'Baghdad Manager' }, { id: 'demo-eg-analyst', displayName: 'Egypt Analyst' },
  { id: 'demo-regional-analyst', displayName: 'Regional Analyst' }, { id: 'demo-iq-sales-analyst', displayName: 'Iraq Sales Analyst' },
];
export const demoMemberships: readonly TenantMembership[] = [
  { id: 'iq-admin', userId: 'demo-iq-admin', tenantId: 'demo-iq', roleIds: ['admin'], metricDomains: allDomains },
  { id: 'iq-analyst', userId: 'demo-iq-analyst', tenantId: 'demo-iq', roleIds: ['analyst'], metricDomains: allDomains },
  { id: 'iq-baghdad', userId: 'demo-iq-baghdad-manager', tenantId: 'demo-iq', roleIds: ['manager'], metricDomains: allDomains, enforcedFilters: [{ dimension: 'branch', values: ['baghdad'] }] },
  { id: 'eg-analyst', userId: 'demo-eg-analyst', tenantId: 'demo-eg', roleIds: ['analyst'], metricDomains: allDomains },
  { id: 'regional-iq', userId: 'demo-regional-analyst', tenantId: 'demo-iq', roleIds: ['analyst'], metricDomains: allDomains },
  { id: 'regional-eg', userId: 'demo-regional-analyst', tenantId: 'demo-eg', roleIds: ['analyst'], metricDomains: allDomains },
  { id: 'iq-sales', userId: 'demo-iq-sales-analyst', tenantId: 'demo-iq', roleIds: ['sales-analyst'], metricDomains: ['sales', 'crm'] },
];
export class DemoIdentityProvider implements IdentityProvider {
  listUsers() { return demoUsers; }
  membershipsFor(userId: string) { return demoMemberships.filter(item => item.userId === userId); }
  resolve(userId: string, tenantId: string, locale: Locale): RequestContext {
    if (!demoUsers.some(user => user.id === userId)) throw new AuthorizationError('UNKNOWN_USER', 'Unknown demo user.');
    const membership = this.membershipsFor(userId).find(item => item.tenantId === tenantId);
    if (!membership) throw new AuthorizationError('TENANT_FORBIDDEN', 'No valid membership for the selected tenant.');
    const roles = membership.roleIds.map(id => demoRoles.find(role => role.id === id));
    if (roles.some(role => !role)) throw new AuthorizationError('INVALID_MEMBERSHIP', 'Membership refers to an unknown role.');
    return { principal: { userId, membershipId: membership.id }, tenant: { tenantId: membership.tenantId }, locale,
      authorization: { permissions: [...new Set(roles.flatMap(role => role!.permissions))], metricDomains: membership.metricDomains,
        enforcedFilters: membership.enforcedFilters ?? [] } };
  }
}
export class DefaultAuthorizationPolicy implements AuthorizationPolicy {
  authorize(action: Permission, context: RequestContext): void {
    if (!context.authorization.permissions.includes(action)) throw new AuthorizationError('PERMISSION_DENIED', `Permission ${action} is required.`);
  }
  authorizeMetric(metric: MetricId, context: RequestContext): void {
    const item = productMetricCatalog.find(candidate => candidate.id === metric && candidate.availability === 'available');
    if (!item || !context.authorization.metricDomains.includes(item.domain)) throw new AuthorizationError('METRIC_FORBIDDEN', `Metric ${metric} is unavailable.`);
  }
  authorizeDashboard(spec: DashboardSpec, context: RequestContext): void {
    for (const widget of spec.widgets) for (const series of widget.series) this.authorizeMetric(series.metric, context);
  }
}
export function analyticsContext(context: RequestContext): AnalyticsContext {
  return { tenantId: context.tenant.tenantId, locale: context.locale, enforcedFilters: context.authorization.enforcedFilters };
}
export function authorizedCatalog(context: RequestContext) {
  const registry = productMetricCatalog.filter(metric => context.authorization.metricDomains.includes(metric.domain));
  const metrics = Object.values(semanticCatalog).filter(metric => registry.some(item => item.id === metric.id && item.availability === 'available'));
  return { metrics, registry, metricIds: metrics.map(metric => metric.id) };
}
export class AuthorizedAnalyticsService {
  constructor(private readonly repository: AnalyticsRepository, private readonly policy: AuthorizationPolicy) {}
  async execute(query: AnalyticsQuery, context: RequestContext): Promise<AnalyticsResult> {
    this.policy.authorize('analytics:query', context);
    this.policy.authorizeMetric(query.metric, context);
    return this.repository.execute(query, analyticsContext(context));
  }
}
export class InMemoryAuditSink implements AuditSink {
  readonly events: AuditEvent[] = [];
  record(event: AuditEvent): void { this.events.push({ ...event }); }
}
