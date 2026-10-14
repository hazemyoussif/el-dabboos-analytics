import type {DashboardWidget,MetricId,DimensionId,LocalizedText} from '@el-dabboos/domain';
import type {DashboardTemplate} from './templates.ts';
const text=(en:string,ar:string):LocalizedText=>({en,ar});
function widget(id:string,type:DashboardWidget['type'],metrics:readonly MetricId[],dimension?:DimensionId):DashboardWidget {
 return {id,type,series:metrics.map(metric=>({id:metric,metric})),...(dimension?{dimension}:{})};
}
export const reviewTemplates:readonly DashboardTemplate[]=[
 {id:'customer-cash-collections',name:text('Customer Cash Collections','التحصيلات النقدية من العملاء'),description:text('Cash receipts, allocations and collection timing. Finance reviews results after exposure.','المقبوضات النقدية وتخصيصاتها وتوقيت التحصيل. تراجع المالية النتائج بعد إتاحتها.'),domain:'finance',tags:['management','finance','collections'],datePreset:'previous_month',layout:{columns:3},widgets:[
  widget('cash','kpi',['customer_cash_collected']),widget('applied','kpi',['cash_applied_to_invoices']),widget('unallocated','kpi',['unallocated_customer_receipts']),
  widget('ratio','kpi',['customer_collection_ratio']),widget('days','kpi',['weighted_collection_days']),widget('due','kpi',['receivables_due_for_collection']),
  widget('customer-cash','table',['customer_cash_collected','cash_applied_to_invoices','unallocated_customer_receipts'],'customer'),
  widget('customer-timing','table',['customer_collection_ratio','weighted_collection_days'],'customer'),
  {...widget('customer-due','table',['receivables_due_for_collection'],'customer'),title:text('Top 100 Customers Due for Collection','أعلى 100 عميل مستحق للتحصيل'),series:[{id:'receivables_due_for_collection',metric:'receivables_due_for_collection',analysis:{topN:{limit:100,direction:'top'}}}]},
 ]},
 {id:'confirmed-order-margin',name:text('Confirmed Order Margin','هامش ربح الطلبات المؤكدة'),description:text('Stored order margin and its percentage of untaxed order value; separate from accounting gross profit.','هامش الطلبات المخزن ونسبته إلى قيمة الطلب دون ضريبة؛ مستقل عن إجمالي الربح المحاسبي.'),domain:'sales',tags:['management','sales','margin'],datePreset:'previous_month',layout:{columns:2},widgets:[
  widget('margin','kpi',['order_margin']),widget('percentage','kpi',['order_margin_percentage']),
  widget('customer-margin','table',['order_margin','order_margin_percentage'],'customer'),
  widget('salesperson-margin','table',['order_margin','order_margin_percentage'],'salesperson'),
 ]},
 {id:'product-invoice-performance',name:text('Product Invoice Performance','أداء فواتير المنتجات'),description:text('Exact invoice-line contributions, including an unassigned product bucket.','مساهمات بنود الفواتير الدقيقة، بما فيها شريحة المنتج غير المعيّن.'),domain:'sales',tags:['management','sales','products'],datePreset:'previous_month',layout:{columns:2},widgets:[
  widget('product-values','table',['net_invoiced_revenue','invoiced_revenue','refund_value'],'product'),
  widget('category-values','table',['net_invoiced_revenue','invoiced_revenue','refund_value'],'product_category'),
 ]},
];
