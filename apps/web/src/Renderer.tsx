import { successfulMetricMetadata } from './metrics/definition-copy.ts';
import { MetricInfo } from './metrics/MetricDefinition.tsx';
import { TrendingUp, ChartLine, ChartArea, ChartBar, ChartPie, PanelsTopLeft, ChartNoAxesCombined, Table2, AlertCircle } from 'lucide-react';
import { resolveGovernedPalette, withGovernedPalette } from './rendering/chart-theme.ts';
import { useChartTheme } from './presentation/ThemeProvider.tsx';
import { EmptyState, Notice } from './presentation/Feedback.tsx';
import type { DashboardExecutionResult, WidgetExecution } from '@el-dabboos/application';
import { resolveDashboardLayout } from '@el-dabboos/domain';
import type { DashboardSpec, DashboardWidget, GovernedPalette, Locale, SemanticMetric, TenantProfile } from '@el-dabboos/domain';
import { copy, formatKey,formatDimensionLabel } from './i18n.ts';
import { AreaContent } from './rendering/AreaContent.tsx';
import { PieContent } from './rendering/PieContent.tsx';
import { TreemapContent } from './rendering/TreemapContent.tsx';
import { ComboContent } from './rendering/ComboContent.tsx';
import { BarContent } from './rendering/BarContent.tsx';
import { KpiContent } from './rendering/KpiContent.tsx';
import { LineContent } from './rendering/LineContent.tsx';
import { TableContent } from './rendering/TableContent.tsx';
import { comparisonKey, formatSeriesValue, valueKey } from './rendering/shared.ts';
import type { ChartRow } from './rendering/shared.ts';

const icons = { kpi: TrendingUp, line: ChartLine, area: ChartArea, bar: ChartBar, pie: ChartPie, treemap: PanelsTopLeft, combo: ChartNoAxesCombined, table: Table2 };
const renderers = { kpi: KpiContent, line: LineContent, area: AreaContent, bar: BarContent, pie: PieContent, treemap: TreemapContent, combo: ComboContent, table: TableContent };

interface Props { execution: DashboardExecutionResult; catalog: Record<string, SemanticMetric>; locale: Locale; profile: TenantProfile }
export function WidgetCard({ widget, dashboardPalette, entry, catalog, locale, profile }: { widget: DashboardWidget; dashboardPalette?: GovernedPalette; entry: WidgetExecution | undefined; catalog: Record<string, SemanticMetric>; locale: Locale; profile: TenantProfile }) {
  const t = copy[locale];
  const theme = withGovernedPalette(useChartTheme(), resolveGovernedPalette(widget.presentation?.palette, dashboardPalette));
  const Icon = icons[widget.type];
  const labels = widget.series.map(series => catalog[series.metric]?.labels[locale] ?? series.metric.replaceAll('_', ' '));
  const title = widget.title?.[locale] ?? (labels.length === 1 ? labels[0]! : labels.join(' · '));
  const subtitle = widget.dimension ? t.dimensions[widget.dimension] : catalog[widget.series[0]!.metric]?.descriptions[locale] ?? '';
  const failures = widget.series.flatMap(series => {
    const result = entry?.seriesResults[series.id];
    return result?.status === 'error' ? [result.error.message] : [];
  });
  if (!entry || entry.status === 'error') return <article className="widget widget-error"><div className="widget-heading"><h3>{title}</h3><WidgetMetricDefinitions widget={widget} catalog={catalog} locale={locale} profile={profile} entry={entry} /><AlertCircle aria-hidden="true" /></div><Notice tone="danger">{failures.join(' · ') || t.failed}</Notice></article>;
  const dimensionLabels=Object.assign({},...Object.values(entry.seriesResults).map(series=>series.status==='success'?series.result.metadata.dimensionLabels??{}:{})) as Record<string,string>;
  const keyLabel=(key:string|null)=>key!==null&&dimensionLabels[key]?formatDimensionLabel(dimensionLabels[key]!,widget.dimension,locale):formatKey(key,widget.dimension,locale,profile);
  const data: ChartRow[] = entry.alignedRows.map((row,index) => {
    const item: ChartRow = { label: keyLabel(row.key), _row: index };
    for (const series of widget.series) {
      item[valueKey(series.id)] = row.series[series.id]?.value ?? null;
      if (row.series[series.id]?.comparisonValue !== undefined) item[comparisonKey(series.id)] = row.series[series.id]?.comparisonValue ?? null;
    }
    return item;
  });
  const formatSeries = (seriesId: string, value: number | null) => formatSeriesValue(widget, catalog, locale, profile, seriesId, value);
  const hasData = entry.alignedRows.some(row => Object.values(row.series).some(value => value !== null && value.value !== null));
  const props = { theme, widget, entry, catalog, locale, profile, labels, formatSeries, data, keyLabel };
  const Content = renderers[widget.type];
  const content = !hasData ? <EmptyState>{t.empty}</EmptyState> : <Content {...props} />;
  const summary = widget.type !== 'kpi' && widget.type !== 'table' && <details className="chart-summary"><summary>{locale === 'ar' ? 'عرض قيم الرسم' : 'View chart values'}</summary><TableContent {...props} /></details>;
  return <article className={`widget widget-${widget.type}`}><div className="widget-heading"><div><h3>{title}</h3><p>{subtitle}</p>{widget.type !== 'table' && <WidgetMetricDefinitions widget={widget} catalog={catalog} locale={locale} profile={profile} entry={entry} />}</div><span className="widget-icon"><Icon aria-hidden="true" /></span></div>{entry.status === 'partial' && <Notice>{t.partial}: {failures.join(' · ')}</Notice>}{content}{summary}</article>;
}
export function DashboardRenderer({ execution, catalog, locale, profile, dashboardOverride }: Props & { dashboardOverride?: DashboardSpec }) {
  const spec = dashboardOverride ?? execution.dashboard;
  const layout = resolveDashboardLayout(spec);
  return <div className="viewer-canvas">{spec.widgets.map(widget => {
    const item = layout.items?.find(candidate => candidate.widgetId === widget.id);
    return <div key={widget.id} className="viewer-item" style={item ? { gridColumn: `${item.x + 1} / span ${item.w}`, gridRow: `${item.y + 1} / span ${item.h}` } : undefined}>
      <WidgetCard widget={widget} dashboardPalette={spec.presentation?.palette} entry={execution.widgetResults[widget.id]} catalog={catalog} locale={locale} profile={profile} />
    </div>;
  })}</div>;
}

function WidgetMetricDefinitions({widget,catalog,locale,profile,entry}: {widget: DashboardWidget; catalog: Record<string,SemanticMetric>; locale: Locale; profile: TenantProfile; entry: WidgetExecution | undefined}) {
 return <div>{widget.series.map(series => {
  const metric = catalog[series.metric];
  return metric && <span key={series.id}>{widget.series.length > 1 && metric.labels[locale]}<MetricInfo metric={metric} locale={locale} currency={profile.reportingCurrency} metadata={successfulMetricMetadata(entry?.seriesResults[series.id])} /></span>;
 })}</div>;
}
