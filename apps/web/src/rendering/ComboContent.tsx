import type { WidgetExecution } from '@el-dabbous/application';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { localeTag } from '../i18n.ts';
import { colors, comparisonKey, seriesLabel, tooltipFormatter, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';
export function ComboContent(props: RenderSeriesProps & { entry: WidgetExecution; data: ChartRow[] }) {
  const { widget, entry, data, locale, profile } = props;
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
    <CartesianGrid stroke="#e8edf2" vertical={false} /><XAxis dataKey="label" interval="preserveStartEnd" tick={{ fontSize: 11 }} />
    <YAxis width={56} tickFormatter={n => new Intl.NumberFormat(localeTag(locale, profile), { notation: 'compact' }).format(Number(n))} />
    <Tooltip formatter={tooltipFormatter(props)} />{widget.presentation?.legend !== 'hide' && <Legend />}
    {widget.series.flatMap((series, index) => {
      const mark = series.presentation?.mark ?? (index === 0 ? 'bar' : 'line');
      const name = `${seriesLabel(props, index)} · ${locale === 'ar' ? mark === 'bar' ? 'أعمدة' : 'خطي' : mark === 'bar' ? 'Bar' : 'Line'}`;
      return [mark === 'bar' ? <Bar key={series.id} dataKey={valueKey(series.id)} name={name} fill={colors[index % colors.length]} maxBarSize={30} /> : <Line key={series.id} type={widget.presentation?.curve === 'smooth' ? 'monotone' : 'linear'} dataKey={valueKey(series.id)} name={name} stroke={colors[index % colors.length]} strokeWidth={3} dot={false} connectNulls={false} />,
        ...(entry.alignedRows.some(row => row.series[series.id]?.comparisonValue !== undefined) ? [<Line key={`comparison-${series.id}`} dataKey={comparisonKey(series.id)} name={`${seriesLabel(props, index)} · ${locale === 'ar' ? 'الفترة السابقة' : 'Previous'}`} stroke={colors[index % colors.length]} strokeDasharray="5 4" dot={false} connectNulls={false} />] : [])];
    })}
  </ComposedChart></ResponsiveContainer></div>;
}
