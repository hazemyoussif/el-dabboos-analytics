import { semanticCatalog } from '@el-dabboos/domain';
import type { AnalysisSpec, MetricId, TenantProfile } from '@el-dabboos/domain';

export type { AnalyticsSeriesIntent } from '@el-dabboos/domain';
import type { AnalyticsSeriesIntent } from '@el-dabboos/domain';
const choice = (values: readonly string[]) => ({ enum: values });
const object = <T extends object>(properties: T, required: string[]) => ({ type: 'object', additionalProperties: false, properties, required });
export const analyticsSeriesSchema = object({
  metric: choice(Object.keys(semanticCatalog)), comparison: choice(['previous_period', 'month_over_month', 'year_over_year']),
  movingAverageWindow: { type: 'integer', minimum: 2, maximum: 24 },
  runningTotal: { type: 'boolean' }, percentageContribution: { type: 'boolean' }, ranking: { type: 'boolean' },pareto:{type:'boolean'},
  topNDirection: choice(['top', 'bottom']), topNLimit: { type: 'integer', minimum: 1, maximum: 100 },
}, ['metric']);

/** The same deterministic transformation compiler serves dashboards and direct questions. */
export function compileAnalyticsSeries(series: AnalyticsSeriesIntent): { metric: MetricId; analysis?: AnalysisSpec } {
  const analysis: AnalysisSpec = {};
  if (series.comparison) analysis.comparison = series.comparison;
  if (series.movingAverageWindow !== undefined) analysis.movingAverage = { window: series.movingAverageWindow };
  for (const key of ['runningTotal', 'percentageContribution', 'ranking','pareto'] as const) if (series[key]) analysis[key] = true;
  if (series.topNDirection && series.topNLimit !== undefined) analysis.topN = { direction: series.topNDirection, limit: series.topNLimit };
  return { metric: series.metric, ...(Object.keys(analysis).length ? { analysis } : {}) };
}

/** Trusted preferences are deterministic resolution, never model guesses or edits to saved semantics. */
export function preferredAnalyticsSeries(series:AnalyticsSeriesIntent,profile:TenantProfile):AnalyticsSeriesIntent {
  const metric = profile.preferredMetrics?.[series.metric] ?? series.metric;
  if (!Object.hasOwn(semanticCatalog,metric)) throw new Error('Invalid preferred business metric');
  return {...series,metric};
}
