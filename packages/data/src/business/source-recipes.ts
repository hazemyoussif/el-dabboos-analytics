/** Fixed company/date-scoped SQL only. No user or model supplies SQL. */
export const customerSegmentSql=`(SELECT CASE WHEN count(DISTINCT family)=0 THEN 'unknown' WHEN count(DISTINCT family)>1 THEN 'ambiguous' ELSE min(family) END
 FROM (SELECT CASE WHEN category_id IN(166,268,322) THEN 'markets' WHEN category_id=177 THEN 'confectionery-bakery-kirzat'
 WHEN category_id IN(173,174,175) THEN 'wholesale' END family FROM res_partner_res_partner_category_rel WHERE partner_id=partner.id) tags WHERE family IS NOT NULL)`;
export const invoiceRecipe=`SELECT line.id::text id,record.invoice_date business_date,record.company_id,currency.name currency,
 jsonb_build_object('customer',record.partner_id::text,'salesperson',record.invoice_user_id::text,'state',record.state_id::text,
 'customer_segment',${customerSegmentSql},'product',line.product_id::text,'product_category',template.categ_id::text,'brand',template.product_brand_id::text) dimensions,
 value.measure_id,value.amount amount,
 (record.currency_id<>company.currency_id OR line.company_id<>record.company_id OR line.price_subtotal IS NULL OR line.price_subtotal<>round(line.price_subtotal,6)) invalid
 FROM account_move record JOIN account_move_line line ON line.move_id=record.id AND line.display_type='product'
 JOIN res_company company ON company.id=record.company_id JOIN res_currency currency ON currency.id=company.currency_id
 LEFT JOIN res_partner partner ON partner.id=record.partner_id LEFT JOIN product_product product ON product.id=line.product_id
 LEFT JOIN product_template template ON template.id=product.product_tmpl_id
 CROSS JOIN LATERAL(VALUES ('period_collection_sales',CASE WHEN record.move_type='out_refund' THEN -line.price_subtotal ELSE line.price_subtotal END),
 ('period_net_sales',CASE WHEN record.move_type='out_refund' THEN -line.price_subtotal ELSE line.price_subtotal END),
 (CASE WHEN record.move_type='out_refund' THEN 'period_invoice_refunds' ELSE 'period_invoice_sales' END,line.price_subtotal)) value(measure_id,amount)
 WHERE $4::text IS NOT NULL AND $5::date IS NOT NULL AND record.company_id=$1::int AND record.state='posted'
 AND record.move_type IN('out_invoice','out_refund') AND record.invoice_date BETWEEN $2::date AND $3::date`;
export const cashRecipe=`WITH cash AS (
 SELECT payment.id,payment.date,payment.partner_id,payment.company_id,company.currency_id,currency.name currency,
 payment.amount receipt_amount,payment.currency_id payment_currency,coalesce(sum(-line.balance),0) amount,
 bool_or(line.partner_id IS DISTINCT FROM payment.partner_id OR line.balance>0 OR line.balance<>round(line.balance,6)) invalid
 FROM account_payment payment JOIN account_move move ON move.id=payment.move_id AND move.company_id=payment.company_id
 JOIN account_move_line line ON line.move_id=move.id AND line.company_id=payment.company_id
 JOIN account_account account ON account.id=line.account_id AND account.account_type='asset_receivable'
 JOIN res_company company ON company.id=payment.company_id JOIN res_currency currency ON currency.id=company.currency_id
 WHERE payment.company_id=$1::int AND payment.payment_type='inbound' AND payment.partner_type='customer'
 AND payment.state IN('in_process','paid') AND move.state='posted' AND payment.date BETWEEN $2::date AND $3::date
 GROUP BY payment.id,company.currency_id,currency.name
) SELECT cash.id::text id,cash.date business_date,cash.company_id,cash.currency,
 jsonb_build_object('customer',cash.partner_id::text,'customer_segment',${customerSegmentSql}) dimensions,
 'period_cash_collections' measure_id,cash.amount,
 (cash.invalid OR cash.amount<0 OR cash.receipt_amount<>cash.amount OR cash.payment_currency IS NULL
 OR EXISTS(SELECT 1 FROM account_payment peer WHERE peer.move_id=(SELECT move_id FROM account_payment WHERE id=cash.id) AND peer.id<>cash.id AND peer.company_id=cash.company_id)
 OR (cash.payment_currency<>cash.currency_id AND NOT(cash.receipt_amount=0 AND cash.amount=0 AND NOT EXISTS(SELECT 1 FROM account_move_line ledger JOIN account_partial_reconcile partial ON partial.credit_move_id=ledger.id OR partial.debit_move_id=ledger.id WHERE ledger.move_id=(SELECT move_id FROM account_payment WHERE id=cash.id))))) invalid
 FROM cash LEFT JOIN res_partner partner ON partner.id=cash.partner_id WHERE $4::text IS NOT NULL AND $5::date IS NOT NULL`;

export const invoiceQuantityRecipe=`SELECT line.id::text id,record.invoice_date business_date,record.company_id,currency.name currency,
 jsonb_build_object('customer',record.partner_id::text,'salesperson',record.invoice_user_id::text,'state',record.state_id::text,'customer_segment',${customerSegmentSql},'product',product.id::text,'product_category',template.categ_id::text,'brand',template.product_brand_id::text,'uom',template.uom_id::text) dimensions,
 'invoiced_product_quantity' measure_id,line.quantity/unit.factor*base.factor*(CASE WHEN record.move_type='out_refund' THEN -1 ELSE 1 END) amount,
 (unit.id IS NULL OR base.id IS NULL OR unit.category_id<>base.category_id OR unit.factor<=0 OR base.factor<=0 OR line.quantity IS NULL OR line.company_id<>record.company_id) invalid
 FROM account_move record JOIN account_move_line line ON line.move_id=record.id AND line.display_type='product'
 JOIN product_product product ON product.id=line.product_id JOIN product_template template ON template.id=product.product_tmpl_id
 LEFT JOIN uom_uom unit ON unit.id=line.product_uom_id LEFT JOIN uom_uom base ON base.id=template.uom_id
 LEFT JOIN res_partner partner ON partner.id=record.partner_id
 JOIN res_company company ON company.id=record.company_id JOIN res_currency currency ON currency.id=company.currency_id
 WHERE $4::text IS NOT NULL AND $5::date IS NOT NULL AND record.company_id=$1::int AND record.state='posted' AND record.move_type IN('out_invoice','out_refund') AND record.invoice_date BETWEEN $2::date AND $3::date`;
