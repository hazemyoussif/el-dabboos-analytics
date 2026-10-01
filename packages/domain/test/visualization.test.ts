import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch, dashboardPatchSchema, dashboardSpecSchema, semanticCatalog, validateDashboardPatch, validateDashboardSpec, visualizationIssues, widgetTypes } from '../src/index.ts';
import type { DashboardSpec, DashboardWidget, WidgetType } from '../src/index.ts';
const widget = (type: WidgetType): DashboardWidget => ({ id: 'chart', type, series: [{ id: 'revenue', metric: 'revenue' }], ...(type === 'kpi' ? {} : { dimension: ['line', 'area', 'combo'].includes(type) ? 'month' : 'branch' }), ...(type === 'combo' ? { series: [{ id: 'revenue', metric: 'revenue', presentation: { mark: 'bar' } }, { id: 'profit', metric: 'gross_profit', presentation: { mark: 'line' } }] } : {}) });
const spec = (w: DashboardWidget): DashboardSpec => ({ schemaVersion: 2, id: 'charts', title: { en: 'Charts', ar: 'رسوم' }, locale: 'en', filters: { dateRange: { from: '2026-01-01', to: '2026-12-31' } }, layout: { columns: 12, items: [{ widgetId: w.id, x: 0, y: 0, w: 6, h: 4 }] }, widgets: [w] });
test('all governed widget types round-trip v2, old documents remain valid and both schemas match contracts', () => {
  assert.deepEqual(dashboardSpecSchema.$defs.widget.properties.type.enum, [...widgetTypes]);
  assert.deepEqual(dashboardPatchSchema.$defs.widget.properties.type.enum, [...widgetTypes]);
  assert.deepEqual(dashboardSpecSchema.$defs.presentation, dashboardPatchSchema.$defs.presentation);
  assert.deepEqual(dashboardSpecSchema.$defs.series, dashboardPatchSchema.$defs.series);
  for (const type of widgetTypes) {
    const current = spec(widget(type)); validateDashboardSpec(JSON.parse(JSON.stringify(current)));
    const patch = { schemaVersion: 2, operations: [{ op: 'replace', widgetId: 'chart', widget: widget(type) }] };
    validateDashboardPatch(patch); assert.deepEqual(applyDashboardPatch(current, patch), current);
  }
});
test('bounded presentation properties and per-series marks are schema- and visualization-specific', () => {
  for (const [type, presentation] of [['bar', { orientation: 'horizontal', legend: 'hide' }], ['pie', { pieVariant: 'donut', dataLabels: 'show' }], ['area', { curve: 'smooth', legend: 'auto' }]] as const) {
    const current = spec({ ...widget(type), presentation }); validateDashboardSpec(current);
    const patch = { schemaVersion: 2, operations: [{ op: 'replace', widgetId: 'chart', widget: current.widgets[0] }] }; validateDashboardPatch(patch);
  }
  for (const presentation of [{ colors: '#fff' }, { strokeWidth: 3 }, { orientation: 'diagonal' }, { formatter: 'function(){}' }]) {
    assert.throws(() => validateDashboardSpec(spec({ ...widget('bar'), presentation } as DashboardWidget)));
    assert.throws(() => validateDashboardPatch({ schemaVersion: 2, operations: [{ op: 'add', widget: { ...widget('bar'), presentation } }] }));
  }
  assert.throws(() => validateDashboardSpec(spec({ ...widget('line'), presentation: { pieVariant: 'donut' } })));
  assert.throws(() => validateDashboardSpec(spec({ ...widget('line'), series: [{ id: 'revenue', metric: 'revenue', presentation: { mark: 'bar' } }] })));
});
test('Area requires time; KPI requires no grouping; composition requires additive/snapshot categorical values', () => {
  assert.throws(() => validateDashboardSpec(spec({ ...widget('area'), dimension: 'branch' })));
  assert.throws(() => validateDashboardSpec(spec({ ...widget('kpi'), dimension: 'month' })));
  for (const type of ['pie', 'treemap'] as const) {
    validateDashboardSpec(spec(widget(type)));
    validateDashboardSpec(spec({ ...widget(type), dimension: 'warehouse', series: [{ id: 'stock', metric: 'stock_on_hand' }] }));
    assert.throws(() => validateDashboardSpec(spec({ ...widget(type), dimension: 'month' })));
    for (const metric of ['gross_margin', 'mttr', 'sales_growth'] as const) assert.throws(() => validateDashboardSpec(spec({ ...widget(type), series: [{ id: 'metric', metric }] })));
    for (const analysis of [{ comparison: 'year_over_year' as const }, { runningTotal: true as const }, { movingAverage: { window: 3 } }, { percentageContribution: true as const }]) assert.throws(() => validateDashboardSpec(spec({ ...widget(type), series: [{ id: 'revenue', metric: 'revenue', analysis }] })));
    validateDashboardSpec(spec({ ...widget(type), series: [{ id: 'revenue', metric: 'revenue', analysis: { topN: { direction: 'top', limit: 10 } } }] }));
  }
});
test('Combo requires two to four matching series; all axis charts retain unit compatibility', () => {
  validateDashboardSpec(spec(widget('combo')));
  assert.throws(() => validateDashboardSpec(spec({ ...widget('combo'), series: [widget('combo').series[0]!] })));
  assert.throws(() => validateDashboardSpec(spec({ ...widget('combo'), series: Array.from({ length: 5 }, (_, index) => ({ id: `s-${index}`, metric: 'revenue' })) })));
  for (const type of ['line', 'area', 'bar', 'combo'] as const) assert.throws(() => validateDashboardSpec(spec({ ...widget(type), series: [{ id: 'revenue', metric: 'revenue' }, { id: 'orders', metric: 'order_count' }] })));
  assert.equal(visualizationIssues(widget('combo'), semanticCatalog).length, 0);
});
