import type { DashboardSpec, DashboardWidget, DateRange } from '@el-dabbous/domain';

const title = (en: string, ar: string) => ({ en, ar });
const period = (today: Date): DateRange => ({ from: `${today.getUTCFullYear()}-01-01`, to: today.toISOString().slice(0, 10) });
const widget = (id: string, type: DashboardWidget['type'], metric: DashboardWidget['metric'], dimension?: DashboardWidget['dimension'], analysis?: DashboardWidget['analysis']): DashboardWidget =>
  ({ id, type, metric, ...(dimension ? { dimension } : {}), ...(analysis ? { analysis } : {}) });
export function demoDashboards(today = new Date()): DashboardSpec[] {
  const filters = { dateRange: period(today) };
  return [
    { schemaVersion: 1, id: 'executive-sales', title: title('Executive Sales', 'مبيعات الإدارة'), locale: 'en', filters, layout: { columns: 3 }, widgets: [
      widget('revenue', 'kpi', 'revenue'), widget('gross-margin', 'kpi', 'gross_margin'), widget('average-order-value', 'kpi', 'average_order_value'),
      widget('order-count', 'kpi', 'order_count'), widget('monthly-revenue', 'line', 'revenue', 'month', { comparison: 'year_over_year' }),
      widget('top-customers', 'bar', 'revenue', 'customer', { topN: { direction: 'top', limit: 10 } }),
      widget('revenue-by-branch', 'bar', 'revenue', 'branch'), widget('outstanding', 'kpi', 'outstanding_amount'),
    ] },
    { schemaVersion: 1, id: 'finance-receivables', title: title('Finance & Receivables', 'المالية والمديونيات'), locale: 'en', filters, layout: { columns: 3 }, widgets: [
      widget('invoiced', 'kpi', 'invoiced_amount'), widget('collected', 'kpi', 'collected_amount'),
      widget('outstanding', 'kpi', 'outstanding_amount'), widget('overdue', 'kpi', 'overdue_amount'),
      widget('overdue-customers', 'table', 'overdue_amount', 'customer', { topN: { direction: 'top', limit: 10 }, ranking: true }),
      widget('collected-monthly', 'line', 'collected_amount', 'month'),
    ] },
    { schemaVersion: 1, id: 'maintenance', title: title('Maintenance Operations', 'عمليات الصيانة'), locale: 'en', filters, layout: { columns: 3 }, widgets: [
      widget('failures', 'kpi', 'failure_count'), widget('mtbf', 'kpi', 'mtbf'), widget('mttr', 'kpi', 'mttr'),
      widget('maintenance-cost', 'kpi', 'maintenance_cost'), widget('monthly-failures', 'line', 'failure_count', 'month'),
      widget('equipment-failures', 'bar', 'failure_count', 'equipment', { topN: { direction: 'top', limit: 10 } }),
      widget('branch-failures', 'table', 'failure_count', 'branch', { ranking: true }),
    ] },
  ];
}
