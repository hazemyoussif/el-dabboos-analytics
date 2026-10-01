import type { WidgetExecution } from '@el-dabbous/application';
import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { compactSeriesValue, valueKey } from './shared.ts';
import type { ChartRow, RenderSeriesProps } from './shared.ts';
import { cardinalityWarning, compositionData, compositionWarning } from './composition.ts';
import { ChartFrame, EnterpriseTooltip } from './ChartChrome.tsx';
import { seriesColor } from './chart-theme.ts';
import { Notice } from '../presentation/Feedback.tsx';
export function PieContent(props: RenderSeriesProps & { entry: WidgetExecution; data: ChartRow[] }) {
  const { widget, data, locale, theme } = props;
  const series = widget.series[0]!;
  const composition = compositionData(data, valueKey(series.id));
  if (composition.status !== 'ok') return <Notice>{compositionWarning[locale]}</Notice>;
  const donut = widget.presentation?.pieVariant === 'donut';
  const labels = widget.presentation?.dataLabels === 'show' || widget.presentation?.dataLabels !== 'hide' && composition.rows.length <= 6;
  const items = composition.rows.map((row,index) => ({ key: `${row.name}-${index}`,label: row.name,color: seriesColor(theme,index) }));
  return <>{composition.rows.length > 12 && <Notice>{cardinalityWarning[locale]}</Notice>}<ChartFrame props={props} items={items} composition>
    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition.rows} dataKey="value" nameKey="name" innerRadius={donut ? '50%' : 0} outerRadius="72%" paddingAngle={1} stroke={theme.tooltip} label={labels ? item => String(item.name) : false} labelLine={labels} isAnimationActive={false}>
      {composition.rows.map((row, index) => <Cell key={`${row.name}-${index}`} fill={seriesColor(theme,index)} />)}
      {donut && <Label position="center" value={compactSeriesValue(props, series.id, composition.total)} fill={theme.text} fontSize={11} />}
    </Pie><Tooltip content={<EnterpriseTooltip props={props} entry={props.entry} composition categoryIndices={composition.rows.map(row => row.sourceIndex)} />} /></PieChart></ResponsiveContainer>
  </ChartFrame></>;
}
