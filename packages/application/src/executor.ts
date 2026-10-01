import { analyticsQueryIdentity, executionConcurrency, normalizeAnalyticsQuery, runBounded } from './query-execution.ts';
import type { DashboardExecutionOptions } from './query-execution.ts';
import { validateDashboardSpec, validateQuery } from '@el-dabbous/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult, AnalyticsRow, DashboardSpec, DashboardWidget } from '@el-dabbous/domain';

export type SeriesExecution = { status: 'success'; result: AnalyticsResult } | { status: 'error'; error: { code: string; message: string } };
export type AlignedSeriesValue = Pick<AnalyticsRow, 'value' | 'comparisonValue' | 'absoluteChange' | 'percentageChange' | 'rank'>;
export interface AlignedWidgetRow { key: string | null; series: Record<string, AlignedSeriesValue | null> }
export interface WidgetExecution {
  status: 'success' | 'partial' | 'error';
  seriesResults: Record<string, SeriesExecution>;
  alignedRows: AlignedWidgetRow[];
}
export interface DashboardExecutionResult {
  dashboard: DashboardSpec;
  widgetResults: Record<string, WidgetExecution>;
  metadata: { executedAt: string; succeeded: number; failed: number; succeededSeries: number; failedSeries: number };
}
function align(widget: DashboardWidget, results: Record<string, SeriesExecution>): AlignedWidgetRow[] {
  const selected = widget.series[0];
  if (selected?.analysis?.topN && results[selected.id]?.status !== 'success') return [];
  const successful = widget.series.flatMap(series => {
    const entry = results[series.id];
    return entry?.status === 'success' ? [{ series, rows: entry.result.rows }] : [];
  });
  if (successful.length === 0) return [];
  const keys: Array<string | null> = [];
  const seen = new Set<string | null>();
  const keySources = selected?.analysis?.topN ? successful.slice(0, 1) : successful;
  for (const item of keySources) {
    for (const row of item.rows) if (!seen.has(row.key)) { seen.add(row.key); keys.push(row.key); }
  }
  if (widget.dimension && ['date', 'month', 'quarter', 'year'].includes(widget.dimension)) keys.sort((a, b) => String(a).localeCompare(String(b)));
  return keys.map(key => {
    const series: Record<string, AlignedSeriesValue | null> = {};
    for (const item of successful) {
      const row = item.rows.find(r => r.key === key);
      series[item.series.id] = row ? { value: row.value,
        ...(row.comparisonValue !== undefined ? { comparisonValue: row.comparisonValue } : {}),
        ...(row.absoluteChange !== undefined ? { absoluteChange: row.absoluteChange } : {}),
        ...(row.percentageChange !== undefined ? { percentageChange: row.percentageChange } : {}),
        ...(row.rank !== undefined ? { rank: row.rank } : {}) } : null;
    }
    return { key, series };
  });
}
export class DashboardExecutor {
  private readonly concurrency: number;
  constructor(private readonly repository: AnalyticsRepository, private readonly clock: () => Date = () => new Date(), options: DashboardExecutionOptions = {}) { this.concurrency = executionConcurrency(options.maxConcurrency); }
  async execute(spec: DashboardSpec, context: AnalyticsContext): Promise<DashboardExecutionResult> {
    validateDashboardSpec(spec);
    if (!context.tenantId.trim() || !['en', 'ar'].includes(context.locale)) throw new Error('Invalid analytics context');
    // All normalized requests are planned before any repository call starts.
    const jobs = new Map<string, { query: AnalyticsQuery; result?: SeriesExecution }>();
    const failure = (error: unknown): SeriesExecution => ({ status: 'error', error: { code: 'SERIES_EXECUTION_FAILED', message: error instanceof Error ? error.message : 'Series failed' } });
    const plan = spec.widgets.map(widget => ({ widget, series: widget.series.map(series => {
      const query: AnalyticsQuery = { metric: series.metric,
        ...(widget.dimension ? { groupBy: widget.dimension } : {}),
        ...(series.analysis ? { analysis: series.analysis } : {}),
        ...(spec.filters.dateRange ? { dateRange: spec.filters.dateRange } : {}),
        ...(spec.filters.dimensions ? { filters: spec.filters.dimensions } : {}),
      };
      try {
        validateQuery(query, context);
        const normalized = normalizeAnalyticsQuery(query);
        const key = analyticsQueryIdentity(normalized, context);
        if (!jobs.has(key)) jobs.set(key, { query: normalized });
        return { id: series.id, key };
      } catch (error) { return { id: series.id, error: failure(error) }; }
    }) }));
    await runBounded([...jobs.values()].map(job => async () => {
      try { job.result = { status: 'success', result: await this.repository.execute(job.query, context) }; }
      catch (error) { job.result = failure(error); }
    }), this.concurrency);
    const entries = plan.map(({ widget, series }) => {
      // Each dependent series retains its own result/error object and null metadata.
      const seriesEntries = series.map(item => [item.id, structuredClone(item.error ?? jobs.get(item.key!)!.result!)] as const);
      const seriesResults = Object.fromEntries(seriesEntries) as Record<string, SeriesExecution>;
      const succeeded = seriesEntries.filter(([, value]) => value.status === 'success').length;
      const selectionFailed = Boolean(widget.series[0]?.analysis?.topN && seriesResults[widget.series[0].id]?.status !== 'success');
      const execution: WidgetExecution = { status: selectionFailed || succeeded === 0 ? 'error' : succeeded === seriesEntries.length ? 'success' : 'partial',
        seriesResults, alignedRows: align(widget, seriesResults) };
      return [widget.id, execution] as const;
    });
    const widgetResults = Object.fromEntries(entries) as Record<string, WidgetExecution>;
    const succeeded = entries.filter(([, value]) => value.status !== 'error').length;
    const succeededSeries = entries.reduce((sum, [, value]) => sum + Object.values(value.seriesResults).filter(result => result.status === 'success').length, 0);
    const totalSeries = spec.widgets.reduce((sum, widget) => sum + widget.series.length, 0);
    return { dashboard: spec, widgetResults, metadata: { executedAt: this.clock().toISOString(), succeeded, failed: entries.length - succeeded,
      succeededSeries, failedSeries: totalSeries - succeededSeries } };
  }
}
