import { requiredMeasures,semanticCatalog } from '@el-dabboos/domain';
import type { AnalyticsContext,DimensionId,FactMeasureId,PublishedAnalyticsCapabilities,PublishedAnalyticsRelease,SourceMapping } from '@el-dabboos/domain';
export interface PublishedReconciliationCoverage {
  measure_id: FactMeasureId; grouping: DimensionId|null; period_from: string; period_to: string; exact: boolean; case_count: string;
}
export interface PublishedDerivedCoverage { metric: SourceMapping['capabilities'][number]['metric']; grouping: DimensionId|null; period_from: string; period_to: string; reference: string }
/** Intersect the immutable approved mapping with linked exact evidence; never infer Cartesian pairs. */
export function projectPublishedRelease(mapping: SourceMapping,coverage: readonly PublishedReconciliationCoverage[],context: AnalyticsContext,derived: readonly PublishedDerivedCoverage[]=[]): PublishedAnalyticsCapabilities {
  if (mapping.tenantId!==context.tenantId || mapping.approval.status!=='approved') throw new Error('Unapproved published scope');
  const certificationReference = mapping.approval.reference;
  const periods = [...new Set(coverage.map(row => JSON.stringify({ from: row.period_from,to: row.period_to })))];
  const releases: PublishedAnalyticsRelease[] = periods.flatMap(periodText => {
    const period = JSON.parse(periodText) as { from: string; to: string };
    const proves = (metric: SourceMapping['capabilities'][number]['metric'],dimension: DimensionId|null) => requiredMeasures(metric).every(measure => coverage.some(row => row.measure_id===measure && row.grouping===dimension && row.period_from===period.from && row.period_to===period.to && row.exact && Number(row.case_count)>0));
    const capabilities = mapping.capabilities.flatMap(capability => {
      // Ratios, distinct counts and comparisons need their own semantic controls; certified inputs alone do not approve outputs.
      const kind = semanticCatalog[capability.metric].semantics.kind;
      const outputProven=(dimension: DimensionId|null) => kind==='additive' || kind==='snapshot' || kind==='ratio' && derived.some(row=>row.metric===capability.metric && row.grouping===dimension && row.period_from===period.from && row.period_to===period.to);
      if (!outputProven(null) || !proves(capability.metric,null)) return [];
      const dimensions = capability.dimensions.filter(dimension => outputProven(dimension) && proves(capability.metric,dimension));
      if (!(context.enforcedFilters ?? []).every(filter => dimensions.includes(filter.dimension))) return [];
      return [{ metric: capability.metric,summary: true,dimensions,analyses: [] }];
    });
    const provenance = { datasetId: mapping.datasetId,sourceId: mapping.sourceId,mappingId: mapping.mappingId,mappingVersion: mapping.mappingVersion,certificationReference };
    const snapshot = (metric: SourceMapping['capabilities'][number]['metric']) => { const semantics = semanticCatalog[metric].semantics; return semantics.kind === 'snapshot' || semantics.kind === 'ratio' && semantics.basis === 'snapshot'; };
    const events = capabilities.filter(capability => !snapshot(capability.metric));
    const balances = capabilities.filter(capability => snapshot(capability.metric));
    return [...((events.length || !balances.length) ? [{...provenance,period,capabilities:events}] : []), ...(balances.length ? [{...provenance,period:{from:period.to,to:period.to},capabilities:balances}] : [])];
  });
  return { tenantId: context.tenantId,mode: 'certified',releases };
}
