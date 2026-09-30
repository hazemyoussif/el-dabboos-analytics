import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { localeTag } from '../i18n.ts';
import { colors, seriesLabel, tooltipFormatter, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';

export function BarContent(props: RenderSeriesProps & { data: ChartRow[] }) {
  const { widget, data, locale, profile } = props;
  return <div className="chart-wrap chart-bar"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 2, right: 12, bottom: 4, left: 4 }}>
    <CartesianGrid stroke="#e8edf2" strokeDasharray="3 4" horizontal={false} />
    <XAxis type="number" tick={{ fill: '#7b8999', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={n => new Intl.NumberFormat(localeTag(locale, profile), { notation: 'compact' }).format(Number(n))} />
    <YAxis type="category" dataKey="label" orientation={locale === 'ar' ? 'right' : 'left'} width={108} tick={{ fill: '#56687a', fontSize: 11 }} tickLine={false} axisLine={false} />
    <Tooltip formatter={tooltipFormatter(props)} contentStyle={{ borderRadius: 12, border: '1px solid #e6ebf0' }} />
    <Legend />
    {widget.series.map((series, index) => <Bar key={series.id} dataKey={valueKey(series.id)} name={seriesLabel(props, index)} fill={colors[index % colors.length]} radius={[0, 5, 5, 0]} maxBarSize={24} />)}
  </BarChart></ResponsiveContainer></div>;
}
