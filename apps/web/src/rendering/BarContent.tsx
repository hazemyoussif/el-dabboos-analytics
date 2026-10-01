import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { localeTag } from '../i18n.ts';
import { colors, seriesLabel, tooltipFormatter, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';

export function BarContent(props: RenderSeriesProps & { data: ChartRow[] }) {
  const { widget, data, locale, profile } = props;
  const horizontal = widget.presentation?.orientation !== 'vertical';
  const numberTick = (n: number) => new Intl.NumberFormat(localeTag(locale, profile), { notation: 'compact' }).format(Number(n));
  return <div className="chart-wrap chart-bar" style={{ overflow: 'auto' }}><div style={{ width: horizontal ? '100%' : `${Math.max(100, data.length * 60)}px`, minWidth: '100%', height: horizontal ? Math.max(245, data.length * 32 + 60) : '100%' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 2, right: 12, bottom: 4, left: 4 }}>
    <CartesianGrid stroke="#e8edf2" strokeDasharray="3 4" horizontal={!horizontal} vertical={horizontal} />
    <XAxis type={horizontal ? 'number' : 'category'} dataKey={horizontal ? undefined : 'label'} tick={{ fill: '#7b8999', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={horizontal ? numberTick : undefined} interval={0} />
    <YAxis type={horizontal ? 'category' : 'number'} dataKey={horizontal ? 'label' : undefined} orientation={locale === 'ar' ? 'right' : 'left'} width={horizontal ? 120 : 56} tick={{ fill: '#56687a', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={horizontal ? undefined : numberTick} interval={0} />
    <Tooltip formatter={tooltipFormatter(props)} contentStyle={{ borderRadius: 12, border: '1px solid #e6ebf0' }} />
    {widget.presentation?.legend !== 'hide' && <Legend />}
    {widget.series.map((series, index) => <Bar key={series.id} dataKey={valueKey(series.id)} name={seriesLabel(props, index)} fill={colors[index % colors.length]} radius={horizontal ? [0, 5, 5, 0] : [5, 5, 0, 0]} maxBarSize={24} />)}
  </BarChart></ResponsiveContainer></div></div>;
}
