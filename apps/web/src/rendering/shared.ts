import type { DashboardExecutionResult } from '@el-dabboos/application';
import type { DashboardSeries,DashboardWidget, Locale, SemanticMetric, TenantProfile } from '@el-dabboos/domain';
import type { ChartTheme } from './chart-theme.ts';
import { formatValue, localeTag } from '../i18n.ts';

export const valueKey = (id: string) => `v_${id}`;
export const comparisonKey = (id: string) => `c_${id}`;
export type ChartRow = Record<string, string | number | null>;
export interface RenderSeriesProps {
  exportMetadata?: DashboardExecutionResult['metadata'];
  theme: ChartTheme;
  canDrill?: ((seriesId:string,key:string|null)=>boolean)|undefined;
  onDrill?: (seriesId:string,key:string|null,opener?:Element)=>void;
  keyLabel?: (key:string|null)=>string;
  widget: DashboardWidget;
  catalog: Record<string, SemanticMetric>;
  locale: Locale;
  profile: TenantProfile;
  labels: string[];
  formatSeries: (seriesId: string, value: number | null) => string;
}
export function seriesLabel(props: RenderSeriesProps, index: number) {
  return props.labels[index] ?? props.widget.series[index]!.id;
}
export function formatSeriesValue(widget: DashboardWidget, catalog: Record<string, SemanticMetric>, locale: Locale, profile: TenantProfile, seriesId: string, value: number | null) {
  const series = widget.series.find(item => item.id === seriesId)!;
  const metric = catalog[series.metric];
  if(metric?.id==='customer_average_monthly_sales'&&value!==null)return new Intl.NumberFormat(localeTag(locale,profile),{style:'currency',currency:profile.reportingCurrency,maximumFractionDigits:6}).format(value);
  return formatValue(value, series.analysis?.pareto||series.analysis?.percentageContribution?'percentage':metric?.type ?? 'number', locale, profile, metric?.presentation.unit);
}

/** Compact presentation only; full precision remains in tooltips and accessible tables. */
export function compactSeriesValue(props: RenderSeriesProps, seriesId: string, value: number) {
  const series = props.widget.series.find(item => item.id === seriesId)!;
  const metric = props.catalog[series.metric];
  const type=series.analysis?.pareto||series.analysis?.percentageContribution?'percentage':metric?.type;
  const number = new Intl.NumberFormat(localeTag(props.locale, props.profile), {
    notation: 'compact', maximumFractionDigits: 1,
    ...(type === 'currency' ? { style: 'currency' as const, currency: props.profile.reportingCurrency, currencyDisplay: 'narrowSymbol' as const } : {}),
  }).format(value);
  if (type === 'percentage') return `${number}%`;
  if (metric?.type === 'duration') return `${number} ${props.locale === 'ar' ? (metric.presentation.unit==='days'?'يوم':'ساعة') : metric.presentation.unit ?? 'hours'}`;
  return number;
}

export function seriesDisplayLabel(series:DashboardSeries,catalog:Record<string,SemanticMetric>,locale:Locale){
 const label=catalog[series.metric]?.labels[locale]??series.metric.replaceAll('_',' ');
 return series.analysis?.pareto?`${label} — ${locale==='ar'?'المساهمة الموجبة التراكمية (%)':'cumulative positive share (%)'}`:label;
}
