import assert from 'node:assert/strict';
import test from 'node:test';
import { productMetricCatalog, tenantProfiles } from '@el-dabbous/domain';
import type { DashboardSpec, DashboardWidget } from '@el-dabbous/domain';
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
