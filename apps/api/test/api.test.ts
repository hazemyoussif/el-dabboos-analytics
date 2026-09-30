import assert from 'node:assert/strict';
import test from 'node:test';
import { MockAnalyticsRepository } from '@el-dabbous/data';
import { buildApi } from '../src/app.ts';

const facts = [
  { tenantId: 'demo-iq', measureId: 'revenue', date: '2026-01-15', value: 100, dimensions: { branch: 'baghdad' } },
  { tenantId: 'demo-eg', measureId: 'revenue', date: '2026-01-15', value: 250, dimensions: { branch: 'cairo' } },
] as const;
const app = await buildApi({ repository: new MockAnalyticsRepository([...facts]), clock: () => new Date('2026-09-30T12:00:00.000Z') });
const iq = { 'x-tenant-id': 'demo-iq', 'x-locale': 'ar' };
const eg = { 'x-tenant-id': 'demo-eg', 'x-locale': 'en' };
test('health, controlled profiles and metric availability are discoverable', async () => {
  assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
  const profiles = (await app.inject({ method: 'GET', url: '/api/tenant-profiles' })).json();
  assert.equal(profiles.defaultTenantId, 'demo-iq');
  assert.equal(profiles.profiles.length, 2);
  assert.equal((await app.inject({ method: 'GET', url: '/api/tenant-profile', headers: iq })).json().reportingCurrency, 'IQD');
  const catalog = (await app.inject({ method: 'GET', url: '/api/semantic-catalog' })).json();
  assert.ok(catalog.registry.some((item: { id: string; availability: string }) => item.id === 'days_sales_outstanding' && item.availability === 'planned'));
});
test('analytics requires a registered tenant and isolates Iraq from Egypt', async () => {
  const payload = { metric: 'revenue' };
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', payload })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { 'x-tenant-id': 'other' }, payload })).statusCode, 403);
  const iraq = await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { ...iq, 'x-currency': 'EGP', 'x-country': 'EG' }, payload });
  const egypt = await app.inject({ method: 'POST', url: '/api/analytics/query', headers: eg, payload });
  assert.equal(iraq.json().rows[0].value, 100);
  assert.equal(iraq.json().metadata.dataThrough, '2026-01-15');
  assert.equal(iraq.json().metadata.sourceAsOf, undefined);
  assert.equal(egypt.json().rows[0].value, 250);
  assert.equal((await app.inject({ method: 'GET', url: '/api/tenant-profile', headers: iq })).json().reportingCurrency, 'IQD');
});
test('dimension value discovery is tenant scoped and market labeled', async () => {
  const iraq = (await app.inject({ method: 'GET', url: '/api/dimensions/branch/values', headers: iq })).json().values;
  const egypt = (await app.inject({ method: 'GET', url: '/api/dimensions/branch/values', headers: eg })).json().values;
  assert.deepEqual(iraq, [{ id: 'baghdad', label: 'بغداد' }]);
  assert.deepEqual(egypt, [{ id: 'cairo', label: 'Cairo' }]);
  assert.equal((await app.inject({ method: 'GET', url: '/api/dimensions/branch/values' })).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/api/dimensions/customer/values', headers: iq })).statusCode, 400);
});
test('query endpoint rejects SQL, planned metrics and malformed JSON', async () => {
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: iq, payload: { metric: 'revenue', sql: 'SELECT *' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: iq, payload: { metric: 'days_sales_outstanding' } })).statusCode, 400);
  const malformed = await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { ...iq, 'content-type': 'application/json' }, payload: '{' });
  assert.equal(malformed.statusCode, 400);
  assert.equal(malformed.json().error.code, 'VALIDATION_ERROR');
});
test('same Sales Performance template executes under both markets without duplication', async () => {
  const templates = (await app.inject({ method: 'GET', url: '/api/dashboard-templates' })).json().templates;
  assert.equal(templates.length, 10);
  const iraq = (await app.inject({ method: 'GET', url: '/api/dashboard-templates/sales-performance/instantiate', headers: iq })).json();
  const egypt = (await app.inject({ method: 'GET', url: '/api/dashboard-templates/sales-performance/instantiate', headers: eg })).json();
  assert.equal(iraq.dashboard.id, egypt.dashboard.id);
  assert.deepEqual(iraq.dashboard.widgets, egypt.dashboard.widgets);
  assert.equal(iraq.dashboard.schemaVersion, 2);
  assert.equal(iraq.execution.widgetResults.revenue.seriesResults.revenue.result.rows[0].value, 100);
  assert.equal(egypt.execution.widgetResults.revenue.seriesResults.revenue.result.rows[0].value, 250);
  const iraqFiltered = { ...iraq.dashboard, filters: { ...iraq.dashboard.filters, dimensions: [{ dimension: 'branch', values: ['baghdad'] }] } };
  const scoped = (await app.inject({ method: 'POST', url: '/api/dashboards/execute', headers: iq, payload: { dashboard: iraqFiltered } })).json();
  assert.equal(scoped.widgetResults.revenue.seriesResults.revenue.result.rows[0].value, 100);
  assert.equal(egypt.dashboard.filters.dimensions, undefined);
  assert.equal(egypt.execution.widgetResults.revenue.seriesResults.revenue.result.rows[0].value, 250);
  assert.equal((await app.inject({ method: 'GET', url: '/api/dashboard-templates/unknown/instantiate', headers: iq })).statusCode, 404);
});
test('v2 manual execution, Iraqi generation and edit complete the workflow', async () => {
  const generated = await app.inject({ method: 'POST', url: '/api/dashboards/generate', headers: iq, payload: { prompt: 'أريد dashboard للمبيعات ويّاه أعلى الزبائن والمديونيات' } });
  assert.equal(generated.statusCode, 200);
  assert.equal(generated.json().dashboard.schemaVersion, 2);
  const dashboard = generated.json().dashboard;
  const manual = await app.inject({ method: 'POST', url: '/api/dashboards/execute', headers: iq, payload: { dashboard } });
  assert.equal(manual.statusCode, 200);
  assert.equal(manual.json().widgetResults.revenue.status, 'success');
  const edited = await app.inject({ method: 'POST', url: '/api/dashboards/edit', headers: iq, payload: { dashboard, instruction: 'شيل المديونيات' } });
  assert.equal(edited.statusCode, 200);
  assert.ok(!edited.json().dashboard.widgets.some((w: { id: string }) => w.id === 'outstanding'));
  assert.equal((await app.inject({ method: 'POST', url: '/api/dashboards/execute', headers: iq, payload: { dashboard: { ...dashboard, schemaVersion: 1 } } })).statusCode, 400);
  const unsupported = await app.inject({ method: 'POST', url: '/api/dashboards/generate', headers: iq, payload: { prompt: 'show website traffic' } });
  assert.equal(unsupported.statusCode, 422);
});
test.after(async () => { await app.close(); });

test('manual template execution remains available when the planner is disabled', async () => {
  const manualOnly = await buildApi({ repository: new MockAnalyticsRepository([...facts]), planner: null, clock: () => new Date('2026-09-30T12:00:00.000Z') });
  try {
    assert.equal((await manualOnly.inject({ method: 'GET', url: '/api/dashboard-templates/sales-performance/instantiate', headers: iq })).statusCode, 200);
    const planning = await manualOnly.inject({ method: 'POST', url: '/api/dashboards/generate', headers: iq, payload: { prompt: 'مبيعات' } });
    assert.equal(planning.statusCode, 503);
    assert.equal(planning.json().error.code, 'PLANNER_UNAVAILABLE');
  } finally { await manualOnly.close(); }
});
