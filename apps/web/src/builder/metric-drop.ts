import type { AnalysisSpec, DashboardSeries, DashboardSpec, DashboardWidget, DimensionId, MetricId, ProductMetric, SemanticMetric, WidgetType } from '@el-dabboos/domain';
import { visualizationChoices, visualizationCandidate, visualizationNames } from './visualizations.ts';
import { analysisAllowed, canAddSeries, validWidgetDraft } from './model.ts';
import type { BuilderCommand, BuilderDocument } from './model.ts';
import { insertWidget, nextWidgetId, widgetSizes } from './layout-tools.ts';

export type MetricDropAction = 'add-series' | 'replace-primary';
export type MetricCatalog = Record<string, SemanticMetric>;
export const metricAvailable = (id: string, catalog: MetricCatalog, registry: readonly ProductMetric[]): id is MetricId =>
  !!catalog[id] && registry.some(metric => metric.id === id && metric.availability === 'available');
export const metricDropCopy = {
  en: { create: 'Create visualization', 'add-series': 'Add series', 'replace-primary': 'Replace primary', replace: 'Replace metric', invalid: 'Not compatible', cancel: 'Cancel', ...visualizationNames.en, choose: 'Choose how to use this metric' },
  ar: { create: 'إنشاء عرض', 'add-series': 'إضافة سلسلة', 'replace-primary': 'استبدال المؤشر الأساسي', replace: 'استبدال المؤشر', invalid: 'غير متوافق', cancel: 'إلغاء', ...visualizationNames.ar, choose: 'اختر طريقة استخدام المؤشر' },
};
const temporal: DimensionId[] = ['month', 'date', 'quarter', 'year'];
const categorical: DimensionId[] = ['branch', 'region', 'salesperson', 'product_category', 'product', 'customer', 'warehouse', 'equipment', 'technician'];
export function nextSeriesId(metric: MetricId, used: readonly string[]): string {
  const stem = metric.replaceAll('_', '-'); let id = stem; let number = 2;
  while (used.includes(id)) id = `${stem}-${number++}`;
  return id;
}
export function metricVisualizationOptions(metric: MetricId, catalog: MetricCatalog, base: Omit<DashboardSpec, 'widgets'>, chosenDimension?: DimensionId) {
  const dimensions = catalog[metric]?.dimensions ?? [];
  const time = temporal.find(dimension => dimensions.includes(dimension));
  const category = categorical.find(dimension => dimensions.includes(dimension)) ?? dimensions[0];
  const seed: DashboardWidget = { id: 'candidate', type: 'table', series: [{ id: 'candidate', metric }] };
  return catalog[metric] ? visualizationChoices.flatMap(option => {
    const dimension = option.type === 'kpi' ? undefined : chosenDimension ?? (['line', 'area', 'combo'].includes(option.type) ? time : category);
    if (['line', 'area', 'combo'].includes(option.type) && dimension && !temporal.includes(dimension)) return [];
    const candidate = visualizationCandidate({ ...seed, dimension }, option);
    return validWidgetDraft(candidate, base) ? [{ ...option, dimension }] : [];
  }) : [];
}
export function createWidgetFromMetric(document: BuilderDocument, metric: MetricId, type: WidgetType | 'donut' | 'horizontal', catalog: MetricCatalog, registry: readonly ProductMetric[], dimension?: DimensionId): DashboardWidget {
  if (!metricAvailable(metric, catalog, registry)) throw new Error('Metric is unavailable');
  const base = document.kind === 'empty' ? document.base : document.spec;
  const widgets = document.kind === 'empty' ? [] : document.spec.widgets;
  const option = metricVisualizationOptions(metric, catalog, base, dimension).find(option => option.id === type);
  if (!option) throw new Error('Invalid visualization');
  const intent = { type: option.type, dimension: option.dimension, presentation: option.presentation };
  return { id: nextWidgetId(widgets), ...intent, series: [{ id: nextSeriesId(metric, widgets.flatMap(widget => widget.series.map(series => series.id))), metric }] };
}
function replacePrimary(widget: DashboardWidget, metric: MetricId, base: Omit<DashboardSpec, 'widgets'>): DashboardWidget {
  const original = widget.series[0]!;
  // Remove only operations that no longer satisfy the metric/dimension/date contract.
  const analysis: AnalysisSpec = {};
  for (const key of Object.keys(original.analysis ?? {}) as Array<keyof AnalysisSpec>) {
    const part = { [key]: original.analysis![key] };
    if (analysisAllowed(metric, widget.dimension, base.filters.dateRange ?? base.filters.datePreset, part)) Object.assign(analysis, part);
  }
  const series: DashboardSeries = { id: original.id, metric, ...(Object.keys(analysis).length ? { analysis } : {}) };
  return { ...widget, series: [series, ...widget.series.slice(1)] };
}
export function metricDropActions(widget: DashboardWidget, metric: MetricId, catalog: MetricCatalog, registry: readonly ProductMetric[], base: Omit<DashboardSpec, 'widgets'>): MetricDropAction[] {
  if (!metricAvailable(metric, catalog, registry) || widget.series.some(series => !catalog[series.metric]) ||
    widget.dimension && !catalog[metric]!.dimensions.includes(widget.dimension)) return [];
  const actions: MetricDropAction[] = [];
  const replacement = replacePrimary(widget, metric, base);
  if (validWidgetDraft(replacement, base)) actions.push('replace-primary');
  if (canAddSeries(widget, metric, catalog).allowed) {
    const next = { ...widget, series: [...widget.series, { id: nextSeriesId(metric, widget.series.map(series => series.id)), metric }] };
    if (validWidgetDraft(next, base)) actions.push('add-series');
  }
  return actions;
}
export function applyMetricDrop(spec: DashboardSpec, widgetId: string, metric: MetricId, action: MetricDropAction, catalog: MetricCatalog, registry: readonly ProductMetric[]): BuilderCommand {
  const widget = spec.widgets.find(widget => widget.id === widgetId);
  if (!widget || !metricDropActions(widget, metric, catalog, registry, spec).includes(action)) throw new Error('Not compatible');
  const next = action === 'replace-primary' ? replacePrimary(widget, metric, spec) : { ...widget, series: [...widget.series,
    { id: nextSeriesId(metric, spec.widgets.flatMap(widget => widget.series.map(series => series.id))), metric }] };
  return { type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'replace', widgetId, widget: next }] } };
}
export function createMetricCommand(document: BuilderDocument, metric: MetricId, type: WidgetType | 'donut' | 'horizontal', position: { x: number; y: number }, catalog: MetricCatalog, registry: readonly ProductMetric[], dimension?: DimensionId) {
  const widget = createWidgetFromMetric(document, metric, type, catalog, registry, dimension);
  // A chooser may select a wider type than the initial KPI drop placeholder.
  const point = { x: Math.max(0, Math.min(12 - widgetSizes[widget.type].w, position.x)), y: position.y };
  const command: BuilderCommand = document.kind === 'dashboard' ? insertWidget(document.spec, widget, point) : { type: 'add-first', widget,
    layout: { columns: 12, items: [{ widgetId: widget.id, ...widgetSizes[widget.type], ...point }] } };
  return { widget, command };
}
