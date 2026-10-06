import { semanticCatalog } from './catalog.ts';
import type { AnalyticsContext, AnalyticsQuery, DateRange, DimensionId, MetricId, AnalysisSpec } from './contracts.ts';

/** Source-neutral projection; physical mapping recipes never cross this boundary. */
export interface PublishedMetricCapability {
  metric: MetricId; summary: boolean; dimensions: readonly DimensionId[];
  analyses: readonly (keyof AnalysisSpec)[];
}
export interface AnalyticsReleaseProvenance {
  datasetId: string; sourceId: string; mappingId: string; mappingVersion: string;
  certificationReference: string; outputCertificationReference?: string;
}
export interface PublishedAnalyticsRelease extends AnalyticsReleaseProvenance {
  period?: DateRange;
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
    if (release.period && (!query.dateRange || query.dateRange.from<release.period.from || query.dateRange.to>release.period.to)) missing.push(`period:${release.period.from}:${release.period.to}`);
    return missing;
  });
  return issues.find(missing => !missing.length) ?? issues.sort((left,right) => left.length-right.length)[0]!;
}
/** Synthetic composition is explicit; it is never a fallback for a missing certified binding. */
export function syntheticCapabilities(context: AnalyticsContext): PublishedAnalyticsCapabilities {
  return { tenantId: context.tenantId,mode: 'synthetic',releases: [{ datasetId: 'synthetic',sourceId: 'synthetic',mappingId: 'synthetic',mappingVersion: '1',certificationReference: 'SYNTHETIC ONLY',capabilities: Object.values(semanticCatalog).map(metric => ({ metric: metric.id,summary: true,dimensions: metric.dimensions,analyses: ['comparison','movingAverage','runningTotal','percentageContribution','ranking','topN'] })) }] };
}

function aggregationIssues(query: AnalyticsQuery,published: PublishedAnalyticsCapabilities): string[] {
  return published.mode==='certified' && query.aggregation && query.aggregation!=='sum' ? [`aggregation:${query.metric}:${query.aggregation}`] : [];
}
