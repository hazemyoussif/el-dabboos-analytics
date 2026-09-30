import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult } from '@el-dabbous/domain';
import { executeFacts } from './engine.ts';
import type { AnalyticsFact } from './facts.ts';

/** sourceAsOf is a known source synchronization/extraction timestamp, never inferred from fact dates. */
export interface RepositoryMetadataOptions { clock?: () => Date; sourceAsOf?: string }
export class MockAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly facts: readonly AnalyticsFact[], private readonly options: RepositoryMetadataOptions = {}) {}
  async execute(query: AnalyticsQuery, context: AnalyticsContext): Promise<AnalyticsResult> {
    return executeFacts(this.facts, query, context, {
      sourceId: 'mock', executedAt: (this.options.clock?.() ?? new Date()).toISOString(),
      ...(this.options.sourceAsOf ? { sourceAsOf: this.options.sourceAsOf } : {}),
    });
  }
}
