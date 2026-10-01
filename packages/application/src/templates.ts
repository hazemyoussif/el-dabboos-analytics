import type { DashboardSeries, DashboardSpec, DashboardWidget, DateRange, Locale, LocalizedText, MetricId, TenantProfile, AnalysisSpec, DimensionId } from '@el-dabbous/domain';
import { validateDashboardSpec } from '@el-dabbous/domain';

export type DatePreset = 'current_year' | 'last_12_months' | 'last_6_months';
export interface DashboardTemplate {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  domain: 'executive' | 'sales' | 'crm' | 'finance' | 'customers' | 'inventory' | 'maintenance';
  tags: readonly string[];
  datePreset: DatePreset;
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
];
export function getDashboardTemplate(id: string): DashboardTemplate | undefined { return dashboardTemplates.find(template => template.id === id); }
function localDate(now: Date, zone: TenantProfile['timeZone']): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}
export function resolveDatePreset(preset: DatePreset, profile: TenantProfile, now: Date): DateRange {
  const { year, month, day } = localDate(now, profile.timeZone);
  const to = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (preset === 'current_year') return { from: `${year}-01-01`, to };
  const firstMonth = new Date(Date.UTC(year, month - (preset === 'last_12_months' ? 12 : 6), 1));
  return { from: firstMonth.toISOString().slice(0, 10), to };
}
export function instantiateDashboardTemplate(template: DashboardTemplate, profile: TenantProfile, now: Date, locale: Locale = profile.defaultLocale): DashboardSpec {
  const spec: DashboardSpec = { schemaVersion: 2, id: template.id, title: template.name, locale,
    filters: { dateRange: resolveDatePreset(template.datePreset, profile, now) }, layout: template.layout,
    widgets: structuredClone(template.widgets) };
  validateDashboardSpec(spec);
  return spec;
}
