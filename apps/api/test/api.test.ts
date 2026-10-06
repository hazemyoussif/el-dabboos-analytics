import assert from 'node:assert/strict';
import test from 'node:test';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import { buildApi } from '../src/app.ts';

const facts = [
  { tenantId: 'demo-iq', measureId: 'revenue', date: '2026-01-15', value: 100, dimensions: { branch: 'baghdad' } },
  { tenantId: 'demo-eg', measureId: 'revenue', date: '2026-01-15', value: 250, dimensions: { branch: 'cairo' } },
] as const;
const repository = new MockAnalyticsRepository([...facts]);
const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, clock: () => new Date('2026-09-30T12:00:00.000Z') });
const iq = { 'x-demo-user-id': 'demo-iq-admin', 'x-tenant-id': 'demo-iq', 'x-locale': 'ar' };
const eg = { 'x-demo-user-id': 'demo-eg-analyst', 'x-tenant-id': 'demo-eg', 'x-locale': 'en' };
test('health, controlled profiles and metric availability are discoverable', async () => {
  assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
  const profiles = (await app.inject({ method: 'GET', url: '/api/tenant-profiles', headers: iq })).json();
  assert.equal(profiles.defaultTenantId, 'demo-iq');
  assert.equal(profiles.profiles.length, 1);
  assert.equal((await app.inject({ method: 'GET', url: '/api/tenant-profile', headers: iq })).json().reportingCurrency, 'IQD');
  const catalog = (await app.inject({ method: 'GET', url: '/api/semantic-catalog', headers: iq })).json();
  assert.ok(catalog.registry.some((item: { id: string; availability: string }) => item.id === 'days_sales_outstanding' && item.availability === 'planned'));
});
test('analytics requires a registered tenant and isolates Iraq from Egypt', async () => {
  const payload = { metric: 'revenue' };
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', payload })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { 'x-demo-user-id': 'demo-iq-admin', 'x-tenant-id': 'other' }, payload })).statusCode, 403);
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
  assert.equal((await app.inject({ method: 'GET', url: '/api/dimensions/date/values', headers: iq })).statusCode, 400);
});
test('query endpoint rejects SQL, planned metrics and malformed JSON', async () => {
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: iq, payload: { metric: 'revenue', sql: 'SELECT *' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: iq, payload: { metric: 'days_sales_outstanding' } })).statusCode, 400);
  const malformed = await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { ...iq, 'content-type': 'application/json' }, payload: '{' });
  assert.equal(malformed.statusCode, 400);
  assert.equal(malformed.json().error.code, 'VALIDATION_ERROR');
});
test('same Sales Performance template executes under both markets without duplication', async () => {
  const templates = (await app.inject({ method: 'GET', url: '/api/dashboard-templates', headers: iq })).json().templates;
  assert.equal(templates.length, 24);
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
  const manualRepository = new MockAnalyticsRepository([...facts]);
  const manualOnly = await buildApi({ analyticsRepository: manualRepository, dimensionValues: manualRepository, planner: null, clock: () => new Date('2026-09-30T12:00:00.000Z') });
  try {
    const template = await manualOnly.inject({ method: 'GET', url: '/api/dashboard-templates/sales-performance/instantiate', headers: iq });
    assert.equal(template.statusCode, 200);
    assert.equal((await manualOnly.inject({ method: 'POST', url: '/api/dashboards/execute', headers: iq, payload: { dashboard: template.json().dashboard } })).statusCode, 200);
    const planning = await manualOnly.inject({ method: 'POST', url: '/api/dashboards/generate', headers: iq, payload: { prompt: 'مبيعات' } });
    assert.equal(planning.statusCode, 503);
    assert.equal(planning.json().error.code, 'PLANNER_UNAVAILABLE');
  } finally { await manualOnly.close(); }
});

test('demo identity and tenant headers require a valid server-owned membership', async () => {
  const query = { metric: 'revenue' };
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { 'x-tenant-id': 'demo-iq' }, payload: query })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { 'x-demo-user-id': 'unknown', 'x-tenant-id': 'demo-iq' }, payload: query })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { ...iq, 'x-tenant-id': 'demo-eg' }, payload: query })).statusCode, 403);
  const regional = { 'x-demo-user-id': 'demo-regional-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' };
  assert.equal((await app.inject({ method: 'GET', url: '/api/tenant-profiles', headers: regional })).json().profiles.length, 2);
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: { ...regional, 'x-tenant-id': 'demo-eg' }, payload: query })).json().rows[0].value, 250);
});
test('restricted catalog, template and handcrafted dashboard are denied server-side', async () => {
  const sales = { 'x-demo-user-id': 'demo-iq-sales-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' };
  const catalog = (await app.inject({ method: 'GET', url: '/api/semantic-catalog', headers: sales })).json();
  assert.ok(catalog.metrics.some((metric: { id: string }) => metric.id === 'revenue'));
  assert.ok(!catalog.metrics.some((metric: { id: string }) => metric.id === 'outstanding_amount'));
  const templates = (await app.inject({ method: 'GET', url: '/api/dashboard-templates', headers: sales })).json().templates;
  assert.equal(templates.find((template: { id: string }) => template.id === 'sales-performance').availability, 'restricted');
  assert.equal(templates.find((template: { id: string }) => template.id === 'sales-team').availability, 'available');
  assert.equal((await app.inject({ method: 'GET', url: '/api/dashboard-templates/sales-performance/instantiate', headers: sales })).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: '/api/analytics/query', headers: sales, payload: { metric: 'outstanding_amount' } })).statusCode, 403);
  const spec = (await app.inject({ method: 'GET', url: '/api/dashboard-templates/sales-performance/instantiate', headers: iq })).json().dashboard;
  assert.equal((await app.inject({ method: 'POST', url: '/api/dashboards/execute', headers: sales, payload: { dashboard: spec } })).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: '/api/dashboards/generate', headers: sales, payload: { prompt: 'sales dashboard' } })).statusCode, 422);
  assert.equal((await app.inject({ method: 'GET', url: '/api/dashboard-templates/sales-team/instantiate', headers: sales })).statusCode, 200);
});
test('Baghdad manager cannot broaden policy with a dashboard or discover other branches', async () => {
  const manager = { 'x-demo-user-id': 'demo-iq-baghdad-manager', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' };
  const branch = (await app.inject({ method: 'GET', url: '/api/dimensions/branch/values', headers: manager })).json().values;
  assert.deepEqual(branch, [{ id: 'baghdad', label: 'Baghdad' }]);
  const query = await app.inject({ method: 'POST', url: '/api/analytics/query', headers: manager, payload: { metric: 'revenue', filters: [{ dimension: 'branch', values: ['basra'] }] } });
  assert.equal(query.json().rows[0].value, 0);
  const template = (await app.inject({ method: 'GET', url: '/api/dashboard-templates/sales-performance/instantiate', headers: manager })).json();
  assert.equal(template.dashboard.filters.dimensions, undefined);
  assert.equal(template.execution.widgetResults.revenue.seriesResults.revenue.result.rows[0].value, 100);
  assert.equal((await app.inject({ method: 'POST', url: '/api/dashboards/generate', headers: manager, payload: { prompt: 'sales' } })).statusCode, 403);
});

test('planner output is authorized after generation and audit omits raw prompts', async () => {
  const { InMemoryAuditSink } = await import('@el-dabboos/application');
  const sink = new InMemoryAuditSink();
  const unrestricted = (await app.inject({ method: 'GET', url: '/api/dashboard-templates/sales-performance/instantiate', headers: iq })).json().dashboard;
  const maliciousPlanner = { async generate() { return unrestricted; }, async edit() { return { schemaVersion: 2 as const, operations: [] }; } };
  const scopedRepository = new MockAnalyticsRepository([...facts]);
  const guarded = await buildApi({ analyticsRepository: scopedRepository, dimensionValues: scopedRepository, planner: maliciousPlanner, auditSink: sink });
  try {
    const sales = { 'x-demo-user-id': 'demo-iq-sales-analyst', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' };
    const response = await guarded.inject({ method: 'POST', url: '/api/dashboards/generate', headers: sales, payload: { prompt: 'private customer values' } });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, 'METRIC_FORBIDDEN');
    assert.equal(sink.events[0]?.result, 'denied');
    assert.equal(JSON.stringify(sink.events).includes('private customer values'), false);
  } finally { await guarded.close(); }
});

test('mock custom-dashboard edits return controlled demo limitation instead of missing widget or invalid patch errors', async () => {
  const dashboard = { schemaVersion: 2, id: 'manual-dashboard', title: { en: 'Custom', ar: 'مخصصة' }, locale: 'en', filters: {},
    layout: { columns: 12, items: [{ widgetId: 'widget-1', x: 3, y: 2, w: 5, h: 3 }] },
    widgets: [{ id: 'widget-1', type: 'kpi', series: [{ id: 'series-1', metric: 'revenue' }] }] };
  for (const instruction of ['Change KPI to profit', 'Add moving average', 'Remove receivables']) {
    const response = await app.inject({ method: 'POST', url: '/api/dashboards/edit', headers: iq, payload: { dashboard, instruction } });
    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, 'UNSUPPORTED_DEMO_INTENT');
    assert.equal(response.json().error.message, 'The demo planner supports only predefined dashboard edit examples. Configure a structured model provider for general AI editing.');
    assert.ok(!response.body.includes('widget-1'));
  }
});
