import type { LocalizedText, MetricHelp, MetricId, MetricSemantics } from './contracts.ts';
import { collectionsHelp } from './collections-help.ts';
import { metricHelpContent } from './metric-help-content.ts';
const helpContent={...metricHelpContent,...collectionsHelp};
const text = (en: string, ar: string): LocalizedText => ({ en, ar });
const meanings: Partial<Record<MetricId, LocalizedText>> = {
 revenue: text('Eligible sales revenue before separately recorded adjustments.', 'إيرادات المبيعات المؤهلة قبل التسويات المسجلة بصورة منفصلة.'),
 net_revenue: text('Sales revenue after governed sales adjustments.', 'إيرادات المبيعات بعد تسويات المبيعات المعتمدة.'),
 units_sold: text('Sold quantities in compatible units of measure.', 'الكميات المباعة بوحدات قياس متوافقة.'),
 gross_profit: text('Revenue less the governed cost of goods. Accounting cost policy requires separate approval for a production source.', 'الإيرادات ناقص تكلفة البضاعة المعتمدة. سياسة التكلفة المحاسبية تتطلب اعتماداً مستقلاً للمصدر الفعلي.'),
 gross_margin: text('Gross profit divided by net revenue, expressed as a percentage.', 'إجمالي الربح مقسوماً على صافي الإيرادات كنسبة مئوية.'),
 opportunity_count: text('Number of eligible sales opportunities.', 'عدد فرص المبيعات المؤهلة.'),
 pipeline_value: text('Value of eligible open sales opportunities.', 'قيمة فرص المبيعات المفتوحة المؤهلة.'),
 weighted_pipeline: text('Opportunity value weighted by its governed probability.', 'قيمة الفرص مرجّحة باحتمالها المعتمد.'),
 win_rate: text('Won opportunities divided by closed opportunities.', 'الفرص الرابحة مقسومة على الفرص المغلقة.'),
 invoiced_amount: text('Eligible invoiced amounts under the source-specific approved invoice basis.', 'قيمة الفواتير المؤهلة وفق أساس الفوترة المعتمد للمصدر.'),
 collected_amount: text('Eligible collected payment amounts; this does not by itself establish cash-flow or settlement policy.', 'مبالغ الدفعات المحصلة المؤهلة؛ لا يحدد هذا وحده سياسة التدفقات النقدية أو التسوية.'),
 outstanding_amount: text('Legacy source-defined outstanding balance at cutoff; distinct from Net Aged Receivable and gross open components.', 'الرصيد المستحق وفق التعريف السابق للمصدر عند القطع؛ يختلف عن صافي الذمم حسب العمر ومكونات الذمم المفتوحة الإجمالية.'),
 overdue_amount: text('Legacy source-defined overdue balance at cutoff; distinct from the signed aging report.', 'الرصيد المتأخر وفق التعريف السابق للمصدر عند القطع؛ يختلف عن تقرير الأعمار ذي الأرصدة الموقّعة.'),
 stock_on_hand: text('Eligible stock quantity at cutoff, in compatible product units.', 'كمية المخزون المؤهلة عند القطع بوحدات المنتج المتوافقة.'),
 inventory_value: text('Stock value at cutoff under the approved valuation basis.', 'قيمة المخزون عند القطع وفق أساس التقييم المعتمد.'),
 low_stock_count: text('Count of eligible stock positions below the governed threshold at cutoff.', 'عدد مواقع المخزون المؤهلة دون الحد المعتمد عند القطع.'),
 maintenance_requests: text('Number of eligible maintenance requests in the reporting period.', 'عدد طلبات الصيانة المؤهلة خلال فترة التقرير.'),
 failure_count: text('Number of recorded eligible failures in the reporting period.', 'عدد الأعطال المسجلة المؤهلة خلال فترة التقرير.'),
 maintenance_cost: text('Eligible maintenance costs recognized in the reporting period.', 'تكاليف الصيانة المؤهلة المعترف بها خلال فترة التقرير.'),
 mtbf: text('Operating hours divided by recorded failures.', 'ساعات التشغيل مقسومة على الأعطال المسجلة.'),
 mttr: text('Repair hours divided by completed repairs.', 'ساعات الإصلاح مقسومة على الإصلاحات المكتملة.'),
 average_order_value: text('Sales revenue divided by order count.', 'إيرادات المبيعات مقسومة على عدد الطلبات.'),
 sales_growth: text('Change in revenue relative to the comparison period; null when the prior value is zero or missing.', 'تغير الإيرادات مقارنة بالفترة المرجعية؛ لا تُحسب النسبة إذا كانت القيمة السابقة صفراً أو مفقودة.'),
 customers_served: text('Distinct stable customers with eligible orders; unassigned identities are excluded.', 'عدد العملاء ذوي الهوية الثابتة والطلبات المؤهلة دون الهويات غير المعيّنة.'),
};
function aggregation(semantics: MetricSemantics): LocalizedText {
 if (semantics.kind === 'snapshot') return text('Latest eligible balance per stable entity at cutoff; sum across entities, never across dates.', 'آخر رصيد مؤهل لكل هوية ثابتة عند القطع؛ يُجمع عبر الهويات ولا يُجمع عبر التواريخ.');
 if (semantics.kind === 'ratio' || semantics.kind === 'duration_derived') return text('Divide aggregated numerator by aggregated denominator; zero denominator returns no value. Never sum individual averages or percentages.', 'قسمة إجمالي البسط على إجمالي المقام؛ المقام الصفري يعطي قيمة غير متاحة. لا تُجمع المتوسطات الفردية أو النسب.');
 if (semantics.kind === 'distinct_count') return text('Count each stable identity once within the selected scope.', 'عدّ كل هوية ثابتة مرة واحدة ضمن النطاق المختار.');
 return text('Aggregate eligible contributions within the selected period and filters.', 'تجميع المساهمات المؤهلة خلال الفترة والفلاتر المختارة.');
}
export function metricHelp(id: MetricId, labels: LocalizedText, semantics: MetricSemantics): MetricHelp {
 const content = helpContent[id];
 const definition = content?.definition ?? meanings[id];
 if (!definition) throw new Error(`Metric help missing: ${id}`);
 const metricType = semantics.kind === 'snapshot' ? 'snapshot' : ['additive','distinct_count'].includes(semantics.kind) ? 'event' : 'derived';
 return { shortDefinition: content?.shortDefinition ?? definition, definition, formula: content?.formula ?? definition,
  inclusionSummary: content?.inclusionSummary ?? text('Eligible canonical contributions under the governed source mapping.', 'المساهمات المعتمدة المؤهلة وفق ربط المصدر المحكوم.'),
  exclusionSummary: content?.exclusionSummary ?? text('Ineligible source states and records outside the authorized scope.', 'حالات المصدر غير المؤهلة والسجلات خارج النطاق المصرح به.'),
  dateBasis: content?.dateBasis ?? (metricType === 'snapshot' ? text('Selected cutoff date.', 'تاريخ القطع المختار.') : text('Governed business recognition date within the reporting period.', 'تاريخ الاعتراف بالأعمال المعتمد ضمن فترة التقرير.')),
  refundCreditBehavior: content?.refundCreditBehavior ?? text('Use only the governed signed contributions for this definition; no inferred credit allocation.', 'تُستخدم المساهمات الموقّعة المعتمدة لهذا التعريف فقط دون تخصيص دائن مفترض.'),
  aggregationBehavior: content?.aggregationBehavior ?? aggregation(semantics), definitionVersion: content?.definitionVersion ?? 1, metricType,
  ...(id === 'sales_growth' ? {formula: text(`${labels.en}: revenue change ÷ absolute prior revenue × 100`, `${labels.ar}: تغير الإيرادات ÷ القيمة المطلقة للإيرادات السابقة × ١٠٠`)} : {}),
 };
}
