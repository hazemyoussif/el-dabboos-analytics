import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { semanticCatalog, productMetricCatalog, tenantProfiles, validateDashboardSpec } from '@el-dabboos/domain';
import type { AnalyticsQuery, DashboardSpec, DashboardWidget } from '@el-dabboos/domain';
import { DashboardExecutor } from '@el-dabboos/application';
import { visualizationCandidate, visualizationChoices, visualizationOptions, recommendedVisualization } from '../src/builder/visualizations.ts';
import { metricVisualizationOptions, createMetricCommand, metricDropActions } from '../src/builder/metric-drop.ts';
import { blankDashboardDraft, commitBuilderCommand, startBuilder, undoBuilder, redoBuilder } from '../src/builder/model.ts';
import { compositionData } from '../src/rendering/composition.ts';
import { MetricChooser } from '../src/builder/MetricChooser.ts';
import { documentIsDirty, editDocument, savedDocument, persistDocument } from '../src/dashboard-lifecycle.ts';
const base = blankDashboardDraft(tenantProfiles['demo-iq'], 'en', new Date('2026-01-01')).base;
const w: DashboardWidget = { id: 'chart', type: 'bar', dimension: 'branch', series: [{ id: 'revenue', metric: 'revenue' }] };
const spec: DashboardSpec = { ...base, widgets: [w], layout: { columns: 12, items: [{ widgetId: w.id, x: 2, y: 3, w: 6, h: 4 }] } };
const option = (id: string) => visualizationChoices.find(option => option.id === id)!;
test('dimension-aware options and deterministic recommendations govern all builder paths', () => {
  assert.equal(recommendedVisualization({ ...w, type: 'kpi', dimension: undefined }, base, semanticCatalog)?.id, 'kpi');
  assert.equal(recommendedVisualization({ ...w, dimension: 'month' }, base, semanticCatalog)?.id, 'line');
  assert.equal(recommendedVisualization({ ...w, series: [{ ...w.series[0]!, analysis: { topN: { direction: 'top', limit: 10 } } }] }, base, semanticCatalog)?.id, 'horizontal');
  assert.equal(recommendedVisualization(w, base, semanticCatalog, 4)?.id, 'donut');
  assert.equal(recommendedVisualization({ ...w, dimension: 'customer' }, base, semanticCatalog)?.id, 'treemap');
  assert.equal(recommendedVisualization(w, base, semanticCatalog, 25)?.id, 'horizontal');
  assert.ok(!visualizationOptions({ ...w, series: [{ id: 'margin', metric: 'gross_margin' }] }, base).some(option => ['pie', 'donut', 'treemap'].includes(option.id)));
  assert.deepEqual(metricVisualizationOptions('revenue', semanticCatalog, base, 'month').map(option => option.id), ['kpi', 'line', 'area', 'bar', 'horizontal', 'table']);
  assert.deepEqual(metricVisualizationOptions('revenue', semanticCatalog, base, 'branch').map(option => option.id), ['kpi', 'bar', 'horizontal', 'pie', 'donut', 'treemap', 'table']);
  // Existing Line permits categorical dimensions; recommendation remains temporal.
  assert.ok(!metricVisualizationOptions('gross_margin', semanticCatalog, base, 'branch').some(option => ['pie', 'donut', 'treemap'].includes(option.id)));
  const multi = { ...w, dimension: 'month' as const, series: [...w.series, { id: 'profit', metric: 'gross_profit' as const }] };
  assert.ok(visualizationOptions(multi, base).some(option => option.id === 'combo'));
});
test('new metric creation has canonical sizes, unique IDs and compatible drop actions', () => {
  for (const [id, width, height] of [['area', 8, 4], ['donut', 5, 4], ['treemap', 6, 5], ['horizontal', 6, 4]] as const) {
    const next = createMetricCommand({ kind: 'empty', base }, 'revenue', id, { x: 8, y: 2 }, semanticCatalog, productMetricCatalog);
    const step = commitBuilderCommand(startBuilder({ kind: 'empty', base }), next.command);
    assert.equal(step.execute, true);
    if (step.history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
    validateDashboardSpec(step.history.present.spec);
    const item = step.history.present.spec.layout.items![0]!;
    assert.equal(item.w, width); assert.equal(item.h, height); assert.equal(item.x, 12 - width);
  }
  assert.ok(!metricDropActions({ ...w, type: 'pie' }, 'gross_profit', semanticCatalog, productMetricCatalog, base).includes('add-series'));
  assert.ok(metricDropActions({ ...w, type: 'area', dimension: 'month' }, 'gross_profit', semanticCatalog, productMetricCatalog, base).includes('add-series'));
});
test('presentation and visualization changes preserve queries, layout, filters; Undo/Redo does not requery', async () => {
  const queries: AnalyticsQuery[] = [];
  const executor = new DashboardExecutor({ async execute(query) { queries.push(query); return { metric: query.metric, groupBy: query.groupBy ?? null, rows: [], metadata: { sourceId: 'test', executedAt: '2026-01-01', metricType: 'currency', semantics: 'additive' } }; } });
  await executor.execute(spec, { tenantId: 'demo-iq', locale: 'en' });
  for (const id of ['horizontal', 'donut', 'treemap', 'table']) {
    const changed = visualizationCandidate(w, option(id));
    const step = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec }), { type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'replace', widgetId: w.id, widget: changed }] } });
    assert.equal(step.execute, false); assert.equal(undoBuilder(step.history).execute, false); assert.equal(redoBuilder(undoBuilder(step.history).history).execute, false);
    if (step.history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
    assert.deepEqual(step.history.present.spec.layout, spec.layout); assert.deepEqual(step.history.present.spec.filters, spec.filters);
    await executor.execute(step.history.present.spec, { tenantId: 'demo-iq', locale: 'en' });
    assert.deepEqual(queries.at(-1), queries[0]);
  }
});
test('presentation remains dirty until explicit Save and round-trips a versioned record', async () => {
  const record = { id: 'saved', tenantId: 'demo-iq', ownerUserId: 'user', scope: 'private' as const, createdBy: 'user', updatedBy: 'user', version: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01', spec };
  const changed = { ...spec, widgets: [visualizationCandidate(w, option('donut'))] };
  const document = editDocument(savedDocument(record), changed); assert.equal(documentIsDirty(document), true);
  let writes = 0;
  const next = await persistDocument(document, false, { async create() { throw new Error('Unexpected create'); }, async update(_id, value, version) { writes++; assert.equal(version, 1); return { ...record, spec: JSON.parse(JSON.stringify(value)), version: 2 }; } });
  assert.equal(writes, 1); assert.equal(documentIsDirty(next), false);
  if (next.kind === 'saved') assert.equal(next.record.spec.widgets[0]!.presentation?.pieVariant, 'donut');
});
test('composition handles negative/null/zero data without fabrication or truncation', () => {
  assert.equal(compositionData([{ label: 'A', v: -10 }, { label: 'B', v: 20 }], 'v').status, 'negative');
  assert.equal(compositionData([{ label: 'A', v: null }, { label: 'B', v: 0 }], 'v').status, 'empty');
  const rows = Array.from({ length: 40 }, (_, i) => ({ label: `C${i}`, v: i + 1 })); const original = structuredClone(rows);
  const result = compositionData(rows, 'v'); assert.equal(result.rows.length, 40); assert.equal(result.total, 820); assert.deepEqual(rows, original);
});
test('EN/AR chooser smoke renders the expanded labels and accessible native controls', () => {
  for (const locale of ['en', 'ar'] as const) {
    const html = renderToStaticMarkup(createElement(MetricChooser, { locale, label: 'Revenue', options: metricVisualizationOptions('revenue', semanticCatalog, base), actions: [], kpi: false, busy: false, dimensions: ['month', 'branch'], onDimension() {}, onCreate() {}, onAction() {}, onClose() {} }));
    assert.ok(html.includes(locale === 'ar' ? 'حلقي' : 'Donut')); assert.ok(html.includes(locale === 'ar' ? 'خريطة شجرية' : 'Treemap')); assert.ok(html.includes('<select')); assert.ok(html.includes('<button'));
  }
});

test('AI palette intent survives compatible manual visualization conversion and Undo/Redo without analytics', () => {
  const blue: DashboardWidget = { ...w, presentation: { palette: 'blue' } };
  const current: DashboardSpec = { ...spec, widgets: [blue] };
  for (const id of ['line', 'horizontal', 'donut', 'treemap', 'table']) {
    const candidate = visualizationCandidate(blue, option(id)); assert.equal(candidate.presentation?.palette, 'blue');
    const step = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec: current }), { type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'replace', widgetId: blue.id, widget: candidate }] } });
    assert.equal(step.execute, false);
    if (step.history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
    validateDashboardSpec(step.history.present.spec); assert.deepEqual(step.history.present.spec.layout, current.layout);
    assert.deepEqual(step.history.present.spec.filters, current.filters); assert.deepEqual(step.history.present.spec.widgets[0]!.series, blue.series);
    const undone = undoBuilder(step.history); const redone = redoBuilder(undone.history);
    assert.equal(undone.execute, false); assert.equal(redone.execute, false);
    for (const state of [undone.history.present, redone.history.present]) {
      if (state.kind !== 'dashboard') throw new Error('Expected dashboard');
      assert.equal(state.spec.widgets[0]!.presentation?.palette, 'blue');
    }
  }
});
