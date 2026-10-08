import type { DashboardSeries, DashboardSpec, DashboardWidget, DateRange, RelativeDatePreset, Locale, LocalizedText, MetricId, TenantProfile, AnalysisSpec, DimensionId } from '@el-dabboos/domain';
import { validateDashboardSpec } from '@el-dabboos/domain';

import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { historicalTemplates } from './historical-templates.ts';
import { managementTemplates,supportedTemplatePeriod } from './management-templates.ts';
import { resolveRelativeDatePreset } from './relative-date.ts';
export type DatePreset = RelativeDatePreset;
export interface DashboardTemplate {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  domain: 'executive' | 'sales' | 'crm' | 'finance' | 'customers' | 'inventory' | 'maintenance';
  tags: readonly string[];
  datePreset: DatePreset;
  periodStrategy?: 'certified';
  layout: DashboardSpec['layout'];
  widgets: DashboardWidget[];
}
const text = (en: string, ar: string): LocalizedText => ({ en, ar });
const series = (id: string, metric: MetricId, analysis?: AnalysisSpec): DashboardSeries => ({ id, metric, ...(analysis ? { analysis } : {}) });
const widget = (id: string, type: DashboardWidget['type'], metrics: DashboardSeries[], dimension?: DimensionId, title?: LocalizedText): DashboardWidget =>
  ({ id, type, series: metrics, ...(dimension ? { dimension } : {}), ...(title ? { title } : {}) });
const one = (id: string, type: DashboardWidget['type'], metric: MetricId, dimension?: DimensionId, analysis?: AnalysisSpec): DashboardWidget =>
  widget(id, type, [series(metric, metric, analysis)], dimension);

export const dashboardTemplates: readonly DashboardTemplate[] = [
  ...managementTemplates,
  ...historicalTemplates,
  { id: 'executive-overview', name: text('Executive Overview', 'نظرة تنفيذية'), description: text('A concise view of sales, margin, collections and reliability.', 'ملخص للمبيعات والهامش والتحصيل والاعتمادية.'), domain: 'executive', tags: ['leadership', 'overview'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('revenue', 'kpi', 'revenue'), one('gross-margin', 'kpi', 'gross_margin'), one('outstanding', 'kpi', 'outstanding_amount'),
    widget('revenue-profit', 'line', [series('revenue', 'revenue', { comparison: 'year_over_year' }), series('gross-profit', 'gross_profit')], 'month'),
    { ...one('revenue-by-branch', 'bar', 'revenue', 'branch'), presentation: { orientation: 'horizontal' } }, one('failures', 'kpi', 'failure_count'),
  ] },
  { id: 'sales-performance', name: text('Sales Performance', 'أداء المبيعات'), description: text('Revenue, profit, orders and customer contribution.', 'الإيرادات والربح والطلبات ومساهمة العملاء.'), domain: 'sales', tags: ['revenue', 'profit', 'customers'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('revenue', 'kpi', 'revenue'), one('gross-margin', 'kpi', 'gross_margin'), one('average-order-value', 'kpi', 'average_order_value'), one('order-count', 'kpi', 'order_count'),
    widget('revenue-profit', 'line', [series('revenue', 'revenue', { comparison: 'year_over_year' }), series('gross-profit', 'gross_profit')], 'month'),
    widget('branch-sales', 'bar', [series('revenue', 'revenue'), series('gross-profit', 'gross_profit')], 'branch'),
    widget('top-customers', 'table', [series('revenue', 'revenue', { topN: { direction: 'top', limit: 10 } }), series('gross-profit', 'gross_profit')], 'customer'),
    one('outstanding', 'kpi', 'outstanding_amount'),
  ] },
  { id: 'sales-team', name: text('Sales Team', 'فريق المبيعات'), description: text('Salesperson performance and order volume.', 'أداء مندوبي المبيعات وحجم الطلبات.'), domain: 'sales', tags: ['salespeople', 'orders'], datePreset: 'last_12_months', layout: { columns: 3 }, widgets: [
    one('revenue', 'kpi', 'revenue'), one('orders', 'kpi', 'order_count'), one('win-rate', 'kpi', 'win_rate'),
    one('rep-revenue', 'bar', 'revenue', 'salesperson'), widget('rep-table', 'table', [series('revenue', 'revenue'), series('orders', 'order_count')], 'salesperson'),
  ] },
  { id: 'crm-pipeline', name: text('CRM Pipeline', 'فرص المبيعات'), description: text('Opportunity volume, pipeline value and win rate.', 'عدد الفرص وقيمتها ومعدل الفوز.'), domain: 'crm', tags: ['opportunities', 'pipeline'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('opportunities', 'kpi', 'opportunity_count'), one('pipeline', 'kpi', 'pipeline_value'), one('win-rate', 'kpi', 'win_rate'),
    one('pipeline-by-branch', 'bar', 'pipeline_value', 'branch'), widget('rep-pipeline', 'table', [series('pipeline', 'pipeline_value'), series('opportunities', 'opportunity_count')], 'salesperson'),
  ] },
  { id: 'finance-collections', name: text('Finance & Collections', 'المالية والتحصيل'), description: text('Invoices, collections and outstanding receivables.', 'الفواتير والتحصيل والذمم المستحقة.'), domain: 'finance', tags: ['receivables', 'collections'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('invoiced', 'kpi', 'invoiced_amount'), one('collected', 'kpi', 'collected_amount'), one('outstanding', 'kpi', 'outstanding_amount'), one('overdue', 'kpi', 'overdue_amount'),
    widget('invoice-collection', 'combo', [series('invoiced', 'invoiced_amount'), series('collected', 'collected_amount')], 'month'),
    widget('overdue-customers', 'table', [series('overdue', 'overdue_amount', { topN: { direction: 'top', limit: 10 } }), series('outstanding', 'outstanding_amount')], 'customer'),
  ] },
  { id: 'customer-analytics', name: text('Customer Analytics', 'تحليلات العملاء'), description: text('Customer revenue, profit and balances in one view.', 'إيرادات العملاء وأرباحهم وأرصدتهم في عرض واحد.'), domain: 'customers', tags: ['customers', 'profit'], datePreset: 'last_12_months', layout: { columns: 3 }, widgets: [
    one('revenue', 'kpi', 'revenue'), one('gross-profit', 'kpi', 'gross_profit'), one('outstanding', 'kpi', 'outstanding_amount'),
    one('customer-contribution', 'treemap', 'revenue', 'customer', { topN: { direction: 'top', limit: 10 } }),
    widget('customer-performance', 'table', [series('revenue', 'revenue', { topN: { direction: 'top', limit: 10 } }), series('gross-profit', 'gross_profit'), series('outstanding', 'outstanding_amount')], 'customer'),
  ] },
  { id: 'inventory', name: text('Inventory', 'المخزون'), description: text('On-hand quantities, value and pressure points.', 'الكميات المتاحة والقيمة ومواطن الضغط.'), domain: 'inventory', tags: ['stock', 'warehouses'], datePreset: 'last_6_months', layout: { columns: 3 }, widgets: [
    one('stock', 'kpi', 'stock_on_hand'), one('value', 'kpi', 'inventory_value'), one('low-stock', 'kpi', 'low_stock_count'),
    one('stock-by-product', 'bar', 'stock_on_hand', 'product', { topN: { direction: 'bottom', limit: 10 } }),
    widget('stock-table', 'table', [series('stock', 'stock_on_hand'), series('value', 'inventory_value')], 'product'),
  ] },
  { id: 'maintenance', name: text('Maintenance', 'الصيانة'), description: text('Failures, repair time and asset costs.', 'الأعطال وأوقات الإصلاح وتكلفة الأصول.'), domain: 'maintenance', tags: ['assets', 'reliability'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('failures', 'kpi', 'failure_count'), one('mtbf', 'kpi', 'mtbf'), one('mttr', 'kpi', 'mttr'), one('maintenance-cost', 'kpi', 'maintenance_cost'),
    widget('reliability-trend', 'line', [series('mtbf', 'mtbf'), series('mttr', 'mttr')], 'month'),
    one('equipment-failures', 'bar', 'failure_count', 'equipment', { topN: { direction: 'top', limit: 10 } }),
    widget('branch-maintenance', 'table', [series('failures', 'failure_count'), series('cost', 'maintenance_cost')], 'branch'),
  ] },
  { id: 'branch-performance', name: text('Branch Performance', 'أداء الفروع'), description: text('Compare revenue, profit and outstanding balances by branch.', 'مقارنة الإيرادات والأرباح والأرصدة المستحقة بين الفروع.'), domain: 'sales', tags: ['branches', 'comparison'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    widget('branch-sales', 'bar', [series('revenue', 'revenue'), series('gross-profit', 'gross_profit')], 'branch'),
    widget('branch-table', 'table', [series('revenue', 'revenue'), series('orders', 'order_count'), series('outstanding', 'outstanding_amount')], 'branch'),
    one('monthly-revenue', 'line', 'revenue', 'month'),
  ] },
  { id: 'product-performance', name: text('Product Performance', 'أداء المنتجات'), description: text('Product sales, units and margin contribution.', 'مبيعات المنتجات وكمياتها ومساهمتها في الربح.'), domain: 'sales', tags: ['products', 'margin'], datePreset: 'last_12_months', layout: { columns: 3 }, widgets: [
    widget('product-sales', 'bar', [series('revenue', 'revenue', { topN: { direction: 'top', limit: 10 } }), series('gross-profit', 'gross_profit')], 'product'),
    one('product-contribution', 'treemap', 'revenue', 'product', { topN: { direction: 'top', limit: 10 } }),
    widget('product-table', 'table', [series('units', 'units_sold'), series('revenue', 'revenue'), series('gross-profit', 'gross_profit')], 'product'),
    one('monthly-units', 'line', 'units_sold', 'month'),
  ] },
  { id: 'sales-trends-growth', name: text('Sales Trends & Growth', 'اتجاهات ونمو المبيعات'), description: text('Sales Trends & Growth using governed metrics.', 'اتجاهات ونمو المبيعات باستخدام المؤشرات المعتمدة.'), domain: 'sales', tags: ['sales', 'sales-trends-growth'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('revenue', 'kpi', 'revenue'),
    one('sales-growth', 'kpi', 'sales_growth'),
    one('order-count', 'kpi', 'order_count'),
    one('average-order-value', 'kpi', 'average_order_value'),
    widget('trend', 'area', [series('revenue', 'revenue')], 'month'),
    widget('profit-trend', 'combo', [series('revenue', 'revenue'), series('gross-profit', 'gross_profit')], 'month'),
    widget('growth', 'line', [series('sales-growth', 'sales_growth')], 'month'),
    widget('monthly-detail', 'table', [series('revenue', 'revenue'), series('gross-profit', 'gross_profit'), series('order-count', 'order_count'), series('sales-growth', 'sales_growth')], 'month')
  ] },
  { id: 'profitability-overview', name: text('Profitability Overview', 'نظرة على الربحية'), description: text('Profitability Overview using governed metrics.', 'نظرة على الربحية باستخدام المؤشرات المعتمدة.'), domain: 'sales', tags: ['sales', 'profitability-overview'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('net-revenue', 'kpi', 'net_revenue'),
    one('gross-profit', 'kpi', 'gross_profit'),
    one('gross-margin', 'kpi', 'gross_margin'),
    one('average-order-value', 'kpi', 'average_order_value'),
    widget('net-trend', 'area', [series('net-revenue', 'net_revenue')], 'month'),
    widget('profit-trend', 'line', [series('gross-profit', 'gross_profit')], 'month'),
    widget('margin-trend', 'line', [series('gross-margin', 'gross_margin')], 'month'),
    widget('branch-detail', 'table', [series('net-revenue', 'net_revenue'), series('gross-profit', 'gross_profit'), series('gross-margin', 'gross_margin')], 'branch'),
    widget('category-detail', 'table', [series('revenue', 'revenue'), series('gross-profit', 'gross_profit'), series('gross-margin', 'gross_margin')], 'product_category')
  ] },
  { id: 'regional-performance', name: text('Regional Performance', 'أداء المناطق'), description: text('Regional Performance using governed metrics.', 'أداء المناطق باستخدام المؤشرات المعتمدة.'), domain: 'sales', tags: ['sales', 'regional-performance'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('revenue', 'kpi', 'revenue'),
    one('gross-profit', 'kpi', 'gross_profit'),
    one('order-count', 'kpi', 'order_count'),
    one('average-order-value', 'kpi', 'average_order_value'),
    { ...widget('regional-revenue', 'bar', [series('revenue', 'revenue')], 'region'), presentation: { orientation: 'horizontal' } },
    widget('regional-contribution', 'treemap', [series('revenue', 'revenue')], 'region'),
    widget('regional-detail', 'table', [series('revenue', 'revenue'), series('gross-profit', 'gross_profit'), series('order-count', 'order_count'), series('average-order-value', 'average_order_value')], 'region')
  ] },
  { id: 'customer-receivables', name: text('Customer Receivables', 'مستحقات العملاء'), description: text('Customer Receivables using governed metrics.', 'مستحقات العملاء باستخدام المؤشرات المعتمدة.'), domain: 'finance', tags: ['finance', 'customer-receivables'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('invoiced-amount', 'kpi', 'invoiced_amount'),
    one('collected-amount', 'kpi', 'collected_amount'),
    one('outstanding-amount', 'kpi', 'outstanding_amount'),
    one('overdue-amount', 'kpi', 'overdue_amount'),
    widget('collections', 'combo', [series('invoiced-amount', 'invoiced_amount'), series('collected-amount', 'collected_amount')], 'month'),
    { ...widget('top-outstanding', 'bar', [series('outstanding-amount', 'outstanding_amount' , { topN: { direction: 'top', limit: 10 } })], 'customer'), presentation: { orientation: 'horizontal' } },
    widget('overdue-detail', 'table', [series('overdue-amount', 'overdue_amount'), series('outstanding-amount', 'outstanding_amount')], 'customer'),
    widget('outstanding-share', 'treemap', [series('outstanding-amount', 'outstanding_amount' , { topN: { direction: 'top', limit: 10 } })], 'customer')
  ] },
  { id: 'product-category-performance', name: text('Product Category Performance', 'أداء فئات المنتجات'), description: text('Product Category Performance using governed metrics.', 'أداء فئات المنتجات باستخدام المؤشرات المعتمدة.'), domain: 'sales', tags: ['sales', 'product-category-performance'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('revenue', 'kpi', 'revenue'),
    one('units-sold', 'kpi', 'units_sold'),
    one('gross-profit', 'kpi', 'gross_profit'),
    one('gross-margin', 'kpi', 'gross_margin'),
    { ...widget('category-revenue', 'bar', [series('revenue', 'revenue')], 'product_category'), presentation: { orientation: 'horizontal' } },
    widget('category-contribution', 'treemap', [series('revenue', 'revenue')], 'product_category'),
    { ...widget('category-units', 'bar', [series('units-sold', 'units_sold')], 'product_category'), presentation: { orientation: 'horizontal' } },
    widget('category-detail', 'table', [series('revenue', 'revenue'), series('units-sold', 'units_sold'), series('gross-profit', 'gross_profit'), series('gross-margin', 'gross_margin')], 'product_category')
  ] },
  { id: 'warehouse-inventory', name: text('Warehouse Inventory', 'مخزون المستودعات'), description: text('Warehouse Inventory using governed metrics.', 'مخزون المستودعات باستخدام المؤشرات المعتمدة.'), domain: 'inventory', tags: ['inventory', 'warehouse-inventory'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('stock-on-hand', 'kpi', 'stock_on_hand'),
    one('inventory-value', 'kpi', 'inventory_value'),
    one('low-stock-count', 'kpi', 'low_stock_count'),
    { ...widget('warehouse-stock', 'bar', [series('stock-on-hand', 'stock_on_hand')], 'warehouse'), presentation: { orientation: 'horizontal' } },
    widget('warehouse-value', 'treemap', [series('inventory-value', 'inventory_value')], 'warehouse'),
    widget('low-stock-products', 'table', [series('stock-on-hand', 'stock_on_hand'), series('low-stock-count', 'low_stock_count'), series('inventory-value', 'inventory_value')], 'product')
  ] },
  { id: 'maintenance-reliability', name: text('Maintenance Reliability', 'اعتمادية الصيانة'), description: text('Maintenance Reliability using governed metrics.', 'اعتمادية الصيانة باستخدام المؤشرات المعتمدة.'), domain: 'maintenance', tags: ['maintenance', 'maintenance-reliability'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    one('maintenance-requests', 'kpi', 'maintenance_requests'),
    one('failure-count', 'kpi', 'failure_count'),
    one('mtbf', 'kpi', 'mtbf'),
    one('mttr', 'kpi', 'mttr'),
    one('maintenance-cost', 'kpi', 'maintenance_cost'),
    widget('request-failures', 'combo', [series('maintenance-requests', 'maintenance_requests'), series('failure-count', 'failure_count')], 'month'),
    widget('repair-trend', 'line', [series('mtbf', 'mtbf'), series('mttr', 'mttr')], 'month'),
    { ...widget('equipment-failures', 'bar', [series('failure-count', 'failure_count' , { topN: { direction: 'top', limit: 10 } })], 'equipment'), presentation: { orientation: 'horizontal' } },
    widget('maintenance-detail', 'table', [series('failure-count', 'failure_count'), series('mtbf', 'mtbf'), series('mttr', 'mttr'), series('maintenance-cost', 'maintenance_cost')], 'equipment')
  ] },
  { id: 'technician-performance', name: text('Technician Performance', 'أداء الفنيين'), description: text('Technician Performance using governed metrics.', 'أداء الفنيين باستخدام المؤشرات المعتمدة.'), domain: 'maintenance', tags: ['maintenance', 'technician-performance'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    { ...widget('technician-requests', 'bar', [series('maintenance-requests', 'maintenance_requests'), series('failure-count', 'failure_count')], 'technician'), presentation: { orientation: 'horizontal' } },
    { ...widget('technician-repair', 'bar', [series('mttr', 'mttr')], 'technician'), presentation: { orientation: 'horizontal' } },
    { ...widget('technician-cost', 'bar', [series('maintenance-cost', 'maintenance_cost')], 'technician'), presentation: { orientation: 'horizontal' } },
    widget('technician-detail', 'table', [series('maintenance-requests', 'maintenance_requests'), series('failure-count', 'failure_count'), series('mttr', 'mttr'), series('maintenance-cost', 'maintenance_cost')], 'technician')
  ] },
  { id: 'equipment-performance', name: text('Equipment Performance', 'أداء المعدات'), description: text('Equipment Performance using governed metrics.', 'أداء المعدات باستخدام المؤشرات المعتمدة.'), domain: 'maintenance', tags: ['maintenance', 'equipment-performance'], datePreset: 'current_year', layout: { columns: 3 }, widgets: [
    { ...widget('equipment-failures', 'bar', [series('failure-count', 'failure_count' , { topN: { direction: 'top', limit: 10 } })], 'equipment'), presentation: { orientation: 'horizontal' } },
    widget('equipment-cost', 'treemap', [series('maintenance-cost', 'maintenance_cost' , { topN: { direction: 'top', limit: 10 } })], 'equipment'),
    widget('equipment-detail', 'table', [series('failure-count', 'failure_count'), series('mtbf', 'mtbf'), series('mttr', 'mttr'), series('maintenance-cost', 'maintenance_cost')], 'equipment'),
    widget('category-reliability', 'table', [series('failure-count', 'failure_count'), series('mtbf', 'mtbf'), series('mttr', 'mttr'), series('maintenance-cost', 'maintenance_cost')], 'equipment_category')
  ] },
  { id: 'sales-invoicing', name: text('Sales & Invoicing', 'المبيعات والفواتير'), description: text('Certified invoice revenue, refunds and orders.', 'إيرادات الفواتير والإشعارات الدائنة والطلبات المعتمدة.'), domain: 'sales', tags: ['sales','invoicing'],datePreset: 'previous_month',periodStrategy: 'certified',layout: { columns: 4 },widgets: [
    one('net-invoiced-revenue','kpi','net_invoiced_revenue'),
    { ...one('posted-invoice-value','kpi','invoiced_revenue'),title: text('Posted Invoice Value','قيمة الفواتير المُرحّلة') },
    one('refund-value','kpi','refund_value'),one('orders','kpi','order_count'),
  ] },

];
export function getDashboardTemplate(id: string): DashboardTemplate | undefined { return dashboardTemplates.find(template => template.id === id); }
/** Compatibility export; all calendar arithmetic belongs to the shared resolver. */
export function resolveDatePreset(preset: DatePreset, profile: TenantProfile, now: Date): DateRange {
  return resolveRelativeDatePreset(preset, profile.timeZone, now);
}
export function instantiateDashboardTemplate(template: DashboardTemplate, profile: TenantProfile, _now: Date, locale: Locale = profile.defaultLocale, published?: PublishedAnalyticsCapabilities): DashboardSpec {
  const spec: DashboardSpec = { schemaVersion: 2, id: template.id, title: template.name, locale,
    filters: { datePreset: template.datePreset }, layout: template.layout,
    widgets: structuredClone(template.widgets) };
  if (template.periodStrategy==='certified') {
    if(template.id==='sales-invoicing') spec.title = { en: `${profile.labels.en} Sales & Invoicing`,ar: `المبيعات والفواتير — ${profile.labels.ar}` };
    const period = published ? supportedTemplatePeriod(template,published) : undefined;
    if (period) spec.filters = { dateRange: { ...period } };
  }
  validateDashboardSpec(spec);
  return spec;
}
