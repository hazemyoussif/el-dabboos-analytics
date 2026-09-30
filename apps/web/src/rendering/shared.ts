import type { DashboardWidget, Locale, SemanticMetric, TenantProfile } from '@el-dabbous/domain';
import { formatValue } from '../i18n.ts';

export const colors = ['#0aa992', '#3274bd', '#e8943a', '#9a6cd3', '#e06377', '#6c8b3c', '#7a91a8', '#c168a6'];
export const valueKey = (id: string) => `v_${id}`;
export const comparisonKey = (id: string) => `c_${id}`;
export type ChartRow = Record<string, string | number | null>;
export interface RenderSeriesProps {
  widget: DashboardWidget;
  catalog: Record<string, SemanticMetric>;
  locale: Locale;
  profile: TenantProfile;
  labels: string[];
  formatSeries: (seriesId: string, value: number | null) => string;
}
export function tooltipFormatter(props: RenderSeriesProps) {
  return (value: unknown, name: unknown) => {
    const index = props.labels.findIndex(label => label === name);
    const seriesId = props.widget.series[index]?.id ?? props.widget.series[0]!.id;
    return typeof value === 'number' ? props.formatSeries(seriesId, value) : '—';
  };
}
export function seriesLabel(props: RenderSeriesProps, index: number) {
  return props.labels[index] ?? props.widget.series[index]!.id;
}
export function formatSeriesValue(widget: DashboardWidget, catalog: Record<string, SemanticMetric>, locale: Locale, profile: TenantProfile, seriesId: string, value: number | null) {
  const series = widget.series.find(item => item.id === seriesId)!;
  const metric = catalog[series.metric];
  return formatValue(value, metric?.type ?? 'number', locale, profile, metric?.presentation.unit);
}
