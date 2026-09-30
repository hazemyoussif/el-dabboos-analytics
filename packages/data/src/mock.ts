import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult } from '@el-dabbous/domain';
import { executeFacts } from './engine.ts';
import type { AnalyticsFact } from './facts.ts';
export class MockAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly facts: readonly AnalyticsFact[]) {}
  async execute(query: AnalyticsQuery, context: AnalyticsContext): Promise<AnalyticsResult> {
    return executeFacts(this.facts, query, context);
  }
}
