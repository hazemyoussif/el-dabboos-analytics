import {receivablesControlBaseSql} from '../operational/receivable-control-sql.ts';
/** Closed, company-scoped source recipes. All amounts stay exact PostgreSQL numerics. */
const paymentBase=`WITH receipts AS (
 SELECT payment.id,payment.date,payment.partner_id,payment.company_id,payment.amount,payment.currency_id,
 company.currency_id company_currency_id,currency.name company_currency,
 move.id move_id,coalesce(sum(-line.balance),0) cash,
 -- A zero-value receipt contributes zero; a debit receivable line conflicts with inbound cash.
 count(*) FILTER(WHERE line.balance>0 OR line.partner_id IS DISTINCT FROM payment.partner_id OR line.balance<>round(line.balance,6)
 OR EXISTS(SELECT 1 FROM account_payment peer WHERE peer.move_id=move.id AND peer.company_id=payment.company_id AND peer.id<>payment.id)) invalid
 FROM account_payment payment JOIN account_move move ON move.id=payment.move_id AND move.company_id=payment.company_id
 JOIN res_company company ON company.id=payment.company_id JOIN res_currency currency ON currency.id=company.currency_id
 JOIN account_move_line line ON line.move_id=move.id AND line.company_id=payment.company_id
 JOIN account_account account ON account.id=line.account_id AND account.account_type='asset_receivable'
 WHERE $4::text IS NOT NULL AND payment.company_id=ANY($1::int[]) AND payment.payment_type='inbound' AND payment.partner_type='customer'
 AND payment.state IN ('in_process','paid') AND move.state='posted' AND payment.date BETWEEN $2::date AND $3::date
 GROUP BY payment.id,company.currency_id,currency.name,move.id
), allocation AS (
 SELECT receipt.id,sum(partial.amount) applied,
 sum(partial.amount*(receipt.date-invoice.invoice_date)) amount_days,
 count(*) FILTER(WHERE partial.company_id<>receipt.company_id OR debit.company_id<>receipt.company_id
 OR credit.company_id<>receipt.company_id OR debit.partner_id IS DISTINCT FROM receipt.partner_id
 OR invoice.invoice_date IS NULL OR partial.amount<=0 OR partial.amount<>round(partial.amount,6)) invalid
 FROM receipts receipt JOIN account_move_line credit ON credit.move_id=receipt.move_id
 JOIN account_partial_reconcile partial ON partial.credit_move_id=credit.id AND partial.max_date<=$5::date
 JOIN account_move_line debit ON debit.id=partial.debit_move_id JOIN account_move invoice ON invoice.id=debit.move_id
 JOIN account_account debit_account ON debit_account.id=debit.account_id
 JOIN account_account credit_account ON credit_account.id=credit.account_id
 WHERE invoice.state='posted' AND invoice.move_type='out_invoice'
 AND debit_account.account_type='asset_receivable' AND credit_account.account_type='asset_receivable'
 GROUP BY receipt.id
) SELECT receipt.id::text source_record_id,'account_payment' source_object,'whole' component_id,
 receipt.date::text business_date,receipt.company_id::text company_id,receipt.company_currency currency,
 receipt.partner_id::text customer,NULL::text salesperson,NULL::text business_line,NULL::text product,NULL::text product_category,
 value.measure_id,value.amount::numeric(30,6)::text value,
 (receipt.invalid+coalesce(allocation.invalid,0)>0 OR receipt.cash<0 OR coalesce(allocation.applied,0)>receipt.cash
 OR receipt.currency_id<>receipt.company_currency_id OR receipt.amount<>receipt.cash) invalid
 FROM receipts receipt LEFT JOIN allocation ON allocation.id=receipt.id
 CROSS JOIN LATERAL (VALUES
 ('customer_cash_collected',receipt.cash),('cash_applied_to_invoices',coalesce(allocation.applied,0)),
 ('unallocated_customer_receipts',receipt.cash-coalesce(allocation.applied,0)),
 ('collection_amount_days',coalesce(allocation.amount_days,0)),('collection_applied_amount',coalesce(allocation.applied,0))
 ) value(measure_id,amount)`;
const orderBase=`SELECT record.id::text source_record_id,'sale_order' source_object,'whole' component_id,
 (((record.date_order AT TIME ZONE 'UTC') AT TIME ZONE $4)::date)::text business_date,
 record.company_id::text company_id,currency.name currency,record.partner_id::text customer,record.user_id::text salesperson,
 record.business_line_id::text business_line,NULL::text product,NULL::text product_category,
 value.measure_id,value.amount::numeric(30,6)::text value,
 (record.margin IS NULL OR record.amount_untaxed IS NULL OR record.margin<>round(record.margin,6) OR record.amount_untaxed<>round(record.amount_untaxed,6) OR record.currency_id<>company.currency_id) invalid
 FROM sale_order record JOIN res_company company ON company.id=record.company_id JOIN res_currency currency ON currency.id=company.currency_id
 CROSS JOIN LATERAL (VALUES ('order_margin',record.margin),('order_untaxed_value',record.amount_untaxed)) value(measure_id,amount)
 WHERE record.company_id=ANY($1::int[]) AND record.state='sale'
 AND ((record.date_order AT TIME ZONE 'UTC') AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date`;
const productBase=`SELECT line.id::text source_record_id,'account_move_line' source_object,'whole' component_id,
 record.invoice_date::text business_date,record.company_id::text company_id,currency.name currency,
 record.partner_id::text customer,record.invoice_user_id::text salesperson,record.business_line_id::text business_line,
 line.product_id::text product,template.categ_id::text product_category,
 value.measure_id,value.amount::numeric(30,6)::text value,
 (record.currency_id<>company.currency_id OR line.company_id<>record.company_id OR line.price_subtotal IS NULL OR line.price_subtotal<>round(line.price_subtotal,6)
 OR (SELECT coalesce(sum(peer.price_subtotal),0) FROM account_move_line peer WHERE peer.move_id=record.id AND peer.display_type='product')
 <> CASE WHEN record.move_type='out_refund' THEN -record.amount_untaxed_signed ELSE record.amount_untaxed_signed END) invalid
 FROM account_move record JOIN account_move_line line ON line.move_id=record.id AND line.display_type='product'
 JOIN res_company company ON company.id=record.company_id JOIN res_currency currency ON currency.id=company.currency_id
 LEFT JOIN product_product product ON product.id=line.product_id LEFT JOIN product_template template ON template.id=product.product_tmpl_id
 CROSS JOIN LATERAL (VALUES ('net_invoiced_revenue',CASE WHEN record.move_type='out_refund' THEN -line.price_subtotal ELSE line.price_subtotal END),
 (CASE WHEN record.move_type='out_refund' THEN 'refund_value' ELSE 'invoiced_revenue' END,line.price_subtotal)) value(measure_id,amount)
 WHERE $4::text IS NOT NULL AND record.company_id=ANY($1::int[]) AND record.state='posted' AND record.move_type IN ('out_invoice','out_refund')
 AND record.invoice_date BETWEEN $2::date AND $3::date`;
export type ReviewSourceFamily='payments'|'orders'|'products'|'due';
export function reviewSourceSql(family:ReviewSourceFamily):string {
 if(family==='payments')return paymentBase;
 if(family==='orders')return orderBase;
 if(family==='products')return productBase;
 return receivablesControlBaseSql+` SELECT id::text source_record_id,'receivable_cutoff' source_object,'whole' component_id,
 $2::date::text business_date,$1::int::text company_id,company_currency currency,partner_id::text customer,
 NULL::text salesperson,NULL::text business_line,NULL::text product,NULL::text product_category,
 'receivables_due_for_collection' measure_id,greatest(residual,0)::numeric(30,6)::text value,
 (invalid_links>0 OR reconstructed_current<>stored_current) invalid
 FROM reconstructed WHERE date_maturity<=$2::date`;
}
