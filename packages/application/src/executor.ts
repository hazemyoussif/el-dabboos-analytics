import { validateDashboardSpec, validateQuery } from '@el-dabbous/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult, DashboardSpec } from '@el-dabbous/domain';

export type WidgetExecution = { status: 'success'; result: AnalyticsResult } | { status: 'error'; error: { code: string; message: string } };
export interface DashboardExecutionResult {
  dashboard: DashboardSpec;
  widgetResults: Record<string, WidgetExecution>;
  metadata: { executedAt: string; succeeded: number; failed: number };
}
export class DashboardExecutor {
  constructor(private readonly repository: AnalyticsRepository, private readonly clock: () => Date = () => new Date()) {}
  async execute(spec: DashboardSpec, context: AnalyticsContext): Promise<DashboardExecutionResult> {
    validateDashboardSpec(spec);
    if (!context.tenantId.trim() || !['en', 'ar'].includes(context.locale)) throw new Error('Invalid analytics context');
    const entries = await Promise.all(spec.widgets.map(async widget => {
      const query: AnalyticsQuery = { metric: widget.metric,
        ...(widget.dimension ? { groupBy: widget.dimension } : {}),
        ...(widget.analysis ? { analysis: widget.analysis } : {}),
        ...(spec.filters.dateRange ? { dateRange: spec.filters.dateRange } : {}),
        ...(spec.filters.dimensions ? { filters: spec.filters.dimensions } : {}),
      };
      try {
        validateQuery(query, context);
        return [widget.id, { status: 'success', result: await this.repository.execute(query, context) }] as const;
      } catch (error) {
        return [widget.id, { status: 'error', error: { code: 'WIDGET_EXECUTION_FAILED', message: error instanceof Error ? error.message : 'Widget failed' } }] as const;
      }
    }));
    const widgetResults = Object.fromEntries(entries) as Record<string, WidgetExecution>;
    const succeeded = entries.filter(([, value]) => value.status === 'success').length;
    return { dashboard: spec, widgetResults, metadata: { executedAt: this.clock().toISOString(), succeeded, failed: entries.length - succeeded } };
  }
}
