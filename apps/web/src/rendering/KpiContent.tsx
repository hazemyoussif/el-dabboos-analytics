import type { WidgetExecution } from '@el-dabboos/application';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatValue } from '../i18n.ts';
import { presentationCopy } from '../presentation/copy.ts';
import type { RenderSeriesProps } from './shared.ts';
export function KpiContent({ entry, ...props }: RenderSeriesProps & { entry: WidgetExecution }) {
  const { widget, catalog, locale, profile, formatSeries, theme } = props;
  const series = widget.series[0]!; const result = entry.seriesResults[series.id];
  const row = result?.status === 'success' ? result.result.rows[0] : undefined;
  const change = row?.percentageChange; const direction = change == null || change === 0 ? 'neutral' : change > 0 ? 'positive' : 'negative';
  const Icon = direction === 'neutral' ? Minus : direction === 'positive' ? ArrowUpRight : ArrowDownRight;
  return <div className="kpi-content"><div className="kpi-value">{formatSeries(series.id, row?.value ?? null)}</div>
    {change != null && <span className={`change ${direction}`} style={{ color: direction === 'neutral' ? theme.neutral : direction === 'positive' ? theme.positive : theme.negative }}><Icon aria-hidden="true" /><span>{change > 0 ? '+' : change < 0 ? '−' : ''}{formatValue(Math.abs(change), 'percentage', locale, profile)}</span></span>}
    {row?.comparisonValue !== undefined && <span className="kpi-comparison">{presentationCopy[locale].previous}: {formatSeries(series.id,row.comparisonValue)}</span>}
    <span className="kpi-caption">{catalog[series.metric]?.descriptions[locale]}</span></div>;
}
