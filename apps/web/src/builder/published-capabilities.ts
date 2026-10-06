import { analysisAllowed,validWidgetDraft } from './model.ts';
import { publishedQueryIssues } from '@el-dabboos/domain';
import type { AnalysisSpec,DashboardSeries,DashboardSpec,DashboardWidget,PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
/** The palette and every editor analysis use the same exact-pair preflight as the backend. */
export function publishedWidgetAllowed(widget: DashboardWidget,base: Omit<DashboardSpec,'widgets'>,published?: PublishedAnalyticsCapabilities): boolean {
  if (!published) return true;
  return widget.series.every(series => !publishedQueryIssues({ metric: series.metric,...(widget.dimension ? { groupBy: widget.dimension } : {}),...(series.analysis ? { analysis: series.analysis } : {}),...(base.filters.dateRange ? { dateRange: base.filters.dateRange } : {}),...(base.filters.dimensions ? { filters: base.filters.dimensions } : {}) },published).length);
}

export function editorAnalysisAllowed(widget: DashboardWidget,series: DashboardSeries,analysis: AnalysisSpec,context: { base: Omit<DashboardSpec,'widgets'>; published?: PublishedAnalyticsCapabilities | undefined }): boolean {
  const candidate = { ...widget,series: widget.series.map(item => item.id===series.id ? { ...item,analysis } : item) };
  return analysisAllowed(series.metric,widget.dimension,context.base.filters.dateRange ?? context.base.filters.datePreset,analysis) && validWidgetDraft(candidate,context.base) && publishedWidgetAllowed(candidate,context.base,context.published);
}

export function validPublishedWidgetDraft(widget: DashboardWidget,base: Omit<DashboardSpec,'widgets'>,published?: PublishedAnalyticsCapabilities): boolean {
  return validWidgetDraft(widget,base) && publishedWidgetAllowed(widget,base,published);
}
