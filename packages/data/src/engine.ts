import { semanticCatalog, validateQuery } from '@el-dabbous/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsResult, AnalyticsRow, Aggregation, DimensionId } from '@el-dabbous/domain';
import type { AnalyticsFact } from './facts.ts';

function dimension(f: AnalyticsFact, id: DimensionId): string | undefined {
  if (id === 'date') return f.date;
  if (id === 'month') return f.date.slice(0, 7);
  if (id === 'year') return f.date.slice(0, 4);
  if (id === 'quarter') return `${f.date.slice(0, 4)}-Q${Math.floor((Number(f.date.slice(5, 7)) - 1) / 3) + 1}`;
  return f.dimensions[id];
}
function aggregate(values: number[], kind: Aggregation): number {
  if (!values.length) return 0;
  switch (kind) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'count': return values.length;
    case 'average': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
  }
}
function grouped(facts: AnalyticsFact[], query: AnalyticsQuery): AnalyticsRow[] {
  const filtered = facts.filter(f =>
    (!query.dateRange || f.date >= query.dateRange.from && f.date <= query.dateRange.to) &&
    (!query.filters || query.filters.every(filter => filter.values.includes(dimension(f, filter.dimension) ?? '')))
  );
  const groups = new Map<string | null, number[]>();
  for (const fact of filtered) {
    const key = query.groupBy ? dimension(fact, query.groupBy) : null;
    if (key === undefined) continue;
    const values = groups.get(key) ?? [];
    values.push(fact.value);
    groups.set(key, values);
  }
  if (!query.groupBy && !groups.size) groups.set(null, []);
  const aggregation = query.aggregation ?? semanticCatalog[query.metric].defaultAggregation;
  return [...groups].map(([key, values]) => ({ key, value: aggregate(values, aggregation) }))
    .sort((a, b) => String(a.key).localeCompare(String(b.key)));
}
function shiftRange(range: NonNullable<AnalyticsQuery['dateRange']>, kind: string): NonNullable<AnalyticsQuery['dateRange']> {
  const from = new Date(`${range.from}T00:00:00Z`);
  const to = new Date(`${range.to}T00:00:00Z`);
  if (kind === 'year_over_year') { from.setUTCFullYear(from.getUTCFullYear() - 1); to.setUTCFullYear(to.getUTCFullYear() - 1); }
  else if (kind === 'month_over_month') { from.setUTCMonth(from.getUTCMonth() - 1); to.setUTCMonth(to.getUTCMonth() - 1); }
  else {
    const span = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    from.setUTCDate(from.getUTCDate() - span); to.setUTCDate(to.getUTCDate() - span);
  }
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}
export function executeFacts(facts: readonly AnalyticsFact[], query: AnalyticsQuery, context: AnalyticsContext): AnalyticsResult {
  validateQuery(query, context);
  const scoped = facts.filter(f => f.tenantId === context.tenantId && f.metricId === query.metric);
  let rows = grouped(scoped, query);
  const op = query.operation;
  if (op && ['previous_period', 'month_over_month', 'year_over_year', 'absolute_change', 'percentage_change'].includes(op.kind)) {
    if (!query.dateRange) throw new Error('Comparison requires a date range');
    const prior = grouped(scoped, { ...query, dateRange: shiftRange(query.dateRange, op.kind) });
    const priorMap = new Map(prior.map(row => [row.key, row.value]));
    rows = rows.map(row => {
      const comparisonValue = priorMap.get(row.key) ?? (query.groupBy && ['date', 'month', 'quarter', 'year'].includes(query.groupBy) ? prior.reduce((s, r) => s + r.value, 0) : 0);
      const absoluteChange = row.value - comparisonValue;
      return { ...row, comparisonValue, absoluteChange, percentageChange: comparisonValue === 0 ? null : absoluteChange / Math.abs(comparisonValue) * 100 };
    });
  } else if (op?.kind === 'top_n' || op?.kind === 'bottom_n') {
    if (!query.groupBy) throw new Error('Top/bottom N requires groupBy');
    rows = [...rows].sort((a, b) => (op.kind === 'top_n' ? b.value - a.value : a.value - b.value) || String(a.key).localeCompare(String(b.key))).slice(0, op.n);
  } else if (op?.kind === 'running_total') {
    let total = 0; rows = rows.map(row => ({ ...row, value: total += row.value }));
  } else if (op?.kind === 'percentage_contribution') {
    const total = rows.reduce((s, row) => s + row.value, 0);
    rows = rows.map(row => ({ ...row, value: total === 0 ? 0 : row.value / total * 100 }));
  } else if (op?.kind === 'moving_average') {
    const window = op.window ?? 2;
    rows = rows.map((row, i) => ({ ...row, value: rows.slice(Math.max(0, i - window + 1), i + 1).reduce((s, r) => s + r.value, 0) / Math.min(window, i + 1) }));
  } else if (op?.kind === 'ranking') {
    const ranked = [...rows].sort((a, b) => b.value - a.value || String(a.key).localeCompare(String(b.key)));
    const ranks = new Map(ranked.map((row, i) => [row.key, i + 1]));
    rows = rows.map(row => ({ ...row, rank: ranks.get(row.key)! }));
  }
  return { metric: query.metric, groupBy: query.groupBy ?? null, rows };
}
