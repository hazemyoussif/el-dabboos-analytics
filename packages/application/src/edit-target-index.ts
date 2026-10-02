import type { DashboardSpec } from '@el-dabboos/domain';

/** Compact canonical identities from an already validated/authorized spec.
 * Transient provider context only; never includes results or filter values.
 */
export function dashboardEditTargetIndex(current: DashboardSpec) {
  return current.widgets.map(widget => ({
    widgetId: widget.id,
    type: widget.type,
    ...(widget.dimension ? { dimension: widget.dimension } : {}),
    metrics: [...new Set(widget.series.map(series => series.metric))],
    series: widget.series.map(series => ({ seriesId: series.id, metric: series.metric })),
  }));
}
