import { publishedQueryIssues } from '@el-dabboos/domain';
import type { PublishedAnalyticsCapabilities,MetricId,DimensionId,DashboardWidget,LocalizedText } from '@el-dabboos/domain';
import type { DashboardTemplate } from './templates.ts';
const text=(en:string,ar:string):LocalizedText=>({en,ar});
const monetary=['net_invoiced_revenue','invoiced_revenue','refund_value','order_revenue'] as const;
const headlines=[...monetary,'order_count','average_confirmed_order_value'] as const;
const series=(metrics:readonly MetricId[])=>metrics.map(metric=>({id:metric,metric}));
function invoiceOperationsReport():DashboardTemplate {
 const metrics=['invoice_count','refund_count','average_invoice_value','invoiced_revenue','refund_value','net_invoiced_revenue'] as const;
 return {id:'invoice-refund-operations',name:text('Invoice & Refund Operations','عمليات الفواتير والإشعارات الدائنة'),description:text('Posted document volumes, average invoice value and salesperson detail.','أعداد المستندات المُرحّلة ومتوسط قيمة الفاتورة والتفاصيل حسب مندوب المبيعات.'),domain:'finance',tags:['management'],datePreset:'previous_month',periodStrategy:'certified',layout:{columns:3},widgets:[
  ...metrics.map(metric=>({id:metric,type:'kpi' as const,series:series([metric]),...(metric==='invoiced_revenue'?{title:text('Posted Invoice Value','قيمة الفواتير المُرحّلة')}:{})})),
  {id:'invoice-detail',type:'table',dimension:'salesperson',series:series(metrics),title:text('Invoice and refund detail by salesperson','تفاصيل الفواتير والإشعارات الدائنة حسب مندوب المبيعات')},
 ]};
}
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
 invoiceOperationsReport(),
 receivablesReport(),
];
export function supportedTemplatePeriod(template:DashboardTemplate,published:PublishedAnalyticsCapabilities) {
 const metrics=new Set(template.widgets.flatMap(widget=>widget.series.map(series=>series.metric)));
 const periods=published.releases.filter(release=>release.capabilities.some(capability=>metrics.has(capability.metric))).flatMap(release=>release.period?[release.period]:[]);
 const candidates=[...periods,...periods.flatMap(start=>periods.map(end=>({from:start.from,to:end.to})))];
 const eligible=candidates.filter(period=>period.from<=period.to && (!template.tags.includes('historical') || period.from.slice(0,7)!==period.to.slice(0,7)) && template.widgets.every(widget=>widget.series.every(item=>
  published.releases.some(release=>release.period && release.period.from<=period.from && release.period.to>=period.to && !publishedQueryIssues({metric:item.metric,...(widget.dimension?{groupBy:widget.dimension}:{}),...(item.analysis?{analysis:item.analysis}:{}),dateRange:period},{...published,releases:[release]}).length)
 )));
 if(template.tags.includes('historical'))eligible.sort((left,right)=>Date.parse(right.to)-Date.parse(right.from)-(Date.parse(left.to)-Date.parse(left.from)));
 return eligible[0];
}
export function selectDefaultTemplate(templates:readonly {id:string;availability:string}[],mode:PublishedAnalyticsCapabilities['mode']) {
 const preferred=mode==='certified'?'executive-sales-invoicing':'sales-performance';
 return templates.find(template=>template.id===preferred && template.availability==='available')?.id??templates.find(template=>template.availability==='available')?.id;
}

function receivablesReport(): DashboardTemplate {
 const metrics: MetricId[] = ['net_aged_receivable','aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120','total_overdue_receivable','overdue_receivable_percentage','gross_open_receivable_components','credit_balances'];
 return {id:'receivables-aging',name:text('Receivables & Aging','الذمم المدينة وأعمار الديون'),description:text('Certified signed receivables at a fixed cutoff.','الذمم المدينة الموقّعة المعتمدة عند تاريخ قطع ثابت.'),domain:'finance',tags:['management'],datePreset:'previous_month',periodStrategy:'certified',layout:{columns:3},widgets:[
  ...metrics.map(metric=>({id:metric,type:'kpi' as const,series:series([metric])})),
  {id:'customer-aging',type:'table',dimension:'customer',series:series(metrics.slice(0,7)),title:text('Customer Aging','أعمار ذمم العملاء')},
 ]};
}
