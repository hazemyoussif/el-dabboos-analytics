/** Reduce negative/positive positions before clamping, once per product/warehouse. */
export const inventoryAvailabilityRecipe=`WITH cost_defaults AS (
 SELECT coalesce((SELECT CASE WHEN defaults.json_value::jsonb IN('null'::jsonb,'false'::jsonb) THEN '0'
  ELSE defaults.json_value::jsonb#>>'{}' END FROM ir_default defaults
  JOIN ir_model_fields field ON field.id=defaults.field_id
  WHERE field.model='product.product' AND field.name='standard_price' AND defaults.user_id IS NULL AND defaults.condition IS NULL
  AND (defaults.company_id=$1::int OR defaults.company_id IS NULL)
  ORDER BY defaults.company_id NULLS LAST,defaults.id LIMIT 1),'0')::numeric amount,
 EXISTS(SELECT 1 FROM ir_default defaults JOIN ir_model_fields field ON field.id=defaults.field_id
  WHERE field.model='product.product' AND field.name='standard_price' AND defaults.user_id IS NOT NULL AND defaults.condition IS NULL
  AND (defaults.company_id=$1::int OR defaults.company_id IS NULL)) user_specific
),positions AS (
 SELECT quant.product_id,quant.company_id,
 (SELECT CASE WHEN count(*)=1 THEN min(warehouse.id) END FROM stock_warehouse warehouse
  JOIN stock_location root ON root.id=warehouse.view_location_id
  WHERE warehouse.company_id=$1::int AND location.parent_path LIKE root.parent_path||'%') warehouse_id,
 quant.quantity,quant.reserved_quantity
 FROM stock_quant quant JOIN stock_location location ON location.id=quant.location_id
 WHERE quant.company_id=$1::int AND location.usage='internal' AND quant.owner_id IS NULL
 AND (quant.quantity<>0 OR quant.reserved_quantity<>0 OR quant.quantity IS NULL OR quant.reserved_quantity IS NULL)
),totals AS (
 SELECT product_id,company_id,warehouse_id,sum(quantity) on_hand,sum(reserved_quantity) reserved,
 bool_or(quantity IS NULL OR reserved_quantity IS NULL OR reserved_quantity<0) invalid
 FROM positions GROUP BY product_id,company_id,warehouse_id
)
 SELECT product.id::text||':'||coalesce(totals.warehouse_id::text,'unassigned') id,
 $5::date business_date,totals.company_id,currency.name currency,
 jsonb_build_object('product',product.id::text,'product_category',template.categ_id::text,
  'brand',template.product_brand_id::text,'uom',template.uom_id::text,'warehouse',totals.warehouse_id::text) dimensions,
 value.measure_id,value.amount,
 (totals.invalid OR (value.measure_id='free_stock_value' AND greatest(totals.on_hand-totals.reserved,0)>0
  AND (product.standard_price->>totals.company_id::text) IS NULL AND cost_defaults.user_specific)) invalid
 FROM totals JOIN product_product product ON product.id=totals.product_id
 JOIN product_template template ON template.id=product.product_tmpl_id
 JOIN res_company company ON company.id=totals.company_id JOIN res_currency currency ON currency.id=company.currency_id
 CROSS JOIN cost_defaults
 CROSS JOIN LATERAL(VALUES
  ('reserved_stock_quantity',totals.reserved),
  ('free_stock_quantity',greatest(totals.on_hand-totals.reserved,0)),
  ('free_stock_value',CASE WHEN greatest(totals.on_hand-totals.reserved,0)=0 THEN 0
   ELSE greatest(totals.on_hand-totals.reserved,0)*coalesce((product.standard_price->>totals.company_id::text)::numeric,cost_defaults.amount) END)
 ) value(measure_id,amount)
 WHERE $2::date IS NOT NULL AND $3::date=$5::date AND $4::text IS NOT NULL`;
