import type { ReactNode } from 'react';
import type { WidgetExecution } from '@el-dabbous/application';
import { useChartTheme } from '../presentation/ThemeProvider.tsx';
import { presentationCopy } from '../presentation/copy.ts';
import { formatValue } from '../i18n.ts';
import { comparisonKey, seriesLabel, valueKey } from './shared.ts';
import type { RenderSeriesProps } from './shared.ts';
import { seriesColor, showChartLegend } from './chart-theme.ts';
export interface LegendItem { key: string; label: string; color: string; reference?: boolean }
export function axisStyle(theme: ReturnType<typeof useChartTheme>) { return { tick: { fill: theme.axis, fontSize: 11 }, tickLine: false, axisLine: false }; }
export function legendItems(props: RenderSeriesProps, entry?: WidgetExecution): LegendItem[] {
  return props.widget.series.flatMap((series,index) => {
    const color = seriesColor(props.theme,index);
    return [{ key: series.id, label: seriesLabel(props,index), color }, ...(entry?.alignedRows.some(row => row.series[series.id]?.comparisonValue !== undefined) ? [{ key: comparisonKey(series.id), label: `${seriesLabel(props,index)} · ${presentationCopy[props.locale].previous}`, color, reference: true }] : [])];
  });
}
export function ChartLegend({ items, locale }: { items: LegendItem[]; locale: RenderSeriesProps['locale'] }) {
  return <ul className="chart-legend" aria-label={presentationCopy[locale].legend}>{items.map(item => <li key={item.key}><span className={`legend-mark ${item.reference ? 'reference' : ''}`} style={{ color: item.color, background: item.reference ? undefined : item.color }} aria-hidden="true" />{item.label}</li>)}</ul>;
}
export function ChartFrame({ children, props, entry, items, composition = false, className = '' }: { children: ReactNode; props: RenderSeriesProps; entry?: WidgetExecution; items?: LegendItem[]; composition?: boolean; className?: string }) {
  const values = items ?? legendItems(props,entry);
  return <div className={`chart-wrap ${className}`}><div className="chart-plot">{children}</div>{showChartLegend(props.widget.series.length,props.widget.presentation?.legend,composition,values.some(item => item.reference)) && <ChartLegend items={values} locale={props.locale} />}</div>;
}
interface TooltipItem { dataKey?: string | number; name?: string | number; value?: unknown; color?: string; payload?: { label?: string; name?: string; _row?: number; sourceIndex?: number; value?: number } }
/** Only formatted analytics values enter this presentation component. Nulls remain missing values. */
export function EnterpriseTooltip({ active, label, payload, props, entry, composition = false, categoryIndices = [] }: { active?: boolean; label?: unknown; payload?: readonly TooltipItem[]; props: RenderSeriesProps; entry?: WidgetExecution; composition?: boolean; categoryIndices?: number[] }) {
  if (!active || !payload?.length) return null;
  const t = presentationCopy[props.locale];
  const first = payload[0];
  const heading = String(label ?? first?.payload?.name ?? first?.payload?.label ?? '');
  const seen = new Set<string>();
  return <div className="enterprise-tooltip" dir={props.locale === 'ar' ? 'rtl' : 'ltr'} style={{ background: props.theme.tooltip, borderColor: props.theme.border, color: props.theme.text }}><strong>{heading}</strong>{payload.flatMap(item => {
    const index = composition ? 0 : props.widget.series.findIndex(series => valueKey(series.id) === item.dataKey || comparisonKey(series.id) === item.dataKey);
    const series = props.widget.series[index]; if (!series || seen.has(series.id)) return []; seen.add(series.id);
    const main = payload.find(value => value.dataKey === valueKey(series.id)) ?? item;
    const rowIndex = item.payload?._row ?? item.payload?.sourceIndex;
    const aligned = rowIndex === undefined ? undefined : entry?.alignedRows[rowIndex]?.series[series.id];
    const value = composition ? item.value : main.value;
    const comparison = aligned?.comparisonValue;
    return <div className="tooltip-series" key={series.id}><div><i style={{ background: composition ? seriesColor(props.theme,Math.max(0,categoryIndices.indexOf(item.payload?.sourceIndex ?? -1))) : seriesColor(props.theme,index) }} aria-hidden="true" /><span>{seriesLabel(props,index)}</span><b>{props.formatSeries(series.id,typeof value === 'number' ? value : null)}</b></div>
      {comparison !== undefined && <div className="tooltip-detail"><span>{t.previous}</span><span>{props.formatSeries(series.id,comparison)}</span></div>}
      {aligned?.absoluteChange !== undefined && <div className="tooltip-detail"><span>{t.change}</span><span>{props.formatSeries(series.id,aligned.absoluteChange)}{aligned.percentageChange != null && ` (${formatValue(aligned.percentageChange,'percentage',props.locale,props.profile)})`}</span></div>}
      {aligned?.rank !== undefined && <div className="tooltip-detail"><span>{t.rank}</span><span>{aligned.rank}</span></div>}
    </div>;
  })}</div>;
}
