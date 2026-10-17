import { alignAnalyticsSeries } from './analytics-alignment.ts';
import {executeGroupedWidget,windowedWidget} from './grouped-widget-execution.ts';
import type {WidgetResultWindow} from './grouped-widget-execution.ts';
import {seriesFailure} from './series-failure.ts';
import { validateDashboardOverrideDimensions, resolveDashboardFilters } from './dashboard-filters.ts';
import type { DashboardExecutionScope, EffectiveDashboardFilters } from './dashboard-filters.ts';
import { analyticsQueryIdentity, executionConcurrency, normalizeAnalyticsQuery, runBounded } from './query-execution.ts';
import {consistentAnalyticsExecution} from './consistent-execution.ts';
import type { DashboardExecutionOptions } from './query-execution.ts';
import { validateDashboardSpec, validateQuery } from '@el-dabboos/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository,AnalyticsExecutionScope, AnalyticsResult, AnalyticsRow, DashboardSpec } from '@el-dabboos/domain';

export type SeriesExecution = { status: 'success'; result: AnalyticsResult } | { status: 'error'; error: { code: string; message: string } };
export type AlignedSeriesValue = Pick<AnalyticsRow, 'value' | 'comparisonValue' | 'absoluteChange' | 'percentageChange' | 'rank'>;
export interface AlignedWidgetRow { key: string | null; series: Record<string, AlignedSeriesValue | null> }
export interface WidgetExecution {
  window?: WidgetResultWindow;
  status: 'success' | 'partial' | 'error';
  seriesResults: Record<string, SeriesExecution>;
  alignedRows: AlignedWidgetRow[];
}
export interface DashboardExecutionResult {
  dashboard: DashboardSpec;
  widgetResults: Record<string, WidgetExecution>;
  metadata: { servingRevision?:string;effectiveFilters?: EffectiveDashboardFilters; executedAt: string; succeeded: number; failed: number; succeededSeries: number; failedSeries: number };
}
export class DashboardExecutor {
  private readonly concurrency: number;
  constructor(private readonly repository: AnalyticsRepository, private readonly clock: () => Date = () => new Date(), private readonly options: DashboardExecutionOptions = {}) { this.concurrency = executionConcurrency(options.maxConcurrency); }
  async executeWidget(spec:DashboardSpec,widgetId:string,context:AnalyticsContext,scope:DashboardExecutionScope):Promise<WidgetExecution>{
    validateDashboardSpec(spec);
    const widget=spec.widgets.find(widget=>widget.id===widgetId);
    if(!widget||!this.repository.supportsResultWindows||!windowedWidget(widget))throw new Error('Result window unavailable');
    const result=await this.execute({...spec,widgets:[widget],layout:{columns:spec.layout.columns}},context,scope);
    return result.widgetResults[widgetId]!;
  }
  async execute(spec: DashboardSpec, context: AnalyticsContext, scope?: DashboardExecutionScope): Promise<DashboardExecutionResult> {
    validateDashboardSpec(spec);
    if (!context.tenantId.trim() || !['en', 'ar'].includes(context.locale)) throw new Error('Invalid analytics context');
    const now = this.clock();
    const effectiveFilters = resolveDashboardFilters(spec.filters, scope, now);
    validateDashboardOverrideDimensions(spec,scope?.overrides);
    return consistentAnalyticsExecution(this.repository,context,{...this.options,maxConcurrency:this.concurrency},repository=>this.executePlan(spec,context,{repository,effectiveFilters,scope,now}));
  }
  private async executePlan(spec:DashboardSpec,context:AnalyticsContext,prepared:{repository:AnalyticsExecutionScope;effectiveFilters:EffectiveDashboardFilters;scope:DashboardExecutionScope|undefined;now:Date}):Promise<DashboardExecutionResult>{
    const {repository,effectiveFilters,scope,now}=prepared;
    // All normalized requests are planned before any repository call starts.
    const jobs = new Map<string, { query: AnalyticsQuery; result?: SeriesExecution }>();
    const failure = seriesFailure;
    const grouped=spec.widgets.filter(widget=>repository.supportsResultWindows&&windowedWidget(widget));
    const plan = spec.widgets.filter(widget=>!grouped.includes(widget)).map(widget => ({ widget, series: widget.series.map(series => {
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
    const groupedResults=new Map<string,WidgetExecution>();
    const regularJobs=[...jobs.values()].map(job => async () => {
      try { job.result = { status: 'success', result: await repository.execute(job.query, context) }; }
      catch (error) {
        job.result = failure(error);
      }
    });
    await runBounded([...regularJobs,...grouped.map(widget=>async()=>{
      try{groupedResults.set(widget.id,await executeGroupedWidget(repository,widget,context,effectiveFilters,scope?.windows?.[widget.id]));}
      catch(error){const result=seriesFailure(error);groupedResults.set(widget.id,{status:'error',seriesResults:Object.fromEntries(widget.series.map(series=>[series.id,result])),alignedRows:[]});}
    })],this.concurrency);
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
    const widgetResults = Object.fromEntries(spec.widgets.map(widget=>[widget.id,groupedResults.get(widget.id)??Object.fromEntries(entries)[widget.id]])) as Record<string, WidgetExecution>;
    const succeeded = Object.values(widgetResults).filter(value => value.status !== 'error').length;
    const succeededSeries = Object.values(widgetResults).reduce((sum,value) => sum + Object.values(value.seriesResults).filter(result => result.status === 'success').length, 0);
    const totalSeries = spec.widgets.reduce((sum, widget) => sum + widget.series.length, 0);
    return { dashboard: spec, widgetResults, metadata: { ...(repository.servingRevision?{servingRevision:repository.servingRevision}:{}),effectiveFilters, executedAt: now.toISOString(), succeeded, failed: spec.widgets.length - succeeded,
      succeededSeries, failedSeries: totalSeries - succeededSeries } };
  }
}
