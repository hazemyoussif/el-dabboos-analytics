import { semanticCatalog } from './catalog.ts';
import type { AnalyticsContext, AnalyticsQuery, DateRange, DimensionId, MetricId, AnalysisSpec, ComparisonPeriod } from './contracts.ts';

/** Source-neutral projection; physical mapping recipes never cross this boundary. */
export interface PublishedMetricCapability {
  metric: MetricId; summary: boolean; dimensions: readonly DimensionId[];
  analyses: readonly (keyof AnalysisSpec)[];
  comparisons?: readonly ComparisonPeriod[];
  analysisDimensions?: Partial<Record<keyof AnalysisSpec,readonly (DimensionId|null)[]>>;
  movingAverageWindows?: readonly number[];
}
export interface AnalyticsReleaseProvenance {
  datasetId: string; sourceId: string; mappingId: string; mappingVersion: string;
  certificationReference: string; outputCertificationReference?: string;
  /** Technical exposure is independent from subsequent Finance review. */
  financeReview?: 'pending';
}
export interface PublishedAnalyticsRelease extends AnalyticsReleaseProvenance {
  period?: DateRange;
  /** Trusted serving resolves availability inside this governed coverage. */
  selectionSemantics?: 'event_intersection' | 'latest_snapshot';
  capabilities: readonly PublishedMetricCapability[];
}
export interface PublishedAnalyticsCapabilities {
  tenantId: string; mode: 'certified' | 'synthetic'; releases: readonly PublishedAnalyticsRelease[];
}
export interface PublishedCapabilityProvider {
  getPublishedCapabilities(context: AnalyticsContext): Promise<PublishedAnalyticsCapabilities>;
}
export function publishedQueryIssues(query: AnalyticsQuery, published: PublishedAnalyticsCapabilities): string[] {
  const candidates = published.releases.flatMap(release => release.capabilities.filter(capability => capability.metric===query.metric).map(capability => ({ release,capability })));
  if (!candidates.length) return [`metric:${query.metric}`];
  const issues = candidates.map(({ release,capability }) => {
    const missing: string[] = [];
    missing.push(...aggregationIssues(query,published));
    if (query.groupBy ? !capability.dimensions.includes(query.groupBy) : !capability.summary) missing.push(`pair:${query.metric}:${query.groupBy ?? 'summary'}`);
    for (const filter of query.filters ?? []) if (!capability.dimensions.includes(filter.dimension)) missing.push(`filter:${query.metric}:${filter.dimension}`);
    for (const analysis of Object.keys(query.analysis ?? {}) as (keyof AnalysisSpec)[]) if (!capability.analyses.includes(analysis)) missing.push(`analysis:${query.metric}:${analysis}`);
    missing.push(...comparisonIssues(query,capability));
    missing.push(...analysisScopeIssues(query,capability));
    if (release.period && !resolvesSelection(release,query) && (!query.dateRange || query.dateRange.from<release.period.from || query.dateRange.to>release.period.to)) missing.push(`period:${release.period.from}:${release.period.to}`);
    return missing;
  });
  return issues.find(missing => !missing.length) ?? issues.sort((left,right) => left.length-right.length)[0]!;
}
function resolvesSelection(release:PublishedAnalyticsRelease,query:AnalyticsQuery) {
  const semantics=semanticCatalog[query.metric].semantics;
  const snapshot=semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';
  return Boolean(query.dateRange && release.selectionSemantics===(snapshot?'latest_snapshot':'event_intersection'));
}
/** Synthetic composition is explicit; it is never a fallback for a missing certified binding. */
export function syntheticCapabilities(context: AnalyticsContext): PublishedAnalyticsCapabilities {
  return { tenantId: context.tenantId,mode: 'synthetic',releases: [{ datasetId: 'synthetic',sourceId: 'synthetic',mappingId: 'synthetic',mappingVersion: '1',certificationReference: 'SYNTHETIC ONLY',capabilities: Object.values(semanticCatalog).map(metric => ({ metric: metric.id,summary: true,dimensions: metric.dimensions,analyses: ['comparison','movingAverage','runningTotal','percentageContribution','ranking','topN'] })) }] };
}

function aggregationIssues(query: AnalyticsQuery,published: PublishedAnalyticsCapabilities): string[] {
  return published.mode==='certified' && query.aggregation && query.aggregation!=='sum' ? [`aggregation:${query.metric}:${query.aggregation}`] : [];
}
function comparisonIssues(query:AnalyticsQuery,capability:PublishedMetricCapability):string[] {
  const comparison=query.analysis?.comparison;
  return comparison && capability.comparisons && !capability.comparisons.includes(comparison) ? [`comparison:${comparison}`] : [];
}
function analysisScopeIssues(query:AnalyticsQuery,capability:PublishedMetricCapability):string[] {
  const issues=Object.keys(query.analysis ?? {}).flatMap(key=>{
    const dimensions=capability.analysisDimensions?.[key as keyof AnalysisSpec];
    return dimensions && !dimensions.includes(query.groupBy ?? null) ? [`analysis-pair:${key}:${query.groupBy ?? 'summary'}`] : [];
  });
  const window=query.analysis?.movingAverage?.window;
  if (window && capability.movingAverageWindows && !capability.movingAverageWindows.includes(window)) issues.push(`moving-average-window:${window}`);
  return issues;
}
