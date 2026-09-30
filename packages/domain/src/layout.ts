import type { DashboardGridItem, DashboardLayout, DashboardSpec, DashboardWidget } from './contracts.ts';

export const GRID_COLUMNS = 12;
const sizes: Record<DashboardWidget['type'], { w: number; h: number }> = {
  kpi: { w: 3, h: 2 }, line: { w: 8, h: 4 }, bar: { w: 6, h: 4 }, table: { w: 12, h: 5 },
};
const overlaps = (a: DashboardGridItem, b: DashboardGridItem): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function validateDashboardLayout(layout: DashboardLayout, widgets: readonly DashboardWidget[]): void {
  if (!layout.items) return;
  if (layout.columns !== GRID_COLUMNS || layout.items.length !== widgets.length) throw new Error('Invalid dashboard layout');
  const ids = new Set(widgets.map(widget => widget.id));
  const seen = new Set<string>();
  for (const item of layout.items) {
    if (!ids.has(item.widgetId) || seen.has(item.widgetId) ||
      ![item.x, item.y, item.w, item.h].every(Number.isInteger) ||
      item.x < 0 || item.y < 0 || item.y > 200 || item.w < 1 || item.w > GRID_COLUMNS ||
      item.h < 1 || item.h > 20 || item.x + item.w > GRID_COLUMNS ||
      (item.minW !== undefined && (!Number.isInteger(item.minW) || item.minW < 1 || item.minW > item.w)) ||
      (item.minH !== undefined && (!Number.isInteger(item.minH) || item.minH < 1 || item.minH > item.h)))
      throw new Error('Invalid dashboard layout item');
    if (layout.items.some(other => other !== item && overlaps(item, other))) throw new Error('Overlapping dashboard layout');
    seen.add(item.widgetId);
  }
}

/** First available cell in row-major order; deterministic for a fixed widget order. */
export function placeDashboardWidget(existing: readonly DashboardGridItem[], widget: DashboardWidget): DashboardGridItem {
  const { w, h } = sizes[widget.type];
  for (let y = 0; y <= 200; y++) for (let x = 0; x <= GRID_COLUMNS - w; x++) {
    const candidate = { widgetId: widget.id, x, y, w, h };
    if (existing.every(item => !overlaps(item, candidate))) return candidate;
  }
  throw new Error('Dashboard grid is full');
}
export function defaultDashboardLayout(widgets: readonly DashboardWidget[]): DashboardLayout {
  const items: DashboardGridItem[] = [];
  for (const widget of widgets) items.push(placeDashboardWidget(items, widget));
  return { columns: GRID_COLUMNS, items };
}
export function resolveDashboardLayout(spec: DashboardSpec): DashboardLayout {
  return spec.layout.items ? structuredClone(spec.layout) : defaultDashboardLayout(spec.widgets);
}
