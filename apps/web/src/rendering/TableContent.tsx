import type { WidgetExecution } from '@el-dabbous/application';
import { copy, formatKey } from '../i18n.ts';
import { seriesLabel } from './shared.ts';
import type { RenderSeriesProps } from './shared.ts';

export function TableContent(props: RenderSeriesProps & { entry: WidgetExecution }) {
  const { widget, entry, locale, profile, formatSeries } = props;
  const t = copy[locale];
  return <div className="table-wrap"><table><thead><tr><th>{widget.dimension ? t.dimensions[widget.dimension] : t.results}</th>{widget.series.map((series, index) => <th key={series.id}>{seriesLabel(props, index)}</th>)}</tr></thead><tbody>{entry.alignedRows.map((row, index) => <tr key={`${row.key}-${index}`}><td>{formatKey(row.key, widget.dimension, locale, profile)}</td>{widget.series.map(series => <td key={series.id}>{formatSeries(series.id, row.series[series.id]?.value ?? null)}</td>)}</tr>)}</tbody></table></div>;
}
