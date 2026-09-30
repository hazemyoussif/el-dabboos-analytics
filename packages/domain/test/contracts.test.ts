import assert from 'node:assert/strict';
import test from 'node:test';
import { semanticCatalog, validateDashboardSpec, validateQuery } from '../src/index.ts';

const spec = {
  schemaVersion: 1, id: 'sales', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: { dateRange: { from: '2026-01-01', to: '2026-09-30' } }, layout: { columns: 2 },
  widgets: [{ id: 'revenue', type: 'line', metric: 'revenue', dimension: 'month' }],
};
test('DashboardSpec accepts a governed bilingual dashboard and rejects unknown fields', () => {
  assert.doesNotThrow(() => validateDashboardSpec(spec));
  assert.throws(() => validateDashboardSpec({ ...spec, sql: 'SELECT *' }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], metric: 'sale_order.amount_total' }] }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [{ ...spec.widgets[0], dimension: 'warehouse' }] }));
  assert.throws(() => validateDashboardSpec({ ...spec, widgets: [spec.widgets[0], spec.widgets[0]] }));
});
test('24 canonical metrics carry both languages and governed dimensions', () => {
  assert.equal(Object.keys(semanticCatalog).length, 24);
  for (const [id, metric] of Object.entries(semanticCatalog)) {
    assert.equal(id, metric.id);
    assert.ok(metric.labels.en && metric.labels.ar && metric.descriptions.en && metric.descriptions.ar);
    assert.ok(metric.dimensions.length > 0);
  }
});
test('analytics queries require tenant context and supported dimensions', () => {
  assert.throws(() => validateQuery({ metric: 'revenue' }, { tenantId: '', locale: 'en' }));
  assert.throws(() => validateQuery({ metric: 'revenue', groupBy: 'equipment' }, { tenantId: 'demo', locale: 'en' }));
  assert.doesNotThrow(() => validateQuery({ metric: 'revenue', groupBy: 'branch' }, { tenantId: 'demo', locale: 'ar' }));
});
