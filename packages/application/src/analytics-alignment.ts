import type { AnalyticsRow,DashboardWidget } from '@el-dabboos/domain';
import type { AlignedSeriesValue, AlignedWidgetRow, SeriesExecution } from './executor.ts';

export function alignAnalyticsSeries(widget: Pick<DashboardWidget,'dimension'|'series'>, results: Record<string, SeriesExecution>): AlignedWidgetRow[] {
  const selected = widget.series[0];
  if (selected?.analysis?.topN && results[selected.id]?.status !== 'success') return [];
  const successful = widget.series.flatMap(series => {
    const entry = results[series.id];
    return entry?.status === 'success' ? [{ series, rows: entry.result.rows, indexed: indexRows(entry.result.rows) }] : [];
  });
  if (successful.length === 0) return [];
  const keys: Array<string | null> = [];
  const seen = new Set<string | null>();
  const keySources = selected?.analysis?.topN ? successful.slice(0, 1) : successful;
  for (const item of keySources) {
    for (const row of item.rows) if (!seen.has(row.key)) { seen.add(row.key); keys.push(row.key); }
  }
  if (widget.dimension && ['date', 'month', 'quarter', 'year'].includes(widget.dimension)) keys.sort((left, right) => String(left).localeCompare(String(right)));
  return keys.map(key => {
    const series: Record<string, AlignedSeriesValue | null> = {};
    for (const item of successful) {
      const row = item.indexed.get(key);
      series[item.series.id] = row ? { value: row.value,
        ...(row.comparisonValue !== undefined ? { comparisonValue: row.comparisonValue } : {}),
        ...(row.absoluteChange !== undefined ? { absoluteChange: row.absoluteChange } : {}),
        ...(row.percentageChange !== undefined ? { percentageChange: row.percentageChange } : {}),
        ...(row.rank !== undefined ? { rank: row.rank } : {}) } : null;
    }
    return { key, series };
  });
}

function indexRows(rows:readonly AnalyticsRow[]) {
 const indexed=new Map<string|null,AnalyticsRow>();
 for(const row of rows)if(!indexed.has(row.key))indexed.set(row.key,row);
 return indexed;
}
