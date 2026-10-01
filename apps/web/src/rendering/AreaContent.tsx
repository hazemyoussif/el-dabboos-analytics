import type { WidgetExecution } from '@el-dabbous/application';
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { localeTag } from '../i18n.ts';
import { colors, comparisonKey, seriesLabel, tooltipFormatter, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';
export function AreaContent(props: RenderSeriesProps & { entry: WidgetExecution; data: ChartRow[] }) {
  const { widget, entry, data, locale, profile } = props;
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
    <CartesianGrid stroke="#e8edf2" vertical={false} /><XAxis dataKey="label" interval="preserveStartEnd" tick={{ fontSize: 11 }} />
    <YAxis width={56} tickFormatter={n => new Intl.NumberFormat(localeTag(locale, profile), { notation: 'compact' }).format(Number(n))} />
    <Tooltip formatter={tooltipFormatter(props)} />{widget.presentation?.legend !== 'hide' && <Legend />}
    {widget.series.flatMap((series, index) => [<Area key={series.id} type={widget.presentation?.curve === 'smooth' ? 'monotone' : 'linear'} dataKey={valueKey(series.id)} name={seriesLabel(props, index)} stroke={colors[index % colors.length]} fill={colors[index % colors.length]} fillOpacity={0.14} connectNulls={false} />,
      ...(entry.alignedRows.some(row => row.series[series.id]?.comparisonValue !== undefined) ? [<Line key={`comparison-${series.id}`} dataKey={comparisonKey(series.id)} name={`${seriesLabel(props, index)} · ${locale === 'ar' ? 'الفترة السابقة' : 'Previous'}`} stroke={colors[index % colors.length]} strokeDasharray="5 4" dot={false} connectNulls={false} />] : [])])}
  </AreaChart></ResponsiveContainer></div>;
}
