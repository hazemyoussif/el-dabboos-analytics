import type { LocalizedText, MetricId, DashboardWidget } from '@el-dabboos/domain';
import type { DashboardTemplate } from './templates.ts';
const text = (en: string, ar: string): LocalizedText => ({en,ar});
function monthly(id: string, metrics: readonly MetricId[], title: LocalizedText): DashboardWidget {
  return {id,type:'line',dimension:'month',title,series:metrics.map(metric=>({id:metric,metric}))};
}
function historical(id: string, name: LocalizedText, description: LocalizedText, widgets: DashboardWidget[]): DashboardTemplate {
  return {id,name,description,domain:'sales',tags:['management','historical'],datePreset:'last_12_months',periodStrategy:'certified',layout:{columns:2},widgets};
}
function selectedIdentity(id: string, name: LocalizedText, dimension: 'business_line'|'salesperson'|'customer', description: LocalizedText): DashboardTemplate {
  return historical(id,name,description,[
    monthly('monthly-invoicing',['net_invoiced_revenue'],text('Net invoiced revenue by month','صافي إيرادات الفواتير حسب الشهر')),
    {id:'contribution',type:'table',dimension,title:text('Contribution over the selected period','المساهمة خلال الفترة المحددة'),series:[{id:'net-invoiced',metric:'net_invoiced_revenue'},{id:'order-revenue',metric:'order_revenue'}]},
  ]);
}
/** Prepared reports stay unavailable until publication proves their full time/group pairs. */
export const historicalTemplates: readonly DashboardTemplate[] = [
  historical('historical-executive-trend',text('Historical Executive Trend','الاتجاهات التنفيذية التاريخية'),text('Monthly event totals over reconciled, published coverage. Change the existing date range to inspect a period.','إجماليات الأحداث الشهرية ضمن النطاق المُطابق والمنشور. غيّر نطاق التاريخ الحالي لمراجعة فترة محددة.'),[
    monthly('net-invoiced',['net_invoiced_revenue'],text('Net invoiced revenue by month','صافي إيرادات الفواتير حسب الشهر')),
    monthly('orders',['order_revenue'],text('Order revenue by month','قيمة الطلبات حسب الشهر')),
    monthly('order-count',['order_count'],text('Order count by month','عدد الطلبات حسب الشهر')),
    monthly('refunds',['refund_value'],text('Refund value by month','قيمة الإشعارات الدائنة حسب الشهر')),
  ]),
  historical('sales-invoicing-trend',text('Sales vs Invoicing Trend','اتجاهات المبيعات مقارنة بالفواتير'),text('Confirmed order revenue and net invoiced revenue in each document’s own month.','قيمة الطلبات المؤكدة وصافي إيرادات الفواتير في شهر كل مستند.'),[
    monthly('sales-invoicing',['order_revenue','net_invoiced_revenue'],text('Order revenue vs net invoiced revenue','قيمة الطلبات مقارنة بصافي إيرادات الفواتير')),
  ]),
  selectedIdentity('business-line-trend',text('Business Line Trend','اتجاهات خطوط الأعمال'),'business_line',text('Select a Business Line using the existing filters. The table retains the complete underlying population.','اختر خط أعمال باستخدام المرشحات الحالية. يحتفظ الجدول بكامل الفئات الأساسية.')),
  selectedIdentity('salesperson-historical-analysis',text('Salesperson Historical Analysis','التحليل التاريخي لمندوبي المبيعات'),'salesperson',text('Select a salesperson using the existing filters; inspect all contributions in the table. Names never replace identities.','اختر مندوب مبيعات باستخدام المرشحات الحالية، وراجع جميع المساهمات في الجدول. لا تحل الأسماء محل الهويات.')),
  selectedIdentity('customer-historical-analysis',text('Customer Historical Analysis','التحليل التاريخي للعملاء'),'customer',text('Select a customer using the existing filters; the table preserves every customer. Without a filter, the monthly chart shows all customers combined.','اختر عميلاً باستخدام المرشحات الحالية. يحافظ الجدول على جميع العملاء. دون مرشح، يعرض الرسم الشهري إجمالي جميع العملاء.')),
];
