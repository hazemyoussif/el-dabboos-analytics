import { dimensionLabels, semanticCatalog } from '@el-dabboos/domain';
import type { DashboardSpec, MetricId } from '@el-dabboos/domain';

/** Compact labels and identities from an already validated/authorized spec.
 * Transient provider context only; never includes results or filter values.
 */
export function dashboardEditTargetIndex(current: DashboardSpec) {
  const metric = (id: MetricId) => ({ id, labelEn: semanticCatalog[id].labels.en, labelAr: semanticCatalog[id].labels.ar });
  return current.widgets.map(widget => ({
    widgetId: widget.id,
    type: widget.type,
    ...(widget.dimension ? { dimension: { id: widget.dimension, labelEn: dimensionLabels.en[widget.dimension], labelAr: dimensionLabels.ar[widget.dimension] } } : {}),
    metrics: [...new Set(widget.series.map(series => series.metric))].map(metric),
    series: widget.series.map(series => ({ seriesId: series.id, metric: metric(series.metric) })),
    ...(widget.title ? { title: { ...widget.title } } : {}),
  }));
}
