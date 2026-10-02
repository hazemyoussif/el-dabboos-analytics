import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { MockAnalyticsRepository, SqliteDashboardRepository, createDashboardPersistenceSchema } from '@el-dabboos/data';
import type { DashboardSpec } from '@el-dabboos/domain';
import { buildApi } from '../src/app.ts';

const spec: DashboardSpec = { schemaVersion: 2, id: 'same-portable-id', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: {}, layout: { columns: 1 }, widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
const headers = (userId: string, tenantId = 'demo-iq') => ({ 'x-demo-user-id': userId, 'x-tenant-id': tenantId, 'x-locale': 'en' });
test('saved dashboard API creates, lists, gets, updates, and returns 409 for stale versions', async () => {
  const db = new DatabaseSync(':memory:'); createDashboardPersistenceSchema(db);
  const facts = new MockAnalyticsRepository([]);
  const app = await buildApi({ analyticsRepository: facts, dimensionValues: facts, dashboardRepository: new SqliteDashboardRepository(db) });
  try {
    const owner = headers('demo-iq-admin');
    const first = await app.inject({ method: 'POST', url: '/api/saved-dashboards', headers: owner, payload: { dashboard: spec } });
    assert.equal(first.statusCode, 200);
    const saved = first.json();
    assert.notEqual(saved.id, spec.id);
    assert.equal(saved.version, 1);
    assert.equal(saved.ownerUserId, 'demo-iq-admin');
    const second = await app.inject({ method: 'POST', url: '/api/saved-dashboards', headers: owner, payload: { dashboard: spec } });
    assert.equal(second.statusCode, 200);
    assert.notEqual(second.json().id, saved.id);
    const list = await app.inject({ method: 'GET', url: '/api/saved-dashboards', headers: owner });
    assert.equal(list.json().dashboards.length, 2);
    const got = await app.inject({ method: 'GET', url: `/api/saved-dashboards/${saved.id}`, headers: owner });
    assert.equal(got.json().spec.id, spec.id);
    const edited = structuredClone(spec); edited.title.en = 'Changed';
    const update = await app.inject({ method: 'PUT', url: `/api/saved-dashboards/${saved.id}`, headers: owner,
      payload: { dashboard: edited, expectedVersion: 1 } });
    assert.equal(update.statusCode, 200);
    assert.equal(update.json().version, 2);
    assert.equal(update.json().spec.title.en, 'Changed');
    const stale = await app.inject({ method: 'PUT', url: `/api/saved-dashboards/${saved.id}`, headers: owner,
      payload: { dashboard: spec, expectedVersion: 1 } });
    assert.equal(stale.statusCode, 409);
    assert.equal(stale.json().error.code, 'DASHBOARD_VERSION_CONFLICT');
  } finally { await app.close(); db.close(); }
});
test('saved dashboard API enforces private ownership, tenant boundaries and share permission', async () => {
  const db = new DatabaseSync(':memory:'); createDashboardPersistenceSchema(db);
  const facts = new MockAnalyticsRepository([]);
  const app = await buildApi({ analyticsRepository: facts, dimensionValues: facts, dashboardRepository: new SqliteDashboardRepository(db) });
  try {
    const owner = headers('demo-iq-admin');
    const saved = (await app.inject({ method: 'POST', url: '/api/saved-dashboards', headers: owner, payload: { dashboard: spec } })).json();
    const other = headers('demo-iq-analyst');
    const privateGet = await app.inject({ method: 'GET', url: `/api/saved-dashboards/${saved.id}`, headers: other });
    assert.equal(privateGet.statusCode, 404);
    assert.equal((await app.inject({ method: 'GET', url: '/api/saved-dashboards', headers: other })).json().dashboards.length, 0);
    const crossTenant = await app.inject({ method: 'GET', url: `/api/saved-dashboards/${saved.id}`, headers: headers('demo-regional-analyst', 'demo-eg') });
    assert.equal(crossTenant.statusCode, 404);
    const otherUpdate = await app.inject({ method: 'PUT', url: `/api/saved-dashboards/${saved.id}`, headers: other,
      payload: { dashboard: spec, expectedVersion: 1 } });
    assert.equal(otherUpdate.statusCode, 404);
    const forbiddenScope = await app.inject({ method: 'POST', url: '/api/saved-dashboards', headers: other, payload: { dashboard: spec, scope: 'tenant' } });
    assert.equal(forbiddenScope.statusCode, 403);
    const shared = await app.inject({ method: 'POST', url: '/api/saved-dashboards', headers: owner, payload: { dashboard: spec, scope: 'tenant' } });
    assert.equal(shared.statusCode, 200);
    assert.equal((await app.inject({ method: 'GET', url: `/api/saved-dashboards/${shared.json().id}`, headers: other })).statusCode, 200);
  } finally { await app.close(); db.close(); }
});

test('governed palette survives explicit save, update and reopening through a fresh API composition', async () => {
  const db = new DatabaseSync(':memory:'); createDashboardPersistenceSchema(db);
  const facts = new MockAnalyticsRepository([]);
  const deps = { analyticsRepository: facts, dimensionValues: facts, dashboardRepository: new SqliteDashboardRepository(db) };
  let app = await buildApi(deps);
  try {
    const owner = headers('demo-iq-admin');
    const blue = { ...spec, widgets: [{ ...spec.widgets[0]!, presentation: { palette: 'blue' as const } }] };
    const saved = (await app.inject({ method: 'POST', url: '/api/saved-dashboards', headers: owner, payload: { dashboard: blue } })).json();
    assert.equal(saved.spec.widgets[0].presentation.palette, 'blue');
    const green = { ...blue, widgets: [{ ...blue.widgets[0]!, presentation: { palette: 'green' as const } }] };
    const update = await app.inject({ method: 'PUT', url: `/api/saved-dashboards/${saved.id}`, headers: owner, payload: { dashboard: green, expectedVersion: saved.version } });
    assert.equal(update.statusCode, 200);
    await app.close(); app = await buildApi(deps);
    const reopened = await app.inject({ method: 'GET', url: `/api/saved-dashboards/${saved.id}`, headers: owner });
    assert.equal(reopened.statusCode, 200); assert.deepEqual(reopened.json().spec, green);
    assert.equal(reopened.json().version, 2);
  } finally { await app.close(); db.close(); }
});
