import type { AnalyticsOperation, DimensionId, MetricId, SemanticMetric } from './contracts.ts';

export const dimensions: readonly DimensionId[] = [
  'date', 'month', 'quarter', 'year', 'customer', 'branch', 'region',
  'salesperson', 'product', 'product_category', 'warehouse', 'equipment',
  'equipment_category', 'technician',
];
const time: DimensionId[] = ['date', 'month', 'quarter', 'year'];
const sales: DimensionId[] = [...time, 'customer', 'branch', 'region', 'salesperson', 'product', 'product_category'];
const crm: DimensionId[] = [...time, 'customer', 'branch', 'region', 'salesperson'];
const finance: DimensionId[] = [...time, 'customer', 'branch', 'region'];
const inventory: DimensionId[] = [...time, 'product', 'product_category', 'warehouse', 'branch'];
const maintenance: DimensionId[] = [...time, 'equipment', 'equipment_category', 'technician', 'branch'];
const operations: AnalyticsOperation[] = [
  'top_n', 'bottom_n', 'previous_period', 'month_over_month', 'year_over_year',
  'absolute_change', 'percentage_change', 'running_total',
  'percentage_contribution', 'moving_average', 'ranking',
];
type Definition = [MetricId, string, string, SemanticMetric['type'], SemanticMetric['defaultAggregation'], DimensionId[], string[], string[]];
const definitions: Definition[] = [
  ['revenue', 'Revenue', 'الإيرادات', 'currency', 'sum', sales, ['sales', 'turnover'], ['المبيعات', 'قيمة المبيعات']],
  ['net_revenue', 'Net revenue', 'صافي الإيرادات', 'currency', 'sum', sales, ['net sales'], ['صافي المبيعات']],
  ['order_count', 'Orders', 'عدد الطلبات', 'number', 'sum', sales, ['sales orders'], ['الطلبات']],
  ['units_sold', 'Units sold', 'الوحدات المباعة', 'number', 'sum', sales, ['quantity sold'], ['الكمية المباعة']],
  ['average_order_value', 'Average order value', 'متوسط قيمة الطلب', 'currency', 'average', sales, ['AOV'], ['متوسط الطلب']],
  ['gross_profit', 'Gross profit', 'إجمالي الربح', 'currency', 'sum', sales, ['profit'], ['الربح']],
  ['gross_margin', 'Gross margin', 'هامش الربح', 'percentage', 'average', sales, ['margin'], ['نسبة الربح']],
  ['sales_growth', 'Sales growth', 'نمو المبيعات', 'percentage', 'average', sales, ['revenue growth'], ['نمو الإيرادات']],
  ['opportunity_count', 'Opportunities', 'عدد الفرص', 'number', 'sum', crm, ['leads'], ['الفرص']],
  ['pipeline_value', 'Pipeline value', 'قيمة الفرص', 'currency', 'sum', crm, ['pipeline'], ['قيمة خط المبيعات']],
  ['weighted_pipeline', 'Weighted pipeline', 'قيمة الفرص المرجحة', 'currency', 'sum', crm, ['weighted opportunities'], ['الفرص المرجحة']],
  ['win_rate', 'Win rate', 'معدل الفوز', 'percentage', 'average', crm, ['conversion rate'], ['معدل التحويل']],
  ['invoiced_amount', 'Invoiced amount', 'قيمة الفواتير', 'currency', 'sum', finance, ['invoices'], ['الفواتير']],
  ['collected_amount', 'Collected amount', 'المبالغ المحصلة', 'currency', 'sum', finance, ['payments'], ['التحصيلات']],
  ['outstanding_amount', 'Outstanding amount', 'المبالغ المستحقة', 'currency', 'sum', finance, ['receivables'], ['المديونيات']],
  ['overdue_amount', 'Overdue amount', 'المبالغ المتأخرة', 'currency', 'sum', finance, ['overdue receivables'], ['المتأخرات']],
  ['stock_on_hand', 'Stock on hand', 'المخزون المتاح', 'number', 'sum', inventory, ['inventory quantity'], ['كمية المخزون']],
  ['inventory_value', 'Inventory value', 'قيمة المخزون', 'currency', 'sum', inventory, ['stock value'], ['قيمة البضاعة']],
  ['low_stock_count', 'Low stock products', 'منتجات منخفضة المخزون', 'number', 'sum', inventory, ['stockouts'], ['النواقص']],
  ['maintenance_requests', 'Maintenance requests', 'طلبات الصيانة', 'number', 'sum', maintenance, ['work orders'], ['بلاغات الصيانة']],
  ['failure_count', 'Failures', 'عدد الأعطال', 'number', 'sum', maintenance, ['breakdowns'], ['الأعطال']],
  ['mtbf', 'Mean time between failures', 'متوسط الزمن بين الأعطال', 'duration', 'average', maintenance, ['MTBF'], ['متوسط الوقت بين الأعطال']],
  ['mttr', 'Mean time to repair', 'متوسط زمن الإصلاح', 'duration', 'average', maintenance, ['MTTR'], ['متوسط وقت الإصلاح']],
  ['maintenance_cost', 'Maintenance cost', 'تكلفة الصيانة', 'currency', 'sum', maintenance, ['repair cost'], ['تكاليف الصيانة']],
];
export const semanticCatalog: Readonly<Record<MetricId, SemanticMetric>> = Object.fromEntries(
  definitions.map(([id, en, ar, type, defaultAggregation, supportedDimensions, enSynonyms, arSynonyms]) => [id, {
    id, labels: { en, ar }, descriptions: { en: `${en} across the selected period and filters.`, ar: `${ar} خلال الفترة والفلاتر المحددة.` },
    synonyms: { en: enSynonyms, ar: arSynonyms }, type, defaultAggregation,
    dimensions: supportedDimensions, operations,
    presentation: { decimals: type === 'number' ? 0 : 2, ...(type === 'duration' ? { unit: 'hours' } : {}) },
  }]),
) as unknown as Record<MetricId, SemanticMetric>;

export function isMetricId(id: string): id is MetricId { return Object.hasOwn(semanticCatalog, id); }
export function isDimensionId(id: string): id is DimensionId { return dimensions.includes(id as DimensionId); }
