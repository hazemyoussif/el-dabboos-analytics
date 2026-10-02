import type { WidgetExecution } from '@el-dabboos/application';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';
import { cardinalityWarning, compositionData, compositionWarning } from './composition.ts';
import { ChartFrame, EnterpriseTooltip } from './ChartChrome.tsx';
import { seriesColor } from './chart-theme.ts';
import type { ChartTheme } from './chart-theme.ts';
import { Notice } from '../presentation/Feedback.tsx';
function Cell({ x = 0, y = 0, width = 0, height = 0, name = '', value = 0, sourceIndex, depth = 0, labels, format, theme, rtl, categoryIndices }: { x?: number; y?: number; width?: number; height?: number; name?: string; value?: number; sourceIndex?: number; categoryIndices: number[]; depth?: number; labels: boolean; format: (value: number) => string; theme: ChartTheme; rtl: boolean }) {
  if (depth !== 1) return <g />;
  return <g><rect x={x+1} y={y+1} width={Math.max(0,width-2)} height={Math.max(0,height-2)} rx={3} fill={seriesColor(theme,Math.max(0,categoryIndices.indexOf(sourceIndex ?? -1)))} stroke={theme.tooltip} /><title>{name}: {format(value)}</title>{labels && width > 85 && height > 45 && <><text x={rtl ? x+width-8 : x+8} y={y+20} textAnchor={rtl ? 'end' : 'start'} fill={theme.onMark} fontSize={11}>{name.length > Math.floor(width / 8) ? `${name.slice(0, Math.floor(width / 8) - 1)}…` : name}</text><text x={rtl ? x+width-8 : x+8} y={y+37} textAnchor={rtl ? 'end' : 'start'} fill={theme.onMark} fontSize={10}>{format(value)}</text></>}</g>;
}
export function TreemapContent(props: RenderSeriesProps & { entry: WidgetExecution; data: ChartRow[] }) {
  const { widget, data, locale, formatSeries, theme } = props;
  const series = widget.series[0]!; const composition = compositionData(data, valueKey(series.id));
  if (composition.status !== 'ok') return <Notice>{compositionWarning[locale]}</Notice>;
  return <>{composition.rows.length > 20 && <Notice>{cardinalityWarning[locale]}</Notice>}<ChartFrame props={props} composition items={composition.rows.map((row,index) => ({ key:`${row.name}-${index}`,label:row.name,color:seriesColor(theme,index) }))}>
    <ResponsiveContainer width="100%" height="100%"><Treemap data={composition.rows} dataKey="value" nameKey="name" isAnimationActive={false} content={<Cell labels={widget.presentation?.dataLabels !== 'hide'} format={value => formatSeries(series.id, value)} theme={theme} rtl={locale === 'ar'} categoryIndices={composition.rows.map(row => row.sourceIndex)} />}>
      <Tooltip content={<EnterpriseTooltip props={props} entry={props.entry} composition categoryIndices={composition.rows.map(row => row.sourceIndex)} />} />
    </Treemap></ResponsiveContainer></ChartFrame></>;
}
