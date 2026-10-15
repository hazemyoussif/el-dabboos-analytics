import {useMemo} from 'react';
import {timeDimensions} from '@el-dabboos/domain';
import {RowPages,useRowPages} from './RowPages.tsx';
import {numberFormatter} from '../presentation/number-format.ts';
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
  const ordered=useMemo(()=>orderedBarRows(widget,data),[data,widget]);
  const paging=useRowPages(ordered,25),visible=paging.rows;
  const horizontal = widget.presentation?.orientation !== 'vertical';
  const extent=useMemo(()=>barExtent(data,widget.series),[data,widget.series]),domains=numericDomains(horizontal,extent);
  const percentage=widget.series.every(series=>series.analysis?.pareto||series.analysis?.percentageContribution||props.catalog[series.metric]?.type==='percentage');
  const numberTick = (value: number) => `${numberFormatter(localeTag(locale, profile), { notation: 'compact' }).format(Number(value))}${percentage?'%':''}`;
  return <><ChartFrame props={props} className="chart-bar"><div className="bar-scroll"><div style={{ width: horizontal ? '100%' : `${Math.max(100, visible.length * 60)}px`, minWidth: '100%', height: horizontal ? Math.max(190, visible.length * 30 + 38) : '100%' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={visible} layout={horizontal ? 'vertical' : 'horizontal'} margin={chartMargins}>
    <CartesianGrid stroke={theme.grid} strokeDasharray="3 4" horizontal={!horizontal} vertical={horizontal} />
    <XAxis {...axisStyle(theme)} domain={domains.x} type={horizontal ? 'number' : 'category'} dataKey={horizontal ? undefined : 'label'} tickFormatter={horizontal ? numberTick : undefined} interval={0} tick={horizontal ? axisStyle(theme).tick : <CategoryAxisTick fill={theme.axis} locale={locale} />} />
    <YAxis {...axisStyle(theme)} domain={domains.y} type={horizontal ? 'category' : 'number'} dataKey={horizontal ? 'label' : undefined} orientation={locale === 'ar' ? 'right' : 'left'} width={horizontal ? 110 : 56} tickFormatter={horizontal ? undefined : numberTick} interval={0} tick={horizontal ? <CategoryAxisTick fill={theme.axis} locale={locale} horizontal /> : axisStyle(theme).tick} />
    <Tooltip content={<EnterpriseTooltip props={props} entry={props.entry} />} cursor={{ fill: theme.highlight }} />
    {widget.series.map((series, index) => <Bar shape={mark => <DrillBarMark mark={mark} props={props} seriesId={series.id}/>} key={series.id} dataKey={valueKey(series.id)} name={seriesLabel(props, index)} fill={seriesColor(theme,index)} activeBar={false} radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />)}
  </BarChart></ResponsiveContainer></div></div></ChartFrame><RowPages paging={paging} locale={locale} kind="chart"/></>;
}

function numericDomains(horizontal:boolean,extent:[number,number]){return {x:horizontal?extent:undefined,y:horizontal?undefined:extent};}
function barExtent(data:readonly ChartRow[],series:RenderSeriesProps['widget']['series']):[number,number]{
 let minimum=0,maximum=0;
 for(const row of data)for(const item of series){const value=row[valueKey(item.id)];if(typeof value==='number'&&Number.isFinite(value)){minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);}}
 return [minimum,maximum===minimum?maximum+1:maximum];
}

export function orderedBarRows(widget:RenderSeriesProps['widget'],data:readonly ChartRow[]){
 if(widget.dimension&&timeDimensions.includes(widget.dimension)||widget.series.some(series=>series.analysis))return data;
 return [...data].sort((left,right)=>Number(right[valueKey(widget.series[0]!.id)]??-Infinity)-Number(left[valueKey(widget.series[0]!.id)]??-Infinity)||String(left.label).localeCompare(String(right.label)));
}
