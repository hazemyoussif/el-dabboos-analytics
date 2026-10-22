/** Warehouse is derived from location ancestors, never stock.move.warehouse_id. */
const warehouse=`(SELECT CASE WHEN count(*)=1 THEN min(warehouse.id) END FROM stock_warehouse warehouse JOIN stock_location root ON root.id=warehouse.view_location_id
 WHERE warehouse.company_id=$1::int AND location.parent_path LIKE root.parent_path||'%')`;
const productDimensions=`'product',product.id::text,'product_category',template.categ_id::text,'brand',template.product_brand_id::text,'uom',template.uom_id::text`;
export const stockRecipe=`SELECT quant.id::text id,$5::date business_date,quant.company_id,currency.name currency,
 jsonb_build_object(${productDimensions},'warehouse',${warehouse}::text) dimensions,
 value.measure_id,value.amount,
 (quant.quantity IS NULL OR (lot.id IS NOT NULL AND (lot.product_id<>quant.product_id OR (lot.company_id IS NOT NULL AND lot.company_id<>quant.company_id)))) invalid
 FROM stock_quant quant JOIN stock_location location ON location.id=quant.location_id
 JOIN product_product product ON product.id=quant.product_id JOIN product_template template ON template.id=product.product_tmpl_id
 JOIN res_company company ON company.id=quant.company_id JOIN res_currency currency ON currency.id=company.currency_id
 LEFT JOIN stock_lot lot ON lot.id=quant.lot_id
 CROSS JOIN LATERAL(VALUES ('internal_stock_quantity',quant.quantity),
 ('expired_stock_quantity',CASE WHEN quant.quantity>0 AND ((lot.expiration_date AT TIME ZONE 'UTC') AT TIME ZONE $4)::date<$5::date THEN quant.quantity ELSE 0 END),
 ('near_expiry_stock_quantity',CASE WHEN quant.quantity>0 AND ((lot.expiration_date AT TIME ZONE 'UTC') AT TIME ZONE $4)::date BETWEEN $5::date AND ($5::date+interval '2 months')::date THEN quant.quantity ELSE 0 END),
 ('unknown_expiry_stock_quantity',CASE WHEN quant.quantity>0 AND lot.expiration_date IS NULL THEN quant.quantity ELSE 0 END),
 ('negative_stock_positions',CASE WHEN quant.quantity<0 THEN 1 ELSE 0 END::numeric)) value(measure_id,amount)
 WHERE $2::date IS NOT NULL AND $3::date=$5::date AND quant.company_id=$1::int AND location.usage='internal' AND quant.owner_id IS NULL AND (quant.quantity<>0 OR quant.quantity IS NULL)`;
export const movementRecipe=`SELECT line.id::text id,(((line.date AT TIME ZONE 'UTC') AT TIME ZONE $4)::date) business_date,line.company_id,currency.name currency,
 jsonb_build_object(${productDimensions},'warehouse',${warehouse}::text) dimensions,
 CASE WHEN origin.usage='customer' THEN 'physical_return_quantity' WHEN destination.usage='customer' THEN 'delivered_customer_quantity' ELSE 'internal_transfer_quantity' END measure_id,line.quantity_product_uom amount,
 (line.quantity_product_uom IS NULL OR line.quantity_product_uom<0 OR move.company_id<>line.company_id) invalid
 FROM stock_move_line line JOIN stock_move move ON move.id=line.move_id AND move.state='done'
 JOIN stock_location origin ON origin.id=line.location_id JOIN stock_location destination ON destination.id=line.location_dest_id
 JOIN stock_location location ON location.id=CASE WHEN destination.usage='customer' THEN origin.id ELSE destination.id END
 JOIN product_product product ON product.id=line.product_id JOIN product_template template ON template.id=product.product_tmpl_id
 JOIN res_company company ON company.id=line.company_id JOIN res_currency currency ON currency.id=company.currency_id
 WHERE $5::date IS NOT NULL AND line.company_id=$1::int AND ((destination.usage='internal' AND origin.usage IN('customer','internal')) OR (origin.usage='internal' AND destination.usage='customer'))
 AND ((line.date AT TIME ZONE 'UTC') AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date`;
export function unbilledRecipe(purchase:boolean){
 const table=purchase?'purchase':'sale',states=purchase?"('purchase','done')":"('sale')",quantity=purchase?'product_qty':'product_uom_qty',fulfilled=purchase?'qty_received':'qty_delivered';
 return `SELECT line.id::text id,$5::date business_date,record.company_id,currency.name currency,
 jsonb_build_object(${productDimensions},'${purchase?'supplier':'customer'}',record.partner_id::text) dimensions,
 '${purchase?'received':'delivered'}_unbilled_quantity' measure_id,
 greatest(line.${fulfilled}-line.qty_invoiced,0)/unit.factor*base.factor amount,
 (unit.id IS NULL OR base.id IS NULL OR unit.category_id<>base.category_id OR unit.factor<=0 OR base.factor<=0 OR line.${fulfilled} IS NULL OR line.qty_invoiced IS NULL OR line.company_id<>record.company_id) invalid
 FROM ${table}_order_line line JOIN ${table}_order record ON record.id=line.order_id
 JOIN product_product product ON product.id=line.product_id JOIN product_template template ON template.id=product.product_tmpl_id
 LEFT JOIN uom_uom unit ON unit.id=line.product_uom LEFT JOIN uom_uom base ON base.id=template.uom_id
 JOIN res_company company ON company.id=record.company_id JOIN res_currency currency ON currency.id=company.currency_id
 WHERE $2::date IS NOT NULL AND $4::text IS NOT NULL AND $3::date=$5::date AND record.company_id=$1::int AND record.state IN${states}
 AND line.display_type IS NULL AND template.type<>'service' AND line.${quantity}>0 AND line.${fulfilled}>line.qty_invoiced`;
}
export const cashLedgerRecipe=`SELECT journal.id::text id,$5::date business_date,$1::int company_id,currency.name currency,
 jsonb_build_object('journal',journal.id::text) dimensions,'book_cash_balance' measure_id,sum(line.balance) amount,bool_or(line.balance IS NULL OR line.balance<>round(line.balance,6)) invalid
 FROM account_move_line line JOIN account_move move ON move.id=line.move_id AND move.company_id=line.company_id
 JOIN account_account account ON account.id=line.account_id AND account.account_type='asset_cash'
 JOIN account_journal journal ON journal.id=line.journal_id AND journal.company_id=line.company_id
 JOIN res_company company ON company.id=line.company_id JOIN res_currency currency ON currency.id=company.currency_id
 WHERE $2::date IS NOT NULL AND $4::text IS NOT NULL AND $3::date=$5::date AND line.company_id=$1::int AND move.state='posted' AND line.date<=$5::date
 GROUP BY journal.id,currency.name`;
function payableSql(selected=false){return `SELECT line.id::text id,$5::date business_date,line.company_id,currency.name currency,
 jsonb_build_object('supplier',line.partner_id::text) dimensions,value.measure_id,value.amount,(line.amount_residual IS NULL OR line.amount_residual<>round(line.amount_residual,6)) invalid
 FROM account_move_line line JOIN account_move move ON move.id=line.move_id AND move.company_id=line.company_id
 JOIN account_account account ON account.id=line.account_id AND account.account_type='liability_payable'
 JOIN res_company company ON company.id=line.company_id JOIN res_currency currency ON currency.id=company.currency_id
 CROSS JOIN LATERAL(VALUES
 ('supplier_payable_next_month',CASE WHEN line.date_maturity BETWEEN (date_trunc('month',$5::date)+interval '1 month')::date AND (date_trunc('month',$5::date)+interval '2 months - 1 day')::date THEN greatest(-line.amount_residual,0) ELSE 0 END),
 ('supplier_payable_due',CASE WHEN line.date_maturity<=$5::date THEN greatest(-line.amount_residual,0) ELSE 0 END),
 ('supplier_payable_unknown_due',CASE WHEN line.date_maturity IS NULL THEN greatest(-line.amount_residual,0) ELSE 0 END),
 ('supplier_advance_balance',greatest(line.amount_residual,0))) value(measure_id,amount)
 WHERE $2::date IS NOT NULL AND $4::text IS NOT NULL AND $3::date=$5::date AND line.company_id=$1::int AND move.state='posted' AND line.date<=$5::date AND (line.amount_residual<>0 OR line.amount_residual IS NULL)${selected?' AND line.id=ANY($10::bigint[])':''}`;}
export const payableRecipe=payableSql();
export function payableIdentityRecipe(){return payableSql(true);}
