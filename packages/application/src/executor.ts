import { alignAnalyticsSeries } from './analytics-alignment.ts';
import { validateDashboardOverrideDimensions, resolveDashboardFilters } from './dashboard-filters.ts';
import type { DashboardExecutionScope, EffectiveDashboardFilters } from './dashboard-filters.ts';
import { analyticsQueryIdentity, executionConcurrency, normalizeAnalyticsQuery, runBounded } from './query-execution.ts';
import type { DashboardExecutionOptions } from './query-execution.ts';
import { validateDashboardSpec, validateQuery,AnalyticsResultLimitError } from '@el-dabboos/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult, AnalyticsRow, DashboardSpec } from '@el-dabboos/domain';

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
  metadata: { effectiveFilters?: EffectiveDashboardFilters; executedAt: string; succeeded: number; failed: number; succeededSeries: number; failedSeries: number };
}
export class DashboardExecutor {
  private readonly concurrency: number;
  constructor(private readonly repository: AnalyticsRepository, private readonly clock: () => Date = () => new Date(), private readonly options: DashboardExecutionOptions = {}) { this.concurrency = executionConcurrency(options.maxConcurrency); }
  async execute(spec: DashboardSpec, context: AnalyticsContext, scope?: DashboardExecutionScope): Promise<DashboardExecutionResult> {
    validateDashboardSpec(spec);
    if (!context.tenantId.trim() || !['en', 'ar'].includes(context.locale)) throw new Error('Invalid analytics context');
    const now = this.clock();
    const effectiveFilters = resolveDashboardFilters(spec.filters, scope, now);
    validateDashboardOverrideDimensions(spec,scope?.overrides);
    // All normalized requests are planned before any repository call starts.
    const jobs = new Map<string, { query: AnalyticsQuery; result?: SeriesExecution }>();
    const failure = seriesFailure;
    const plan = spec.widgets.map(widget => ({ widget, series: widget.series.map(series => {
      const query: AnalyticsQuery = { metric: series.metric,
        ...(widget.dimension ? { groupBy: widget.dimension } : {}),
        ...(series.analysis ? { analysis: series.analysis } : {}),
        ...(effectiveFilters.dateRange ? { dateRange: effectiveFilters.dateRange } : {}),
        ...(effectiveFilters.dimensions ? { filters: effectiveFilters.dimensions } : {}),
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
      catch (error) {
        this.options.onSeriesFailure?.({metric:job.query.metric,category:error instanceof Error && /Unsafe SQL numeric output/.test(error.message)?'unsafe_numeric':'execution_failure'});
        job.result = failure(error);
      }
    }), this.concurrency);
    const entries = plan.map(({ widget, series }) => {
      // Each dependent series retains its own result/error object and null metadata.
      const seriesEntries = series.map(item => [item.id, structuredClone(item.error ?? jobs.get(item.key!)!.result!)] as const);
      const seriesResults = Object.fromEntries(seriesEntries) as Record<string, SeriesExecution>;
      const succeeded = seriesEntries.filter(([, value]) => value.status === 'success').length;
      const selectionFailed = Boolean(widget.series[0]?.analysis?.topN && seriesResults[widget.series[0].id]?.status !== 'success');
      const execution: WidgetExecution = { status: selectionFailed || succeeded === 0 ? 'error' : succeeded === seriesEntries.length ? 'success' : 'partial',
        seriesResults, alignedRows: alignAnalyticsSeries(widget, seriesResults) };
      return [widget.id, execution] as const;
    });
    const widgetResults = Object.fromEntries(entries) as Record<string, WidgetExecution>;
    const succeeded = entries.filter(([, value]) => value.status !== 'error').length;
    const succeededSeries = entries.reduce((sum, [, value]) => sum + Object.values(value.seriesResults).filter(result => result.status === 'success').length, 0);
    const totalSeries = spec.widgets.reduce((sum, widget) => sum + widget.series.length, 0);
    return { dashboard: spec, widgetResults, metadata: { effectiveFilters, executedAt: now.toISOString(), succeeded, failed: entries.length - succeeded,
      succeededSeries, failedSeries: totalSeries - succeededSeries } };
  }
}
function seriesFailure(error:unknown):SeriesExecution {
  if(error instanceof AnalyticsResultLimitError)return {status:'error',error:{code:'RESULT_LIMIT_EXCEEDED',message:'Choose customers or narrow the dates to view this report.'}};
  return {status:'error',error:{code:'SERIES_EXECUTION_FAILED',message:error instanceof Error&&!/SQL|Unsafe.*result|NaN|Infinity/.test(error.message)?error.message:'This metric is temporarily unavailable.'}};
}
