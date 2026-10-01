import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { colors, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';
import { cardinalityWarning, compositionData, compositionWarning } from './composition.ts';
function Cell({ x = 0, y = 0, width = 0, height = 0, name = '', value = 0, index = 0, depth = 0, labels, format }: { x?: number; y?: number; width?: number; height?: number; name?: string; value?: number; index?: number; depth?: number; labels: boolean; format: (value: number) => string }) {
  if (depth !== 1) return <g />;
  return <g><rect x={x} y={y} width={width} height={height} fill={colors[index % colors.length]} stroke="#fff" /><title>{name}: {format(value)}</title>{labels && width > 85 && height > 45 && <><text x={x + 8} y={y + 20} fill="#fff" fontSize={11}>{name.length > Math.floor(width / 8) ? `${name.slice(0, Math.floor(width / 8) - 1)}…` : name}</text><text x={x + 8} y={y + 37} fill="#fff" fontSize={10}>{format(value)}</text></>}</g>;
}
export function TreemapContent(props: RenderSeriesProps & { data: ChartRow[] }) {
  const { widget, data, locale, formatSeries } = props;
  const series = widget.series[0]!;
  const composition = compositionData(data, valueKey(series.id));
  if (composition.status !== 'ok') return <p role="status" className="series-warning">{compositionWarning[locale]}</p>;
  return <div className="chart-wrap composition-chart">{composition.rows.length > 20 && <p className="series-warning">{cardinalityWarning[locale]}</p>}
    <div className="composition-plot"><ResponsiveContainer width="100%" height="100%"><Treemap data={composition.rows} dataKey="value" nameKey="name" isAnimationActive={false} content={<Cell labels={widget.presentation?.dataLabels !== 'hide'} format={value => formatSeries(series.id, value)} />}>
      <Tooltip formatter={value => typeof value === 'number' ? formatSeries(series.id, value) : '—'} />
    </Treemap></ResponsiveContainer></div>{widget.presentation?.legend === 'show' && <div className="composition-legend">{composition.rows.map((row, index) => <span key={`${row.name}-${index}`}><i style={{ background: colors[index % colors.length] }} />{row.name}</span>)}</div>}</div>;
}
