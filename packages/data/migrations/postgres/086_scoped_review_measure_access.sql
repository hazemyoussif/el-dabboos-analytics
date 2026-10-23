-- Explicit measure populations must use tenant/partition/measure typed access.
-- Keep optional filters in separate statements; empty arrays select no rows.
-- Keyed reads, complete reads and sparse root masking retain their semantics.
CREATE OR REPLACE FUNCTION mart.review_effective_facts(selected_tenant text,selected_partition text,selected_keys text[] DEFAULT NULL,selected_measures text[] DEFAULT NULL)
 RETURNS SETOF mart.review_facts LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF selected_keys IS NOT NULL THEN
  RETURN QUERY

 WITH RECURSIVE lineage(partition_id,depth) AS (
  SELECT selected_partition,0 WHERE selected_tenant=nullif(current_setting('mart.tenant_id',true),'')
  UNION ALL SELECT origin.base_partition,lineage.depth+1 FROM lineage
  JOIN mart.business_delta_storage sparse ON sparse.tenant_id=selected_tenant AND sparse.partition_id=lineage.partition_id
  JOIN mart.business_delta_origins origin ON origin.tenant_id=selected_tenant AND origin.partition_id=lineage.partition_id
 ),requested AS MATERIALIZED (
  SELECT DISTINCT fact_key FROM unnest(selected_keys) identities(fact_key) WHERE fact_key IS NOT NULL
 )
 SELECT fact.tenant_id,selected_partition,fact.fact_key,fact.payload,fact.measure_id,
  fact.business_day,fact.amount,fact.dimensions,fact.display_labels,fact.entity_id
 FROM lineage CROSS JOIN requested JOIN mart.review_facts fact
 ON fact.tenant_id=selected_tenant AND fact.partition_id=lineage.partition_id AND fact.fact_key=requested.fact_key
 WHERE (selected_measures IS NULL OR fact.measure_id=ANY(selected_measures))
 AND NOT EXISTS(
  SELECT 1 FROM lineage newer JOIN mart.business_delta_replacements replaced
  ON replaced.tenant_id=selected_tenant AND replaced.partition_id=newer.partition_id
  WHERE newer.depth<lineage.depth AND replaced.source_object=fact.payload->>'sourceObject'
  AND replaced.source_record_id=fact.payload->>'sourceRecordId'
 );
  RETURN;
 END IF;
 IF selected_measures IS NOT NULL THEN
  RETURN QUERY

 WITH RECURSIVE lineage(partition_id,depth) AS (
  SELECT selected_partition,0 WHERE selected_tenant=nullif(current_setting('mart.tenant_id',true),'')
  UNION ALL SELECT origin.base_partition,lineage.depth+1 FROM lineage
  JOIN mart.business_delta_storage sparse ON sparse.tenant_id=selected_tenant AND sparse.partition_id=lineage.partition_id
  JOIN mart.business_delta_origins origin ON origin.tenant_id=selected_tenant AND origin.partition_id=lineage.partition_id
 ),requested_measures AS MATERIALIZED (
  SELECT DISTINCT measure_id FROM unnest(selected_measures) measures(measure_id) WHERE measure_id IS NOT NULL
 )
 SELECT fact.tenant_id,selected_partition,fact.fact_key,fact.payload,fact.measure_id,
  fact.business_day,fact.amount,fact.dimensions,fact.display_labels,fact.entity_id
 FROM lineage CROSS JOIN requested_measures JOIN mart.review_facts fact
 ON fact.tenant_id=selected_tenant AND fact.partition_id=lineage.partition_id AND fact.measure_id=requested_measures.measure_id
 WHERE true
 AND NOT EXISTS(
  SELECT 1 FROM lineage newer JOIN mart.business_delta_replacements replaced
  ON replaced.tenant_id=selected_tenant AND replaced.partition_id=newer.partition_id
  WHERE newer.depth<lineage.depth AND replaced.source_object=fact.payload->>'sourceObject'
  AND replaced.source_record_id=fact.payload->>'sourceRecordId'
 );
  RETURN;
 END IF;
 RETURN QUERY

 WITH RECURSIVE lineage(partition_id,depth) AS (
  SELECT selected_partition,0 WHERE selected_tenant=nullif(current_setting('mart.tenant_id',true),'')
  UNION ALL SELECT origin.base_partition,lineage.depth+1 FROM lineage
  JOIN mart.business_delta_storage sparse ON sparse.tenant_id=selected_tenant AND sparse.partition_id=lineage.partition_id
  JOIN mart.business_delta_origins origin ON origin.tenant_id=selected_tenant AND origin.partition_id=lineage.partition_id
 )
 SELECT fact.tenant_id,selected_partition,fact.fact_key,fact.payload,fact.measure_id,
  fact.business_day,fact.amount,fact.dimensions,fact.display_labels,fact.entity_id
 FROM lineage JOIN mart.review_facts fact ON fact.tenant_id=selected_tenant AND fact.partition_id=lineage.partition_id
 WHERE (selected_measures IS NULL OR fact.measure_id=ANY(selected_measures))
 AND NOT EXISTS(
  SELECT 1 FROM lineage newer JOIN mart.business_delta_replacements replaced
  ON replaced.tenant_id=selected_tenant AND replaced.partition_id=newer.partition_id
  WHERE newer.depth<lineage.depth AND replaced.source_object=fact.payload->>'sourceObject'
  AND replaced.source_record_id=fact.payload->>'sourceRecordId'
 );
END $$;

-- Project each necessary contributor/grain/time bucket once before matching
-- affected dimension keys. Reductions and label-conflict semantics are unchanged.
CREATE OR REPLACE FUNCTION mart.business_prepared_replacement_cells(selected_tenant text,selected_revision text,config jsonb,base_config jsonb)
 RETURNS TABLE(time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,dimension_key text,
 value numeric,fact_count bigint,minimum numeric,maximum numeric,data_through date,labels jsonb,conflicting_labels text[])
 LANGUAGE sql STABLE AS $$
 WITH keys AS MATERIALIZED (
  SELECT * FROM mart.business_prepared_affected_keys(selected_tenant,selected_revision,config,base_config)
 ),population AS MATERIALIZED (
  SELECT * FROM mart.business_prepared_population(selected_tenant,selected_revision,config,ARRAY(SELECT DISTINCT keys.measure_id FROM keys))
 ),projected AS MATERIALIZED (
  SELECT grain->>'id' grain_id,bucket.time_grain,
   CASE bucket.time_grain WHEN 'cutoff' THEN (config->>'through')::date
    WHEN 'monthly' THEN date_trunc('month',fact.business_day)::date ELSE fact.business_day END business_date,
   fact.measure_id,coalesce((SELECT jsonb_object_agg(attribute.key,attribute.value) FROM jsonb_each(fact.dimensions) attribute
    WHERE grain->'dimensions'?attribute.key),'{}'::jsonb) dimensions,
   fact.amount,fact.item_count,fact.business_day data_through,
   coalesce((SELECT jsonb_object_agg(label.key,label.value) FROM jsonb_each(fact.labels) label WHERE EXISTS(
    SELECT 1 FROM jsonb_array_elements_text(grain->'dimensions') dimension
    WHERE label.key=CASE dimension WHEN 'business_line' THEN 'businessLine' ELSE dimension END)),'{}'::jsonb) labels
  FROM population fact CROSS JOIN jsonb_array_elements(config->'grains') grain
  CROSS JOIN LATERAL (SELECT 'cutoff'::text time_grain WHERE config->>'kind'='snapshot'
   UNION ALL SELECT 'daily' WHERE config->>'kind'='event' UNION ALL SELECT 'monthly' WHERE config->>'kind'='event') bucket
  WHERE EXISTS(SELECT 1 FROM keys WHERE keys.measure_id=fact.measure_id AND keys.grain_id=grain->>'id'
   AND keys.time_grain=bucket.time_grain AND keys.business_date=CASE bucket.time_grain
    WHEN 'cutoff' THEN (config->>'through')::date WHEN 'monthly' THEN date_trunc('month',fact.business_day)::date ELSE fact.business_day END)
 ),expanded AS MATERIALIZED (
  SELECT keys.*,projected.amount,projected.item_count,projected.data_through,projected.labels
  FROM keys JOIN projected USING(time_grain,grain_id,business_date,measure_id,dimensions)
 ),reduced AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,sum(amount) value,sum(item_count)::bigint fact_count,
   min(amount) FILTER(WHERE item_count>0) minimum,max(amount) FILTER(WHERE item_count>0) maximum,max(data_through) data_through
  FROM expanded GROUP BY 1,2,3,4,5,6
 ),label_values AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,label.key,min(label.value) label,count(DISTINCT label.value) choices
  FROM expanded CROSS JOIN LATERAL jsonb_each_text(labels) label GROUP BY 1,2,3,4,5,6,7
 ),label_groups AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,
   coalesce(jsonb_object_agg(key,label) FILTER(WHERE choices=1),'{}'::jsonb) labels,
   coalesce(array_agg(key ORDER BY key) FILTER(WHERE choices>1),'{}'::text[]) conflicting_labels
  FROM label_values GROUP BY 1,2,3,4,5,6
 ) SELECT reduced.*,coalesce(label_groups.labels,'{}'::jsonb),coalesce(label_groups.conflicting_labels,'{}'::text[])
 FROM reduced LEFT JOIN label_groups USING(time_grain,grain_id,business_date,measure_id,dimensions,dimension_key)
$$;
