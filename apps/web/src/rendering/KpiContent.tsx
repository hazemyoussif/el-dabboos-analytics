import type { WidgetExecution } from '@el-dabbous/application';
import { formatValue } from '../i18n.ts';
import type { RenderSeriesProps } from './shared.ts';

export function KpiContent({ entry, ...props }: RenderSeriesProps & { entry: WidgetExecution }) {
  const { widget, catalog, locale, profile, formatSeries } = props;
  const series = widget.series[0]!;
  const result = entry.seriesResults[series.id];
  const row = result?.status === 'success' ? result.result.rows[0] : undefined;
  return <div className="kpi-content"><div className="kpi-value">{formatSeries(series.id, row?.value ?? null)}</div>
    {row?.percentageChange !== undefined && row.percentageChange !== null && <span className={`change ${row.percentageChange >= 0 ? 'positive' : 'negative'}`}>{row.percentageChange >= 0 ? '↑' : '↓'} {formatValue(Math.abs(row.percentageChange), 'percentage', locale, profile)}</span>}
    <span className="kpi-caption">{catalog[series.metric]?.descriptions[locale]}</span></div>;
}
