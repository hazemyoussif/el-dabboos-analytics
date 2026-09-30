import type { DimensionId, FactMeasureId, MetricId, MetricSemantics, SemanticMetric } from './contracts.ts';

export const dimensions: readonly DimensionId[] = [
  'date', 'month', 'quarter', 'year', 'customer', 'branch', 'region',
  'salesperson', 'product', 'product_category', 'warehouse', 'equipment',
  'equipment_category', 'technician',
];
export const timeDimensions: readonly DimensionId[] = ['date', 'month', 'quarter', 'year'];
const time: DimensionId[] = [...timeDimensions];
const sales: DimensionId[] = [...time, 'customer', 'branch', 'region', 'salesperson', 'product', 'product_category'];
const crm: DimensionId[] = [...time, 'customer', 'branch', 'region', 'salesperson'];
const finance: DimensionId[] = [...time, 'customer', 'branch', 'region'];
const inventory: DimensionId[] = [...time, 'product', 'product_category', 'warehouse', 'branch'];
const maintenance: DimensionId[] = [...time, 'equipment', 'equipment_category', 'technician', 'branch'];

/** These recipes use canonical measures only; source adapters map physical data to them. */
const semantics: Record<MetricId, MetricSemantics> = {
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
export const semanticCatalog: Readonly<Record<MetricId, SemanticMetric>> = Object.fromEntries(
  definitions.map(([id, en, ar, type, supportedDimensions, enSynonyms, arSynonyms]) => [id, {
    id, labels: { en, ar }, descriptions: { en: `${en} across the selected period and filters.`, ar: `${ar} خلال الفترة والفلاتر المحددة.` },
    synonyms: { en: enSynonyms, ar: arSynonyms },
    ...(dialectSynonyms[id] ? { dialectSynonyms: dialectSynonyms[id] } : {}),
    type, semantics: semantics[id],
    dimensions: supportedDimensions,
    presentation: { decimals: type === 'number' ? 0 : 2, ...(type === 'duration' ? { unit: 'hours' } : type === 'percentage' ? { unit: '%' } : {}) },
  }]),
) as unknown as Record<MetricId, SemanticMetric>;

const factIds = new Set<FactMeasureId>([
  ...Object.values(semantics).flatMap(s => s.kind === 'additive' || s.kind === 'snapshot' ? [s.measure] : []),
  'won_opportunity_count', 'closed_opportunity_count', 'operating_hours', 'repair_hours', 'completed_repair_count',
]);
export const factMeasureIds: readonly FactMeasureId[] = [...factIds];
export function isMetricId(id: string): id is MetricId { return Object.hasOwn(semanticCatalog, id); }
export function isDimensionId(id: string): id is DimensionId { return dimensions.includes(id as DimensionId); }
export function isFactMeasureId(id: string): id is FactMeasureId { return factIds.has(id as FactMeasureId); }
export function requiredMeasures(id: MetricId): readonly FactMeasureId[] {
  const s = semanticCatalog[id].semantics;
  if (s.kind === 'additive' || s.kind === 'snapshot') return [s.measure];
  if (s.kind === 'ratio' || s.kind === 'duration_derived') return [s.numerator, s.denominator];
  return requiredMeasures(s.base);
}
