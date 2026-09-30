import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch } from '../src/patch.ts';
import type { DashboardSpec } from '../src/contracts.ts';

const original: DashboardSpec = {
  schemaVersion: 1, id: 'demo', title: { en: 'Demo', ar: 'عرض' }, locale: 'en',
  filters: {}, layout: { columns: 2 }, widgets: [{ id: 'revenue', type: 'kpi', metric: 'revenue' }],
};
test('patch edits a dashboard without mutating the original', () => {
  const next = applyDashboardPatch(original, { schemaVersion: 1, operations: [
    { op: 'add', widget: { id: 'orders', type: 'bar', metric: 'order_count', dimension: 'branch' } },
    { op: 'set_title', title: { en: 'Sales', ar: 'المبيعات' } },
  ] });
  assert.equal(next.widgets.length, 2);
  assert.equal(next.title.ar, 'المبيعات');
  assert.equal(original.widgets.length, 1);
});
test('patch rejects duplicate IDs, unsupported dimensions and empty dashboards', () => {
  assert.throws(() => applyDashboardPatch(original, { schemaVersion: 1, operations: [{ op: 'add', widget: original.widgets[0]! }] }));
  assert.throws(() => applyDashboardPatch(original, { schemaVersion: 1, operations: [{ op: 'add', widget: { id: 'bad', type: 'line', metric: 'revenue', dimension: 'equipment' } }] }));
  assert.throws(() => applyDashboardPatch(original, { schemaVersion: 1, operations: [{ op: 'remove', widgetId: 'revenue' }] }));
});
test('patch schema rejects unknown fields and validates the completed dashboard atomically', () => {
  assert.throws(() => applyDashboardPatch(original, { schemaVersion: 1, operations: [
    { op: 'add', widget: { id: 'extra', type: 'kpi', metric: 'revenue', sql: 'SELECT 1' } },
  ] } as unknown as Parameters<typeof applyDashboardPatch>[1]));
  const next = applyDashboardPatch(original, { schemaVersion: 1, operations: [
    { op: 'add', widget: { id: 'growth', type: 'line', metric: 'sales_growth', dimension: 'month', analysis: { comparison: 'year_over_year' } } },
    { op: 'set_filters', filters: { dateRange: { from: '2026-01-01', to: '2026-06-30' } } },
  ] });
  assert.equal(next.widgets[1]?.metric, 'sales_growth');
  assert.equal(original.filters.dateRange, undefined);
});
