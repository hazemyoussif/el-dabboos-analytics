import type { DashboardExecutionResult } from '@el-dabbous/application';
import type { DashboardWidget, Locale, SemanticMetric } from '@el-dabbous/domain';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { copy, formatKey, formatValue } from './i18n.ts';

interface Props { execution: DashboardExecutionResult; catalog: Record<string, SemanticMetric>; locale: Locale }
const fallback = (widget: DashboardWidget, locale: Locale) => widget.title?.[locale] ?? widget.metric.replaceAll('_', ' ');
export function WidgetCard({ widget, entry, metric, locale }: { widget: DashboardWidget; entry: DashboardExecutionResult['widgetResults'][string] | undefined; metric: SemanticMetric | undefined; locale: Locale }) {
  const t = copy[locale];
  const title = metric?.labels[locale] ?? fallback(widget, locale);
  const subtitle = widget.dimension ? t.dimensions[widget.dimension] : metric?.descriptions[locale] ?? '';
  if (!entry || entry.status === 'error') return <article className="widget widget-error"><div className="widget-heading"><span>{title}</span><span className="widget-icon">!</span></div><p>{entry?.status === 'error' ? entry.error.message : t.failed}</p></article>;
  const result = entry.result;
  const rows = result.rows;
  const type = result.metadata.metricType;
  const fmt = (value: number | null) => formatValue(value, type, locale, result.metadata.unit);
  const data = rows.map(row => ({ label: formatKey(row.key, widget.dimension, locale), value: row.value, comparison: row.comparisonValue ?? undefined }));
  const hasComparison = rows.some(row => row.comparisonValue !== undefined);
  const tooltipFormatter = (value: unknown) => typeof value === 'number' ? fmt(value) : String(value ?? '—');
  let content;
  if (rows.length === 0 || rows.every(row => row.value === null)) content = <div className="widget-empty">{t.empty}</div>;
  else if (widget.type === 'kpi') {
    const row = rows[0]!;
    content = <div className="kpi-content"><div className="kpi-value">{fmt(row.value)}</div>
      {row.percentageChange !== undefined && row.percentageChange !== null && <span className={`change ${row.percentageChange >= 0 ? 'positive' : 'negative'}`}>{row.percentageChange >= 0 ? '↑' : '↓'} {formatValue(Math.abs(row.percentageChange), 'percentage', locale)}</span>}
      <span className="kpi-caption">{metric?.descriptions[locale]}</span></div>;
  } else if (widget.type === 'line') content = <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
    <CartesianGrid stroke="#e8edf2" strokeDasharray="3 4" vertical={false} />
    <XAxis dataKey="label" tick={{ fill: '#7b8999', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
    <YAxis orientation={locale === 'ar' ? 'right' : 'left'} tick={{ fill: '#7b8999', fontSize: 11 }} tickLine={false} axisLine={false} width={48} tickFormatter={n => new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { notation: 'compact' }).format(Number(n))} />
    <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: '1px solid #e6ebf0' }} />
    {hasComparison && <Line dataKey="comparison" name={locale === 'ar' ? 'الفترة السابقة' : 'Previous period'} stroke="#a6bac5" strokeDasharray="5 4" strokeWidth={2} dot={false} />}
    <Line dataKey="value" name={title} stroke="#00a992" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
  </LineChart></ResponsiveContainer></div>;
  else if (widget.type === 'bar') content = <div className="chart-wrap chart-bar"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 2, right: 12, bottom: 4, left: 4 }}>
    <CartesianGrid stroke="#e8edf2" strokeDasharray="3 4" horizontal={false} />
    <XAxis type="number" tick={{ fill: '#7b8999', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={n => new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { notation: 'compact' }).format(Number(n))} />
    <YAxis type="category" dataKey="label" orientation={locale === 'ar' ? 'right' : 'left'} width={108} tick={{ fill: '#56687a', fontSize: 11 }} tickLine={false} axisLine={false} />
    <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: '1px solid #e6ebf0' }} />
    <Bar dataKey="value" name={title} fill="#14b8a6" radius={[0, 5, 5, 0]} maxBarSize={24} />
  </BarChart></ResponsiveContainer></div>;
  else content = <div className="table-wrap"><table><thead><tr><th>{widget.dimension ? t.dimensions[widget.dimension] : t.results}</th><th>{title}</th>{rows.some(r => r.rank) && <th>{t.rank}</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.key}-${index}`}><td>{formatKey(row.key, widget.dimension, locale)}</td><td>{fmt(row.value)}</td>{rows.some(r => r.rank) && <td>{row.rank}</td>}</tr>)}</tbody></table></div>;
  return <article className={`widget widget-${widget.type}`}><div className="widget-heading"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="widget-icon">{widget.type === 'kpi' ? '↗' : widget.type === 'line' ? '⌁' : widget.type === 'bar' ? '▥' : '≡'}</span></div>{content}</article>;
}
export function DashboardRenderer({ execution, catalog, locale }: Props) {
  return <div className="dashboard-grid">{execution.dashboard.widgets.map(widget => <WidgetCard key={widget.id} widget={widget} entry={execution.widgetResults[widget.id]} metric={catalog[widget.metric]} locale={locale} />)}</div>;
}
