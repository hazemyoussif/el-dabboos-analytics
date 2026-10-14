import {publishedQueryIssues} from '@el-dabboos/domain';
import {supportedTemplatePeriod} from './management-templates.ts';
import type {PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import type {DashboardWidget,DashboardGridItem,MetricId,DimensionId,LocalizedText} from '@el-dabboos/domain';
import type {DashboardTemplate} from './templates.ts';
interface PurposeChart {source:string;metrics?:readonly MetricId[];type?:'bar'|'line';title:LocalizedText}
const text=(en:string,ar:string):LocalizedText=>({en,ar});
/** Every source-backed comparison retains its complete detail table and existing query basis. */
const chartPurposes:Readonly<Record<string,readonly PurposeChart[]>>={
 'customer-cash-collections':[{source:'customer-cash',metrics:['customer_cash_collected','cash_applied_to_invoices','unallocated_customer_receipts'],title:text('Customer cash, applied and unallocated — total cash includes both components','نقد العملاء والمخصص وغير المخصص — يشمل الإجمالي كلا المكونين')}],
 'confirmed-order-margin':[
  {source:'salesperson-margin',metrics:['order_margin'],title:text('Stored order margin by salesperson','هامش الطلبات المخزن حسب المندوب')},
  {source:'salesperson-margin',metrics:['order_margin_percentage'],title:text('Order margin percentage by salesperson','نسبة هامش الطلبات حسب المندوب')},
 ],
 'product-invoice-performance':[
  {source:'product-values',metrics:['net_invoiced_revenue'],title:text('Product net invoice contribution','مساهمة المنتج في صافي الفواتير')},
  {source:'category-values',metrics:['refund_value'],title:text('Credit-note value by product category','قيمة الإشعارات الدائنة حسب فئة المنتج')},
 ],
 'customer-debt-aging':[{source:'positive-aging',metrics:['positive_due_0_30','positive_due_31_60','positive_due_61_90','positive_due_over_90'],title:text('Known positive due balances by age at each cutoff','الأرصدة الموجبة المستحقة المعروفة حسب العمر في كل قطع')}],
 'receivables-aging':[{source:'customer-aging',metrics:['net_aged_receivable'],title:text('Signed customer receivable balances — credits remain negative','أرصدة ذمم العملاء الموقعة — تبقى الأرصدة الدائنة سالبة')}],
 'executive-monthly-overview':[{source:'source-segments',metrics:['period_net_sales','period_cash_collections'],title:text('Monthly sales and cash by provisional source segment','المبيعات والنقد الشهريان حسب تصنيف المصدر المؤقت')}],
 'customer-positive-sales-pareto':[{source:'cumulative-share',type:'line',title:text('Cumulative positive customer sales share — 80% reference','حصة مبيعات العملاء الموجبة التراكمية — مرجع ٨٠٪')}],
 'product-brand-positive-sales-pareto':[
  {source:'product-share',type:'line',title:text('Cumulative positive product sales share — 80% reference','حصة مبيعات المنتجات الموجبة التراكمية — مرجع ٨٠٪')},
  {source:'brands',metrics:['period_net_sales'],title:text('Net invoice sales by native Brand','صافي مبيعات الفواتير حسب العلامة من المصدر')},
 ],
 'governorate-sales-abc':[
  {source:'governorates',title:text('Net sales by invoice governorate','صافي المبيعات حسب محافظة الفاتورة')},
  {source:'salespeople',title:text('Net sales by document salesperson','صافي المبيعات حسب مندوب المستند')},
 ],
 'observed-customer-movement':[{source:'segment-movement',title:text('Observed customer cohorts by segment — cohorts may overlap','مجموعات العملاء المرصودة حسب التصنيف — قد تتداخل المجموعات')}],
 'current-stock-expiry':[{source:'warehouse-negatives',title:text('Negative stock positions by warehouse','مواقع المخزون السالبة حسب المخزن')}],
 'book-liquidity-due-coverage':[{source:'journals',title:text('Signed cash / bank book balances by journal','أرصدة دفتر النقد والبنوك الموقعة حسب الدفتر')}],
};
function fromDetail(template:DashboardTemplate,purpose:PurposeChart,index:number):DashboardWidget {
 const source=template.widgets.find(widget=>widget.id===purpose.source);
 if(!source)throw new Error('Missing purpose-chart detail widget');
 const series=source.series.filter(series=>!purpose.metrics||purpose.metrics.includes(series.metric));
 if(!series.length||purpose.metrics?.some(metric=>!series.some(series=>series.metric===metric)))throw new Error('Missing purpose-chart metric');
 return {...source,id:`${purpose.source}-chart-${index}`,type:purpose.type??'bar',series,title:purpose.title,presentation:purpose.type==='line'?{curve:'straight'}:{orientation:source.dimension==='month'?'vertical':'horizontal'}};
}
function monthly(id:string,metrics:readonly MetricId[],title:LocalizedText):DashboardWidget {
 return {id,type:'line',dimension:'month' as DimensionId,title,series:metrics.map(metric=>({id:metric,metric})),presentation:{curve:'straight'}};
}
export function withPurposeCharts(template:DashboardTemplate):DashboardTemplate {
 const charts=(chartPurposes[template.id]??[]).map((purpose,index)=>fromDetail(template,purpose,index));
 if(template.id==='executive-sales-invoicing')charts.push(monthly('sales-invoice-trend',['order_revenue','net_invoiced_revenue'],text('Orders and net invoicing in their own document months','الطلبات وصافي الفواتير في أشهر مستنداتها')));
 if(template.id==='invoice-refund-operations')charts.push(
  monthly('document-count-trend',['invoice_count','refund_count'],text('Posted invoice and credit-note counts by month','أعداد الفواتير والإشعارات الدائنة المرحلة حسب الشهر')),
  monthly('document-value-trend',['invoiced_revenue','refund_value'],text('Posted invoice and credit-note values by month','قيم الفواتير والإشعارات الدائنة المرحلة حسب الشهر')),
 );
 if(!charts.length)return template;
 const headlines=template.widgets.filter(widget=>widget.type==='kpi'),details=template.widgets.filter(widget=>widget.type!=='kpi');
 return {...template,widgets:[...headlines,...charts,...details],layout:purposeLayout(headlines,charts,details)};
}

function purposeLayout(headlines:readonly DashboardWidget[],charts:readonly DashboardWidget[],details:readonly DashboardWidget[]):DashboardTemplate['layout']{
 const items:DashboardGridItem[]=headlines.map((widget,index)=>({widgetId:widget.id,x:index%3*4,y:Math.floor(index/3)*2,w:4,h:2}));
 let row=Math.ceil(headlines.length/3)*2;
 for(let index=0;index<charts.length;index++){
  const chart=charts[index]!,paired=chart.type==='bar'&&charts[index+1]?.type==='bar';
  items.push({widgetId:chart.id,x:0,y:row,w:paired?6:12,h:4});
  if(paired){items.push({widgetId:charts[++index]!.id,x:6,y:row,w:6,h:4});}
  row+=4;
 }
 for(const detail of details){items.push({widgetId:detail.id,x:0,y:row,w:12,h:5});row+=5;}
 return {columns:12,items};
}

/** Unpublished optional chart groupings never remove an already supported detail report. */
export function supportedPurposeTemplate(template:DashboardTemplate,published:PublishedAnalyticsCapabilities):DashboardTemplate {
 if(published.mode==='synthetic')return template;
 const chartIds=new Set((chartPurposes[template.id]??[]).map((purpose,index)=>`${purpose.source}-chart-${index}`));
 if(template.id==='executive-sales-invoicing')chartIds.add('sales-invoice-trend');
 if(template.id==='invoice-refund-operations'){chartIds.add('document-count-trend');chartIds.add('document-value-trend');}
 if(!chartIds.size)return template;
 const base={...template,widgets:template.widgets.filter(widget=>!chartIds.has(widget.id))},period=supportedTemplatePeriod(base,published);
 const widgets=template.widgets.filter(widget=>!chartIds.has(widget.id)||period&&widget.series.every(series=>!publishedQueryIssues({metric:series.metric,...(widget.dimension?{groupBy:widget.dimension}:{}),dateRange:period,...(series.analysis?{analysis:series.analysis}:{})},published).length));
 if(widgets.length===template.widgets.length)return template;
 const headlines=widgets.filter(widget=>widget.type==='kpi'),charts=widgets.filter(widget=>chartIds.has(widget.id)),details=widgets.filter(widget=>widget.type!=='kpi'&&!chartIds.has(widget.id));
 return {...template,widgets,layout:purposeLayout(headlines,charts,details)};
}
