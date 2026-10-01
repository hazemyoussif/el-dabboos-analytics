import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { MockAnalyticsRepository, SqliteDashboardRepository, createDashboardPersistenceSchema } from '@el-dabbous/data';
import type { DashboardSpec, TenantProfile } from '@el-dabbous/domain';
import { buildApi } from '../../api/src/app.ts';
import { resolveSavedRoute } from '../src/saved-route.ts';

const spec: DashboardSpec = { schemaVersion: 2, id: 'portable', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: {}, layout: { columns: 1 }, widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
test('regional user resolves an accessible IQ dashboard while preferred tenant is Egypt', async () => {
  const db = new DatabaseSync(':memory:'); createDashboardPersistenceSchema(db);
  const facts = new MockAnalyticsRepository([]);
  const app = await buildApi({ analyticsRepository: facts, dimensionValues: facts, dashboardRepository: new SqliteDashboardRepository(db) });
  const headers = (user: string, tenant: string) => ({ 'x-demo-user-id': user, 'x-tenant-id': tenant, 'x-locale': 'en' });
  try {
    const created = await app.inject({ method: 'POST', url: '/api/saved-dashboards', headers: headers('demo-iq-admin', 'demo-iq'),
      payload: { dashboard: spec, scope: 'tenant' } });
    assert.equal(created.statusCode, 200);
    const id = created.json().id as string;
    const memberships = await app.inject({ method: 'GET', url: '/api/tenant-profiles', headers: headers('demo-regional-analyst', 'demo-eg') });
    const profiles = memberships.json().profiles as TenantProfile[];
    const preferred = profiles.find(profile => profile.id === 'demo-eg')!;
    const tried: string[] = [];
    const lookup = async (tenant: TenantProfile, recordId: string, user = 'demo-regional-analyst') => {
      tried.push(tenant.id);
      const result = await app.inject({ method: 'GET', url: `/api/saved-dashboards/${recordId}`, headers: headers(user, tenant.id) });
      if (result.statusCode !== 200) throw { status: result.statusCode };
      return result.json();
    };
    const inaccessible = (error: unknown) => typeof error === 'object' && error !== null && 'status' in error &&
      (error.status === 404 || error.status === 403);
    const found = await resolveSavedRoute(id, preferred, profiles, lookup, inaccessible);
    assert.equal(found?.tenant.id, 'demo-iq'); assert.deepEqual(tried, ['demo-eg', 'demo-iq']);
    tried.length = 0;
    const egyptOnly = profiles.filter(profile => profile.id === 'demo-eg');
    const hidden = await resolveSavedRoute(id, preferred, egyptOnly, tenant => lookup(tenant, id, 'demo-eg-analyst'), inaccessible);
    assert.equal(hidden, null); assert.deepEqual(tried, ['demo-eg']);
  } finally { await app.close(); db.close(); }
});
