import type {DashboardWidget,MetricId,LocalizedText} from '@el-dabboos/domain';
import type {DashboardTemplate} from './templates.ts';
const text=(en:string,ar:string):LocalizedText=>({en,ar});
const series=(metrics:readonly MetricId[])=>metrics.map(metric=>({id:metric,metric}));
const kpis=(metrics:readonly MetricId[]):DashboardWidget[]=>metrics.map(metric=>({id:metric,type:'kpi',series:series([metric])}));
const dueCustomers:DashboardWidget={id:'customers-due',type:'table',dimension:'customer',title:text('Top 100 Customers Due for Collection','أعلى 100 عميل مستحق للتحصيل'),series:[{id:'due',metric:'receivables_due_for_collection',analysis:{topN:{limit:100,direction:'top'}}}]};
/** Mixed event/snapshot reports bind one complete published month; balances never sum across months. */
export const leadershipTemplates:readonly DashboardTemplate[]=[
 {id:'customer-debt-aging',name:text('Customer Debt & Aging','مديونية العملاء وأعمار الديون'),description:text('Month-end signed aging and cash collected during the same month. Filter by customer for individual balances; the due table shows only the Top 100. Collection timing excludes unpaid invoices.','أعمار الذمم الموقّعة في نهاية الشهر والتحصيل النقدي خلال الشهر نفسه. رشّح حسب العميل لعرض رصيده؛ يعرض جدول المستحقات أعلى 100 فقط. يستثني توقيت التحصيل الفواتير غير المسددة.'),domain:'finance',tags:['management','finance','collections','aging'],datePreset:'previous_month',periodStrategy:'latest_complete_month',layout:{columns:3},widgets:[
  ...kpis(['net_aged_receivable','total_overdue_receivable','credit_balances','receivables_due_for_collection','customer_cash_collected','weighted_collection_days']),
  {id:'aging-breakdown',type:'table',dimension:'month',title:text('Month-end signed aging — existing governed buckets','أعمار الذمم الموقّعة في نهاية الشهر — الشرائح المعتمدة الحالية'),series:series(['aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120'])},
  dueCustomers,
 ]},
 {id:'executive-monthly-overview',name:text('Executive Monthly Overview','النظرة التنفيذية الشهرية'),description:text('Sales, invoice refunds, cash collections and month-end debt for one shared published month. Cash may settle older invoices; sales and collections retain their own source cutoffs. Inventory and physical returns are not included.','المبيعات والإشعارات الدائنة والتحصيل النقدي ومديونية نهاية الشهر لشهر منشور مشترك. قد تسدد التحصيلات فواتير أقدم؛ تحتفظ المبيعات والتحصيلات بتواريخ قطع مصادرها. لا يشمل المخزون والمرتجعات الفعلية.'),domain:'executive',tags:['management','leadership','overview'],datePreset:'previous_month',periodStrategy:'latest_complete_month',layout:{columns:3},widgets:[
  ...kpis(['net_invoiced_revenue','refund_value','customer_cash_collected','unallocated_customer_receipts','net_aged_receivable','total_overdue_receivable']),
  {id:'business-line-invoices',type:'bar',dimension:'business_line',title:text('Net invoice revenue and refunds by Business Line','صافي إيرادات الفواتير والإشعارات الدائنة حسب خط الأعمال'),series:series(['net_invoiced_revenue','refund_value']),presentation:{orientation:'horizontal'}},
  dueCustomers,
 ]},
];
