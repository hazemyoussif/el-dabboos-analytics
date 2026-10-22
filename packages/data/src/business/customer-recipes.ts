import {customerSegmentSql} from './source-recipes.ts';
import {receivablesControlBaseForIdentities} from '../operational/receivable-control-sql.ts';
export const customerRecipe=`WITH invoice_history AS (
 SELECT partner_id,min(invoice_date) FILTER(WHERE move_type='out_invoice') first_invoice,max(invoice_date) FILTER(WHERE move_type='out_invoice') last_invoice,
 coalesce(sum(amount_untaxed_signed) FILTER(WHERE invoice_date BETWEEN $2::date AND $3::date),0) period_sales,
 coalesce(sum(amount_untaxed_signed) FILTER(WHERE invoice_date>=date_trunc('year',$3::date)),0) ytd_sales
 FROM account_move WHERE company_id=$1::int AND state='posted' AND move_type IN('out_invoice','out_refund') AND invoice_date<=$3::date GROUP BY partner_id
),order_history AS (
 SELECT partner_id,count(*) orders,max(((date_order AT TIME ZONE 'UTC') AT TIME ZONE $4)::date) last_order
 FROM sale_order WHERE company_id=$1::int AND state='sale' AND ((date_order AT TIME ZONE 'UTC') AT TIME ZONE $4)::date<=$3::date GROUP BY partner_id
),cash_history AS (
 SELECT payment.partner_id,max(payment.date) last_cash FROM account_payment payment JOIN account_move move ON move.id=payment.move_id AND move.company_id=payment.company_id
 WHERE payment.company_id=$1::int AND payment.payment_type='inbound' AND payment.partner_type='customer' AND payment.state IN('in_process','paid')
 AND move.state='posted' AND payment.amount>0 AND payment.date<=$3::date
 AND EXISTS(SELECT 1 FROM account_move_line line JOIN account_account account ON account.id=line.account_id
 WHERE line.move_id=move.id AND line.company_id=payment.company_id AND account.account_type='asset_receivable' AND line.balance<0)
 GROUP BY payment.partner_id
),customers AS(SELECT partner_id FROM invoice_history UNION SELECT partner_id FROM order_history UNION SELECT partner_id FROM cash_history)
 SELECT partner.id::text id,$3::date business_date,$1::int company_id,currency.name currency,
 jsonb_build_object('customer',partner.id::text,'state',partner.state_id::text,'customer_segment',${customerSegmentSql},
 'customer_class',CASE WHEN $3::date<>(date_trunc('month',$3::date)+interval '1 month - 1 day')::date THEN 'unknown'
 WHEN coalesce(invoice.ytd_sales,0)/extract(month FROM $3::date)>=1000000 THEN 'A'
 WHEN coalesce(invoice.ytd_sales,0)/extract(month FROM $3::date)>=400000 THEN 'B' ELSE 'C' END) dimensions,
 value.measure_id,value.amount,false invalid
 FROM customers JOIN res_partner partner ON partner.id=customers.partner_id
 JOIN res_company company ON company.id=$1::int JOIN res_currency currency ON currency.id=company.currency_id
 LEFT JOIN invoice_history invoice ON invoice.partner_id=partner.id LEFT JOIN order_history orders ON orders.partner_id=partner.id LEFT JOIN cash_history cash ON cash.partner_id=partner.id
 CROSS JOIN LATERAL(VALUES
 ('observed_customer_count',1::numeric),
 ('customer_period_sales',coalesce(invoice.period_sales,0)),
 ('customer_average_monthly_sales',CASE WHEN $3::date=(date_trunc('month',$3::date)+interval '1 month - 1 day')::date THEN coalesce(invoice.ytd_sales,0)/extract(month FROM $3::date) END),
 ('customer_observed_orders',coalesce(orders.orders,0)::numeric),
 ('observed_new_customers',(CASE WHEN invoice.first_invoice BETWEEN $2::date AND $3::date THEN 1 ELSE 0 END)::numeric),
 ('observed_single_order_customers',(CASE WHEN orders.orders=1 THEN 1 ELSE 0 END)::numeric),
 ('observed_inactive_customers',(CASE WHEN orders.last_order<($3::date-interval '3 months')::date THEN 1 ELSE 0 END)::numeric),
 ('customer_last_invoice_date',(invoice.last_invoice-date '1970-01-01')::numeric),
 ('customer_last_collection_date',(cash.last_cash-date '1970-01-01')::numeric),
 ('order_age_exceptions',CASE WHEN $3::date=$5::date THEN (
 SELECT count(*) FROM sale_order record WHERE record.company_id=$1::int AND record.state='sale' AND record.partner_id=partner.id
 AND (record.date_order AT TIME ZONE 'UTC')<($6::timestamptz-interval '1 day')
 AND EXISTS(SELECT 1 FROM sale_order_line line JOIN product_product product ON product.id=line.product_id JOIN product_template template ON template.id=product.product_tmpl_id
 WHERE line.order_id=record.id AND line.display_type IS NULL AND template.type<>'service' AND line.product_uom_qty>0 AND line.qty_delivered<line.product_uom_qty))::numeric END)
 ) value(measure_id,amount) WHERE value.amount IS NOT NULL`;
function receivableSql(selected=false){return receivablesControlBaseForIdentities(selected).replaceAll('$2::date','$3::date')+` SELECT reconstructed.id::text id,$3::date business_date,$1::int company_id,company_currency currency,
 jsonb_build_object('customer',partner_id::text,'state',partner.state_id::text,'customer_segment',${customerSegmentSql},'customer_class',NULL::text) dimensions,
 value.measure_id,value.amount,(invalid_links>0 OR reconstructed_current<>stored_current) invalid
 FROM reconstructed LEFT JOIN res_partner partner ON partner.id=reconstructed.partner_id
 CROSS JOIN LATERAL(VALUES ('review_customer_balance',residual),
 ('receivables_due_next_month',CASE WHEN date_maturity BETWEEN (date_trunc('month',$3::date)+interval '1 month')::date AND (date_trunc('month',$3::date)+interval '2 months - 1 day')::date THEN greatest(residual,0) ELSE 0 END),
 ('receivable_unknown_due',CASE WHEN date_maturity IS NULL THEN greatest(residual,0) ELSE 0 END),
 ('positive_receivable_not_due',CASE WHEN date_maturity>$3::date THEN greatest(residual,0) ELSE 0 END),
 ('positive_due_0_30',CASE WHEN $3::date-date_maturity BETWEEN 0 AND 30 THEN greatest(residual,0) ELSE 0 END),
 ('positive_due_31_60',CASE WHEN $3::date-date_maturity BETWEEN 31 AND 60 THEN greatest(residual,0) ELSE 0 END),
 ('positive_due_61_90',CASE WHEN $3::date-date_maturity BETWEEN 61 AND 90 THEN greatest(residual,0) ELSE 0 END),
 ('positive_due_over_90',CASE WHEN $3::date-date_maturity>90 THEN greatest(residual,0) ELSE 0 END)) value(measure_id,amount)
 WHERE $2::date IS NOT NULL AND $4::text IS NOT NULL AND $5::date IS NOT NULL AND residual<>0`;}
export const receivableRecipe=receivableSql();
export function receivableIdentityRecipe(){return receivableSql(true);}
