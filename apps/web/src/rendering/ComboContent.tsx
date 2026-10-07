import { CategoryAxisTick } from './CategoryAxisTick.tsx';
import type { WidgetExecution } from '@el-dabboos/application';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { localeTag } from '../i18n.ts';
import { comparisonKey, seriesLabel, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';
import { axisStyle, ChartFrame, EnterpriseTooltip } from './ChartChrome.tsx';
import { chartMargins, seriesColor } from './chart-theme.ts';
export function ComboContent(props: RenderSeriesProps & { entry: WidgetExecution; data: ChartRow[] }) {
  const { widget, entry, data, locale, profile, theme } = props;
  return <ChartFrame props={props} entry={entry}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={chartMargins}>
    <CartesianGrid stroke={theme.grid} strokeDasharray="3 4" vertical={false} /><XAxis {...axisStyle(theme)} dataKey="label" interval="preserveStartEnd" minTickGap={24} tick={<CategoryAxisTick fill={theme.axis} locale={locale} />} />
    <YAxis {...axisStyle(theme)} orientation={locale === 'ar' ? 'right' : 'left'} width={56} tickFormatter={n => new Intl.NumberFormat(localeTag(locale, profile), { notation: 'compact' }).format(Number(n))} />
    <Tooltip content={<EnterpriseTooltip props={props} entry={entry} />} cursor={{ fill: theme.highlight }} />
    {widget.series.flatMap((series, index) => {
      const mark = series.presentation?.mark ?? (index === 0 ? 'bar' : 'line');
      return [mark === 'bar' ? <Bar key={series.id} dataKey={valueKey(series.id)} name={seriesLabel(props,index)} fill={seriesColor(theme,index)} radius={[3,3,0,0]} maxBarSize={26} isAnimationActive={false} /> : <Line key={series.id} type={widget.presentation?.curve === 'smooth' ? 'monotone' : 'linear'} dataKey={valueKey(series.id)} name={seriesLabel(props,index)} stroke={seriesColor(theme,index)} strokeWidth={2.5} dot={false} activeDot={{ r:4,stroke:theme.tooltip }} connectNulls={false} isAnimationActive={false} />,
        ...(entry.alignedRows.some(row => row.series[series.id]?.comparisonValue !== undefined) ? [<Line key={`comparison-${series.id}`} dataKey={comparisonKey(series.id)} stroke={seriesColor(theme,index)} strokeOpacity={0.6} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />] : [])];
    })}
  </ComposedChart></ResponsiveContainer></ChartFrame>;
}
