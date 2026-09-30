import type { DashboardExecutionResult, WidgetExecution } from '@el-dabbous/application';
import type { DashboardWidget, Locale, SemanticMetric, TenantProfile } from '@el-dabbous/domain';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { copy, formatKey, formatValue, localeTag } from './i18n.ts';

interface Props { execution: DashboardExecutionResult; catalog: Record<string, SemanticMetric>; locale: Locale; profile: TenantProfile }
const colors = ['#0aa992', '#3274bd', '#e8943a', '#9a6cd3', '#e06377', '#6c8b3c', '#7a91a8', '#c168a6'];
const valueKey = (id: string) => `v_${id}`;
const comparisonKey = (id: string) => `c_${id}`;
export function WidgetCard({ widget, entry, catalog, locale, profile }: { widget: DashboardWidget; entry: WidgetExecution | undefined; catalog: Record<string, SemanticMetric>; locale: Locale; profile: TenantProfile }) {
  const t = copy[locale];
  const labels = widget.series.map(series => catalog[series.metric]?.labels[locale] ?? series.metric.replaceAll('_', ' '));
  const title = widget.title?.[locale] ?? (labels.length === 1 ? labels[0]! : labels.join(' · '));
  const subtitle = widget.dimension ? t.dimensions[widget.dimension] : catalog[widget.series[0]!.metric]?.descriptions[locale] ?? '';
  const failures = widget.series.flatMap(series => {
    const result = entry?.seriesResults[series.id];
    return result?.status === 'error' ? [result.error.message] : [];
  });
  if (!entry || entry.status === 'error') return <article className="widget widget-error"><div className="widget-heading"><span>{title}</span><span className="widget-icon">!</span></div><p>{failures.join(' · ') || t.failed}</p></article>;
  const data = entry.alignedRows.map(row => {
    const item: Record<string, string | number | null> = { label: formatKey(row.key, widget.dimension, locale, profile) };
    for (const series of widget.series) {
      item[valueKey(series.id)] = row.series[series.id]?.value ?? null;
      if (row.series[series.id]?.comparisonValue !== undefined) item[comparisonKey(series.id)] = row.series[series.id]?.comparisonValue ?? null;
    }
    return item;
  });
  const fmt = (seriesId: string, value: number | null) => {
    const series = widget.series.find(s => s.id === seriesId)!;
    const metric = catalog[series.metric];
    return formatValue(value, metric?.type ?? 'number', locale, profile, metric?.presentation.unit);
  };
  const hasData = entry.alignedRows.some(row => Object.values(row.series).some(value => value !== null && value.value !== null));
  const labelFor = (index: number) => labels[index] ?? widget.series[index]!.id;
  const formatter = (value: unknown, name: unknown) => {
    const index = labels.findIndex(label => label === name);
    const seriesId = widget.series[index]?.id ?? widget.series[0]!.id;
    return typeof value === 'number' ? fmt(seriesId, value) : '—';
  };
  let content;
  if (!hasData) content = <div className="widget-empty">{t.empty}</div>;
  else if (widget.type === 'kpi') {
    const series = widget.series[0]!;
    const result = entry.seriesResults[series.id];
    const row = result?.status === 'success' ? result.result.rows[0] : undefined;
    content = <div className="kpi-content"><div className="kpi-value">{fmt(series.id, row?.value ?? null)}</div>
      {row?.percentageChange !== undefined && row.percentageChange !== null && <span className={`change ${row.percentageChange >= 0 ? 'positive' : 'negative'}`}>{row.percentageChange >= 0 ? '↑' : '↓'} {formatValue(Math.abs(row.percentageChange), 'percentage', locale, profile)}</span>}
      <span className="kpi-caption">{catalog[series.metric]?.descriptions[locale]}</span></div>;
  } else if (widget.type === 'line') content = <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
    <CartesianGrid stroke="#e8edf2" strokeDasharray="3 4" vertical={false} />
    <XAxis dataKey="label" tick={{ fill: '#7b8999', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
    <YAxis orientation={locale === 'ar' ? 'right' : 'left'} tick={{ fill: '#7b8999', fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={n => new Intl.NumberFormat(localeTag(locale, profile), { notation: 'compact' }).format(Number(n))} />
    <Tooltip formatter={formatter} contentStyle={{ borderRadius: 12, border: '1px solid #e6ebf0' }} />
    <Legend />
    {widget.series.flatMap((series, index) => [
      ...(entry.alignedRows.some(row => row.series[series.id]?.comparisonValue !== undefined) ? [<Line key={`comparison-${series.id}`} dataKey={comparisonKey(series.id)} name={`${labelFor(index)} · ${locale === 'ar' ? 'الفترة السابقة' : 'Previous'}`} stroke={colors[index % colors.length]} strokeOpacity={0.42} strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls={false} />] : []),
      <Line key={series.id} dataKey={valueKey(series.id)} name={labelFor(index)} stroke={colors[index % colors.length]} strokeWidth={3} dot={false} activeDot={{ r: 5 }} connectNulls={false} />,
    ])}
  </LineChart></ResponsiveContainer></div>;
  else if (widget.type === 'bar') content = <div className="chart-wrap chart-bar"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 2, right: 12, bottom: 4, left: 4 }}>
    <CartesianGrid stroke="#e8edf2" strokeDasharray="3 4" horizontal={false} />
    <XAxis type="number" tick={{ fill: '#7b8999', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={n => new Intl.NumberFormat(localeTag(locale, profile), { notation: 'compact' }).format(Number(n))} />
    <YAxis type="category" dataKey="label" orientation={locale === 'ar' ? 'right' : 'left'} width={108} tick={{ fill: '#56687a', fontSize: 11 }} tickLine={false} axisLine={false} />
    <Tooltip formatter={formatter} contentStyle={{ borderRadius: 12, border: '1px solid #e6ebf0' }} />
    <Legend />
    {widget.series.map((series, index) => <Bar key={series.id} dataKey={valueKey(series.id)} name={labelFor(index)} fill={colors[index % colors.length]} radius={[0, 5, 5, 0]} maxBarSize={24} />)}
  </BarChart></ResponsiveContainer></div>;
  else content = <div className="table-wrap"><table><thead><tr><th>{widget.dimension ? t.dimensions[widget.dimension] : t.results}</th>{widget.series.map((series, index) => <th key={series.id}>{labelFor(index)}</th>)}</tr></thead><tbody>{entry.alignedRows.map((row, index) => <tr key={`${row.key}-${index}`}><td>{formatKey(row.key, widget.dimension, locale, profile)}</td>{widget.series.map(series => <td key={series.id}>{fmt(series.id, row.series[series.id]?.value ?? null)}</td>)}</tr>)}</tbody></table></div>;
  return <article className={`widget widget-${widget.type}`}><div className="widget-heading"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="widget-icon">{widget.type === 'kpi' ? '↗' : widget.type === 'line' ? '⌁' : widget.type === 'bar' ? '▥' : '≡'}</span></div>{entry.status === 'partial' && <p className="series-warning">{t.partial}: {failures.join(' · ')}</p>}{content}</article>;
}
export function DashboardRenderer({ execution, catalog, locale, profile }: Props) {
  return <div className="dashboard-grid">{execution.dashboard.widgets.map(widget => <WidgetCard key={widget.id} widget={widget} entry={execution.widgetResults[widget.id]} catalog={catalog} locale={locale} profile={profile} />)}</div>;
}
