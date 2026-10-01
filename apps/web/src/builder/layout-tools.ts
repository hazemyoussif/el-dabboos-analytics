import { defaultDashboardLayout, resolveDashboardLayout, validateDashboardLayout, validateDashboardSpec } from '@el-dabbous/domain';
import type { DashboardGridItem, DashboardLayout, DashboardSpec, DashboardWidget, WidgetType } from '@el-dabbous/domain';
import type { BuilderCommand } from './model.ts';

export const widgetSizes: Record<WidgetType, { w: number; h: number }> = {
  kpi: { w: 4, h: 2 }, line: { w: 8, h: 4 }, area: { w: 8, h: 4 }, pie: { w: 5, h: 4 }, treemap: { w: 6, h: 5 }, combo: { w: 8, h: 4 }, bar: { w: 6, h: 4 }, table: { w: 12, h: 5 },
};
export const sizePresets: Record<WidgetType, Array<{ id: string; w: number; h: number }>> = {
  kpi: [{ id: 'small', w: 3, h: 2 }, { id: 'medium', w: 4, h: 2 }, { id: 'large', w: 6, h: 3 }],
  line: [{ id: 'half', w: 6, h: 4 }, { id: 'twoThirds', w: 8, h: 4 }, { id: 'full', w: 12, h: 4 }],
  area: [{ id: 'half', w: 6, h: 4 }, { id: 'twoThirds', w: 8, h: 4 }, { id: 'full', w: 12, h: 4 }],
  combo: [{ id: 'half', w: 6, h: 4 }, { id: 'twoThirds', w: 8, h: 4 }, { id: 'full', w: 12, h: 4 }],
  pie: [{ id: 'small', w: 5, h: 4 }, { id: 'large', w: 6, h: 5 }],
  treemap: [{ id: 'half', w: 6, h: 5 }, { id: 'full', w: 12, h: 5 }],
  bar: [{ id: 'half', w: 6, h: 4 }, { id: 'twoThirds', w: 8, h: 4 }, { id: 'full', w: 12, h: 4 }],
  table: [{ id: 'half', w: 6, h: 5 }, { id: 'full', w: 12, h: 5 }],
};
export function editorMinimums(widget: DashboardWidget, item: DashboardGridItem) {
  // Honor persisted minima; legacy small widgets remain editable without forced enlargement.
  return { minW: item.minW ?? Math.min(item.w, widget.type === 'kpi' ? 2 : 4),
    minH: item.minH ?? Math.min(item.h, widget.type === 'kpi' ? 2 : 3) };
}
const overlaps = (a: DashboardGridItem, b: DashboardGridItem) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function freePlacement(existing: DashboardGridItem[], item: DashboardGridItem): DashboardGridItem {
  for (let y = 0; y <= 200; y++) for (let x = 0; x <= 12 - item.w; x++) {
    const candidate = { ...item, x, y };
    if (!existing.some(other => overlaps(candidate, other))) return candidate;
  }
  throw new Error('Dashboard grid is full');
}
export function updateWidgetLayout(spec: DashboardSpec, id: string, change: Partial<Pick<DashboardGridItem, 'x' | 'y' | 'w' | 'h'>>, reflow = false): DashboardLayout {
  const layout = resolveDashboardLayout(spec);
  const old = layout.items!.find(item => item.widgetId === id)!;
  const widget = spec.widgets.find(widget => widget.id === id)!;
  if (!old || !widget) throw new Error('Unknown widget');
  const minimums = editorMinimums(widget, old);
  const next = { ...old, ...change };
  if (next.w < minimums.minW || next.h < minimums.minH) throw new Error('Below editor minimum size');
  if (reflow) next.x = Math.min(next.x, 12 - next.w);
  const others = layout.items!.filter(item => item.widgetId !== id);
  const placed = [next];
  for (const other of others) placed.push(reflow && placed.some(item => overlaps(item, other)) ? freePlacement(placed, other) : other);
  layout.items = layout.items!.map(item => placed.find(next => next.widgetId === item.widgetId)!);
  validateDashboardLayout(layout, spec.widgets);
  return layout;
}
export function arrangeLayout(spec: DashboardSpec): DashboardLayout {
  const previous = resolveDashboardLayout(spec).items!;
  const items: DashboardGridItem[] = [];
  for (const item of [...previous].sort((a, b) => a.y - b.y || a.x - b.x)) items.push(freePlacement(items, item));
  const layout: DashboardLayout = { columns: 12, items: previous.map(item => items.find(next => next.widgetId === item.widgetId)!) };
  validateDashboardLayout(layout, spec.widgets); return layout;
}
export const resetLayout = (spec: DashboardSpec): DashboardLayout => {
  // Default placement while honoring persisted minimum sizes, if larger than defaults.
  const defaults = defaultDashboardLayout(spec.widgets);
  const previous = resolveDashboardLayout(spec).items!;
  const items: DashboardGridItem[] = [];
  for (const item of defaults.items!) {
    const old = previous.find(old => old.widgetId === item.widgetId)!;
    const sized = { ...item, w: Math.max(item.w, old.minW ?? 1), h: Math.max(item.h, old.minH ?? 1),
      ...(old.minW === undefined ? {} : { minW: old.minW }), ...(old.minH === undefined ? {} : { minH: old.minH }) };
    items.push(freePlacement(items, sized));
  }
  const layout: DashboardLayout = { columns: 12, items }; validateDashboardLayout(layout, spec.widgets); return layout;
};
export function keyboardLayout(spec: DashboardSpec, id: string, key: string, shift: boolean): DashboardLayout | null {
  const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
  if (!delta) return null;
  const item = resolveDashboardLayout(spec).items!.find(item => item.widgetId === id);
  if (!item) return null;
  try { return updateWidgetLayout(spec, id, shift ? { w: item.w + delta[0]!, h: item.h + delta[1]! } : { x: item.x + delta[0]!, y: item.y + delta[1]! }); }
  catch { return null; }
}
export function nextWidgetId(widgets: readonly DashboardWidget[]): string {
  let number = 1; while (widgets.some(widget => widget.id === `widget-${number}`)) number++;
  return `widget-${number}`;
}
export function duplicateWidget(spec: DashboardSpec, id: string): { widget: DashboardWidget; command: BuilderCommand } {
  const original = spec.widgets.find(widget => widget.id === id);
  if (!original) throw new Error('Unknown widget');
  const widget = structuredClone(original); widget.id = nextWidgetId(spec.widgets);
  const used = new Set(spec.widgets.flatMap(widget => widget.series.map(series => series.id)));
  widget.series = widget.series.map((series, index) => {
    let id = `${widget.id}-series-${index + 1}`;
    while (used.has(id)) id += '-copy'; used.add(id); return { ...series, id };
  });
  const layout = resolveDashboardLayout(spec);
  const originalItem = layout.items!.find(item => item.widgetId === original.id)!;
  layout.items!.push(freePlacement(layout.items!, { ...originalItem, widgetId: widget.id }));
  validateDashboardSpec({ ...spec, widgets: [...spec.widgets, widget], layout });
  return { widget, command: { type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'add', widget }, { op: 'set_layout', layout }] } } };
}
export function insertWidget(spec: DashboardSpec, widget: DashboardWidget, position: { x: number; y: number }): BuilderCommand {
  const layout = resolveDashboardLayout(spec);
  const candidate = { widgetId: widget.id, ...widgetSizes[widget.type], ...position };
  // The grid supplies a snapped position. Deterministically move colliding neighbors.
  const placed = [candidate];
  for (const item of layout.items!) placed.push(placed.some(other => overlaps(item, other)) ? freePlacement(placed, item) : item);
  layout.items = [...layout.items!.map(item => placed.find(next => next.widgetId === item.widgetId)!), candidate];
  validateDashboardSpec({ ...spec, widgets: [...spec.widgets, widget], layout });
  return { type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'add', widget }, { op: 'set_layout', layout }] } };
}
