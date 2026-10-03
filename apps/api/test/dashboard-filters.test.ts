import test from 'node:test';
import assert from 'node:assert/strict';
import type { AnalyticsQuery, DashboardSpec } from '@el-dabboos/domain';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import { DashboardExecutor, analyticsQueryIdentity, dashboardFilterSelection, resolveDashboardFilters, validateDashboardFilterOverrides } from '@el-dabboos/application';
const context = { tenantId: 'demo-iq', locale: 'en' as const };
const scope = { timeZone: 'Asia/Baghdad' };
const spec: DashboardSpec = { schemaVersion: 2, id: 'rolling', title: { en: 'Rolling', ar: 'متجدد' }, locale: 'en', filters: { datePreset: 'previous_month' }, layout: { columns: 12 }, widgets: [{ id: 'top', type: 'bar', dimension: 'branch', series: [{ id: 'r', metric: 'revenue', analysis: { topN: { direction: 'top', limit: 1 } } }] }] };
test('unchanged relative spec rolls dates and Top-N after filtering; fixed spec stays fixed and identity uses concrete dates', async () => {
  const facts = new MockAnalyticsRepository([
    { tenantId: 'demo-iq', measureId: 'revenue', date: '2026-09-15', value: 100, dimensions: { branch: 'baghdad' } },
    { tenantId: 'demo-iq', measureId: 'revenue', date: '2027-02-15', value: 200, dimensions: { branch: 'basra' } },
  ]);
  let now = new Date('2026-10-01T00:00:00Z'); const queries: AnalyticsQuery[] = [];
  const executor = new DashboardExecutor({ execute: (query, ctx) => { queries.push(query); return facts.execute(query, ctx); } }, () => now);
  const before = structuredClone(spec);
  const first = await executor.execute(spec, context, scope);
  assert.equal(first.widgetResults.top?.alignedRows[0]?.key, 'baghdad');
  assert.deepEqual(first.metadata.effectiveFilters, { dateRange: { from: '2026-09-01', to: '2026-09-30' } });
  const fixed = { ...spec, filters: { dateRange: first.metadata.effectiveFilters!.dateRange! } };
  now = new Date('2027-03-18T00:00:00Z');
  const second = await executor.execute(spec, context, scope);
  assert.equal(second.widgetResults.top?.alignedRows[0]?.key, 'basra');
  assert.notEqual(analyticsQueryIdentity(queries[0]!, context), analyticsQueryIdentity(queries[1]!, context));
  assert.equal((await executor.execute(fixed, context, scope)).widgetResults.top?.alignedRows[0]?.key, 'baghdad');
  assert.ok(queries.every(q => !Object.hasOwn(q, 'datePreset'))); assert.deepEqual(spec, before);
});
test('temporary overrides replace business defaults only and All cannot broaden policy', async () => {
  const facts = new MockAnalyticsRepository([
    { tenantId: 'demo-iq', measureId: 'revenue', date: '2026-09-15', value: 100, dimensions: { branch: 'baghdad' } },
    { tenantId: 'demo-iq', measureId: 'revenue', date: '2026-09-15', value: 999, dimensions: { branch: 'basra' } },
    { tenantId: 'demo-eg', measureId: 'revenue', date: '2026-09-15', value: 99999, dimensions: { branch: 'baghdad' } },
  ]);
  const executor = new DashboardExecutor(facts, () => new Date('2026-10-01T00:00:00Z'));
  const secured = { ...context, enforcedFilters: [{ dimension: 'branch' as const, values: ['baghdad'] }] };
  const all = await executor.execute(spec, secured, { ...scope, overrides: { date: null, dimensions: [] } });
  assert.deepEqual(all.metadata.effectiveFilters, { dimensions: [] });
  assert.equal(all.widgetResults.top?.alignedRows[0]?.key, 'baghdad');
  const denied = await executor.execute(spec, secured, { ...scope, overrides: { dimensions: [{ dimension: 'branch', values: ['basra'] }] } });
  assert.deepEqual(denied.widgetResults.top?.alignedRows, []);
  assert.ok(!JSON.stringify(all.metadata).includes('enforcedFilters'));
  assert.deepEqual(dashboardFilterSelection(spec.filters, { date: { mode: 'relative', preset: 'previous_quarter' } }), { datePreset: 'previous_quarter' });
  assert.deepEqual(resolveDashboardFilters(spec.filters, scope, new Date('2026-10-01')), { dateRange: { from: '2026-09-01', to: '2026-09-30' } });
  await assert.rejects(executor.execute(spec, context), /requires tenant timezone/);
  await assert.rejects(executor.execute(spec, context, { ...scope, overrides: { dimensions: [{ dimension: 'warehouse', values: ['x'] }] } }), /Unsupported/);
});
test('override boundary rejects arbitrary fields, dates, presets, calendar dimensions and malformed values', () => {
  for (const value of [null, [], { enforcedFilters: [] }, { date: { mode: 'relative', preset: 'last_month' } }, { date: { mode: 'absolute', range: { from: '2026-02-30', to: '2026-03-01' } } }, { dimensions: [{ dimension: 'month', values: ['2026-09'] }] }, { dimensions: [{ dimension: 'branch', values: [] }] }]) assert.throws(() => validateDashboardFilterOverrides(value));
  for (const value of [{}, { date: null }, { dimensions: [] }, { date: { mode: 'relative', preset: 'previous_month' } }]) assert.doesNotThrow(() => validateDashboardFilterOverrides(value));
});

test('HTTP executes trusted timezone overrides, rejects malformed payloads, and preserves saved JSON/version through Reset and Save As', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { SqliteDashboardRepository, createDashboardPersistenceSchema } = await import('@el-dabboos/data');
  const { buildApi } = await import('../src/app.ts');
  const db = new DatabaseSync(':memory:'); createDashboardPersistenceSchema(db);
  const facts = new MockAnalyticsRepository([]);
  const app = await buildApi({ analyticsRepository: facts, dimensionValues: facts, dashboardRepository: new SqliteDashboardRepository(db), clock: () => new Date('2026-09-30T21:30:00Z') });
  const headers = { 'x-demo-user-id': 'demo-iq-admin', 'x-tenant-id': 'demo-iq', 'x-locale': 'en' };
  const post = (url: string, payload: unknown) => app.inject({ method: 'POST', url, headers, payload: payload as Record<string, unknown> });
  try {
    const relative = { ...spec, filters: { datePreset: 'current_month', dimensions: [{ dimension: 'branch', values: ['baghdad'] }] } };
    const saved = (await post('/api/saved-dashboards', { dashboard: relative })).json();
    const executed = await post('/api/dashboards/execute', { dashboard: relative, overrides: { date: { mode: 'relative', preset: 'today' }, dimensions: [] } });
    assert.equal(executed.statusCode, 200);
    assert.deepEqual(executed.json().metadata.effectiveFilters, { dateRange: { from: '2026-10-01', to: '2026-10-01' }, dimensions: [] });
    assert.deepEqual(executed.json().dashboard, relative);
    const reset = await post('/api/dashboards/execute', { dashboard: relative });
    assert.deepEqual(reset.json().metadata.effectiveFilters, { dateRange: { from: '2026-10-01', to: '2026-10-01' }, dimensions: relative.filters.dimensions });
    const reopened = (await app.inject({ method: 'GET', url: `/api/saved-dashboards/${saved.id}`, headers })).json();
    assert.deepEqual(reopened, saved); assert.equal(reopened.version, 1);
    const copy = (await post('/api/saved-dashboards', { dashboard: reopened.spec })).json();
    assert.notEqual(copy.id, saved.id); assert.deepEqual(copy.spec.filters, relative.filters);
    const fixed = { ...relative, filters: { dateRange: { from: '2026-09-01', to: '2026-09-30' } } };
    const fixedSaved = (await post('/api/saved-dashboards', { dashboard: fixed })).json();
    assert.deepEqual((await app.inject({ method: 'GET', url: `/api/saved-dashboards/${fixedSaved.id}`, headers })).json().spec, fixed);
    for (const payload of [{ dashboard: relative, timeZone: 'UTC' }, { dashboard: relative, overrides: { enforcedFilters: [] } }, { dashboard: relative, overrides: { dimensions: [{ dimension: 'warehouse', values: ['x'] }] } }, { dashboard: relative, overrides: { date: { mode: 'relative', preset: 'week' } } }]) assert.equal((await post('/api/dashboards/execute', payload)).statusCode, 400);
  } finally { await app.close(); db.close(); }
});

test('resolved comparisons and snapshots keep existing cutoff semantics in mock and SQLite', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { SqliteAnalyticsRepository, createSqliteSchema, insertFacts } = await import('@el-dabboos/data');
  const facts = [
    { tenantId: 'demo-iq', measureId: 'revenue' as const, date: '2026-09-15', value: 100, dimensions: { branch: 'baghdad' } },
    { tenantId: 'demo-iq', measureId: 'revenue' as const, date: '2026-08-15', value: 50, dimensions: { branch: 'baghdad' } },
    { tenantId: 'demo-iq', measureId: 'outstanding_amount' as const, entityId: 'invoice1', date: '2026-07-15', value: 80, dimensions: { branch: 'baghdad' } },
    { tenantId: 'demo-iq', measureId: 'outstanding_amount' as const, entityId: 'invoice1', date: '2026-09-15', value: 30, dimensions: { branch: 'baghdad' } },
    { tenantId: 'demo-iq', measureId: 'outstanding_amount' as const, entityId: 'invoice1', date: '2026-10-15', value: 0, dimensions: { branch: 'baghdad' } },
  ];
  const db = new DatabaseSync(':memory:'); createSqliteSchema(db); insertFacts(db, facts);
  try { for (const repository of [new MockAnalyticsRepository(facts), new SqliteAnalyticsRepository(db)]) {
    const executor = new DashboardExecutor(repository, () => new Date('2026-10-18'));
    const dashboard: DashboardSpec = { ...spec, widgets: [
      { id: 'revenue', type: 'kpi', series: [{ id: 'r', metric: 'revenue', analysis: { comparison: 'previous_period' } }] },
      { id: 'balance', type: 'kpi', series: [{ id: 'b', metric: 'outstanding_amount' }] },
    ] };
    const result = await executor.execute(dashboard, context, scope);
    const revenue = result.widgetResults.revenue!.seriesResults.r!;
    assert.equal(revenue.status, 'success'); if (revenue.status === 'success') { assert.equal(revenue.result.rows[0]!.value, 100); assert.equal(revenue.result.rows[0]!.comparisonValue, 50); }
    assert.equal(result.widgetResults.balance!.alignedRows[0]!.series.b!.value, 30);
    const early = await executor.execute(dashboard, context, { ...scope, overrides: { date: { mode: 'absolute', range: { from: '2026-08-01', to: '2026-08-31' } } } });
    assert.equal(early.widgetResults.balance!.alignedRows[0]!.series.b!.value, 80);
    const unbounded = await executor.execute(dashboard, context, { ...scope, overrides: { date: null } });
    assert.equal(unbounded.widgetResults.revenue!.status, 'error'); // Never weaken bounded comparison requirements.
    assert.equal(unbounded.widgetResults.balance!.alignedRows[0]!.series.b!.value, 0);
  } } finally { db.close(); }
});
