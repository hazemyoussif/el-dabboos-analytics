import { alignAnalyticsSeries } from './analytics-alignment.ts';
import type { AlignedWidgetRow, SeriesExecution } from './executor.ts';
import { AnalyticsResultLimitError, semanticCatalog, drillMetrics, drillDimensions, timeDimensions } from '@el-dabboos/domain';
import type { AnalyticsQuery, AnalyticsRepository, AnalyticsResult, AuthorizationPolicy, DrillRequest, PublishedCapabilityProvider, RequestContext } from '@el-dabboos/domain';
import { analyticsContext } from './security.ts';
import { resolveAnalyticsCapabilities } from './analytics-capability.ts';
import type { AnalyticsCapabilityResolution } from './analytics-capability.ts';
import type { AnalyticsIntent } from './analytics-intent.ts';
import { analyticsQueryIdentity, executionConcurrency, normalizeAnalyticsQuery, runBounded } from './query-execution.ts';

export type AnalyticsAnswerForm = 'scalar' | 'ranked_list' | 'grouped' | 'time_series' | 'comparison' | 'snapshot';
export type AnalyticsSeriesResult = { status: 'SUPPORTED' | 'PARTIAL_COVERAGE' | 'DATA_NOT_READY'; query: AnalyticsQuery; result: AnalyticsResult; form: AnalyticsAnswerForm }
  | { status: 'EXECUTION_FAILED'; query: AnalyticsQuery; code: 'RESULT_LIMIT_EXCEEDED' | 'EXECUTION_FAILED' };
export interface AnalyticsIntentResult {
  status: 'SUPPORTED' | 'PARTIAL_COVERAGE' | 'DATA_NOT_READY' | 'EXECUTION_FAILED';
  intent: AnalyticsIntent;
  analyses: { series: AnalyticsSeriesResult[]; alignedRows: AlignedWidgetRow[]; selectedKeys?: Array<string|null> }[];
  timing: { capabilityMs: number; executionMs: number };
}
export interface AnalyticsExecutionOptions { timeZone: string; clock?: () => Date; maxConcurrency?: number; timer?: () => number }
export type AnalyticsExecutionOutcome = AnalyticsIntentResult | Exclude<AnalyticsCapabilityResolution,{status:'SUPPORTED'}>;
/** Fresh RequestContext must be resolved by the caller's membership boundary on every invocation. */
export class AnalyticsIntentExecutor {
  constructor(private readonly repository: AnalyticsRepository, private readonly capabilities: PublishedCapabilityProvider,
    private readonly policy: AuthorizationPolicy, private readonly options: AnalyticsExecutionOptions) {}
  async execute(intent: AnalyticsIntent, identity: RequestContext): Promise<AnalyticsExecutionOutcome> {
    const timer = this.options.timer ?? (() => performance.now()), started = timer();
    this.policy.authorize('analytics:query',identity);
    const context = analyticsContext(identity), published = await this.capabilities.getPublishedCapabilities(context);
    const resolution = resolveAnalyticsCapabilities(intent,identity,this.policy,{ published,timeZone:this.options.timeZone,now:(this.options.clock ?? (() => new Date()))() });
    const capabilityMs = timer() - started;
    if (resolution.status !== 'SUPPORTED') return resolution;
    const executionStarted = timer(), jobs = new Map<string,{query:AnalyticsQuery; output?:AnalyticsSeriesResult}>();
    const references = resolution.queries.map(queries => queries.map(query => {
      const normalized = normalizeAnalyticsQuery(query), key = analyticsQueryIdentity(normalized,context);
      if (!jobs.has(key)) jobs.set(key,{query:normalized});
      return key;
    }));
    await runBounded([...jobs.values()].map(job => async () => {
      try { job.output = structuredSeries(job.query,await this.repository.execute(job.query,context)); }
      catch (error) { job.output = { status:'EXECUTION_FAILED',query:job.query,code:error instanceof AnalyticsResultLimitError ? 'RESULT_LIMIT_EXCEEDED' : 'EXECUTION_FAILED' }; }
    }),executionConcurrency(this.options.maxConcurrency));
    const analyses = references.map((keys,index) => selectAnalysis(keys.map(key => structuredClone(jobs.get(key)!.output!)),intent.analyses[index]!.rank));
    return { status:combinedStatus(analyses.flatMap(analysis => analysis.series)),intent:structuredClone(intent),analyses,
      timing:{capabilityMs,executionMs:timer()-executionStarted} };
  }
}
function structuredSeries(query:AnalyticsQuery,result:AnalyticsResult):AnalyticsSeriesResult {
  const status = result.metadata.availability?.state ?? (result.metadata.coverage?.status === 'partial' ? 'PARTIAL_COVERAGE' : 'SUPPORTED');
  const semantics = semanticCatalog[query.metric].semantics;
  const snapshot = semantics.kind === 'snapshot' || semantics.kind === 'ratio' && semantics.basis === 'snapshot';
  const form:AnalyticsAnswerForm = snapshot ? 'snapshot' : query.analysis?.comparison ? 'comparison' : query.analysis?.ranking || query.analysis?.topN ? 'ranked_list' : query.groupBy && timeDimensions.includes(query.groupBy) ? 'time_series' : query.groupBy ? 'grouped' : 'scalar';
  return {status,query,result,form};
}
/** First-series selection is shared with dashboard semantics; nulls are preserved. */
function selectAnalysis(series:AnalyticsSeriesResult[],rank:number|undefined) {
  const anchor = series[0];
  if (!anchor || anchor.status === 'EXECUTION_FAILED') return {series,alignedRows:[],selectedKeys:[]};
  const selected = rank ? anchor.result.rows.filter(row => row.rank === rank).map(row => row.key)
    : anchor.query.analysis?.topN ? anchor.result.rows.map(row => row.key) : undefined;
  if (selected) for (const entry of series) if (entry.status !== 'EXECUTION_FAILED') entry.result.rows = entry.result.rows.filter(row => selected.includes(row.key));
  const results:Record<string,SeriesExecution> = Object.fromEntries(series.map((entry,index) => [String(index),entry.status === 'EXECUTION_FAILED' ? {status:'error',error:{code:entry.code,message:'Analytics execution failed'}} : {status:'success',result:entry.result}]));
  const widget = { ...(anchor.query.groupBy ? {dimension:anchor.query.groupBy} : {}),series:series.map((entry,index) => ({id:String(index),metric:entry.query.metric,...(entry.query.analysis ? {analysis:entry.query.analysis} : {})})) };
  return {series,alignedRows:alignAnalyticsSeries(widget,results),...(selected ? {selectedKeys:selected} : {})};
}
function combinedStatus(series:AnalyticsSeriesResult[]):AnalyticsIntentResult['status'] {
  const statuses = new Set(series.map(entry => entry.status));
  if (statuses.size === 1) return series[0]!.status;
  return 'PARTIAL_COVERAGE';
}
/** Stable row identity + exact executed query + immutable release; no display-string reconstruction. */
export function analyticsResultDrillRequest(entry:AnalyticsSeriesResult,key:string|null):DrillRequest|null {
  if (entry.status !== 'SUPPORTED' || entry.query.analysis || !drillMetrics.includes(entry.query.metric)) return null;
  const {metadata,rows} = entry.result, dimension = entry.query.groupBy;
  if (!metadata.release || !metadata.sourceAsOf || rows.find(row => row.key === key)?.value == null) return null;
  if (dimension && !drillDimensions.includes(dimension)) return null;
  const {groupBy:_groupBy,...query} = entry.query;
  void _groupBy;
  return {query,release:metadata.drillReleases?.[String(key)] ?? metadata.release.datasetId,sourceAsOf:metadata.sourceAsOf,
    ...(dimension && key !== null ? {clicked:{dimension,values:[key]}} : {})};
}
