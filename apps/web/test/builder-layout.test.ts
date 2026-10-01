import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDashboardLayout, validateDashboardLayout } from '@el-dabbous/domain';
import type { DashboardRecord, DashboardSpec } from '@el-dabbous/domain';
import { arrangeLayout, duplicateWidget, editorMinimums, insertWidget, keyboardLayout, resetLayout, sizePresets, updateWidgetLayout } from '../src/builder/layout-tools.ts';
import { dropGridPosition } from '../src/builder/grid-map.ts';
import { commitBuilderCommand, redoBuilder, startBuilder, undoBuilder } from '../src/builder/model.ts';
import { documentIsDirty, editDocument, persistDocument, savedDocument } from '../src/dashboard-lifecycle.ts';
const spec: DashboardSpec = { schemaVersion: 2, id: 'layout-test', title: { en: 'Layout', ar: 'التخطيط' }, locale: 'en', filters: {}, layout: { columns: 12, items: [
  { widgetId: 'a', x: 0, y: 0, w: 4, h: 2 }, { widgetId: 'b', x: 6, y: 4, w: 6, h: 4 },
] }, widgets: [ { id: 'a', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] },
  { id: 'b', type: 'line', dimension: 'month', series: [{ id: 'profit', metric: 'gross_profit' }] } ] };

test('moving and resizing preserve widget/filter semantics and never execute analytics, including history', () => {
  for (const change of [{ x: 2, y: 1 }, { w: 5, h: 3 }]) {
    const result = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec }), { type: 'layout', layout: updateWidgetLayout(spec, 'a', change) });
    assert.equal(result.execute, false);
    assert.equal(result.history.present.kind, 'dashboard');
    if (result.history.present.kind === 'dashboard') {
      assert.deepEqual(result.history.present.spec.widgets, spec.widgets);
      assert.deepEqual(result.history.present.spec.filters, spec.filters);
    }
    assert.equal(undoBuilder(result.history).execute, false);
    assert.equal(redoBuilder(undoBuilder(result.history).history).execute, false);
  }
});
test('inspector rejects nonintegers, overlap, out-of-bounds and editor minima', () => {
  for (const change of [{ x: -1 }, { x: 9 }, { y: 201 }, { h: 21 }, { w: 1 }, { h: 1 }, { x: 6, y: 4 }, { w: 3.5 }])
    assert.throws(() => updateWidgetLayout(spec, 'a', change));
  const persisted = structuredClone(spec); persisted.layout.items![0]!.minW = 4;
  assert.throws(() => updateWidgetLayout(persisted, 'a', { w: 3 }));
  assert.deepEqual(editorMinimums(spec.widgets[0]!, spec.layout.items![0]!), { minW: 2, minH: 2 });
});
test('presets fit the 12-column grid and reflow without overlap, retaining other sizes', () => {
  for (const widget of spec.widgets) for (const preset of sizePresets[widget.type]) {
    const layout = updateWidgetLayout(spec, widget.id, { w: preset.w, h: preset.h }, true);
    validateDashboardLayout(layout, spec.widgets);
    assert.equal(layout.items!.find(item => item.widgetId === widget.id)!.w, preset.w);
    const other = layout.items!.find(item => item.widgetId !== widget.id)!;
    assert.equal(other.w, spec.layout.items!.find(item => item.widgetId === other.widgetId)!.w);
  }
  assert.equal(sizePresets.table.length, 2);
});
test('duplicate gives deterministic unique IDs and a valid free position with semantics intact', () => {
  const first = duplicateWidget(spec, 'b'); const again = duplicateWidget(spec, 'b');
  assert.deepEqual(first, again);
  assert.notEqual(first.widget.id, 'b'); assert.notEqual(first.widget.series[0]!.id, 'profit');
  assert.equal(first.widget.series[0]!.metric, 'gross_profit'); assert.equal(first.widget.dimension, 'month');
  const result = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec }), first.command);
  assert.equal(result.execute, true);
  if (result.history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
  const nextSpec = result.history.present.spec;
  validateDashboardLayout(nextSpec.layout, nextSpec.widgets);
  assert.equal(new Set(nextSpec.widgets.map(widget => widget.id)).size, 3);
  const second = duplicateWidget(nextSpec, 'b'); assert.notEqual(second.widget.id, first.widget.id);
  assert.equal(undoBuilder(result.history).history.present.kind, 'dashboard');
  assert.deepEqual(redoBuilder(undoBuilder(result.history).history).history.present, result.history.present);
  const removed = commitBuilderCommand(result.history, { type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'remove', widgetId: first.widget.id }] } });
  assert.deepEqual(undoBuilder(removed.history).history.present, result.history.present);
  assert.deepEqual(redoBuilder(undoBuilder(removed.history).history).history.present, removed.history.present);
});
test('auto arrange preserves sizes; reset defaults and both tools participate in layout-only history', () => {
  for (const layout of [arrangeLayout(spec), resetLayout(spec)]) {
    validateDashboardLayout(layout, spec.widgets);
    assert.ok(layout.items!.every(item => item.y < 4));
    const step = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec }), { type: 'layout', layout });
    assert.equal(step.execute, false); assert.equal(undoBuilder(step.history).execute, false);
    assert.deepEqual(redoBuilder(undoBuilder(step.history).history).history.present, step.history.present);
  }
  assert.deepEqual(arrangeLayout(spec).items!.map(item => [item.w, item.h]), [[4, 2], [6, 4]]);
  assert.equal(resetLayout(spec).items![1]!.w, 8);
});
test('keyboard moves and resizes only supported arrows, respecting collisions, bounds and minima', () => {
  assert.equal(keyboardLayout(spec, 'a', 'ArrowLeft', false), null);
  assert.equal(keyboardLayout(spec, 'a', 'ArrowUp', false), null);
  assert.equal(keyboardLayout(spec, 'a', 'ArrowUp', true), null);
  assert.equal(keyboardLayout(spec, 'a', 'Enter', false), null);
  assert.equal(keyboardLayout(spec, 'b', 'ArrowRight', false), null);
  assert.equal(keyboardLayout(spec, 'b', 'ArrowRight', true), null);
  assert.equal(keyboardLayout(spec, 'a', 'ArrowRight', false)!.items![0]!.x, 1);
  assert.equal(keyboardLayout(spec, 'a', 'ArrowDown', true)!.items![0]!.h, 3);
  const boundary = structuredClone(spec); boundary.layout.items![0]!.y = 200;
  assert.equal(keyboardLayout(boundary, 'a', 'ArrowDown', false), null);
});
test('palette insertion honors snapped position, reflows collisions and uses full spec validation', () => {
  const widget = { ...structuredClone(spec.widgets[0]!), id: 'dropped' };
  const step = commitBuilderCommand(startBuilder({ kind: 'dashboard', spec }), insertWidget(spec, widget, { x: 0, y: 0 }));
  if (step.history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
  const next = step.history.present.spec; validateDashboardLayout(next.layout, next.widgets);
  assert.deepEqual(next.layout.items!.at(-1), { widgetId: 'dropped', x: 0, y: 0, w: 4, h: 2 });
  assert.throws(() => insertWidget(spec, widget, { x: 10, y: 0 }));
  assert.throws(() => insertWidget(spec, { ...widget, series: [] }, { x: 0, y: 0 }));
});
test('layout changes mark a saved dashboard Modified, persist only after explicit Save and retain record identity/version', async () => {
  const record: DashboardRecord = { id: 'record', tenantId: 'demo-iq', ownerUserId: 'alice', scope: 'private', spec, version: 1,
    createdBy: 'alice', updatedBy: 'alice', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' };
  let calls = 0;
  const layout = updateWidgetLayout(spec, 'a', { x: 1 });
  const draft = editDocument(savedDocument(record), { ...spec, layout });
  assert.equal(documentIsDirty(draft), true); assert.deepEqual(record.spec, spec); assert.equal(calls, 0);
  const saved = await persistDocument(draft, false, { create: async () => { throw new Error('Must update'); }, update: async (id, value, version) => {
    calls++; assert.equal(id, 'record'); assert.equal(version, 1); return { ...record, spec: value, version: 2 };
  } });
  assert.equal(calls, 1); assert.equal(documentIsDirty(saved), false);
  assert.deepEqual(resolveDashboardLayout(saved.spec!), layout);
});

test('external drop snaps final pointer coordinates, clamps bounds and remains locale-independent', () => {
  assert.deepEqual(dropGridPosition(741, { x: 515, y: 106 }, { w: 4, h: 2 }), { x: 6, y: 0 });
  assert.deepEqual(dropGridPosition(741, { x: -100, y: -100 }, { w: 4, h: 2 }), { x: 0, y: 0 });
  assert.deepEqual(dropGridPosition(741, { x: 2000, y: 25000 }, { w: 4, h: 2 }), { x: 8, y: 200 });
});
