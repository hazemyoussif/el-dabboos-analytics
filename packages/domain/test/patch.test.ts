import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch } from '../src/patch.ts';
import type { DashboardSpec } from '../src/contracts.ts';

const original: DashboardSpec = {
  schemaVersion: 2, id: 'demo', title: { en: 'Demo', ar: 'عرض' }, locale: 'en',
  filters: {}, layout: { columns: 2 }, widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }],
};
test('v2 patch edits a dashboard without mutating the original', () => {
  const next = applyDashboardPatch(original, { schemaVersion: 2, operations: [
    { op: 'add', widget: { id: 'orders', type: 'bar', series: [{ id: 'orders', metric: 'order_count' }], dimension: 'branch' } },
    { op: 'set_title', title: { en: 'Sales', ar: 'المبيعات' } },
  ] });
  assert.equal(next.widgets.length, 2);
  assert.equal(next.title.ar, 'المبيعات');
  assert.equal(original.widgets.length, 1);
});
test('patch rejects duplicate IDs, unsupported dimensions and empty dashboards', () => {
  assert.throws(() => applyDashboardPatch(original, { schemaVersion: 2, operations: [{ op: 'add', widget: original.widgets[0]! }] }));
  assert.throws(() => applyDashboardPatch(original, { schemaVersion: 2, operations: [{ op: 'add', widget: { id: 'bad', type: 'line', series: [{ id: 'revenue', metric: 'revenue' }], dimension: 'equipment' } }] }));
  assert.throws(() => applyDashboardPatch(original, { schemaVersion: 2, operations: [{ op: 'remove', widgetId: 'revenue' }] }));
});
test('patch schema rejects unknown fields and validates completed dashboard atomically', () => {
  assert.throws(() => applyDashboardPatch(original, { schemaVersion: 2, operations: [
    { op: 'add', widget: { id: 'extra', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }], sql: 'SELECT 1' } },
  ] } as unknown as Parameters<typeof applyDashboardPatch>[1]));
  const next = applyDashboardPatch(original, { schemaVersion: 2, operations: [
    { op: 'add', widget: { id: 'growth', type: 'line', series: [{ id: 'growth', metric: 'sales_growth', analysis: { comparison: 'year_over_year' } }], dimension: 'month' } },
    { op: 'set_filters', filters: { dateRange: { from: '2026-01-01', to: '2026-06-30' } } },
  ] });
  assert.equal(next.widgets[1]?.series[0]?.metric, 'sales_growth');
  assert.equal(original.filters.dateRange, undefined);
});

test('dashboard presentation patches replace, explicitly default, and clear atomically', () => {
  const blue = applyDashboardPatch(original, { schemaVersion: 2, operations: [{ op: 'set_presentation', presentation: { palette: 'blue' } }] });
  assert.deepEqual(blue.presentation, { palette: 'blue' }); assert.equal(original.presentation, undefined);
  const enterprise = applyDashboardPatch(blue, { schemaVersion: 2, operations: [{ op: 'set_presentation', presentation: { palette: 'default' } }] });
  assert.deepEqual(enterprise.presentation, { palette: 'default' });
  const empty = applyDashboardPatch(blue, { schemaVersion: 2, operations: [{ op: 'set_presentation', presentation: {} }] });
  assert.deepEqual(empty.presentation, {});
  const cleared = applyDashboardPatch(blue, { schemaVersion: 2, operations: [{ op: 'set_presentation', presentation: null }] });
  assert.equal(Object.hasOwn(cleared, 'presentation'), false);
  for (const presentation of [{ palette: '#355fa8' }, { palette: 'custom' }, { palette: 'inherit' }, { font: 'Comic Sans' }]) {
    assert.throws(() => applyDashboardPatch(blue, { schemaVersion: 2, operations: [{ op: 'set_presentation', presentation }] } as Parameters<typeof applyDashboardPatch>[1]), /Invalid DashboardPatch/);
  }
  assert.throws(() => applyDashboardPatch(blue, { schemaVersion: 2, operations: [{ op: 'set_presentation', presentation: null }, { op: 'remove', widgetId: 'revenue' }] }));
  assert.deepEqual(blue.presentation, { palette: 'blue' });
});
