import assert from 'node:assert/strict';
import test from 'node:test';
import { getTenantProfile, productMetricCatalog, semanticCatalog, validateDashboardSpec, validateQuery } from '../src/index.ts';

const spec = {
  schemaVersion: 2, id: 'sales', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: { dateRange: { from: '2026-01-01', to: '2026-09-30' } }, layout: { columns: 2 },
  widgets: [{ id: 'revenue-profit', type: 'line', dimension: 'month', series: [
    { id: 'revenue', metric: 'revenue' }, { id: 'profit', metric: 'gross_profit' },
  ] }],
};
test('DashboardSpec v2 accepts compatible series and rejects v1, unknown fields, and duplicates', () => {
  assert.doesNotThrow(() => validateDashboardSpec(spec));
  assert.throws(() => validateDashboardSpec({ ...spec, schemaVersion: 1 }));
  assert.throws(() => validateDashboardSpec({ ...spec, sql: 'SELECT *' }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], series: [{ id: 'x', metric: 'sale_order.amount_total' }] }] }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], dimension: 'warehouse' }] }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [spec.widgets[0], spec.widgets[0]] }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], series: [{ id: 'same', metric: 'revenue' }, { id: 'same', metric: 'gross_profit' }] }] }));
});
test('multi-series top N selection belongs only to the first series', () => {
  const first = { id: 'revenue', metric: 'revenue', analysis: { topN: { direction: 'top', limit: 3 } } };
  const second = { id: 'profit', metric: 'gross_profit' };
  assert.doesNotThrow(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], dimension: 'branch', series: [first, second] }] }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], dimension: 'branch', series: [second, first] }] }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], dimension: 'branch', series: [{ ...first, id: 'first' }, first] }] }));
});
test('single-axis charts reject mixed units, while tables allow independently formatted metrics', () => {
  const mixed = { ...spec.widgets[0], series: [{ id: 'revenue', metric: 'revenue' }, { id: 'margin', metric: 'gross_margin' }] };
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [mixed] }));
  assert.doesNotThrow(() => validateDashboardSpec({ ...spec, widgets: [{ ...mixed, type: 'table', dimension: 'customer' }] }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ id: 'kpi', type: 'kpi', series: mixed.series }] }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], dimension: 'branch', series: [
    { id: 'contribution', metric: 'revenue', analysis: { percentageContribution: true } }, { id: 'profit', metric: 'gross_profit' },
  ] }] }));
  assert.doesNotThrow(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], series: [
    { id: 'revenue', metric: 'revenue' }, { id: 'smoothed-revenue', metric: 'revenue', analysis: { movingAverage: { window: 3 } } },
  ] }] }));
});
test('product catalog marks planned concepts without making them executable', () => {
  assert.equal(Object.keys(semanticCatalog).length, 124);
  assert.equal(productMetricCatalog.filter(metric => metric.availability === 'available').length, 124);
  assert.ok(productMetricCatalog.some(metric => metric.id === 'days_sales_outstanding' && metric.availability === 'planned'));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ id: 'dso', type: 'kpi', series: [{ id: 'dso', metric: 'days_sales_outstanding' }] }] }));
  assert.ok(semanticCatalog.outstanding_amount.dialectSynonyms?.iq?.includes('الديون'));
});
test('controlled market profiles carry presentation preferences, not metric changes', () => {
  assert.equal(getTenantProfile('demo-iq')?.reportingCurrency, 'IQD');
  assert.equal(getTenantProfile('demo-eg')?.reportingCurrency, 'EGP');
  assert.equal(getTenantProfile('demo-iq')?.timeZone, 'Asia/Baghdad');
  assert.equal(getTenantProfile('demo-eg')?.timeZone, 'Africa/Cairo');
  assert.equal(getTenantProfile('arbitrary'), undefined);
});
test('analytics queries require tenant context and supported dimensions', () => {
  assert.throws(() => validateQuery({ metric: 'revenue' }, { tenantId: '', locale: 'en' }));
  assert.throws(() => validateQuery({ metric: 'revenue', groupBy: 'equipment' }, { tenantId: 'demo-iq', locale: 'en' }));
  assert.doesNotThrow(() => validateQuery({ metric: 'revenue', groupBy: 'branch' }, { tenantId: 'demo-iq', locale: 'ar' }));
});

test('optional dashboard appearance is strict governed V2 presentation and legacy omission remains valid', () => {
  for (const presentation of [{}, ...['default','blue','green','orange','purple','red','neutral'].map(palette => ({ palette }))]) {
    assert.doesNotThrow(() => validateDashboardSpec({ ...spec, presentation }));
  }
  assert.doesNotThrow(() => validateDashboardSpec(spec));
  for (const presentation of [null, { palette: '#355fa8' }, { palette: 'custom' }, { palette: 'inherit' }, { font: 'Comic Sans' }, { palette: 'blue', theme: 'dark' }, { orientation: 'horizontal' }]) {
    assert.throws(() => validateDashboardSpec({ ...spec, presentation }), /Invalid DashboardSpec/);
  }
});

test('relative, fixed and all-time V2 filters are exclusive and comparison validation stays bounded', () => {
  for (const filters of [{}, { datePreset: 'previous_month' }, { dateRange: { from: '2026-09-01', to: '2026-09-30' } }]) assert.doesNotThrow(() => validateDashboardSpec({ ...spec, filters }));
  for (const filters of [{ datePreset: 'last_month' }, { datePreset: 'previous_month', dateRange: { from: '2026-09-01', to: '2026-09-30' } }, { dateRange: { from: '2026-02-30', to: '2026-03-01' } }]) assert.throws(() => validateDashboardSpec({ ...spec, filters }));
  const widgets = [{ id: 'growth', type: 'kpi', series: [{ id: 'growth', metric: 'sales_growth' }] }];
  assert.doesNotThrow(() => validateDashboardSpec({ ...spec, filters: { datePreset: 'previous_month' }, widgets }));
  assert.throws(() => validateDashboardSpec({ ...spec, filters: {}, widgets }));
});
