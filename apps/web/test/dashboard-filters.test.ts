import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardFilterDimensions, dashboardFilterSelection } from '@el-dabboos/application';
import type { DashboardSpec } from '@el-dabboos/domain';
import { semanticCatalog } from '@el-dabboos/domain';
import { executeDashboard, editDashboard, createSavedDashboard } from '../src/api/client.ts';
const spec: DashboardSpec = { schemaVersion: 2, id: 'filters', locale: 'en', title: { en: 'Sales', ar: 'المبيعات' }, filters: { datePreset: 'previous_month', dimensions: [{ dimension: 'branch', values: ['baghdad', 'basra'] }] }, layout: { columns: 12 }, widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'r', metric: 'revenue' }] }] };
test('viewer API requests carry temporary overrides separately; reset, AI and save use untouched canonical defaults', async () => {
  const bodies: Array<Record<string, unknown>> = [];
  const original = structuredClone(spec); const fetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => { bodies.push(JSON.parse(String(init?.body))); return new Response('{}', { status: 200 }); };
  const session = { userId: 'demo-iq-admin', tenantId: 'demo-iq', locale: 'en' as const };
  try {
    await executeDashboard(session, spec, { date: { mode: 'relative', preset: 'last_30_days' }, dimensions: [] });
    await executeDashboard(session, spec); await editDashboard(session, spec, 'Make it blue'); await createSavedDashboard(session, spec);
    assert.deepEqual(bodies[0], { dashboard: original, overrides: { date: { mode: 'relative', preset: 'last_30_days' }, dimensions: [] } });
    assert.deepEqual(bodies[1], { dashboard: original });
    for (const body of bodies.slice(1)) { assert.ok(!Object.hasOwn(body, 'overrides')); assert.deepEqual(body.dashboard, original); }
    assert.deepEqual(spec, original);
  } finally { globalThis.fetch = fetch; }
});
test('dimension choices intersect every series across every widget; precedence preserves multi-value defaults until explicitly replaced', () => {
  assert.deepEqual(dashboardFilterDimensions(spec, semanticCatalog), ['customer', 'branch', 'region', 'salesperson', 'product', 'product_category', 'business_line', 'city', 'state']);
  const mixed: DashboardSpec = { ...spec, widgets: [...spec.widgets, { id: 'stock', type: 'kpi', series: [{ id: 's', metric: 'inventory_value' }] }] };
  assert.deepEqual(dashboardFilterDimensions(mixed, semanticCatalog), ['branch', 'product', 'product_category']);
  assert.deepEqual(dashboardFilterDimensions({ widgets: [] }), []);
  assert.deepEqual(dashboardFilterSelection(spec.filters), spec.filters);
  assert.deepEqual(dashboardFilterSelection(spec.filters, { date: null, dimensions: [] }), { dimensions: [] });
  assert.deepEqual(dashboardFilterSelection(spec.filters, { date: { mode: 'absolute', range: { from: '2026-09-01', to: '2026-09-30' } } }), { dateRange: { from: '2026-09-01', to: '2026-09-30' }, dimensions: spec.filters.dimensions });
});

test('viewer lifecycle resets on navigation, Reset and enter-edit; stale requests cannot cross sessions', async () => {
  const { currentViewFilters, emptyViewFilters, executeViewFilters } = await import('../src/dashboard-view-filters.ts');
  const { tenantProfiles } = await import('@el-dabboos/domain');
  let state = emptyViewFilters(); let request = 0; let execution: unknown = null; let error: unknown = null;
  const original = structuredClone(spec);
  const workspace = { dashboard: spec, profile: tenantProfiles['demo-iq'], navigationRevision: 1,
    beginRequest: () => ++request, isCurrent: (id: number) => request === id,
    session: () => ({ userId: 'demo-iq-admin', tenantId: 'demo-iq', locale: 'en' as const }),
    setExecution: (value: unknown) => { execution = value; }, setError: (value: unknown) => { error = value; },
  };
  const result = { dashboard: spec, widgetResults: {}, metadata: { executedAt: '2026-10-03', succeeded: 0, failed: 0, succeededSeries: 0, failedSeries: 0 } };
  const overrides = { date: { mode: 'relative' as const, preset: 'last_30_days' as const }, dimensions: [] };
  const seen: unknown[] = [];
  const run = (next = overrides as import('@el-dabboos/application').DashboardFilterOverrides) => executeViewFilters(workspace, next, value => { state = value; }, async (_session, dashboard, filters) => { seen.push({ dashboard: structuredClone(dashboard), filters }); return result; });
  await run(); assert.equal(state.busy, false); assert.deepEqual(currentViewFilters(state, 1).overrides, overrides);
  // Language/theme leave navigation revision unchanged; every document/tenant/user navigation changes it.
  assert.deepEqual(currentViewFilters(state, 1).overrides, overrides);
  for (const revision of [2, 3, 4, 5]) assert.deepEqual(currentViewFilters(state, revision).overrides, {});
  await run({}); // Same operation used for Reset and entering either editor.
  assert.deepEqual(state.overrides, {}); assert.deepEqual(seen.at(-1), { dashboard: original, filters: {} });
  await run(); await run({}); assert.deepEqual(spec, original);
  let resolve!: (value: typeof result) => void;
  const pending = executeViewFilters(workspace, overrides, value => { state = value; }, () => new Promise(done => { resolve = done; }));
  assert.equal(state.busy, true);
  workspace.navigationRevision++; workspace.beginRequest();
  const oldExecution = execution; const oldError = error;
  resolve({ ...result, widgetResults: {} }); await pending;
  assert.equal(execution, oldExecution); assert.equal(error, oldError);
  assert.deepEqual(currentViewFilters(state, workspace.navigationRevision).overrides, {});
  let reject!: (error: Error) => void;
  const failed = executeViewFilters(workspace, overrides, value => { state = value; }, () => new Promise((_done, fail) => { reject = fail; }));
  await run({}); const latest = state; reject(new Error('stale failure')); await failed;
  assert.equal(state, latest); assert.equal(error, null); assert.deepEqual(spec, original);
});
