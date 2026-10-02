import assert from 'node:assert/strict';
import test from 'node:test';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { applyDashboardPatch, dashboardPatchSchema, validateDashboardPatch, validateDashboardSpec } from '@el-dabboos/domain';
import type { DashboardSpec } from '@el-dabboos/domain';
import { compileDashboardEditPlan, dashboardEditPlanSchema, validateDashboardEditPlan } from '../src/edit-plan.ts';
import type { DashboardEditOperation, DashboardEditPlan } from '../src/edit-plan.ts';
import { projectProviderSchema } from '../src/provider-schema.ts';
const current: DashboardSpec = { schemaVersion: 2, id: 'sales', locale: 'en', title: { en: 'Sales', ar: 'المبيعات' },
  filters: { dateRange: { from: '2026-01-01', to: '2026-10-02' }, dimensions: [{ dimension: 'branch', values: ['baghdad'] }] },
  widgets: [{ id: 'widget-1', type: 'bar', dimension: 'branch', title: { en: 'Branches', ar: 'الفروع' }, presentation: { orientation: 'horizontal', legend: 'hide' },
    series: [{ id: 'widget-1-series-1', metric: 'revenue', analysis: { topN: { direction: 'top', limit: 5 }, ranking: true } }] },
  { id: 'widget-3', type: 'line', dimension: 'month', presentation: { curve: 'straight', palette: 'green' },
    series: [{ id: 'sales', metric: 'revenue', analysis: { movingAverage: { window: 3 } } }, { id: 'profit', metric: 'gross_profit' }] }],
  layout: { columns: 12, items: [{ widgetId: 'widget-1', x: 0, y: 0, w: 6, h: 4 }, { widgetId: 'widget-3', x: 0, y: 5, w: 8, h: 4 }] } };
const compile = (...operations: DashboardEditOperation[]) => compileDashboardEditPlan(current, { operations });
const apply = (...operations: DashboardEditOperation[]) => applyDashboardPatch(current, compile(...operations));
const projected = projectProviderSchema(dashboardEditPlanSchema);
const checkProjected = new Ajv2020({ allErrors: true }).compile(projected);

test('live failure: sparse blue edit preserves branch grouping, revenue Top-5, orientation, title, filters, other widgets and layout', () => {
  const operation = { op: 'update_widget' as const, widgetId: 'widget-1', changes: { presentation: { palette: 'blue' as const } } };
  const before = structuredClone(current); const beforeOperation = structuredClone(operation);
  const patch = compile(operation); validateDashboardPatch(patch);
  assert.equal(patch.schemaVersion, 2); assert.equal(patch.operations[0]!.op, 'replace');
  assert.equal(checkProjected({ operations: [operation] }), true);
  const next = applyDashboardPatch(current, patch);
  const expected = structuredClone(current); expected.widgets[0]!.presentation!.palette = 'blue';
  assert.deepEqual(next, expected); assert.deepEqual(current, before); assert.deepEqual(operation, beforeOperation);
  assert.deepEqual(compile(operation), patch);
  const replacement = patch.operations[0]!;
  if (replacement.op === 'replace') replacement.widget.series[0]!.analysis!.topN!.limit = 10;
  assert.equal(current.widgets[0]!.series[0]!.analysis!.topN!.limit, 5);
});
test('explicit smooth Line conversion preserves grouping/metrics/Top-N/layout and only clears requested orientation', () => {
  const next = apply({ op: 'update_widget', widgetId: 'widget-1', changes: { type: 'line', presentation: { orientation: null, curve: 'smooth' } } });
  assert.equal(next.widgets[0]!.type, 'line'); assert.equal(next.widgets[0]!.dimension, 'branch');
  assert.deepEqual(next.widgets[0]!.series, current.widgets[0]!.series); assert.deepEqual(next.layout, current.layout);
  assert.deepEqual(next.widgets[0]!.presentation, { legend: 'hide', curve: 'smooth' });
});
test('analysis-only YoY edit uses stable series ID and preserves moving average and the other series', () => {
  const next = apply({ op: 'update_series', widgetId: 'widget-3', seriesId: 'sales', changes: { analysis: { comparison: 'year_over_year' } } });
  const expected = structuredClone(current); expected.widgets[1]!.series[0]!.analysis!.comparison = 'year_over_year';
  assert.deepEqual(next, expected);
});
test('dimension update preserves unrelated series state and layout', () => {
  const next = apply({ op: 'update_widget', widgetId: 'widget-1', changes: { dimension: 'customer' } });
  const expected = structuredClone(current); expected.widgets[0]!.dimension = 'customer'; assert.deepEqual(next, expected);
});
test('metric update preserves series ID, analysis, presentation and other widgets', () => {
  const next = apply({ op: 'update_series', widgetId: 'widget-1', seriesId: 'widget-1-series-1', changes: { metric: 'gross_profit' } });
  const expected = structuredClone(current); expected.widgets[0]!.series[0]!.metric = 'gross_profit'; assert.deepEqual(next, expected);
});
test('remove compiles to canonical remove and removes only its layout item', () => {
  const patch = compile({ op: 'remove_widget', widgetId: 'widget-1' });
  assert.deepEqual(patch, { schemaVersion: 2, operations: [{ op: 'remove', widgetId: 'widget-1' }] });
  const next = applyDashboardPatch(current, patch); assert.deepEqual(next.widgets, [current.widgets[1]]);
  assert.deepEqual(next.layout.items, [current.layout.items![1]]);
});
test('add uses generation defaults and deterministic collision-free widget/series IDs and canonical placement', () => {
  const intent: DashboardEditOperation = { op: 'add_widget', widget: { dimension: 'month', series: [{ metric: 'revenue' }] } };
  const patch = compile(intent, intent); assert.deepEqual(patch, compile(intent, intent));
  const next = applyDashboardPatch(current, patch);
  assert.deepEqual(next.widgets.slice(0, 2), current.widgets);
  assert.deepEqual(next.widgets.slice(2).map(w => ({ id: w.id, type: w.type, dimension: w.dimension, series: w.series })), [
    { id: 'widget-2', type: 'line', dimension: 'month', series: [{ id: 'widget-2-series-1', metric: 'revenue' }] },
    { id: 'widget-4', type: 'line', dimension: 'month', series: [{ id: 'widget-4-series-1', metric: 'revenue' }] },
  ]);
  assert.deepEqual(next.layout.items!.slice(0, 2), current.layout.items); validateDashboardSpec(next);
  assert.ok(patch.operations.every(operation => operation.op === 'add'));
});
test('added widgets use existing KPI/Bar/Table resolver defaults and bilingual titles', () => {
  const next = apply({ op: 'add_widget', widget: { titleEn: 'Orders', titleAr: 'الطلبات', series: [{ metric: 'order_count' }] } },
    { op: 'add_widget', widget: { dimension: 'branch', series: [{ metric: 'revenue' }] } },
    { op: 'add_widget', widget: { dimension: 'branch', series: [{ metric: 'revenue' }, { metric: 'gross_margin' }] } });
  assert.deepEqual(next.widgets.slice(2).map(w => w.type), ['kpi', 'bar', 'table']);
  assert.deepEqual(next.widgets[2]!.title, { en: 'Orders', ar: 'الطلبات' });
});
test('multiple sparse updates compile sequentially without dropping prior changes', () => {
  const next = apply({ op: 'update_widget', widgetId: 'widget-1', changes: { presentation: { palette: 'blue' } } },
    { op: 'update_series', widgetId: 'widget-1', seriesId: 'widget-1-series-1', changes: { analysis: { topNLimit: 3 } } },
    { op: 'update_widget', widgetId: 'widget-1', changes: { presentation: { legend: 'show' } } });
  assert.deepEqual(next.widgets[0]!.presentation, { orientation: 'horizontal', palette: 'blue', legend: 'show' });
  assert.deepEqual(next.widgets[0]!.series[0]!.analysis, { topN: { direction: 'top', limit: 3 }, ranking: true });
});
test('explicit null/false clearing never resets omitted optional values', () => {
  const next = apply({ op: 'update_series', widgetId: 'widget-1', seriesId: 'widget-1-series-1', changes: { analysis: { topNDirection: null, ranking: false } } },
    { op: 'update_widget', widgetId: 'widget-1', changes: { title: null, presentation: { legend: null } } });
  assert.equal(next.widgets[0]!.series[0]!.analysis, undefined); assert.equal(next.widgets[0]!.title, undefined);
  assert.deepEqual(next.widgets[0]!.presentation, { orientation: 'horizontal' }); assert.deepEqual(next.filters, current.filters);
});
test('widget and dashboard title edits preserve layout and semantic state', () => {
  const next = apply({ op: 'set_title', titleEn: 'Updated', titleAr: 'محدّث' },
    { op: 'update_widget', widgetId: 'widget-1', changes: { title: { en: 'Updated chart', ar: 'رسم محدّث' } } });
  assert.deepEqual(next.title, { en: 'Updated', ar: 'محدّث' }); assert.deepEqual(next.widgets[0]!.title, { en: 'Updated chart', ar: 'رسم محدّث' });
  assert.deepEqual(next.filters, current.filters); assert.deepEqual(next.layout, current.layout); assert.deepEqual(next.widgets[0]!.series, current.widgets[0]!.series);
});
test('filter updates merge sparse changes and preserve omitted filters across operations', () => {
  const next = apply({ op: 'set_filters', changes: { dateRange: { from: '2024-02-29', to: '2024-03-31' } } });
  assert.deepEqual(next.filters.dimensions, current.filters.dimensions); assert.deepEqual(next.layout, current.layout);
  const cleared = apply({ op: 'set_filters', changes: { dateRange: null } }, { op: 'set_filters', changes: { dimensions: [] } });
  assert.deepEqual(cleared.filters, { dimensions: [] });
});
test('explicit position/size edits compile through separate canonical layout operation', () => {
  const next = apply({ op: 'update_layout', widgetId: 'widget-3', changes: { x: 1, y: 6, w: 7 } });
  assert.deepEqual(next.widgets, current.widgets); assert.deepEqual(next.filters, current.filters);
  assert.deepEqual(next.layout.items![0], current.layout.items![0]);
  assert.deepEqual(next.layout.items![1], { ...current.layout.items![1], x: 1, y: 6, w: 7 });
});
test('atomic compilation validates only the completed semantic edit including explicit layout updates', () => {
  const next = apply({ op: 'update_widget', widgetId: 'widget-1', changes: { type: 'line' } },
    { op: 'update_layout', widgetId: 'widget-1', changes: { h: 4 } },
    { op: 'update_widget', widgetId: 'widget-1', changes: { presentation: { orientation: null, curve: 'smooth' } } });
  assert.equal(next.widgets[0]!.type, 'line'); assert.equal(next.widgets[0]!.presentation!.curve, 'smooth');
});
for (const operation of [
  { op: 'update_widget', widgetId: 'missing', changes: { presentation: { palette: 'blue' } } },
  { op: 'update_series', widgetId: 'widget-1', seriesId: 'missing', changes: { metric: 'revenue' } },
  { op: 'remove_widget', widgetId: 'missing' },
  { op: 'update_layout', widgetId: 'missing', changes: { x: 1 } },
] as DashboardEditOperation[]) test(`nonexistent reference fails safely: ${operation.op}`, () => assert.throws(() => compile(operation), /Invalid DashboardEditPlan .* reference/));
for (const operation of [
  { op: 'update_widget', widgetId: 'widget-1', changes: { type: 'line' } }, // inherited orientation is not silently removed
  { op: 'update_widget', widgetId: 'widget-1', changes: { dimension: null } },
  { op: 'update_series', widgetId: 'widget-1', seriesId: 'widget-1-series-1', changes: { analysis: { movingAverageWindow: 3 } } },
  { op: 'update_series', widgetId: 'widget-3', seriesId: 'profit', changes: { analysis: { topNDirection: 'top', topNLimit: 5 } } },
  { op: 'set_filters', changes: { dateRange: { from: '2023-02-29', to: '2023-03-01' } } },
  { op: 'update_layout', widgetId: 'widget-3', changes: { y: 0 } },
] as DashboardEditOperation[]) test(`canonical final validation rejects incompatible ${JSON.stringify(operation)}`, () => {
  const before = structuredClone(current); assert.throws(() => compile(operation)); assert.deepEqual(current, before);
});
for (const operations of [[], Array(31).fill({ op: 'remove_widget', widgetId: 'widget-1' }),
  [{ op: 'replace', widgetId: 'widget-1', widget: current.widgets[0] }],
  [{ op: 'update_widget', widgetId: 'widget-1', changes: { layout: {} } }],
  [{ op: 'update_widget', widgetId: 'widget-1', changes: { presentation: { palette: '#123456' } } }],
  [{ op: 'update_widget', widgetId: 'widget-1', changes: { presentation: { strokeWidth: 3 } } }],
  [{ op: 'update_series', widgetId: 'widget-1', seriesId: 'widget-1-series-1', changes: { id: 'new-id' } }],
  [{ op: 'add_widget', widget: { id: 'invented', series: [{ metric: 'revenue' }] } }],
]) test(`both plan schemas reject unbounded/canonical reconstruction input ${JSON.stringify(operations).slice(0, 100)}`, () => {
  const value = { operations }; assert.throws(() => validateDashboardEditPlan(value), /schema/); assert.equal(checkProjected(value), false);
});
test('canonical validators still reject strings accepted by relaxed provider projection', () => {
  const value = { operations: [{ op: 'set_title', titleEn: '', titleAr: 'عنوان' }] };
  assert.equal(checkProjected(value), true); assert.throws(() => validateDashboardEditPlan(value), /schema/);
});
test('projected edit plan is smaller and structurally shallower than canonical patch, without widget/series reconstruction', () => {
  const canonical = projectProviderSchema(dashboardPatchSchema);
  const depth = (node: unknown, root: Record<string, unknown>): number => {
    if (!node || typeof node !== 'object') return 0;
    const record = node as Record<string, unknown>;
    if (typeof record.$ref === 'string') return depth(record.$ref.split('/').slice(1).reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], root), root);
    return 1 + Math.max(0, ...Object.entries(record).filter(([key]) => key !== '$defs').map(([,child]) => depth(child, root)));
  };
  assert.ok(JSON.stringify(projected).length < JSON.stringify(canonical).length);
  assert.ok(depth(projected, projected) <= depth(canonical, canonical) - 2);
  assert.ok(!JSON.stringify(projected).includes('"schemaVersion"')); assert.ok(!JSON.stringify(projected).includes('"mark"'));
  const edit: DashboardEditPlan = { operations: [{ op: 'update_widget', widgetId: 'widget-1', changes: { presentation: { palette: 'blue' } } }] };
  assert.equal(checkProjected(edit), true);
});

test('added widgets retain explicit bounded type/presentation/analysis with code-owned Combo marks', () => {
  const next = apply({ op: 'add_widget', widget: { dimension: 'branch', type: 'bar', presentation: { palette: 'blue', orientation: 'horizontal' },
    series: [{ metric: 'revenue', analysis: { topNDirection: 'top', topNLimit: 5 } }] } },
    { op: 'add_widget', widget: { dimension: 'month', type: 'combo', presentation: { curve: 'smooth' }, series: [{ metric: 'revenue' }, { metric: 'gross_profit' }] } });
  assert.deepEqual(next.widgets[2]!.series[0]!.analysis, { topN: { direction: 'top', limit: 5 } });
  assert.equal(next.widgets[2]!.presentation!.palette, 'blue'); assert.equal(next.widgets[2]!.presentation!.orientation, 'horizontal');
  assert.deepEqual(next.widgets[3]!.series.map(series => series.presentation), [{ mark: 'bar' }, { mark: 'line' }]);
  assert.equal(next.widgets[3]!.presentation!.curve, 'smooth');
});
test('incomplete or contradictory analysis changes fail without silently inventing selection', () => {
  assert.throws(() => compile({ op: 'update_series', widgetId: 'widget-3', seriesId: 'sales', changes: { analysis: { topNLimit: 5 } } }), /Invalid DashboardEditPlan topN pair/);
  assert.throws(() => compile({ op: 'update_series', widgetId: 'widget-1', seriesId: 'widget-1-series-1', changes: { analysis: { topNDirection: null, topNLimit: 5 } } }), /Invalid DashboardEditPlan topN clearing/);
});
test('remove/add do not reuse removed IDs within a plan and explicit layout follows canonical placement', () => {
  const next = apply({ op: 'remove_widget', widgetId: 'widget-1' }, { op: 'add_widget', widget: { series: [{ metric: 'revenue' }] } },
    { op: 'update_layout', widgetId: 'widget-3', changes: { x: 1 } });
  assert.deepEqual(next.widgets.map(widget => widget.id), ['widget-3', 'widget-2']);
  assert.deepEqual(next.layout.items!.find(item => item.widgetId === 'widget-2'), { widgetId: 'widget-2', x: 0, y: 0, w: 4, h: 2 });
});

test('Combo conversion requires explicit clear-only series presentation and preserves every omitted series field', () => {
  const combo = structuredClone(current); combo.widgets[1]!.type = 'combo';
  combo.widgets[1]!.series[0]!.presentation = { mark: 'bar' }; combo.widgets[1]!.series[1]!.presentation = { mark: 'line' };
  assert.throws(() => compileDashboardEditPlan(combo, { operations: [{ op: 'update_widget', widgetId: 'widget-3', changes: { type: 'line' } }] }));
  const operations: DashboardEditOperation[] = [{ op: 'update_widget', widgetId: 'widget-3', changes: { type: 'line' } },
    ...combo.widgets[1]!.series.map(series => ({ op: 'update_series' as const, widgetId: 'widget-3', seriesId: series.id, changes: { presentation: null } }))];
  const next = applyDashboardPatch(combo, compileDashboardEditPlan(combo, { operations }));
  const expected = structuredClone(combo); expected.widgets[1]!.type = 'line';
  for (const series of expected.widgets[1]!.series) delete series.presentation;
  assert.deepEqual(next, expected);
  const invented = { operations: [{ op: 'update_series', widgetId: 'widget-3', seriesId: 'sales', changes: { presentation: { mark: 'line' } } }] };
  assert.throws(() => validateDashboardEditPlan(invented), /schema/); assert.equal(checkProjected(invented), false);
});

test('empty sparse updates preserve existing optional-object shapes without inventing absent values', () => {
  const empty = structuredClone(current); empty.widgets[0]!.presentation = {}; empty.widgets[0]!.series[0]!.analysis = {};
  const next = applyDashboardPatch(empty, compileDashboardEditPlan(empty, { operations: [
    { op: 'update_widget', widgetId: 'widget-1', changes: { presentation: {} } },
    { op: 'update_series', widgetId: 'widget-1', seriesId: 'widget-1-series-1', changes: { analysis: {} } },
  ] }));
  assert.deepEqual(next, empty);
  const absent = structuredClone(empty); delete absent.widgets[0]!.presentation; delete absent.widgets[0]!.series[0]!.analysis;
  assert.deepEqual(applyDashboardPatch(absent, compileDashboardEditPlan(absent, { operations: [
    { op: 'update_widget', widgetId: 'widget-1', changes: { presentation: {} } },
    { op: 'update_series', widgetId: 'widget-1', seriesId: 'widget-1-series-1', changes: { analysis: {} } },
  ] })), absent);
});
