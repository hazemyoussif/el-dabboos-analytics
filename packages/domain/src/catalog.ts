import {salesCommandCatalog} from './sales-command-catalog.ts';
import {businessCatalog} from './business-catalog.ts';
import {inventoryAvailabilityCatalog} from './inventory-availability-catalog.ts';
import { metricHelp } from './metric-help.ts';
import type { DimensionId, FactMeasureId, MetricId, MetricSemantics, SemanticMetric } from './contracts.ts';

export const dimensions: readonly DimensionId[] = [
  'date', 'week', 'month', 'quarter', 'year', 'customer', 'branch', 'region','invoice_document_state','invoice_payment_state','receipt_state','order_state',
  'salesperson', 'product', 'product_category', 'warehouse', 'equipment',
  'equipment_category', 'technician', 'business_line', 'city', 'state', 'brand','customer_segment','customer_class','uom','journal','supplier',
];
export const timeDimensions: readonly DimensionId[] = ['date', 'week', 'month', 'quarter', 'year'];
export const categoricalDimensions: readonly DimensionId[] = dimensions.filter(dimension => !timeDimensions.includes(dimension));
const time: DimensionId[] = timeDimensions.filter(dimension=>dimension!=='week');
const sales: DimensionId[] = [...time, 'customer', 'branch', 'region', 'salesperson', 'product', 'product_category','business_line','city','state'];
const crm: DimensionId[] = [...time, 'customer', 'branch', 'region', 'salesperson'];
const finance: DimensionId[] = [...time, 'customer', 'branch', 'region'];
const inventory: DimensionId[] = [...time, 'product', 'product_category', 'warehouse', 'branch'];
const transactions: DimensionId[] = [...time,'customer','salesperson','business_line','city','state'];
const maintenance: DimensionId[] = [...time, 'equipment', 'equipment_category', 'technician', 'branch'];

/** These recipes use canonical measures only; source adapters map physical data to them. */
const semantics: Record<Exclude<MetricId,import('./contracts.ts').BusinessMetricId|import('./contracts.ts').SalesCommandMetricId|import('./contracts.ts').InventoryAvailabilityMetricId>, MetricSemantics> = {
  customer_cash_collected: {kind:'additive',measure:'customer_cash_collected'},
  cash_applied_to_invoices: {kind:'additive',measure:'cash_applied_to_invoices'},
  unallocated_customer_receipts: {kind:'additive',measure:'unallocated_customer_receipts'},
  customer_collection_ratio: {kind:'ratio',numerator:'customer_cash_collected',denominator:'net_invoiced_revenue',scale:100},
  weighted_collection_days: {kind:'duration_derived',numerator:'collection_amount_days',denominator:'collection_applied_amount',scale:1},
  receivables_due_for_collection: {kind:'snapshot',measure:'receivables_due_for_collection'},
  order_margin: {kind:'additive',measure:'order_margin'},
  order_margin_percentage: {kind:'ratio',numerator:'order_margin',denominator:'order_untaxed_value',scale:100},
  net_aged_receivable: { kind: 'snapshot', measure: 'net_aged_receivable' },
  aged_at_date: { kind: 'snapshot', measure: 'aged_at_date' },
  aged_1_30: { kind: 'snapshot', measure: 'aged_1_30' },
  aged_31_60: { kind: 'snapshot', measure: 'aged_31_60' },
  aged_61_90: { kind: 'snapshot', measure: 'aged_61_90' },
  aged_91_120: { kind: 'snapshot', measure: 'aged_91_120' },
  aged_over_120: { kind: 'snapshot', measure: 'aged_over_120' },
  total_overdue_receivable: { kind: 'snapshot', measure: 'total_overdue_receivable' },
  gross_open_receivable_components: { kind: 'snapshot', measure: 'gross_open_receivable_components' },
  credit_balances: { kind: 'snapshot', measure: 'credit_balances' },
  overdue_receivable_percentage: {kind: 'ratio', numerator: 'total_overdue_receivable', denominator: 'net_aged_receivable', scale: 100, basis: 'snapshot'},
  customers_served: { kind: 'distinct_count',measure: 'order_count',dimension: 'customer' },
  order_revenue: { kind: 'additive',measure: 'order_revenue' },
  net_invoiced_revenue: { kind: 'additive',measure: 'net_invoiced_revenue' },
  invoiced_revenue: { kind: 'additive',measure: 'invoiced_revenue' },
  refund_value: { kind: 'additive',measure: 'refund_value' },
  invoice_count: { kind: 'additive',measure: 'invoice_count' },
  refund_count: { kind: 'additive',measure: 'refund_count' },
  cancelled_orders: { kind: 'additive',measure: 'cancelled_orders' },
  average_invoice_value: { kind: 'ratio',numerator: 'invoiced_revenue',denominator: 'invoice_count',scale: 1 },
  average_confirmed_order_value: { kind: 'ratio',numerator: 'order_revenue',denominator: 'order_count',scale: 1 },
  revenue: { kind: 'additive', measure: 'revenue' },
  net_revenue: { kind: 'additive', measure: 'net_revenue' },
  order_count: { kind: 'additive', measure: 'order_count' },
  units_sold: { kind: 'additive', measure: 'units_sold' },
  average_order_value: { kind: 'ratio', numerator: 'revenue', denominator: 'order_count', scale: 1 },
  gross_profit: { kind: 'additive', measure: 'gross_profit' },
  gross_margin: { kind: 'ratio', numerator: 'gross_profit', denominator: 'net_revenue', scale: 100 },
  sales_growth: { kind: 'comparison_derived', base: 'revenue', defaultComparison: 'previous_period' },
  opportunity_count: { kind: 'additive', measure: 'opportunity_count' },
  pipeline_value: { kind: 'additive', measure: 'pipeline_value' },
  weighted_pipeline: { kind: 'additive', measure: 'weighted_pipeline' },
  win_rate: { kind: 'ratio', numerator: 'won_opportunity_count', denominator: 'closed_opportunity_count', scale: 100 },
  invoiced_amount: { kind: 'additive', measure: 'invoiced_amount' },
  collected_amount: { kind: 'additive', measure: 'collected_amount' },
  outstanding_amount: { kind: 'snapshot', measure: 'outstanding_amount' },
  overdue_amount: { kind: 'snapshot', measure: 'overdue_amount' },
  stock_on_hand: { kind: 'snapshot', measure: 'stock_on_hand' },
  inventory_value: { kind: 'snapshot', measure: 'inventory_value' },
  low_stock_count: { kind: 'snapshot', measure: 'low_stock_count' },
  maintenance_requests: { kind: 'additive', measure: 'maintenance_requests' },
  failure_count: { kind: 'additive', measure: 'failure_count' },
  mtbf: { kind: 'duration_derived', numerator: 'operating_hours', denominator: 'failure_count', scale: 1 },
  mttr: { kind: 'duration_derived', numerator: 'repair_hours', denominator: 'completed_repair_count', scale: 1 },
  maintenance_cost: { kind: 'additive', measure: 'maintenance_cost' },
};
type Definition = [MetricId, string, string, SemanticMetric['type'], DimensionId[], string[], string[]];
const definitions: Definition[] = [
  ['customer_cash_collected','Customer Cash Collected','المبالغ النقدية المحصلة من العملاء','currency',[...time,'customer'],['cash collections'],['التحصيلات النقدية']],
  ['cash_applied_to_invoices','Cash Applied to Invoices','النقد المخصص للفواتير','currency',[...time,'customer'],[],[]],
  ['unallocated_customer_receipts','Unallocated Customer Receipts','مقبوضات العملاء غير المخصصة','currency',[...time,'customer'],[],[]],
  ['customer_collection_ratio','Collections / Sales %','نسبة التحصيلات إلى المبيعات','percentage',[...transactions,'product','product_category'],[],[]],
  ['weighted_collection_days','Weighted Collection Days','أيام التحصيل المرجحة','duration',[...time,'customer'],[],[]],
  ['receivables_due_for_collection','Receivables Due for Collection','الذمم المستحقة للتحصيل','currency',['customer','month'],[],[]],
  ['order_margin','Order Margin','هامش ربح الطلبات','currency',transactions,[],[]],
  ['order_margin_percentage','Order Margin %','نسبة هامش ربح الطلبات','percentage',transactions,[],[]],
  ['net_aged_receivable', 'Net Aged Receivable', 'صافي الذمم المدينة حسب العمر', 'currency', ['customer','month'], [], []],
  ['aged_at_date', 'At-Date Receivable', 'الذمم غير المتأخرة عند القطع', 'currency', ['customer','month'], [], []],
  ['aged_1_30', '1–30 Overdue', 'متأخر من ١ إلى ٣٠ يوماً', 'currency', ['customer','month'], [], []],
  ['aged_31_60', '31–60 Overdue', 'متأخر من ٣١ إلى ٦٠ يوماً', 'currency', ['customer','month'], [], []],
  ['aged_61_90', '61–90 Overdue', 'متأخر من ٦١ إلى ٩٠ يوماً', 'currency', ['customer','month'], [], []],
  ['aged_91_120', '91–120 Overdue', 'متأخر من ٩١ إلى ١٢٠ يوماً', 'currency', ['customer','month'], [], []],
  ['aged_over_120', 'Older than 120', 'متأخر أكثر من ١٢٠ يوماً', 'currency', ['customer','month'], [], []],
  ['total_overdue_receivable', 'Total Overdue', 'إجمالي الذمم المتأخرة', 'currency', ['customer','month'], [], []],
  ['gross_open_receivable_components', 'Gross Open Receivable Components', 'مكونات الذمم المفتوحة الإجمالية', 'currency', ['customer','month'], [], []],
  ['credit_balances', 'Credit Balances', 'الأرصدة الدائنة', 'currency', ['customer','month'], [], []],
  ['overdue_receivable_percentage', 'Overdue %', 'نسبة الذمم المتأخرة', 'percentage', ['customer','month'], [], []],
  ['customers_served','Customers / outlets served','العملاء / المنافذ المخدومة','number',sales,[],[]],
  ['order_revenue','Order revenue','إيرادات الطلبات','currency',transactions,[],['قيمة الطلبات']],
  ['net_invoiced_revenue','Net invoiced revenue','صافي إيرادات الفواتير','currency',[...transactions,'product','product_category'],[],['صافي الفواتير']],
  ['invoiced_revenue','Invoiced revenue','إيرادات الفواتير','currency',[...transactions,'product','product_category'],[],[]],
  ['refund_value','Refund value','قيمة الإشعارات الدائنة','currency',[...transactions,'product','product_category'],[],[]],
  ['invoice_count','Invoice count','عدد الفواتير','number',transactions,[],[]],
  ['refund_count','Refund count','عدد الإشعارات الدائنة','number',transactions,[],[]],
  ['cancelled_orders','Cancelled orders','الطلبات الملغاة','number',transactions,[],[]],
  ['average_invoice_value','Average invoice value','متوسط قيمة الفاتورة','currency',[...transactions,'product','product_category'],[],[]],
  ['average_confirmed_order_value','Average confirmed order value','متوسط قيمة الطلب المؤكد','currency',sales,[],[]],
  ['revenue', 'Revenue', 'الإيرادات', 'currency', sales, ['sales', 'turnover'], ['المبيعات', 'قيمة المبيعات']],
  ['net_revenue', 'Net revenue', 'صافي الإيرادات', 'currency', sales, ['net sales'], ['صافي المبيعات']],
  ['order_count', 'Orders', 'عدد الطلبات', 'number', sales, ['sales orders'], ['الطلبات']],
  ['units_sold', 'Units sold', 'الوحدات المباعة', 'number', sales, ['quantity sold'], ['الكمية المباعة']],
  ['average_order_value', 'Average order value', 'متوسط قيمة الطلب', 'currency', sales, ['AOV'], ['متوسط الطلب']],
  ['gross_profit', 'Gross profit', 'إجمالي الربح', 'currency', sales, ['profit'], ['الربح']],
  ['gross_margin', 'Gross margin', 'هامش الربح', 'percentage', sales, ['margin'], ['نسبة الربح']],
  ['sales_growth', 'Sales growth', 'نمو المبيعات', 'percentage', sales, ['revenue growth'], ['نمو الإيرادات']],
  ['opportunity_count', 'Opportunities', 'عدد الفرص', 'number', crm, ['leads'], ['الفرص']],
  ['pipeline_value', 'Pipeline value', 'قيمة الفرص', 'currency', crm, ['pipeline'], ['قيمة خط المبيعات']],
  ['weighted_pipeline', 'Weighted pipeline', 'قيمة الفرص المرجحة', 'currency', crm, ['weighted opportunities'], ['الفرص المرجحة']],
  ['win_rate', 'Win rate', 'معدل الفوز', 'percentage', crm, ['conversion rate'], ['معدل التحويل']],
  ['invoiced_amount', 'Invoiced amount', 'قيمة الفواتير', 'currency', finance, ['invoices'], ['الفواتير']],
  ['collected_amount', 'Collected amount', 'المبالغ المحصلة', 'currency', finance, ['payments'], ['التحصيلات']],
  ['outstanding_amount', 'Outstanding amount', 'المبالغ المستحقة', 'currency', finance, ['receivables'], ['المديونيات']],
  ['overdue_amount', 'Overdue amount', 'المبالغ المتأخرة', 'currency', finance, ['overdue receivables'], ['المتأخرات']],
  ['stock_on_hand', 'Stock on hand', 'المخزون المتاح', 'number', inventory, ['inventory quantity'], ['كمية المخزون']],
  ['inventory_value', 'Inventory value', 'قيمة المخزون', 'currency', inventory, ['stock value'], ['قيمة البضاعة']],
  ['low_stock_count', 'Low stock products', 'منتجات منخفضة المخزون', 'number', inventory, ['stockouts'], ['النواقص']],
  ['maintenance_requests', 'Maintenance requests', 'طلبات الصيانة', 'number', maintenance, ['work orders'], ['بلاغات الصيانة']],
  ['failure_count', 'Failures', 'عدد الأعطال', 'number', maintenance, ['breakdowns'], ['الأعطال']],
  ['mtbf', 'Mean time between failures', 'متوسط الزمن بين الأعطال', 'duration', maintenance, ['MTBF'], ['متوسط الوقت بين الأعطال']],
  ['mttr', 'Mean time to repair', 'متوسط زمن الإصلاح', 'duration', maintenance, ['MTTR'], ['متوسط وقت الإصلاح']],
  ['maintenance_cost', 'Maintenance cost', 'تكلفة الصيانة', 'currency', maintenance, ['repair cost'], ['تكاليف الصيانة']],
];
const dialectSynonyms: Partial<Record<MetricId, { iq?: readonly string[]; eg?: readonly string[] }>> = {
  revenue: { iq: ['المبيعات', 'البيع', 'شكد بايعين'], eg: ['المبيعات', 'البيع'] },
  outstanding_amount: { iq: ['المبالغ على الزبائن', 'الديون', 'المبالغ الباقية'], eg: ['المديونيات', 'المبالغ على العملاء', 'الفلوس المستحقة'] },
  order_count: { iq: ['عدد الطلبيات'], eg: ['عدد الأوردرات'] },
  collected_amount: { iq: ['المبالغ المقبوضة'], eg: ['الفلوس المتحصلة'] },
};
export const semanticCatalog: Readonly<Record<MetricId, SemanticMetric>> = {...businessCatalog,...salesCommandCatalog,...inventoryAvailabilityCatalog,...Object.fromEntries(
  definitions.map(([id, en, ar, type, supportedDimensions, enSynonyms, arSynonyms]) => [id, {
    id, labels: { en, ar }, descriptions: metricHelp(id, {en, ar}, semantics[id as keyof typeof semantics]).shortDefinition,
    synonyms: { en: enSynonyms, ar: arSynonyms },
    ...(dialectSynonyms[id] ? { dialectSynonyms: dialectSynonyms[id] } : {}),
    type, semantics: semantics[id as keyof typeof semantics], help: metricHelp(id, {en, ar}, semantics[id as keyof typeof semantics]),
    dimensions: supportedDimensions,
    presentation: { decimals: type === 'number' ? 0 : 2, ...(type === 'duration' ? { unit: id==='weighted_collection_days'?'days':'hours' } : type === 'percentage' ? { unit: '%' } : {}) },
  }]),
)} as unknown as Record<MetricId, SemanticMetric>;

const factIds = new Set<FactMeasureId>([
  ...Object.values(semanticCatalog).map(metric=>metric.semantics).flatMap(semantics => semantics.kind === 'additive' || semantics.kind === 'snapshot' || semantics.kind === 'distinct_count' ? [semantics.measure] : []),
  'won_opportunity_count', 'closed_opportunity_count', 'operating_hours', 'repair_hours', 'completed_repair_count',
  'command_decided_orders','collection_amount_days','collection_applied_amount','order_untaxed_value','period_collection_sales',
]);
export const factMeasureIds: readonly FactMeasureId[] = [...factIds];
export function isMetricId(id: string): id is MetricId { return Object.hasOwn(semanticCatalog, id); }
export function isDimensionId(id: string): id is DimensionId { return dimensions.includes(id as DimensionId); }
export function isFactMeasureId(id: string): id is FactMeasureId { return factIds.has(id as FactMeasureId); }
export function requiredMeasures(id: MetricId): readonly FactMeasureId[] {
  const s = semanticCatalog[id].semantics;
  if (s.kind === 'additive' || s.kind === 'snapshot' || s.kind === 'distinct_count') return [s.measure];
  if (s.kind === 'ratio' || s.kind === 'duration_derived') return [s.numerator, s.denominator];
  return requiredMeasures(s.base);
}
