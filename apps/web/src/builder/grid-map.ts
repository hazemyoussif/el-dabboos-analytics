import type { Layout } from 'react-grid-layout';
import type { DashboardGridItem, DashboardLayout } from '@el-dabbous/domain';

export function toGridItems(items: readonly DashboardGridItem[]): Layout {
  return items.map(({ widgetId, x, y, w, h, minW, minH }) => ({ i: widgetId, x, y, w, h,
    ...(minW === undefined ? {} : { minW }), ...(minH === undefined ? {} : { minH }) }));
}
export function fromGridItems(items: Layout, previous: DashboardLayout): DashboardLayout {
  const prior = new Map(previous.items?.map(item => [item.widgetId, item]));
  const order = new Map(previous.items?.map((item, index) => [item.widgetId, index]));
  const stable = [...items].sort((a, b) => (order.get(a.i) ?? 999) - (order.get(b.i) ?? 999));
  return { columns: 12, items: stable.map(({ i, x, y, w, h }) => ({ widgetId: i, x, y, w, h,
    ...(prior.get(i)?.minW === undefined ? {} : { minW: prior.get(i)!.minW }),
    ...(prior.get(i)?.minH === undefined ? {} : { minH: prior.get(i)!.minH }) })) };
}

/** Snap a centered external drop using the adapter's desktop grid metrics. */
export function dropGridPosition(width: number, point: { x: number; y: number }, size: { w: number; h: number }) {
  const stride = (width - 14) / 12;
  return { x: Math.max(0, Math.min(12 - size.w, Math.round((point.x - (stride * size.w - 14) / 2 - 14) / stride))),
    y: Math.max(0, Math.min(200, Math.round((point.y - (88 * size.h - 14) / 2 - 14) / 88))) };
}
