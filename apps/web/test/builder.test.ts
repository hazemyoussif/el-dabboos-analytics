import assert from 'node:assert/strict';
import test from 'node:test';
import { productMetricCatalog, tenantProfiles } from '@el-dabboos/domain';
import type { DashboardSpec, DashboardWidget } from '@el-dabboos/domain';
import { fromGridItems, toGridItems } from '../src/builder/grid-map.ts';
import { analysisAllowed, blankDashboardDraft, canAddSeries, commitBuilderCommand, commonDimensions, redoBuilder, selectableMetric, startBuilder, undoBuilder, validWidgetDraft, withWidgetMetric } from '../src/builder/model.ts';
const profile = tenantProfiles['demo-iq'];
const widget: DashboardWidget = { id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] };
const spec: DashboardSpec = { schemaVersion: 2, id: 'manual', title: { en: 'Manual', ar: 'يدوية' }, locale: 'en', filters: {}, layout: { columns: 12 }, widgets: [widget] };

test('empty draft is distinct from executable DashboardSpec until first widget', () => {
  const draft = blankDashboardDraft(profile, 'ar', new Date('2026-09-30T12:00:00Z'));
  assert.equal(draft.kind, 'empty');
  assert.equal('widgets' in draft.base, false);
  const next = commitBuilderCommand(startBuilder(draft), { type: 'add-first', widget });
  assert.equal(next.history.present.kind, 'dashboard');
  assert.equal(next.execute, true);
  assert.equal(next.history.present.kind === 'dashboard' && next.history.present.spec.layout.items?.length, 1);
});
test('removing the final widget returns to an empty draft and can be undone', () => {
  const removed = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec }), { type: 'remove-last' });
  assert.equal(removed.history.present.kind, 'empty');
  assert.equal(removed.execute, true);
  const restored = undoBuilder(removed.history);
  assert.equal(restored.history.present.kind, 'dashboard');
  assert.equal(restored.execute, true);
  assert.equal(redoBuilder(restored.history).history.present.kind, 'empty');
});
test('layout edits and their undo/redo never request analytics; semantic edits do', () => {
  let history = startBuilder({ kind: 'dashboard', spec });
  const layout = { columns: 12 as const, items: [{ widgetId: 'revenue', x: 3, y: 2, w: 3, h: 2 }] };
  let step = commitBuilderCommand(history, { type: 'layout', layout });
  assert.equal(step.execute, false); history = step.history;
  step = undoBuilder(history); assert.equal(step.execute, false); history = step.history;
  step = redoBuilder(history); assert.equal(step.execute, false); history = step.history;
  step = commitBuilderCommand(history, { type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'replace', widgetId: 'revenue', widget: { ...widget, series: [{ id: 'revenue', metric: 'gross_profit' }] } }] } });
  assert.equal(step.execute, true); history = step.history;
  step = undoBuilder(history); assert.equal(step.execute, true);
  assert.equal(step.history.present.kind === 'dashboard' && step.history.present.spec.widgets[0]?.series[0]?.metric, 'revenue');
  assert.equal(startBuilder({ kind: 'dashboard', spec }).past.length, 0);
});
test('filter edits execute, undo and redo; a new tenant session starts without old history', () => {
  const start = startBuilder({ kind: 'dashboard', spec });
  const filtered = commitBuilderCommand(start, { type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'set_filters', filters: {
    dimensions: [{ dimension: 'branch', values: ['baghdad'] }],
  } }] } });
  assert.equal(filtered.execute, true);
  assert.equal(undoBuilder(filtered.history).execute, true);
  assert.equal(redoBuilder(undoBuilder(filtered.history).history).execute, true);
  const egyptSpec = { ...spec, filters: {}, id: 'egypt-dashboard' };
  const switched = startBuilder({ kind: 'dashboard', spec: egyptSpec });
  assert.equal(switched.past.length, 0);
  assert.equal(switched.present.kind === 'dashboard' && switched.present.spec.filters.dimensions, undefined);
});
test('metric picker excludes planned concepts and checks unit and common dimension rules', () => {
  assert.equal(productMetricCatalog.find(metric => metric.id === 'days_sales_outstanding')?.availability, 'planned');
  assert.equal(productMetricCatalog.filter(selectableMetric).some(metric => metric.id === 'days_sales_outstanding'), false);
  const chart: DashboardWidget = { id: 'chart', type: 'line', dimension: 'month', series: [{ id: 'revenue', metric: 'revenue' }] };
  assert.equal(canAddSeries(chart, 'gross_profit').allowed, true);
  assert.match(canAddSeries(chart, 'gross_margin').reason ?? '', /matching metric type/u);
  assert.ok(commonDimensions(['revenue', 'gross_profit']).includes('customer'));
  assert.ok(!commonDimensions(['revenue', 'failure_count']).includes('customer'));
  assert.equal(withWidgetMetric(chart, 'revenue', 'failure_count').dimension, 'month');
  assert.equal(withWidgetMetric({ ...chart, dimension: 'customer' }, 'revenue', 'failure_count').dimension, undefined);
  assert.equal(validWidgetDraft({ ...chart, dimension: undefined }, { ...spec, layout: { columns: 12 } }), false);
});
test('analysis helper follows bounded semantic rules including first-series top N validation', () => {
  assert.equal(analysisAllowed('revenue', 'month', { from: '2026-01-01', to: '2026-09-30' }, { comparison: 'year_over_year', movingAverage: { window: 3 } }), true);
  assert.equal(analysisAllowed('revenue', 'customer', undefined, { movingAverage: { window: 3 } }), false);
  assert.equal(analysisAllowed('gross_margin', 'month', undefined, { runningTotal: true }), false);
  const base = { ...spec, layout: { columns: 12 as const } };
  const bad: DashboardWidget = { id: 'chart', type: 'table', dimension: 'customer', series: [
    { id: 'revenue', metric: 'revenue' }, { id: 'profit', metric: 'gross_profit', analysis: { topN: { direction: 'top', limit: 10 } } },
  ] };
  assert.equal(validWidgetDraft(bad, base), false);
});
test('web grid adapter round-trips canonical coordinates independent of locale', () => {
  const portable = { columns: 12 as const, items: [{ widgetId: 'revenue', x: 5, y: 2, w: 3, h: 2 }] };
  assert.deepEqual(fromGridItems(toGridItems(portable.items), portable), portable);
  assert.deepEqual(toGridItems(portable.items), [{ i: 'revenue', x: 5, y: 2, w: 3, h: 2 }]);
});

test('manual palette changes preserve business intent, participate in history and equal sparse AI intent', async () => {
  const { widgetPaletteCommand } = await import('../src/builder/model.ts');
  const { compileDashboardEditPlan } = await import('@el-dabboos/application');
  const { applyDashboardPatch } = await import('@el-dabboos/domain');
  const chart: DashboardWidget = { id: 'branch', type: 'bar', dimension: 'branch', title: { en: 'Branches', ar: 'الفروع' },
    presentation: { orientation: 'horizontal', legend: 'hide' },
    series: [{ id: 'profit', metric: 'gross_profit', analysis: { topN: { direction: 'top', limit: 5 }, ranking: true } }] };
  const current: DashboardSpec = { ...spec, widgets: [chart], filters: { dateRange: { from: '2026-01-01', to: '2026-10-01' } },
    layout: { columns: 12, items: [{ widgetId: 'branch', x: 2, y: 3, w: 6, h: 4 }] } };
  const original = structuredClone(current);
  const blue = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec: current }), widgetPaletteCommand(chart, 'blue'));
  assert.equal(blue.execute, false); assert.equal(blue.history.present.kind, 'dashboard');
  if (blue.history.present.kind !== 'dashboard') throw new Error('Missing draft');
  assert.equal(blue.history.present.spec.widgets[0]!.presentation!.palette, 'blue');
  const ai = compileDashboardEditPlan(current, { operations: [{ op: 'update_widget', widgetId: chart.id, changes: { presentation: { palette: 'blue' } } }] });
  assert.deepEqual(blue.history.present.spec, applyDashboardPatch(current, ai));
  const green = commitBuilderCommand(blue.history, widgetPaletteCommand(blue.history.present.spec.widgets[0]!, 'green'));
  assert.equal(green.execute, false);
  if (green.history.present.kind !== 'dashboard') throw new Error('Missing draft');
  const after = green.history.present.spec;
  assert.deepEqual(after, { ...original, widgets: [{ ...chart, presentation: { ...chart.presentation, palette: 'green' } }] });
  const undone = undoBuilder(green.history); assert.equal(undone.execute, false);
  assert.equal(undone.history.present.kind === 'dashboard' && undone.history.present.spec.widgets[0]!.presentation!.palette, 'blue');
  const redone = redoBuilder(undone.history); assert.equal(redone.execute, false);
  assert.deepEqual(redone.history.present, green.history.present);
  const reset = commitBuilderCommand(green.history, widgetPaletteCommand(after.widgets[0]!, 'default'));
  assert.equal(reset.history.present.kind === 'dashboard' && reset.history.present.spec.widgets[0]!.presentation!.palette, 'default');
  assert.deepEqual(current, original);
  for (const raw of ['#0000ff', 'rgb(0,0,255)', 'cyan']) assert.throws(() => widgetPaletteCommand(chart, raw), /Invalid governed palette/);
});

test('dashboard appearance and inherited widget overrides participate in history without analytics', async () => {
  const { dashboardPaletteCommand, widgetPaletteCommand, withWidgetPalette } = await import('../src/builder/model.ts');
  const { resolveGovernedPalette } = await import('../src/rendering/chart-theme.ts');
  const current: DashboardSpec = { ...spec, widgets: [widget, { ...widget, id: 'override', presentation: { palette: 'red' } }] };
  const palette = (history: ReturnType<typeof startBuilder>) => history.present.kind === 'dashboard' ? history.present.spec.presentation?.palette ?? 'default' : 'default';
  let transition = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec: current }), dashboardPaletteCommand('blue'));
  assert.equal(transition.execute, false); assert.equal(palette(transition.history), 'blue');
  transition = commitBuilderCommand(transition.history, dashboardPaletteCommand('green'));
  assert.equal(transition.execute, false); assert.equal(palette(transition.history), 'green');
  transition = undoBuilder(transition.history); assert.equal(transition.execute, false); assert.equal(palette(transition.history), 'blue');
  transition = undoBuilder(transition.history); assert.equal(transition.execute, false); assert.equal(palette(transition.history), 'default');
  transition = redoBuilder(transition.history); assert.equal(transition.execute, false); assert.equal(palette(transition.history), 'blue');
  assert.equal(transition.history.present.kind, 'dashboard');
  if (transition.history.present.kind !== 'dashboard') throw new Error('Missing spec');
  const draft = transition.history.present.spec;
  assert.deepEqual(draft.widgets, current.widgets);
  assert.equal(resolveGovernedPalette(draft.widgets[0]!.presentation?.palette, draft.presentation?.palette), 'blue');
  assert.equal(resolveGovernedPalette(draft.widgets[1]!.presentation?.palette, draft.presentation?.palette), 'red');
  const inherit = commitBuilderCommand(transition.history, widgetPaletteCommand(draft.widgets[1]!, 'inherit'));
  assert.equal(inherit.execute, false); assert.equal(undoBuilder(inherit.history).execute, false); assert.equal(redoBuilder(undoBuilder(inherit.history).history).execute, false);
  if (inherit.history.present.kind !== 'dashboard') throw new Error('Missing spec');
  assert.equal(inherit.history.present.spec.widgets[1]!.presentation, undefined);
  const bar: DashboardWidget = { ...widget, type: 'bar', dimension: 'branch', presentation: { orientation: 'horizontal', palette: 'red', legend: 'hide' } };
  assert.deepEqual(withWidgetPalette(bar, 'inherit').presentation, { orientation: 'horizontal', legend: 'hide' });
  assert.equal(bar.presentation?.palette, 'red');
  assert.equal(withWidgetPalette(widget, 'default').presentation?.palette, 'default');
  const last = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec: { ...spec, presentation: { palette: 'blue' } } }), { type: 'remove-last' });
  const first = commitBuilderCommand(last.history, { type: 'add-first', widget });
  assert.equal(first.history.present.kind === 'dashboard' && first.history.present.spec.presentation?.palette, 'blue');
  assert.equal(first.history.present.kind === 'dashboard' && first.history.present.spec.widgets[0]!.presentation?.palette, undefined);
});
