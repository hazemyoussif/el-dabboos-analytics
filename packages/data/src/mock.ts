import { categoricalDimensions } from '@el-dabboos/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult, DimensionId } from '@el-dabboos/domain';
import { executeFacts } from './engine.ts';
import type { AnalyticsFact } from './facts.ts';

/** sourceAsOf is a known source synchronization/extraction timestamp, never inferred from fact dates. */
export interface RepositoryMetadataOptions { clock?: () => Date; sourceAsOf?: string }
export class MockAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly facts: readonly AnalyticsFact[], private readonly options: RepositoryMetadataOptions = {}) {}
  async listDimensionValues(dimension: DimensionId, context: AnalyticsContext): Promise<string[]> {
    if (!categoricalDimensions.includes(dimension)) throw new Error('Unsupported dimension');
    if (!context.tenantId.trim()) throw new Error('Tenant context is required');
    return [...new Set(this.facts.filter(fact => fact.tenantId === context.tenantId && (context.enforcedFilters ?? []).every(filter => filter.values.includes(fact.dimensions[filter.dimension] ?? ''))).map(fact => fact.dimensions[dimension]).filter((value): value is string => !!value))].sort();
  }
  async execute(query: AnalyticsQuery, context: AnalyticsContext): Promise<AnalyticsResult> {
    return executeFacts(this.facts, query, context, {
      sourceId: 'mock', executedAt: (this.options.clock?.() ?? new Date()).toISOString(),
      ...(this.options.sourceAsOf ? { sourceAsOf: this.options.sourceAsOf } : {}),
    });
  }
}
