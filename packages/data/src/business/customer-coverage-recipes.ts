/** Fixed adapter SQL. Population parameters are validated, versioned mapping data. */
export const customerCoverageRecipe=`WITH basis AS MATERIALIZED (
 SELECT rule.population FROM jsonb_to_recordset($9::jsonb) rule("measureId" text,population jsonb)
 WHERE rule."measureId"='coverage_forecast_quantity'
),years AS (SELECT value::int source_year FROM basis,jsonb_array_elements_text(population->'years')),
locations AS MATERIALIZED (
 SELECT location.id FROM stock_location location WHERE EXISTS(
  SELECT 1 FROM stock_warehouse warehouse JOIN stock_location root ON root.id=warehouse.view_location_id
  WHERE warehouse.company_id=$1::int AND location.parent_path LIKE root.parent_path||'%')
),excluded AS (
 SELECT category.id FROM product_category category WHERE EXISTS(
  SELECT 1 FROM basis,jsonb_array_elements_text(population->'excludedProductCategories') excluded(id)
  JOIN product_category root ON root.id=excluded.id::int WHERE category.parent_path LIKE root.parent_path||'%')
),stock AS (
 SELECT product_id,sum(quantity) quantity,bool_or(quantity IS NULL) invalid FROM stock_quant
 WHERE company_id=$1::int AND owner_id IS NULL AND location_id IN(SELECT id FROM locations) GROUP BY product_id
),moves AS (
 SELECT move.product_id,sum(move.product_qty) FILTER(WHERE origin.id IS NULL AND destination.id IS NOT NULL) incoming,
 sum(move.product_qty) FILTER(WHERE origin.id IS NOT NULL AND destination.id IS NULL) outgoing,
 bool_or(move.product_qty IS NULL OR move.product_qty<0) invalid
 FROM stock_move move LEFT JOIN locations origin ON origin.id=move.location_id
 LEFT JOIN locations destination ON destination.id=coalesce(move.location_final_id,move.location_dest_id)
 WHERE move.company_id=$1::int AND move.restrict_partner_id IS NULL
 AND move.state IN('waiting','confirmed','assigned','partially_available') GROUP BY move.product_id
),forecast AS MATERIALIZED (
 SELECT product.id,template.categ_id,template.product_brand_id,template.uom_id,
 CASE WHEN unit.rounding>0 THEN round((coalesce(stock.quantity,0)
  +round(coalesce(moves.incoming,0)/unit.rounding)*unit.rounding
  -round(coalesce(moves.outgoing,0)/unit.rounding)*unit.rounding)/unit.rounding)*unit.rounding END quantity,
 coalesce(stock.invalid,false) OR coalesce(moves.invalid,false) OR unit.rounding IS NULL OR unit.rounding<=0 invalid
 FROM product_product product JOIN product_template template ON template.id=product.product_tmpl_id
 LEFT JOIN uom_uom unit ON unit.id=template.uom_id LEFT JOIN stock ON stock.product_id=product.id LEFT JOIN moves ON moves.product_id=product.id
 WHERE product.active AND template.active AND template.type<>'service' AND (template.company_id IS NULL OR template.company_id=$1::int)
),eligible AS MATERIALIZED (SELECT * FROM forecast WHERE quantity>0 AND id IS NOT NULL AND categ_id NOT IN(SELECT id FROM excluded)),
invoice_lines AS MATERIALIZED (
 SELECT years.source_year,record.partner_id,line.product_id,
 CASE WHEN unit.factor>0 AND base.factor>0 AND unit.category_id=base.category_id
  THEN (CASE WHEN record.move_type='out_refund' THEN -1 ELSE 1 END)*line.quantity/unit.factor*base.factor END quantity,
 record.partner_id IS NULL OR line.company_id<>record.company_id OR (eligible.id IS NOT NULL AND
  (line.quantity IS NULL OR unit.factor IS NULL OR unit.factor<=0 OR base.factor IS NULL OR base.factor<=0 OR unit.category_id IS NULL OR base.category_id IS NULL OR unit.category_id IS DISTINCT FROM base.category_id)) invalid,
 eligible.id eligible_id
 FROM account_move record JOIN account_move_line line ON line.move_id=record.id
 JOIN years ON years.source_year=extract(year FROM record.invoice_date)::int
 JOIN product_product product ON product.id=line.product_id JOIN product_template template ON template.id=product.product_tmpl_id
 LEFT JOIN uom_uom unit ON unit.id=line.product_uom_id LEFT JOIN uom_uom base ON base.id=template.uom_id
 LEFT JOIN eligible ON eligible.id=line.product_id
 WHERE record.company_id=$1::int AND record.state='posted' AND record.move_type IN('out_invoice','out_refund')
 AND record.invoice_date<=$5::date AND line.display_type='product' AND template.type<>'service'
),customers AS MATERIALIZED (
 SELECT source_year,partner_id,count(DISTINCT product_id) FILTER(WHERE eligible_id IS NULL)::numeric excluded_products
 FROM invoice_lines GROUP BY source_year,partner_id
),net AS MATERIALIZED (
 SELECT source_year,partner_id,product_id,sum(quantity) quantity FROM invoice_lines WHERE eligible_id IS NOT NULL GROUP BY source_year,partner_id,product_id
),quality AS (
 SELECT EXISTS(SELECT 1 FROM forecast WHERE invalid) OR EXISTS(SELECT 1 FROM invoice_lines WHERE invalid)
 OR EXISTS(SELECT 1 FROM customers LEFT JOIN res_partner partner ON partner.id=customers.partner_id WHERE partner.id IS NULL)
 OR EXISTS(SELECT 1 FROM years WHERE source_year>extract(year FROM $5::date))
 OR EXISTS(SELECT 1 FROM basis WHERE jsonb_array_length(population->'excludedProductCategories')<>(
  SELECT count(*) FROM product_category WHERE id IN(SELECT value::int FROM jsonb_array_elements_text(population->'excludedProductCategories')))) invalid
),records AS (
 SELECT 'p:'||product.id::text id,'coverage_forecast_quantity' measure_id,product.quantity amount,
 jsonb_build_object('product',product.id::text,'product_category',product.categ_id::text,'brand',product.product_brand_id::text,'uom',product.uom_id::text) dimensions
 FROM eligible product
 UNION ALL
 SELECT 'c:'||customer.source_year||':'||partner.id,value.measure_id,value.amount,
 jsonb_build_object('customer',partner.id::text,'customer_salesperson',partner.user_id::text,'customer_state',partner.state_id::text,'coverage_year',customer.source_year::text)
 FROM customers customer JOIN res_partner partner ON partner.id=customer.partner_id
 CROSS JOIN LATERAL(VALUES('coverage_customer_population',1::numeric),('coverage_excluded_product_count',customer.excluded_products)) value(measure_id,amount)
 UNION ALL
 SELECT 's:'||net.source_year||':'||partner.id||':'||product.id,'coverage_net_quantity',net.quantity,
 jsonb_build_object('customer',partner.id::text,'customer_salesperson',partner.user_id::text,'customer_state',partner.state_id::text,'coverage_year',net.source_year::text,
 'product',product.id::text,'product_category',product.categ_id::text,'brand',product.product_brand_id::text,'uom',product.uom_id::text)
 FROM net JOIN res_partner partner ON partner.id=net.partner_id JOIN eligible product ON product.id=net.product_id
 UNION ALL
 SELECT DISTINCT 't:'||partner.id||':'||tag.id,'coverage_tag_membership',1::numeric,
 jsonb_build_object('customer',partner.id::text,'customer_salesperson',partner.user_id::text,'customer_state',partner.state_id::text,'customer_tag',tag.id::text)
 FROM customers customer JOIN res_partner partner ON partner.id=customer.partner_id
 JOIN res_partner_res_partner_category_rel membership ON membership.partner_id=partner.id
 JOIN res_partner_category tag ON tag.id=membership.category_id
 UNION ALL
 SELECT 'invalid','coverage_customer_population',0::numeric,'{}'::jsonb FROM quality WHERE invalid
)
 SELECT records.id,$5::date business_date,$1::int company_id,currency.name currency,
 records.dimensions,records.measure_id,records.amount,quality.invalid
 FROM records CROSS JOIN quality JOIN res_company company ON company.id=$1::int JOIN res_currency currency ON currency.id=company.currency_id
 WHERE $2::date IS NOT NULL AND $3::date=$5::date AND $4::text IS NOT NULL`;
