import type { LocalizedText, MetricId } from './contracts.ts';
import { semanticCatalog } from './catalog.ts';

export type MetricDomain = 'sales' | 'crm' | 'finance' | 'inventory' | 'purchasing' | 'customers' | 'maintenance';
export type ProductMetric =
  | { id: MetricId; availability: 'available'; domain: MetricDomain; labels: LocalizedText }
  | { id: string; availability: 'planned'; domain: MetricDomain; labels: LocalizedText; reason: string };
const domainFor = (id: MetricId): MetricDomain => {
  if (['opportunity_count', 'pipeline_value', 'weighted_pipeline', 'win_rate'].includes(id)) return 'crm';
  if (['invoiced_amount', 'collected_amount', 'outstanding_amount', 'overdue_amount'].includes(id)) return 'finance';
  if (['stock_on_hand', 'inventory_value', 'low_stock_count'].includes(id)) return 'inventory';
  if (['maintenance_requests', 'failure_count', 'mtbf', 'mttr', 'maintenance_cost'].includes(id)) return 'maintenance';
  return 'sales';
};
const planned = (id: string, domain: MetricDomain, en: string, ar: string, reason: string): ProductMetric =>
  ({ id, availability: 'planned', domain, labels: { en, ar }, reason });
export const productMetricCatalog: readonly ProductMetric[] = [
  ...Object.values(semanticCatalog).map(metric => ({ id: metric.id, availability: 'available' as const, domain: domainFor(metric.id), labels: metric.labels })),
  planned('days_sales_outstanding', 'finance', 'Days sales outstanding', 'أيام تحصيل المبيعات', 'Requires approved receivables and credit-sales definitions.'),
  planned('receivables_aging', 'finance', 'Receivables aging', 'أعمار الذمم المدينة', 'Requires invoice due dates and approved aging buckets.'),
  planned('customer_retention', 'customers', 'Customer retention', 'الاحتفاظ بالعملاء', 'Requires an approved active-customer cohort definition.'),
  planned('customer_churn', 'customers', 'Customer churn', 'تسرب العملاء', 'Requires an approved churn definition.'),
  planned('customer_lifetime_value', 'customers', 'Customer lifetime value', 'القيمة الدائمة للعميل', 'Requires approved customer revenue and cost attribution.'),
  planned('repeat_purchase_rate', 'customers', 'Repeat purchase rate', 'معدل الشراء المتكرر', 'Requires an approved customer/order cohort definition.'),
  planned('inventory_turnover', 'inventory', 'Inventory turnover', 'دوران المخزون', 'Requires approved cost-of-goods and average-inventory values.'),
  planned('days_inventory_outstanding', 'inventory', 'Days inventory outstanding', 'أيام بقاء المخزون', 'Requires approved inventory valuation and cost of goods.'),
  planned('stockout_rate', 'inventory', 'Stockout rate', 'معدل نفاد المخزون', 'Requires stock availability history.'),
  planned('dead_stock', 'inventory', 'Dead stock', 'المخزون الراكد', 'Requires an approved inactivity period and stock history.'),
  planned('supplier_spend', 'purchasing', 'Supplier spend', 'الإنفاق على الموردين', 'Requires purchasing source measures.'),
  planned('supplier_lead_time', 'purchasing', 'Supplier lead time', 'مدة توريد المورد', 'Requires purchase and delivery timestamps.'),
  planned('on_time_supplier_delivery', 'purchasing', 'On-time supplier delivery', 'التسليم في الموعد من الموردين', 'Requires promised and actual delivery dates.'),
  planned('customer_profitability', 'customers', 'Customer profitability', 'ربحية العميل', 'Requires approved customer cost attribution.'),
  planned('asset_availability', 'maintenance', 'Asset availability', 'جاهزية الأصول', 'Requires scheduled and actual downtime.'),
  planned('downtime', 'maintenance', 'Downtime', 'زمن التوقف', 'Requires asset outage intervals.'),
  planned('maintenance_sla_compliance', 'maintenance', 'Maintenance SLA compliance', 'الالتزام بمستوى خدمة الصيانة', 'Requires approved SLA deadlines.'),
  planned('preventive_corrective_ratio', 'maintenance', 'Preventive/corrective maintenance ratio', 'نسبة الصيانة الوقائية إلى التصحيحية', 'Requires maintenance-type classification.'),
];
