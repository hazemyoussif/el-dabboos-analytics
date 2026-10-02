import type { MetricId } from '@el-dabboos/domain';
export type LanguageCategory = 'en' | 'msa' | 'iq' | 'eg' | 'iq_mixed' | 'eg_mixed' | 'arabic_indic_digits' | 'western_digits';
export type PlanningAction = 'reuse_template' | 'modify_template' | 'create_composition' | 'clarify' | 'reject_unavailable';
export interface PlanningEvaluationCase {
  id: string;
  task: 'generate' | 'edit';
  language: LanguageCategory;
  prompt: string;
  expectedAction: PlanningAction;
  expectedTemplateId?: string;
  expectedMetrics?: readonly MetricId[];
  expectedUnavailableMetric?: string;
}
/** Provider-neutral planning targets. These are expectations, not claims that the mock planner handles every case. */
export const planningEvaluationCases: readonly PlanningEvaluationCase[] = [
  { id: 'en-sales-template', task: 'generate', language: 'en', prompt: 'Show the Sales Performance dashboard.', expectedAction: 'reuse_template', expectedTemplateId: 'sales-performance' },
  { id: 'msa-finance-template', task: 'generate', language: 'msa', prompt: 'اعرض لوحة المالية والتحصيل.', expectedAction: 'reuse_template', expectedTemplateId: 'finance-collections' },
  { id: 'iq-branch-sales', task: 'generate', language: 'iq', prompt: 'أريد أشوف مبيعات السنة هاي حسب الفرع.', expectedAction: 'modify_template', expectedTemplateId: 'sales-performance', expectedMetrics: ['revenue'] },
  { id: 'iq-mixed-customer', task: 'generate', language: 'iq_mixed', prompt: 'أريد dashboard للمبيعات ويّاه top customers والمديونيات.', expectedAction: 'modify_template', expectedTemplateId: 'sales-performance', expectedMetrics: ['revenue', 'outstanding_amount'] },
  { id: 'eg-sales', task: 'generate', language: 'eg', prompt: 'عايز لوحة المبيعات وأعلى العملاء.', expectedAction: 'reuse_template', expectedTemplateId: 'sales-performance' },
  { id: 'eg-mixed-invoice', task: 'generate', language: 'eg_mixed', prompt: 'عايز dashboard يقارن invoiced و collected كل شهر.', expectedAction: 'modify_template', expectedTemplateId: 'finance-collections', expectedMetrics: ['invoiced_amount', 'collected_amount'] },
  { id: 'en-revenue-profit', task: 'generate', language: 'en', prompt: 'Show monthly revenue and gross profit on one line chart.', expectedAction: 'create_composition', expectedMetrics: ['revenue', 'gross_profit'] },
  { id: 'en-customer-table', task: 'generate', language: 'en', prompt: 'Show customer revenue, gross profit and outstanding balance in a table.', expectedAction: 'create_composition', expectedMetrics: ['revenue', 'gross_profit', 'outstanding_amount'] },
  { id: 'msa-sales-branches-profit', task: 'generate', language: 'msa', prompt: 'اريد ان ارى المبيعات و اداء الفروع مع الارباح', expectedAction: 'create_composition', expectedMetrics: ['revenue', 'gross_profit', 'gross_margin'] },
  { id: 'msa-clarify', task: 'generate', language: 'msa', prompt: 'أريد أفضل العملاء.', expectedAction: 'clarify' },
  { id: 'en-unavailable-dso', task: 'generate', language: 'en', prompt: 'Show days sales outstanding.', expectedAction: 'reject_unavailable', expectedUnavailableMetric: 'days_sales_outstanding' },
  { id: 'iq-edit-average', task: 'edit', language: 'iq', prompt: 'بدّل عدد الطلبيات بمتوسط قيمة الطلب.', expectedAction: 'modify_template', expectedTemplateId: 'sales-performance', expectedMetrics: ['average_order_value'] },
  { id: 'eg-edit-branches', task: 'edit', language: 'eg', prompt: 'خلّيها القاهرة والإسكندرية بس.', expectedAction: 'modify_template', expectedTemplateId: 'sales-performance' },
  { id: 'arabic-indic-months', task: 'edit', language: 'arabic_indic_digits', prompt: 'أضف متوسط متحرك لـ ٣ أشهر.', expectedAction: 'modify_template', expectedTemplateId: 'sales-performance' },
  { id: 'western-months', task: 'edit', language: 'western_digits', prompt: 'أضف متوسط متحرك لـ 3 أشهر.', expectedAction: 'modify_template', expectedTemplateId: 'sales-performance' },
];
