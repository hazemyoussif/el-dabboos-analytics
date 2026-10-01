import type { WidgetExecution } from '@el-dabbous/application';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { localeTag } from '../i18n.ts';
import { comparisonKey, seriesLabel, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';
import { axisStyle, ChartFrame, EnterpriseTooltip } from './ChartChrome.tsx';
import { chartMargins, seriesColor } from './chart-theme.ts';
export function AreaContent(props: RenderSeriesProps & { entry: WidgetExecution; data: ChartRow[] }) {
  const { widget, entry, data, locale, profile, theme } = props;
  return <ChartFrame props={props} entry={entry}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={chartMargins}>
    <CartesianGrid stroke={theme.grid} strokeDasharray="3 4" vertical={false} /><XAxis {...axisStyle(theme)} dataKey="label" interval="preserveStartEnd" minTickGap={24} />
    <YAxis {...axisStyle(theme)} orientation={locale === 'ar' ? 'right' : 'left'} width={56} tickFormatter={n => new Intl.NumberFormat(localeTag(locale, profile), { notation: 'compact' }).format(Number(n))} />
    <Tooltip content={<EnterpriseTooltip props={props} entry={entry} />} cursor={{ stroke: theme.border, strokeDasharray: '3 4' }} />
    {widget.series.flatMap((series, index) => [<Area key={series.id} type={widget.presentation?.curve === 'smooth' ? 'monotone' : 'linear'} dataKey={valueKey(series.id)} name={seriesLabel(props, index)} stroke={seriesColor(theme,index)} strokeWidth={2.5} fill={seriesColor(theme,index)} fillOpacity={0.12} connectNulls={false} isAnimationActive={false} />,
      ...(entry.alignedRows.some(row => row.series[series.id]?.comparisonValue !== undefined) ? [<Line key={`comparison-${series.id}`} dataKey={comparisonKey(series.id)} stroke={seriesColor(theme,index)} strokeOpacity={0.6} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />] : [])])}
  </ComposedChart></ResponsiveContainer></ChartFrame>;
}
