import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { productMetricCatalog, semanticCatalog, tenantProfiles, validateDashboardSpec } from '@el-dabbous/domain';
import type { DashboardRecord, DashboardSpec, DashboardWidget, MetricId } from '@el-dabbous/domain';
import { applyMetricDrop, createMetricCommand, createWidgetFromMetric, metricAvailable, metricDropActions, metricVisualizationOptions, nextSeriesId } from '../src/builder/metric-drop.ts';
import { BUILDER_DRAG_MIME, consumeMetricDrop, parseBuilderDragItem, readBuilderDragItem, writeBuilderDragItem } from '../src/builder/drag-item.ts';
import { MetricChooser } from '../src/builder/MetricChooser.ts';
import { blankDashboardDraft, commitBuilderCommand, redoBuilder, startBuilder, undoBuilder } from '../src/builder/model.ts';
import { documentIsDirty, editDocument, newManualDocument, persistDocument, savedDocument } from '../src/dashboard-lifecycle.ts';
import { dashboardActions, switchDashboardEditor } from '../src/product-flow.ts';
const registry = productMetricCatalog;
const catalog = semanticCatalog;
const empty = blankDashboardDraft(tenantProfiles['demo-iq'], 'en', new Date('2026-10-01T00:00:00Z'));
const kpi: DashboardWidget = { id: 'widget-1', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] };
const spec: DashboardSpec = { ...empty.base, widgets: [kpi], layout: { columns: 12, items: [{ widgetId: kpi.id, x: 3, y: 2, w: 5, h: 3 }] } };
const chart: DashboardWidget = { id: 'widget-1', type: 'line', dimension: 'month', series: [{ id: 'revenue', metric: 'revenue' }] };
const chartSpec = { ...spec, widgets: [chart] };

test('drag payload supports both variants; unavailable, planned, oversized and malformed data is rejected', () => {
  assert.equal(metricAvailable('revenue', catalog, registry), true);
  assert.equal(metricAvailable('days_sales_outstanding', catalog, registry), false);
  const data = new Map<string, string>(); const transfer = { effectAllowed: 'none' as DataTransfer['effectAllowed'], setData: (key: string, value: string) => { data.set(key, value); }, getData: (key: string) => data.get(key) ?? '' };
  writeBuilderDragItem(transfer, { kind: 'metric', metricId: 'revenue' });
  assert.equal(transfer.effectAllowed, 'copy'); assert.ok(data.has(BUILDER_DRAG_MIME));
  assert.deepEqual(readBuilderDragItem(transfer, catalog, registry), { kind: 'metric', metricId: 'revenue' });
  data.delete(BUILDER_DRAG_MIME); assert.equal(readBuilderDragItem(transfer, catalog, registry)?.kind, 'metric');
  writeBuilderDragItem(transfer, { kind: 'widget', widgetType: 'line' });
  assert.deepEqual(readBuilderDragItem(transfer, catalog, registry), { kind: 'widget', widgetType: 'line' });
  for (const raw of ['revenue', '{}', 'x'.repeat(385), JSON.stringify({ kind: 'metric', metricId: 'days_sales_outstanding' }),
    JSON.stringify({ kind: 'metric', metricId: 'revenue', sql: 'anything' }), JSON.stringify({ kind: 'widget', widgetType: ['line'] })])
    assert.equal(parseBuilderDragItem(raw, catalog, registry), null);
  assert.equal(parseBuilderDragItem('{"kind":"metric","metricId":"revenue"}', catalog, []), null);
  assert.equal(parseBuilderDragItem('{"kind":"metric","metricId":"revenue"}', {}, registry), null);
});
test('metric creation offers valid defaults: KPI, month line, branch bar/table, including duration metrics', () => {
  for (const metric of ['revenue', 'gross_profit', 'order_count', 'outstanding_amount', 'mttr'] as MetricId[]) {
    const options = metricVisualizationOptions(metric, catalog, empty.base);
    assert.deepEqual(options.map(option => option.type), ['kpi', 'line', 'bar', 'table']);
    assert.equal(options[1]!.dimension, 'month'); assert.equal(options[2]!.dimension, 'branch');
    for (const { type } of options) {
      const widget = createWidgetFromMetric(empty, metric, type, catalog, registry);
      validateDashboardSpec({ ...empty.base, widgets: [widget], layout: { columns: 12 } });
      assert.equal(widget.series[0]!.metric, metric);
    }
  }
  const limited = { ...catalog, revenue: { ...catalog.revenue, dimensions: ['year', 'quarter', 'date'] as const } };
  assert.equal(metricVisualizationOptions('revenue', limited, empty.base).find(option => option.type === 'line')!.dimension, 'date');
  const grouped = { ...catalog, revenue: { ...catalog.revenue, dimensions: ['customer', 'warehouse'] as const } };
  assert.equal(metricVisualizationOptions('revenue', grouped, empty.base).some(option => option.type === 'line'), false);
  assert.equal(metricVisualizationOptions('revenue', grouped, empty.base).find(option => option.type === 'table')!.dimension, 'customer');
});
test('metric on empty canvas uses add-first with snapped canonical size, and Undo/Redo executes semantic preview', () => {
  const next = createMetricCommand(empty, 'revenue', 'kpi', { x: 6, y: 3 }, catalog, registry);
  const step = commitBuilderCommand(startBuilder(empty), next.command);
  assert.equal(step.execute, true);
  if (step.history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
  assert.deepEqual(step.history.present.spec.layout.items, [{ widgetId: 'widget-1', x: 6, y: 3, w: 4, h: 2 }]);
  assert.equal(undoBuilder(step.history).history.present.kind, 'empty'); assert.equal(undoBuilder(step.history).execute, true);
  const redo = redoBuilder(undoBuilder(step.history).history); assert.equal(redo.execute, true); assert.deepEqual(redo.history.present, step.history.present);
});
test('free canvas creation inserts at dropped position with unique widget/series IDs and valid collision handling', () => {
  const document = { kind: 'dashboard' as const, spec };
  const next = createMetricCommand(document, 'revenue', 'line', { x: 4, y: 8 }, catalog, registry);
  assert.equal(next.widget.id, 'widget-2'); assert.equal(next.widget.series[0]!.id, 'revenue-2');
  const step = commitBuilderCommand(startBuilder(document), next.command);
  if (step.history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
  const updated = step.history.present.spec;
  assert.deepEqual(updated.layout.items!.at(-1), { widgetId: 'widget-2', x: 4, y: 8, w: 8, h: 4 });
  assert.deepEqual(updated.layout.items![0], spec.layout.items![0]); validateDashboardSpec(updated);
  const collided = commitBuilderCommand(startBuilder(document), createMetricCommand(document, 'mttr', 'table', { x: 3, y: 2 }, catalog, registry).command);
  if (collided.history.present.kind === 'dashboard') validateDashboardSpec(collided.history.present.spec);
  assert.equal(nextSeriesId('gross_profit', ['gross-profit', 'gross-profit-2']), 'gross-profit-3');
});
test('KPI replacement and compatible line addition preserve identity/layout and are semantic undoable operations', () => {
  for (const [current, action] of [[spec, 'replace-primary'], [chartSpec, 'add-series']] as const) {
    const command = applyMetricDrop(current, 'widget-1', 'gross_profit', action, catalog, registry);
    const step = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec: current }), command);
    assert.equal(step.execute, true);
    if (step.history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
    const updated = step.history.present.spec;
    assert.deepEqual(updated.layout, current.layout); assert.equal(updated.widgets[0]!.id, 'widget-1');
    assert.equal(updated.widgets[0]!.series[action === 'add-series' ? 1 : 0]!.metric, 'gross_profit');
    assert.equal(updated.widgets[0]!.series[0]!.id, 'revenue');
    assert.deepEqual(undoBuilder(step.history).history.present, { kind: 'dashboard', spec: current });
    assert.equal(undoBuilder(step.history).execute, true);
    assert.deepEqual(redoBuilder(undoBuilder(step.history).history).history.present, step.history.present);
  }
});
test('single-axis addition and primary replacement respect all remaining series and dimension constraints', () => {
  assert.ok(!metricDropActions(chart, 'gross_margin', catalog, registry, spec).includes('add-series'));
  const mixed = { ...chart, series: [...chart.series, { id: 'profit', metric: 'gross_profit' as const }] };
  assert.deepEqual(metricDropActions(mixed, 'gross_margin', catalog, registry, spec), []);
  const bar = { ...mixed, type: 'bar' as const, dimension: 'customer' as const };
  assert.deepEqual(metricDropActions(bar, 'mttr', catalog, registry, spec), []);
  const limited = { ...chart, series: Array.from({ length: 8 }, (_, i) => ({ id: `revenue-${i}`, metric: 'revenue' as const })) };
  assert.ok(!metricDropActions(limited, 'gross_profit', catalog, registry, spec).includes('add-series'));
});
test('table accepts mixed metric types only with a shared dimension', () => {
  const table = { ...chart, type: 'table' as const, dimension: 'branch' as const };
  const current = { ...spec, widgets: [table] };
  const step = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec: current }), applyMetricDrop(current, table.id, 'gross_margin', 'add-series', catalog, registry));
  assert.equal(step.execute, true);
  assert.ok(metricDropActions(table, 'mttr', catalog, registry, spec).includes('add-series'));
  assert.deepEqual(metricDropActions({ ...table, dimension: 'customer' }, 'mttr', catalog, registry, spec), []);
});
test('primary replacement removes only incompatible analysis and retains compatible operations', () => {
  const analyzed = { ...chart, series: [{ id: 'revenue', metric: 'revenue' as const, analysis: { comparison: 'year_over_year' as const, runningTotal: true as const, ranking: true as const } }] };
  const current = { ...spec, widgets: [analyzed] };
  const step = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec: current }), applyMetricDrop(current, analyzed.id, 'gross_margin', 'replace-primary', catalog, registry));
  if (step.history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
  assert.deepEqual(step.history.present.spec.widgets[0]!.series[0]!.analysis, { comparison: 'year_over_year', ranking: true });
  assert.deepEqual(step.history.present.spec.layout, current.layout);
});
test('crafted or invalid metric commands leave the original document unchanged', () => {
  const history = startBuilder({ kind: 'dashboard', spec: chartSpec }); const before = structuredClone(history);
  assert.throws(() => applyMetricDrop(chartSpec, chart.id, 'gross_margin', 'add-series', catalog, registry));
  assert.throws(() => applyMetricDrop(chartSpec, chart.id, 'revenue', 'replace-primary', catalog, []));
  assert.throws(() => createMetricCommand(empty, 'days_sales_outstanding' as MetricId, 'kpi', { x: 0, y: 0 }, catalog, registry));
  assert.deepEqual(history, before);
});
test('existing-widget drop consumes propagation once and never invokes canvas creation, even for rejected payloads', () => {
  for (const raw of ['{"kind":"metric","metricId":"revenue"}', '{"kind":"metric","metricId":"unknown"}']) {
    let prevented = false; let stopped = false; let widgets = 0; let canvas = 0;
    consumeMetricDrop({ preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; },
      dataTransfer: { getData: key => key === BUILDER_DRAG_MIME ? raw : '' } }, data => readBuilderDragItem(data, catalog, registry), () => { widgets++; });
    if (!stopped) canvas++;
    assert.equal(prevented, true); assert.equal(stopped, true); assert.equal(canvas, 0); assert.equal(widgets, raw.includes('unknown') ? 0 : 1);
  }
});
test('metric drop changes saved record to Modified without persistence until Save; manual to AI sees latest spec', async () => {
  const record: DashboardRecord = { id: 'record', tenantId: 'demo-iq', ownerUserId: 'alice', scope: 'private', spec, version: 1,
    createdBy: 'alice', updatedBy: 'alice', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' };
  const step = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec }), applyMetricDrop(spec, kpi.id, 'gross_profit', 'replace-primary', catalog, registry));
  if (step.history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
  const document = editDocument(savedDocument(record), step.history.present.spec); let writes = 0;
  assert.equal(documentIsDirty(document), true); assert.deepEqual(record.spec, spec); assert.equal(writes, 0);
  assert.equal(dashboardActions(document, true, true, true).editAi, true);
  switchDashboardEditor('ai', { enter: () => {}, exit: () => {} }, () => {});
  assert.equal(document.spec!.widgets[0]!.series[0]!.metric, 'gross_profit'); assert.equal(documentIsDirty(document), true);
  assert.equal(editDocument(newManualDocument(), document.spec).kind, 'draft');
  const saved = await persistDocument(document, false, { create: async () => { throw new Error('Must update'); }, update: async (id, value, version) => {
    writes++; assert.equal(id, record.id); assert.equal(version, 1); return { ...record, spec: value, version: 2 };
  } });
  assert.equal(writes, 1); assert.equal(documentIsDirty(saved), false);
});
test('Arabic chooser renders localized creation/actions with accessible keyboard buttons', () => {
  const html = renderToStaticMarkup(createElement(MetricChooser, { locale: 'ar', label: 'الإيرادات', options: [{ type: 'kpi' }, { type: 'line' }],
    actions: ['add-series', 'replace-primary'], kpi: false, busy: false, onCreate: () => {}, onAction: () => {}, onClose: () => {} }));
  for (const label of ['إنشاء عرض', 'إضافة سلسلة', 'استبدال المؤشر الأساسي', 'مؤشر', 'خطي', 'إلغاء']) assert.ok(html.includes(label));
  assert.ok(html.includes('dir="rtl"')); assert.ok(!html.includes('Create visualization')); assert.ok(html.includes('<button'));
});
