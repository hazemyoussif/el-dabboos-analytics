import { semanticCatalog } from '@el-dabboos/domain';
import type { AnalyticsContext, AnalyticsFilter, AnalyticsQuery } from '@el-dabboos/domain';
const filters = (items: readonly AnalyticsFilter[] = []): AnalyticsFilter[] => items.map(item => ({ dimension: item.dimension, values: [...new Set(item.values)].sort() }))
  .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
/** Normalize validated queries without weakening validation or changing policy intersection. */
export function normalizeAnalyticsQuery(query: AnalyticsQuery): AnalyticsQuery {
  return { metric: query.metric,
    ...(semanticCatalog[query.metric].semantics.kind === 'additive' && query.aggregation && query.aggregation !== 'sum' ? { aggregation: query.aggregation } : {}),
    ...(query.groupBy ? { groupBy: query.groupBy } : {}),
    ...(query.dateRange ? { dateRange: { ...query.dateRange } } : {}),
    ...(query.filters?.length ? { filters: filters(query.filters) } : {}),
    ...(query.analysis && Object.keys(query.analysis).length ? { analysis: structuredClone(query.analysis) } : {}),
  };
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  return value;
}
/** Request-local identity includes tenant, locale and effective policy; never a global cache key. */
export function analyticsQueryIdentity(query: AnalyticsQuery, context: AnalyticsContext): string {
  return JSON.stringify(stable({ query: normalizeAnalyticsQuery(query), tenantId: context.tenantId, locale: context.locale, enforcedFilters: filters(context.enforcedFilters) }));
}
export interface DashboardExecutionOptions {
  maxConcurrency?: number;
  onSeriesFailure?: (diagnostic:{metric:AnalyticsQuery['metric'];category:'unsafe_numeric'|'execution_failure'})=>void;
}
export const defaultExecutionConcurrency = 8;
export function executionConcurrency(value = defaultExecutionConcurrency): number {
  if (!Number.isInteger(value) || value < 1 || value > 64) throw new Error('Execution concurrency must be an integer from 1 to 64');
  return value;
}
export async function runBounded(jobs: readonly (() => Promise<void>)[], concurrency: number): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
    while (next < jobs.length) { const job = jobs[next++]!; await job(); }
  }));
}
