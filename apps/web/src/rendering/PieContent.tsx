import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { colors, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';
import { cardinalityWarning, compositionData, compositionWarning } from './composition.ts';
export function PieContent(props: RenderSeriesProps & { data: ChartRow[] }) {
  const { widget, data, locale, formatSeries } = props;
  const series = widget.series[0]!;
  const composition = compositionData(data, valueKey(series.id));
  if (composition.status !== 'ok') return <p role="status" className="series-warning">{compositionWarning[locale]}</p>;
  const donut = widget.presentation?.pieVariant === 'donut';
  const labels = widget.presentation?.dataLabels === 'show' || widget.presentation?.dataLabels !== 'hide' && composition.rows.length <= 6;
  return <div className="chart-wrap composition-chart">
    {composition.rows.length > 12 && <p className="series-warning">{cardinalityWarning[locale]}</p>}
    <div className="composition-plot"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition.rows} dataKey="value" nameKey="name" innerRadius={donut ? '48%' : 0} outerRadius="72%" label={labels ? item => String(item.name) : false} labelLine={labels} isAnimationActive={false}>
      {composition.rows.map((row, index) => <Cell key={`${row.name}-${index}`} fill={colors[index % colors.length]} />)}
      {donut && <Label position="center" value={formatSeries(series.id, composition.total)} fontSize={12} />}
    </Pie><Tooltip formatter={value => typeof value === 'number' ? formatSeries(series.id, value) : '—'} />{widget.presentation?.legend !== 'hide' && <Legend />}</PieChart></ResponsiveContainer></div>
  </div>;
}
