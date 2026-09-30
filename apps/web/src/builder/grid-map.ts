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
