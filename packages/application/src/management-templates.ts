import { publishedQueryIssues } from '@el-dabboos/domain';
import type { PublishedAnalyticsCapabilities,MetricId,DimensionId,DashboardWidget,LocalizedText } from '@el-dabboos/domain';
import type { DashboardTemplate } from './templates.ts';
const text=(en:string,ar:string):LocalizedText=>({en,ar});
const monetary=['net_invoiced_revenue','invoiced_revenue','refund_value','order_revenue'] as const;
const headlines=[...monetary,'order_count','average_confirmed_order_value'] as const;
const series=(metrics:readonly MetricId[])=>metrics.map(metric=>({id:metric,metric}));
function groupedReport(id:string,name:LocalizedText,dimension:DimensionId,domain:DashboardTemplate['domain']):DashboardTemplate {
 const widgets:DashboardWidget[]=[
  {id:'invoice-comparison',type:'bar',dimension,series:series(['net_invoiced_revenue','invoiced_revenue','refund_value']),title:text('Invoices and refunds','الفواتير والإشعارات الدائنة'),presentation:{orientation:'horizontal'}},
  {id:'orders',type:'bar',dimension,series:series(['order_revenue']),title:text('Order revenue','قيمة طلبات البيع'),presentation:{orientation:'horizontal'}},
  {id:'detail',type:'table',dimension,series:series([...monetary,'order_count','average_confirmed_order_value']),title:text('Performance detail','تفاصيل الأداء')},
 ];
 return {id,name,description:text('Approved sales and invoicing, grouped by stable identity.','المبيعات والفواتير المعتمدة حسب الهوية الثابتة.'),domain,tags:['management'],datePreset:'previous_month',periodStrategy:'certified',layout:{columns:2},widgets};
}
export const managementTemplates:readonly DashboardTemplate[]=[
 {id:'executive-sales-invoicing',name:text('Executive Sales & Invoicing','ملخص المبيعات والفواتير'),description:text('Approved invoice revenue, refunds and sales orders for the certified period.','الفواتير والإشعارات الدائنة وطلبات البيع للفترة المعتمدة.'),domain:'executive',tags:['management'],datePreset:'previous_month',periodStrategy:'certified',layout:{columns:3},widgets:headlines.map(metric=>({id:metric,type:'kpi',series:series([metric]),...(metric==='invoiced_revenue'?{title:text('Posted Invoice Value','قيمة الفواتير المُرحّلة')}:{})}))},
 groupedReport('business-line-performance',text('Business Line Performance','أداء خطوط الأعمال'),'business_line','sales'),
 groupedReport('salesperson-performance',text('Salesperson Performance','أداء مندوبي المبيعات'),'salesperson','sales'),
 groupedReport('customer-performance',text('Customer Performance','أداء العملاء'),'customer','customers'),
];
export function supportedTemplatePeriod(template:DashboardTemplate,published:PublishedAnalyticsCapabilities) {
 return published.releases.find(release=>template.widgets.every(widget=>widget.series.every(item=>!publishedQueryIssues({metric:item.metric,...(widget.dimension?{groupBy:widget.dimension}:{}),...(item.analysis?{analysis:item.analysis}:{}),...(release.period?{dateRange:release.period}:{})},{...published,releases:[release]}).length)))?.period;
}
export function selectDefaultTemplate(templates:readonly {id:string;availability:string}[],mode:PublishedAnalyticsCapabilities['mode']) {
 const preferred=mode==='certified'?'executive-sales-invoicing':'sales-performance';
 return templates.find(template=>template.id===preferred && template.availability==='available')?.id??templates.find(template=>template.availability==='available')?.id;
}
