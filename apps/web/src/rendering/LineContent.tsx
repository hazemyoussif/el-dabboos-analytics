import type { WidgetExecution } from '@el-dabbous/application';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { localeTag } from '../i18n.ts';
import { colors, comparisonKey, seriesLabel, tooltipFormatter, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';

export function LineContent(props: RenderSeriesProps & { entry: WidgetExecution; data: ChartRow[] }) {
  const { widget, entry, data, locale, profile } = props;
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
    <CartesianGrid stroke="#e8edf2" strokeDasharray="3 4" vertical={false} />
    <XAxis dataKey="label" tick={{ fill: '#7b8999', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
    <YAxis orientation={locale === 'ar' ? 'right' : 'left'} tick={{ fill: '#7b8999', fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={n => new Intl.NumberFormat(localeTag(locale, profile), { notation: 'compact' }).format(Number(n))} />
    <Tooltip formatter={tooltipFormatter(props)} contentStyle={{ borderRadius: 12, border: '1px solid #e6ebf0' }} />
    <Legend />
    {widget.series.flatMap((series, index) => [
      ...(entry.alignedRows.some(row => row.series[series.id]?.comparisonValue !== undefined) ? [<Line key={`comparison-${series.id}`} dataKey={comparisonKey(series.id)} name={`${seriesLabel(props, index)} · ${locale === 'ar' ? 'الفترة السابقة' : 'Previous'}`} stroke={colors[index % colors.length]} strokeOpacity={0.42} strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls={false} />] : []),
      <Line key={series.id} dataKey={valueKey(series.id)} name={seriesLabel(props, index)} stroke={colors[index % colors.length]} strokeWidth={3} dot={false} activeDot={{ r: 5 }} connectNulls={false} />,
    ])}
  </LineChart></ResponsiveContainer></div>;
}
