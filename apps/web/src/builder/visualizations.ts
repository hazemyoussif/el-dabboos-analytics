import { timeDimensions, widgetTypes } from '@el-dabboos/domain';
import type { DashboardSpec, DashboardWidget, Locale, SemanticMetric, WidgetPresentation, WidgetType } from '@el-dabboos/domain';
import { validWidgetDraft } from './model.ts';

export interface VisualizationOption { id: string; type: WidgetType; presentation?: WidgetPresentation; group: 'summary' | 'trend' | 'comparison' | 'composition' | 'detail' }
export const visualizationNames = {
  en: { kpi: 'KPI', line: 'Line', area: 'Area', bar: 'Vertical bar', horizontal: 'Horizontal bar', pie: 'Pie', donut: 'Donut', treemap: 'Treemap', combo: 'Combo', table: 'Table', summary: 'Summary', trend: 'Trend', comparison: 'Comparison', composition: 'Composition', detail: 'Detail' },
  ar: { kpi: 'مؤشر', line: 'خطي', area: 'مساحي', bar: 'أعمدة رأسية', horizontal: 'أشرطة أفقية', pie: 'دائري', donut: 'حلقي', treemap: 'خريطة شجرية', combo: 'مركب', table: 'جدول', summary: 'ملخص', trend: 'اتجاه', comparison: 'مقارنة', composition: 'مساهمة', detail: 'تفاصيل' },
};
export const visualizationChoices: VisualizationOption[] = widgetTypes.flatMap(type => {
  const group: VisualizationOption['group'] = type === 'kpi' ? 'summary' : ['line', 'area', 'combo'].includes(type) ? 'trend' : type === 'bar' ? 'comparison' : type === 'table' ? 'detail' : 'composition';
  return [{ id: type, type, group, ...(type === 'bar' ? { presentation: { orientation: 'vertical' as const } } : {}) }, ...(type === 'pie' ? [{ id: 'donut', type, group, presentation: { pieVariant: 'donut' as const } }] : []), ...(type === 'bar' ? [{ id: 'horizontal', type, group, presentation: { orientation: 'horizontal' as const } }] : [])];
});
export const visualizationLabel = (option: Pick<VisualizationOption, 'id'>, locale: Locale) => visualizationNames[locale][option.id as WidgetType | 'donut' | 'horizontal'];
export function visualizationCandidate(widget: DashboardWidget, option: VisualizationOption): DashboardWidget {
  const { presentation: old, ...rest } = widget;
  const presentation: WidgetPresentation = { ...option.presentation };
  if (!['kpi', 'table'].includes(option.type) && old?.legend) presentation.legend = old.legend;
  if (['line', 'area', 'combo'].includes(option.type) && old?.curve) presentation.curve = old.curve;
  if (['pie', 'treemap'].includes(option.type) && old?.dataLabels) presentation.dataLabels = old.dataLabels;
  return { ...rest, type: option.type, ...(Object.keys(presentation).length ? { presentation } : {}),
    dimension: option.type === 'kpi' ? undefined : widget.dimension,
    series: widget.series.map((item, index) => {
      const { presentation: marks, ...series } = item;
      return option.type === 'combo' ? { ...series, presentation: { mark: marks?.mark ?? (index === 0 ? 'bar' : 'line') } } : series;
    }) };
}
export function visualizationOptions(widget: DashboardWidget, base: Omit<DashboardSpec, 'widgets'>): VisualizationOption[] {
  return visualizationChoices.filter(option => validWidgetDraft(visualizationCandidate(widget, option), base));
}
export function recommendedVisualization(widget: DashboardWidget, base: Omit<DashboardSpec, 'widgets'>, catalog: Record<string, SemanticMetric>, categoryCount?: number): VisualizationOption | undefined {
  const options = visualizationOptions(widget, base);
  const metric = catalog[widget.series[0]!.metric];
  const id = !widget.dimension ? 'kpi' : timeDimensions.includes(widget.dimension) ? 'line' : widget.series[0]?.analysis?.topN || widget.series[0]?.analysis?.ranking || (categoryCount !== undefined && categoryCount > 8) ? 'horizontal' : widget.series.length === 1 && ['additive', 'snapshot'].includes(metric?.semantics.kind ?? '') && categoryCount !== undefined && categoryCount <= 8 ? 'donut' : ['product', 'customer', 'product_category'].includes(widget.dimension) ? 'treemap' : 'bar';
  return options.find(option => option.id === id) ?? options.find(option => option.id === 'table');
}
