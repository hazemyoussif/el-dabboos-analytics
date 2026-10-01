import { validateDashboardSpec } from '@el-dabbous/domain';
import type { DashboardGenerationRequest, DashboardPatch, DashboardPlanner, DashboardSpec, TenantProfile, PlannerCapabilities } from '@el-dabbous/domain';
import { getDashboardTemplate, instantiateDashboardTemplate } from './templates.ts';

export class UnsupportedDemoIntentError extends Error { readonly code = 'UNSUPPORTED_DEMO_INTENT'; }
const demoEditLimitation = 'The demo planner supports only predefined dashboard edit examples. Configure a structured model provider for general AI editing.';
const salesIntent = /(sales|revenue|مبيعات|المبيعات|الإيرادات|ايرادات|بايع|بيع)/iu;
export class MockDashboardPlanner implements DashboardPlanner {
  constructor(private readonly clock: () => Date = () => new Date()) {}
  async generate(request: DashboardGenerationRequest): Promise<DashboardSpec> {
    if (request.context.tenantId !== request.tenantProfile.id || !['en', 'ar'].includes(request.locale)) throw new Error('Invalid planner context');
    const prompt = request.prompt.trim().toLowerCase();
    if (!prompt || !salesIntent.test(prompt)) throw new UnsupportedDemoIntentError('This demo planner supports sales dashboard requests.');
    if (request.capabilities && !request.capabilities.templateIds.includes('sales-performance')) throw new UnsupportedDemoIntentError('The sales demo template is unavailable to this user.');
    const template = getDashboardTemplate('sales-performance')!;
    const dashboard = instantiateDashboardTemplate(template, request.tenantProfile, this.clock(), request.locale);
    if (/(this month|هذا الشهر|الشهر ده)/iu.test(prompt) && dashboard.filters.dateRange)
      dashboard.filters.dateRange.from = `${dashboard.filters.dateRange.to.slice(0, 7)}-01`;
    return dashboard;
  }
  async edit(current: DashboardSpec, instruction: string, profile: TenantProfile, _capabilities?: PlannerCapabilities): Promise<DashboardPatch> {
    validateDashboardSpec(current);
    if (_capabilities && !_capabilities.actions.includes('ai:edit')) throw new UnsupportedDemoIntentError('Editing is unavailable to this user.');
    const prompt = instruction.trim().toLowerCase();
    const replace = (widgetId: string, next: (widget: DashboardSpec['widgets'][number]) => DashboardSpec['widgets'][number]): DashboardPatch => {
      const previous = current.widgets.find(w => w.id === widgetId);
      if (!previous) throw new UnsupportedDemoIntentError(demoEditLimitation);
      return { schemaVersion: 2, operations: [{ op: 'replace', widgetId, widget: next(previous) }] };
    };
    if (/(average order value|متوسط قيمة الطلب)/iu.test(prompt) && /(order count|orders|الطلبات|الطلبيات)/iu.test(prompt))
      return replace('order-count', previous => ({ ...previous, series: [{ id: 'average-order-value', metric: 'average_order_value' }] }));
    const mentionsExampleBranches = profile.exampleBranchIds.every(id => {
      const labels = profile.branchLabels[id];
      return labels && [labels.en, labels.ar].some(label => prompt.includes(label.toLowerCase()));
    });
    if (mentionsExampleBranches) {
      const values = [...profile.exampleBranchIds];
      return { schemaVersion: 2, operations: [{ op: 'set_filters', filters: { ...current.filters, dimensions: [{ dimension: 'branch', values }] } }] };
    }
    if (/(top customers|أعلى العملاء|أعلى الزبائن|العملاء|الزبائن)/iu.test(prompt) && /(gross profit|إجمالي الربح|الربح)/iu.test(prompt))
      return replace('top-customers', previous => ({ ...previous, series: [{ id: 'gross-profit', metric: 'gross_profit', analysis: { topN: { direction: 'top', limit: 10 } } }] }));
    if (/(moving average|متوسط متحرك)/iu.test(prompt))
      return replace('revenue-profit', previous => ({ ...previous, series: previous.series.map(series => series.id === 'revenue' ? { ...series, analysis: { ...series.analysis, movingAverage: { window: 3 } } } : series) }));
    if (/(remove|delete|احذف|شيل)/iu.test(prompt) && /(outstanding|receivables|المديونيات|المستحقة|الديون)/iu.test(prompt)) {
      if (!current.widgets.some(widget => widget.id === 'outstanding')) throw new UnsupportedDemoIntentError(demoEditLimitation);
      return { schemaVersion: 2, operations: [{ op: 'remove', widgetId: 'outstanding' }] };
    }
    throw new UnsupportedDemoIntentError(demoEditLimitation);
  }
}
