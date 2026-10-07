import { successfulMetricMetadata } from '../metrics/definition-copy.ts';
import { MetricInfo } from '../metrics/MetricDefinition.tsx';
import type { WidgetExecution } from '@el-dabboos/application';
import { copy, formatKey } from '../i18n.ts';
import { seriesLabel } from './shared.ts';
import type { RenderSeriesProps } from './shared.ts';

export function TableContent(props: RenderSeriesProps & { entry: WidgetExecution }) {
  const { widget, entry, locale, profile, formatSeries } = props;
  const t = copy[locale];
  return <div className="table-wrap" style={{ borderColor: props.theme.grid }}><table><thead><tr><th>{widget.dimension ? t.dimensions[widget.dimension] : t.results}</th>{widget.series.map((series, index) => <th key={series.id}>{seriesLabel(props, index)}{props.catalog[series.metric] && <MetricInfo metric={props.catalog[series.metric]!} locale={locale} currency={profile.reportingCurrency} metadata={successfulMetricMetadata(entry.seriesResults[series.id])} />}</th>)}</tr></thead><tbody>{entry.alignedRows.map((row, index) => <tr key={`${row.key}-${index}`}><td>{props.keyLabel?.(row.key)??formatKey(row.key, widget.dimension, locale, profile)}</td>{widget.series.map(series => <td key={series.id}>{formatSeries(series.id, row.series[series.id]?.value ?? null)}</td>)}</tr>)}</tbody></table></div>;
}
