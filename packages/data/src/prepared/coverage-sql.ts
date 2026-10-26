/** All dictionaries are frozen prepared inputs; pairs have already been completed. */
export const coverageSelectionSql=`WITH entity_cells AS MATERIALIZED(
 SELECT cell.* FROM mart.business_prepared_cells($1,$2::jsonb->'axes'->'entity'->>'data_id',
 $2::jsonb->'axes'->'entity'->>'grain_id','cutoff',ARRAY['coverage_customer_population','coverage_tag_membership','coverage_excluded_product_count'],
 ($2::jsonb->>'through')::date,($2::jsonb->>'through')::date) cell WHERE fact_count>0
),item_cells AS MATERIALIZED(
 SELECT cell.* FROM mart.business_prepared_cells($1,$2::jsonb->'axes'->'item'->>'data_id',
 $2::jsonb->'axes'->'item'->>'grain_id','cutoff',ARRAY['coverage_forecast_quantity'],
 ($2::jsonb->>'through')::date,($2::jsonb->>'through')::date) cell WHERE fact_count>0
),tags AS MATERIALIZED(
 SELECT dimensions->>'customer' customer,dimensions->>'customer_tag' tag,labels->>'customer_tag' label
 FROM entity_cells WHERE measure_id='coverage_tag_membership'
),customers AS MATERIALIZED(
 SELECT cell.* FROM entity_cells cell WHERE measure_id='coverage_customer_population' AND dimensions->>'coverage_year'=$4
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements($5::jsonb) filter
  WHERE filter->>'dimension' IN('customer','customer_salesperson','customer_state','customer_tag')
   AND CASE WHEN filter->>'dimension'='customer_tag' THEN NOT EXISTS(
    SELECT 1 FROM tags WHERE tags.customer=cell.dimensions->>'customer' AND filter->'values'?tags.tag)
   ELSE NOT coalesce(filter->'values'?(cell.dimensions->>(filter->>'dimension')),false) END)
),products AS MATERIALIZED(
 SELECT cell.* FROM item_cells cell WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements($5::jsonb) filter
  WHERE filter->>'dimension' IN('product','product_category','brand','uom')
   AND NOT coalesce(filter->'values'?(cell.dimensions->>(filter->>'dimension')),false))
),selected AS NOT MATERIALIZED(
 SELECT pair.*,customer.dimensions customer_dimensions,customer.labels customer_labels,
 product.dimensions product_dimensions,product.labels product_labels,product.value::text forecast
 FROM mart.prepared_population_rows pair JOIN customers customer ON customer.dimensions->>'customer'=pair.entity_key
 JOIN products product ON product.dimensions->>'product'=pair.item_key
 WHERE pair.tenant_id=$1 AND pair.data_id=$3 AND pair.partition_key=$4
),counts AS(
 SELECT count(*) FILTER(WHERE $6='all' OR ($6='sold')=(amount>0))::text total,
 count(*) FILTER(WHERE amount>0)::text sold,count(*) FILTER(WHERE amount<=0)::text unsold FROM selected
),excluded AS(
 SELECT coalesce(sum(cell.value),0)::text total FROM entity_cells cell JOIN customers customer ON customer.dimensions->>'customer'=cell.dimensions->>'customer'
 WHERE cell.measure_id='coverage_excluded_product_count' AND cell.dimensions->>'coverage_year'=$4
),page AS(
 SELECT * FROM selected WHERE ($6='all' OR ($6='sold')=(amount>0))
 AND (entity_key COLLATE "C",item_key COLLATE "C")>($7::text COLLATE "C",$8::text COLLATE "C")
 ORDER BY entity_key COLLATE "C",item_key COLLATE "C" LIMIT $9
)
SELECT jsonb_build_object('total',counts.total,'sold',counts.sold,'unsold',counts.unsold,'excluded',excluded.total,
 'rows',coalesce((SELECT jsonb_agg(to_jsonb(page)||jsonb_build_object('amount',page.amount::text,'tags',coalesce((SELECT jsonb_agg(jsonb_build_object('id',tag,'label',label) ORDER BY tag) FROM tags WHERE tags.customer=page.entity_key),'[]'::jsonb)) ORDER BY entity_key COLLATE "C",item_key COLLATE "C") FROM page),'[]'::jsonb)) result
FROM counts,excluded`;
