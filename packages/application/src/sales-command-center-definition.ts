import {semanticCatalog} from '@el-dabboos/domain';
import type {DashboardWidget,DimensionId,LocalizedText,MetricId} from '@el-dabboos/domain';

export type SalesSectionId='today'|'month'|'follow-up'|'trends'|'customers';
export type SalesPeriodRule='today'|'current_month'|'selected_range'|'six_weeks';
export interface SalesCommandWidget {
 id:string;section:SalesSectionId;title:LocalizedText;period:SalesPeriodRule;
 insight?:import('@el-dabboos/domain').SalesCommandInsight;widget?:DashboardWidget;comparison?:import('@el-dabboos/domain').SalesCommandComparison;
 reference:'requires_reconciliation'|'different_definition'|'requires_definition';
 reason?:'untaxed_invoice'|'order_states'|'cash_rules'|'invoice_states'|'payment_states'|'same_day_cash'|'receipt_salesperson'|'debt_salesperson'|'overdue_days'|'weekly'|'comparison'|'customer_count'|'cancellation_rate'|'shares';
}
const text=(en:string,ar:string):LocalizedText=>({en,ar});
const series=(metrics:readonly MetricId[]):DashboardWidget['series']=>metrics.map(metric=>({id:metric,metric}));
function kpi(id:string,section:SalesSectionId,period:SalesPeriodRule,metric:MetricId):SalesCommandWidget {
 return {id,section,period,title:semanticCatalog[metric].labels,reference:'requires_reconciliation',widget:{id,type:'kpi',series:series([metric])}};
}
function grouped(id:string,section:SalesSectionId,period:SalesPeriodRule,dimension:DimensionId,settings:{metrics:readonly MetricId[];title:LocalizedText;limit?:number}):SalesCommandWidget {
 const {metrics,title,limit}=settings,entries=series(metrics);
 if(limit)entries[0]={...entries[0]!,analysis:{topN:{direction:'top',limit}}} as DashboardWidget['series'][number];
 return {id,section,period,title,reference:'requires_reconciliation',widget:{id,type:'table',dimension,title,series:entries}};
}
export const salesCommandSections:readonly {id:SalesSectionId;title:LocalizedText}[]=[
 {id:'today',title:text('Today','اليوم')},
 {id:'month',title:text('Month to date','الشهر حتى اليوم')},
 {id:'follow-up',title:text('Customers to follow up','عملاء للمتابعة')},
 {id:'trends',title:text('Order trends','اتجاهات الطلبات')},
 {id:'customers',title:text('Top customers','أبرز العملاء')},
];
/** Report recipes are explicit business intent, never tenant IDs, data, SQL or release overrides. */
export const salesCommandWidgets:readonly SalesCommandWidget[]=[
 kpi('today-invoices','today','today','command_invoice_total'),
 kpi('today-invoice-count','today','today','command_invoice_count'),
 {...kpi('today-cash','today','today','command_cash_received'),comparison:'four_weekdays'},
 kpi('today-orders','today','today','command_order_count'),
 grouped('today-invoice-status','today','today','invoice_document_state',{metrics:['command_document_count','command_document_value'],title:text('Invoice document states','حالات مستندات الفواتير')}),
 grouped('today-invoice-payment-status','today','today','invoice_payment_state',{metrics:['command_invoice_count','command_invoice_total','command_invoice_residual'],title:text('Posted invoice payment states','حالات سداد الفواتير المرحلة')}),
 grouped('today-payment-status','today','today','receipt_state',{metrics:['command_receipt_count','command_receipt_value','command_cash_received'],title:text('Receipt states — document value and eligible cash','حالات القبض — قيمة المستند والنقد المؤهل')}),
 grouped('today-invoice-reps','today','today','salesperson',{metrics:['command_invoice_total','command_invoice_count','command_invoice_residual','command_invoice_settled'],title:text('Invoices by salesperson','الفواتير حسب المندوب')}),
 grouped('today-payment-reps','today','today','salesperson',{metrics:['command_cash_received','command_receipt_count'],title:text('Receipts by payment salesperson','المقبوضات حسب مندوب الدفعة')}),
 grouped('today-order-status','today','today','order_state',{metrics:['command_order_status_count','command_order_status_value'],title:text('Today’s orders and quotations','طلبات اليوم وعروض الأسعار')}),
 kpi('today-same-day','today','today','command_same_day_cash'),
 kpi('today-same-day-rate','today','today','command_same_day_rate'),
 {...kpi('month-invoices','month','current_month','command_invoice_total'),comparison:'previous_month_elapsed'},
 kpi('month-invoice-count','month','current_month','command_invoice_count'),
 kpi('month-refunds','month','current_month','command_invoice_refunds'),
 kpi('month-net-invoices','month','current_month','command_net_invoices'),
 kpi('month-cash','month','current_month','command_cash_received'),
 grouped('month-payment-status','month','current_month','receipt_state',{metrics:['command_receipt_count','command_receipt_value','command_cash_received'],title:text('Monthly receipt states','حالات المقبوضات الشهرية')}),
 kpi('range-orders','month','selected_range','command_order_count'),
 kpi('range-order-value','month','selected_range','command_order_value'),
 kpi('range-cancelled','month','selected_range','command_cancelled_count'),
 kpi('range-cancelled-value','month','selected_range','command_cancelled_value'),
 kpi('range-cancel-rate','month','selected_range','command_cancellation_rate'),
 kpi('range-customers','month','selected_range','command_customers'),
 grouped('month-invoice-reps','month','current_month','salesperson',{metrics:['command_invoice_total','command_invoice_count','command_invoice_residual','command_invoice_settled'],title:text('Monthly invoices by salesperson','الفواتير الشهرية حسب المندوب')}),
 grouped('month-payment-reps','month','current_month','salesperson',{metrics:['command_cash_received','command_receipt_count'],title:text('Monthly receipts by payment salesperson','المقبوضات الشهرية حسب مندوب الدفعة')}),
 contribution('range-governorates','month','selected_range','state',{limit:1,title:text('Leading governorate — share of all confirmed orders','المحافظة الأولى — حصتها من كل الطلبات المؤكدة')}),
 grouped('overdue-customers','follow-up','today','customer',{metrics:['command_overdue_balance','command_future_balance','command_customer_balance','command_unknown_maturity','command_overdue_days'],title:text('Top 10 overdue customers — signed balances and oldest debit days','أبرز ١٠ عملاء متأخرين — الأرصدة الموقعة وأيام أقدم استحقاق مدين'),limit:10}),
 grouped('debt-reps','follow-up','today','salesperson',{metrics:['command_overdue_balance','command_customer_balance','command_overdue_days'],title:text('Receivable account owners — current customer owner, then line salesperson','مسؤولو الذمم — مسؤول العميل الحالي ثم مندوب البند')}),
 {...grouped('daily-orders','trends','selected_range','date',{metrics:['command_order_value'],title:text('Daily confirmed orders incl. tax','الطلبات المؤكدة اليومية شاملة الضريبة')}),widget:{id:'daily-orders',type:'line',dimension:'date',title:text('Daily confirmed orders incl. tax','الطلبات المؤكدة اليومية شاملة الضريبة'),series:series(['command_order_value'])}},
 grouped('daily-order-table','trends','selected_range','date',{metrics:['command_order_count','command_order_value','command_cancelled_count','command_cancelled_value'],title:text('Daily order details','تفاصيل الطلبات اليومية')}),
 {...grouped('weekly-orders','trends','six_weeks','week',{metrics:['command_order_value'],title:text('Six consecutive weeks — Saturday start; current week partial','ستة أسابيع متتالية — تبدأ السبت والأسبوع الحالي جزئي')}),widget:{id:'weekly-orders',type:'bar',dimension:'week',title:text('Six consecutive weeks — Saturday start; current week partial','ستة أسابيع متتالية — تبدأ السبت والأسبوع الحالي جزئي'),series:series(['command_order_value'])}},
 grouped('top-customers','customers','selected_range','customer',{metrics:['command_order_value','command_order_count'],title:text('Top 10 customers — selected confirmed-order period','أبرز ١٠ عملاء — فترة الطلبات المؤكدة المختارة'),limit:10}),
 contribution('range-shares','customers','selected_range','customer',{limit:10,title:text('Top 10 customers — individual shares of all confirmed orders','أبرز ١٠ عملاء — حصة كل منهم من كل الطلبات المؤكدة')}),
];
function contribution(id:string,section:SalesSectionId,period:SalesPeriodRule,dimension:DimensionId,settings:{limit:number;title:LocalizedText}):SalesCommandWidget {
 const {limit,title}=settings;
 const definition=grouped(id,section,period,dimension,{metrics:['command_order_value'],title,limit});
 return {...definition,insight:dimension==='customer'?'top_customer_share':'leading_state',widget:{...definition.widget!,series:[{id:'command_order_value',metric:'command_order_value',analysis:{percentageContribution:true,...(dimension==='customer'?{topN:{direction:'top' as const,limit}}:{ranking:true as const})}}]}};
}
