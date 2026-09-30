import assert from 'node:assert/strict';
import test from 'node:test';
import { semanticCatalog, validateDashboardSpec, validateQuery } from '../src/index.ts';

const context = { tenantId: 'tenant-a', locale: 'en' } as const;
const dateRange = { from: '2026-01-01', to: '2026-06-30' };
const query = (analysis: object, groupBy: 'month' | 'quarter' | 'branch' | undefined = 'month', metric = 'revenue') =>
  ({ metric, groupBy, dateRange, analysis }) as Parameters<typeof validateQuery>[0];
test('catalog declares each metric calculation class explicitly', () => {
  assert.equal(semanticCatalog.average_order_value.semantics.kind, 'ratio');
  assert.equal(semanticCatalog.gross_margin.semantics.kind, 'ratio');
  assert.equal(semanticCatalog.sales_growth.semantics.kind, 'comparison_derived');
  assert.equal(semanticCatalog.win_rate.semantics.kind, 'ratio');
  assert.equal(semanticCatalog.stock_on_hand.semantics.kind, 'snapshot');
  assert.equal(semanticCatalog.mtbf.semantics.kind, 'duration_derived');
  assert.equal(semanticCatalog.mttr.semantics.kind, 'duration_derived');
});
test('compatible bounded analyses include YoY plus moving average and ranking plus top N', () => {
  assert.doesNotThrow(() => validateQuery(query({ comparison: 'year_over_year', movingAverage: { window: 3 } }), context));
  assert.doesNotThrow(() => validateQuery(query({ ranking: true, topN: { direction: 'top', limit: 10 } }, 'branch'), context));
  assert.doesNotThrow(() => validateQuery(query({ runningTotal: true }), context));
});
test('analysis rejects incompatible dimensions, missing date context, and unknown fields', () => {
  assert.throws(() => validateQuery(query({ movingAverage: { window: 3 } }, 'branch'), context));
  assert.throws(() => validateQuery(query({ runningTotal: true }, 'branch'), context));
  assert.throws(() => validateQuery(query({ runningTotal: true }, 'month', 'stock_on_hand'), context));
  assert.throws(() => validateQuery({ metric: 'revenue', dateRange, analysis: { topN: { direction: 'top', limit: 3 } } }, context));
  assert.throws(() => validateQuery(query({ comparison: 'month_over_month' }, 'quarter'), context));
  assert.throws(() => validateQuery({ metric: 'revenue', analysis: { comparison: 'year_over_year' } }, context));
  assert.throws(() => validateQuery({ metric: 'sales_growth' }, context));
  assert.throws(() => validateQuery(query({ comparison: 'year_over_year', extra: 'sql' }), context));
  assert.throws(() => validateQuery(query({ movingAverage: { window: 1 } }), context));
  assert.throws(() => validateQuery(query({ movingAverage: { window: 3 }, runningTotal: true }), context));
  assert.throws(() => validateQuery({ metric: 'gross_margin', aggregation: 'sum' }, context));
  assert.throws(() => validateQuery({ metric: 'stock_on_hand', dateRange, filters: [{ dimension: 'month', values: ['2026-01'] }] }, context));
  assert.throws(() => validateQuery({ metric: 'revenue', operation: { kind: 'top_n' } } as unknown as Parameters<typeof validateQuery>[0], context));
});
test('DashboardSpec schema and semantic rules reject invalid analysis', () => {
  const spec = { schemaVersion: 2, id: 'sales', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
    filters: { dateRange }, layout: { columns: 2 }, widgets: [{ id: 'trend', type: 'line', dimension: 'month', series: [{ id: 'revenue', metric: 'revenue',
      analysis: { comparison: 'year_over_year', movingAverage: { window: 3 } } }] }] };
  assert.doesNotThrow(() => validateDashboardSpec(spec));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], operation: { kind: 'ranking' } }] }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], dimension: 'branch' }] }));
  assert.throws(() => validateDashboardSpec({ ...spec, filters: {} }));
});
test('snapshot time scope uses dateRange instead of event-month filters', () => {
  assert.throws(() => validateQuery({ metric: 'stock_on_hand', dateRange,
    filters: [{ dimension: 'month', values: ['2026-01'] }] }, context));
});
