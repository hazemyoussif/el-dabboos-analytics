import type { WidgetExecution } from '@el-dabboos/application';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CategoryAxisTick } from './CategoryAxisTick.tsx';
import { DrillBarMark } from './DrillMarks.tsx';
import { localeTag } from '../i18n.ts';
import { seriesLabel, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';
import { axisStyle, ChartFrame, EnterpriseTooltip } from './ChartChrome.tsx';
import { chartMargins, seriesColor } from './chart-theme.ts';
export function BarContent(props: RenderSeriesProps & { entry: WidgetExecution; data: ChartRow[] }) {
  const { widget, data, locale, profile, theme } = props;
  const horizontal = widget.presentation?.orientation !== 'vertical';
  const numberTick = (n: number) => new Intl.NumberFormat(localeTag(locale, profile), { notation: 'compact' }).format(Number(n));
  return <ChartFrame props={props} className="chart-bar"><div className="bar-scroll"><div style={{ width: horizontal ? '100%' : `${Math.max(100, data.length * 60)}px`, minWidth: '100%', height: horizontal ? Math.max(190, data.length * 30 + 38) : '100%' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={chartMargins}>
    <CartesianGrid stroke={theme.grid} strokeDasharray="3 4" horizontal={!horizontal} vertical={horizontal} />
    <XAxis {...axisStyle(theme)} type={horizontal ? 'number' : 'category'} dataKey={horizontal ? undefined : 'label'} tickFormatter={horizontal ? numberTick : undefined} interval={0} tick={horizontal ? axisStyle(theme).tick : <CategoryAxisTick fill={theme.axis} locale={locale} />} />
    <YAxis {...axisStyle(theme)} type={horizontal ? 'category' : 'number'} dataKey={horizontal ? 'label' : undefined} orientation={locale === 'ar' ? 'right' : 'left'} width={horizontal ? 110 : 56} tickFormatter={horizontal ? undefined : numberTick} interval={0} tick={horizontal ? <CategoryAxisTick fill={theme.axis} locale={locale} horizontal /> : axisStyle(theme).tick} />
    <Tooltip content={<EnterpriseTooltip props={props} entry={props.entry} />} cursor={{ fill: theme.highlight }} />
    {widget.series.map((series, index) => <Bar shape={mark => <DrillBarMark mark={mark} props={props} seriesId={series.id}/>} key={series.id} dataKey={valueKey(series.id)} name={seriesLabel(props, index)} fill={seriesColor(theme,index)} activeBar={false} radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />)}
  </BarChart></ResponsiveContainer></div></div></ChartFrame>;
}
