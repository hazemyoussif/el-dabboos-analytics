import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch, defaultDashboardLayout, resolveDashboardLayout, validateDashboardSpec } from '../src/index.ts';
import type { DashboardSpec, DashboardWidget } from '../src/index.ts';

const kpi = (id: string): DashboardWidget => ({ id, type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] });
const spec: DashboardSpec = { schemaVersion: 2, id: 'manual', title: { en: 'Manual', ar: 'يدوية' }, locale: 'en',
  filters: {}, layout: { columns: 3 }, widgets: [kpi('first'), kpi('second')] };

test('legacy v2 layout remains valid and default placement is deterministic', () => {
  assert.doesNotThrow(() => validateDashboardSpec(spec));
  const a = resolveDashboardLayout(spec);
  assert.deepEqual(a, defaultDashboardLayout(spec.widgets));
  assert.deepEqual(a.items?.map(item => [item.widgetId, item.x, item.y, item.w, item.h]), [
    ['first', 0, 0, 3, 2], ['second', 3, 0, 3, 2],
  ]);
  assert.equal(spec.layout.items, undefined);
});
test('explicit grid rejects unknown, duplicate, missing, overlapping and out-of-bounds items', () => {
  const layout = resolveDashboardLayout(spec);
  assert.doesNotThrow(() => validateDashboardSpec({ ...spec, layout }));
  const invalid = [
    [{ ...layout.items![0]!, widgetId: 'missing' }, layout.items![1]!],
    [layout.items![0]!, { ...layout.items![1]!, widgetId: 'first' }],
    [layout.items![0]!],
    [layout.items![0]!, { ...layout.items![1]!, x: 0 }],
    [layout.items![0]!, { ...layout.items![1]!, x: 11, w: 3 }],
    [layout.items![0]!, { ...layout.items![1]!, y: 201 }],
  ];
  for (const items of invalid) assert.throws(() => validateDashboardSpec({ ...spec, layout: { columns: 12, items } }));
});
test('patch add and remove maintain the portable layout, and set_layout is validated atomically', () => {
  const added = applyDashboardPatch(spec, { schemaVersion: 2, operations: [{ op: 'add', widget: kpi('third') }] });
  assert.equal(added.layout.columns, 12);
  assert.deepEqual(added.layout.items?.map(item => item.widgetId), ['first', 'second', 'third']);
  assert.deepEqual(added.layout.items?.[2], { widgetId: 'third', x: 6, y: 0, w: 3, h: 2 });
  const removed = applyDashboardPatch(added, { schemaVersion: 2, operations: [{ op: 'remove', widgetId: 'second' }] });
  assert.deepEqual(removed.layout.items?.map(item => item.widgetId), ['first', 'third']);
  const moved = applyDashboardPatch(removed, { schemaVersion: 2, operations: [{ op: 'set_layout', layout: {
    columns: 12, items: [{ ...removed.layout.items![0]!, x: 0, y: 2 }, removed.layout.items![1]!],
  } }] });
  assert.equal(moved.layout.items?.[0]?.y, 2);
  assert.throws(() => applyDashboardPatch(removed, { schemaVersion: 2, operations: [{ op: 'set_layout', layout: { columns: 12, items: [] } }] }));
  assert.equal(removed.layout.items?.[0]?.y, 0);
});
