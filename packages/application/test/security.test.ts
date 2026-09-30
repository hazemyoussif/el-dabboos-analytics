import assert from 'node:assert/strict';
import test from 'node:test';
import { DemoIdentityProvider, DefaultAuthorizationPolicy, AuthorizedAnalyticsService, analyticsContext, authorizedCatalog, demoMemberships, demoRoles, InMemoryAuditSink } from '../src/security.ts';
import type { AnalyticsRepository, AnalyticsQuery, AnalyticsContext, AnalyticsResult } from '@el-dabbous/domain';

const identity = new DemoIdentityProvider();
const policy = new DefaultAuthorizationPolicy();
test('users, tenants and memberships are distinct; one user can hold two tenant memberships', () => {
  assert.equal(identity.membershipsFor('demo-iq-admin').length, 1);
  assert.deepEqual(identity.membershipsFor('demo-regional-analyst').map(item => item.tenantId), ['demo-iq', 'demo-eg']);
  assert.notEqual(identity.resolve('demo-regional-analyst', 'demo-iq', 'en').principal.membershipId,
    identity.resolve('demo-regional-analyst', 'demo-eg', 'en').principal.membershipId);
  assert.throws(() => identity.resolve('demo-iq-admin', 'demo-eg', 'en'), { code: 'TENANT_FORBIDDEN' });
  assert.throws(() => identity.resolve('missing', 'demo-iq', 'en'), { code: 'UNKNOWN_USER' });
  assert.ok(demoMemberships.every(membership => membership.userId !== membership.tenantId));
});
test('roles bundle permissions, while policy checks resolved permissions', () => {
  const admin = identity.resolve('demo-iq-admin', 'demo-iq', 'en');
  const manager = identity.resolve('demo-iq-baghdad-manager', 'demo-iq', 'en');
  assert.ok(demoRoles.find(role => role.id === 'admin')?.permissions.includes('users:manage'));
  assert.doesNotThrow(() => policy.authorize('users:manage', admin));
  assert.throws(() => policy.authorize('ai:generate', manager), { code: 'PERMISSION_DENIED' });
  assert.deepEqual(analyticsContext(manager).enforcedFilters, [{ dimension: 'branch', values: ['baghdad'] }]);
  assert.equal('userId' in analyticsContext(manager), false);
});
test('governed catalog is filtered and unavailable metrics are denied', () => {
  const sales = identity.resolve('demo-iq-sales-analyst', 'demo-iq', 'en');
  const catalog = authorizedCatalog(sales);
  assert.ok(catalog.metricIds.includes('revenue'));
  assert.ok(!catalog.metricIds.includes('outstanding_amount'));
  assert.ok(!catalog.registry.some(item => item.id === 'days_sales_outstanding'));
  assert.throws(() => policy.authorizeMetric('outstanding_amount', sales), { code: 'METRIC_FORBIDDEN' });
});
test('authorized service sends a small, restricted execution context to the repository', async () => {
  let received: AnalyticsContext | undefined;
  const repository: AnalyticsRepository = { async execute(_query: AnalyticsQuery, context: AnalyticsContext): Promise<AnalyticsResult> {
    received = context;
    return { metric: 'revenue', groupBy: null, rows: [{ key: null, value: 1 }], metadata: { sourceId: 'spy', executedAt: '2026-09-30T00:00:00Z', metricType: 'currency', semantics: 'additive' } };
  } };
  const service = new AuthorizedAnalyticsService(repository, policy);
  const manager = identity.resolve('demo-iq-baghdad-manager', 'demo-iq', 'en');
  await service.execute({ metric: 'revenue' }, manager);
  assert.deepEqual(received, { tenantId: 'demo-iq', locale: 'en', enforcedFilters: [{ dimension: 'branch', values: ['baghdad'] }] });
  assert.equal('principal' in received!, false);
});
test('audit sink holds identifiers and action metadata only', () => {
  const sink = new InMemoryAuditSink();
  sink.record({ tenantId: 'demo-iq', userId: 'demo-iq-admin', membershipId: 'iq-admin', action: 'analytics.query', timestamp: '2026-09-30T00:00:00Z', result: 'allowed' });
  assert.equal(sink.events.length, 1);
  assert.equal('prompt' in sink.events[0]!, false);
});
