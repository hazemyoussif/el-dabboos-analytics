import { validateDashboardSpec } from '@el-dabbous/domain';
import type { DashboardGenerationRequest, DashboardPatch, DashboardPlanner, DashboardSpec } from '@el-dabbous/domain';
import { demoDashboards } from './demos.ts';

export class UnsupportedDemoIntentError extends Error { readonly code = 'UNSUPPORTED_DEMO_INTENT'; }
export class MockDashboardPlanner implements DashboardPlanner {
  constructor(private readonly clock: () => Date = () => new Date()) {}
  async generate(request: DashboardGenerationRequest): Promise<DashboardSpec> {
    if (!request.context.tenantId.trim() || !['en', 'ar'].includes(request.locale)) throw new Error('Invalid planner context');
    const prompt = request.prompt.trim().toLowerCase();
    if (!prompt || !/(sales|revenue|مبيعات|المبيعات|الإيرادات|ايرادات)/iu.test(prompt)) throw new UnsupportedDemoIntentError('This demo planner supports executive sales requests.');
    const spec = structuredClone(demoDashboards(this.clock())[0]!);
    spec.locale = request.locale;
    validateDashboardSpec(spec);
    return spec;
  }
  async edit(current: DashboardSpec, instruction: string): Promise<DashboardPatch> {
    validateDashboardSpec(current);
    const prompt = instruction.trim().toLowerCase();
    const replace = (widgetId: string, metric: DashboardSpec['widgets'][number]['metric']): DashboardPatch => {
      const previous = current.widgets.find(w => w.id === widgetId);
      if (!previous) throw new UnsupportedDemoIntentError(`Widget ${widgetId} is unavailable.`);
      return { schemaVersion: 1, operations: [{ op: 'replace', widgetId, widget: { ...previous, metric } }] };
    };
    if (/(average order value|متوسط قيمة الطلب)/iu.test(prompt) && /(order count|orders|الطلبات)/iu.test(prompt)) return replace('order-count', 'average_order_value');
    if (/(cairo|القاهرة)/iu.test(prompt) && /(alexandria|الإسكندرية|اسكندرية)/iu.test(prompt)) return { schemaVersion: 1, operations: [{ op: 'set_filters', filters: { ...current.filters, dimensions: [{ dimension: 'branch', values: ['cairo', 'alexandria'] }] } }] };
    if (/(top customers|أعلى العملاء|العملاء)/iu.test(prompt) && /(gross profit|إجمالي الربح|الربح)/iu.test(prompt)) return replace('top-customers', 'gross_profit');
    if (/(moving average|متوسط متحرك)/iu.test(prompt)) {
      const previous = current.widgets.find(w => w.id === 'monthly-revenue');
      if (!previous) throw new UnsupportedDemoIntentError('Monthly revenue is unavailable.');
      return { schemaVersion: 1, operations: [{ op: 'replace', widgetId: previous.id, widget: { ...previous, analysis: { ...previous.analysis, movingAverage: { window: 3 } } } }] };
    }
    if (/(remove|delete|احذف|شيل)/iu.test(prompt) && /(outstanding|receivables|المديونيات|المستحقة)/iu.test(prompt)) return { schemaVersion: 1, operations: [{ op: 'remove', widgetId: 'outstanding' }] };
    throw new UnsupportedDemoIntentError('This edit is outside the supported demo intents.');
  }
}
