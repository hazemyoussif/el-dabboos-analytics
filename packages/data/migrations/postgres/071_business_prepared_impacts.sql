-- Fixed Business preparation projections. Each query selects only the requested
-- measures. Snapshot operands come from their latest complete observation.
CREATE FUNCTION mart.business_prepared_population(selected_tenant text,selected_revision text,config jsonb,selected_measures text[])
 RETURNS TABLE(measure_id text,kind text,business_day date,entity_id text,amount numeric,dimensions jsonb,labels jsonb,item_count bigint)
 LANGUAGE sql STABLE AS $$
 WITH members AS MATERIALIZED (
  SELECT member.* FROM mart.analytics_serving_members member WHERE member.tenant_id=selected_tenant
  AND member.revision_id=selected_revision AND member.family='business'
  AND (config->>'kind'='event' AND member.month=(config->>'from')::date
   OR config->>'kind'='snapshot' AND member.month<=date_trunc('month',(config->>'through')::date))
 ),observations AS MATERIALIZED (
  SELECT DISTINCT ON(control.measure_id) control.measure_id,member.partition_id,observation.business_day,control.expected_value,control.expected_count
  FROM members member JOIN mart.review_controls control USING(tenant_id,partition_id)
  CROSS JOIN LATERAL mart.business_measure_observation(selected_tenant,member.partition_id,control.measure_id) observation
  WHERE config->>'kind'='snapshot' AND control.scope_key='summary' AND control.measure_id=ANY(selected_measures)
  AND observation.business_day<=(config->>'through')::date ORDER BY control.measure_id,observation.business_day DESC
 ) SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint
 FROM members member CROSS JOIN LATERAL mart.review_effective_facts(selected_tenant,member.partition_id,NULL,
  CASE WHEN config->>'kind'='event' THEN selected_measures ELSE ARRAY(SELECT observation.measure_id FROM observations observation
   WHERE observation.partition_id=member.partition_id) END) fact
 WHERE fact.payload->>'kind'=config->>'kind' AND fact.business_day::date<=(config->>'through')::date
 AND (config->>'kind'='event' AND fact.business_day::date>=(config->>'from')::date
  OR EXISTS(SELECT 1 FROM observations observation WHERE observation.partition_id=member.partition_id
   AND observation.measure_id=fact.measure_id AND observation.business_day=fact.business_day::date))
 UNION ALL SELECT measure_id,'snapshot',business_day,NULL,0::numeric,'{}'::jsonb,'{}'::jsonb,0::bigint
 FROM observations WHERE expected_count=0 AND expected_value=0
$$;
REVOKE ALL ON FUNCTION mart.business_prepared_population(text,text,jsonb,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_prepared_population(text,text,jsonb,text[]) TO dabboos_ingestor;

-- Old and new keys are both invalidated. New measures/grains calculate their
-- initial output only; established measures/grains retain their accepted cells.
CREATE FUNCTION mart.business_prepared_affected_keys(selected_tenant text,selected_revision text,config jsonb,base_config jsonb)
 RETURNS TABLE(time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,dimension_key text)
 LANGUAGE sql STABLE AS $$
 WITH changed_members AS (
  SELECT member.partition_id,previous.partition_id previous_partition,sparse.partition_id sparse_partition FROM mart.analytics_serving_revisions revision
  JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  LEFT JOIN mart.business_delta_storage sparse USING(tenant_id,partition_id)
  LEFT JOIN mart.analytics_serving_members previous ON previous.tenant_id=member.tenant_id
   AND previous.revision_id=revision.parent_revision AND previous.family=member.family AND previous.month=member.month
  WHERE revision.tenant_id=selected_tenant AND revision.revision_id=selected_revision AND member.family='business'
  AND member.partition_id IS DISTINCT FROM previous.partition_id
  AND (sparse.partition_id IS NOT NULL OR previous.partition_id IS NULL)
  AND (config->>'kind'='event' AND member.month=(config->>'from')::date
   OR config->>'kind'='snapshot' AND member.month<=date_trunc('month',(config->>'through')::date))
 ),current_observations AS (
  SELECT DISTINCT ON(measure_id) * FROM mart.prepared_snapshot_observations(selected_tenant,selected_revision,'business')
  WHERE config->>'kind'='snapshot' AND business_day<=(config->>'through')::date AND config->'measures'?measure_id
  ORDER BY measure_id,business_day DESC
 ),previous_observations AS (
  SELECT DISTINCT ON(measure_id) observation.* FROM mart.analytics_serving_revisions revision
  CROSS JOIN LATERAL mart.prepared_snapshot_observations(selected_tenant,revision.parent_revision,'business') observation
  WHERE revision.tenant_id=selected_tenant AND revision.revision_id=selected_revision AND config->>'kind'='snapshot'
  AND observation.business_day<=(base_config->>'through')::date AND config->'measures'?observation.measure_id
  ORDER BY measure_id,business_day DESC
 ),empty_footprints AS (
  SELECT coalesce(current.measure_id,previous.measure_id) measure_id,
   coalesce(current.business_day,previous.business_day) business_day,'{}'::jsonb dimensions
  FROM current_observations current FULL JOIN previous_observations previous USING(measure_id)
  WHERE (current.expected_count=0 OR previous.expected_count=0)
  AND ROW(current.business_day,current.expected_count,current.expected_value)
   IS DISTINCT FROM ROW(previous.business_day,previous.expected_count,previous.expected_value)
 ),changed AS MATERIALIZED (
  SELECT fact.measure_id,fact.business_day::date business_day,fact.dimensions
  FROM changed_members member CROSS JOIN LATERAL (
   SELECT fact.* FROM mart.business_delta_changed_rows(selected_tenant,member.partition_id) fact WHERE member.sparse_partition IS NOT NULL
   UNION ALL SELECT fact.* FROM mart.review_effective_facts(selected_tenant,member.partition_id,NULL,
    ARRAY(SELECT jsonb_array_elements_text(config->'measures'))) fact
    WHERE member.previous_partition IS NULL AND member.sparse_partition IS NULL
  ) fact
  WHERE fact.payload->>'kind'=config->>'kind' AND config->'measures'?fact.measure_id
  AND fact.business_day::date<=(config->>'through')::date
  AND (config->>'kind'='snapshot' OR fact.business_day::date>=(config->>'from')::date)
  UNION ALL SELECT * FROM empty_footprints
 ),initial_measures AS (
  SELECT measure FROM jsonb_array_elements_text(config->'measures') measure
  WHERE NOT base_config->'measures'?measure OR EXISTS(
   SELECT 1 FROM jsonb_array_elements(config->'grains') grain WHERE NOT EXISTS(
    SELECT 1 FROM jsonb_array_elements(base_config->'grains') previous WHERE previous=grain))
 ),initial AS MATERIALIZED (
  SELECT fact.measure_id,fact.business_day,fact.dimensions FROM mart.business_prepared_population(selected_tenant,selected_revision,config,
   ARRAY(SELECT measure FROM initial_measures)) fact
 ),inputs AS (
  SELECT changed.*,grain FROM changed CROSS JOIN jsonb_array_elements(config->'grains') grain
  UNION ALL SELECT initial.*,grain FROM initial CROSS JOIN jsonb_array_elements(config->'grains') grain
   WHERE NOT base_config->'measures'?initial.measure_id OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(base_config->'grains') previous WHERE previous=grain)
 ),keys AS (
  SELECT DISTINCT bucket.time_grain,grain->>'id' grain_id,
   CASE bucket.time_grain WHEN 'cutoff' THEN (config->>'through')::date WHEN 'monthly' THEN date_trunc('month',business_day)::date ELSE business_day END business_date,
   measure_id,coalesce((SELECT jsonb_object_agg(attribute.key,attribute.value) FROM jsonb_each(inputs.dimensions) attribute
    WHERE grain->'dimensions'?attribute.key),'{}'::jsonb) dimensions
  FROM inputs CROSS JOIN LATERAL (SELECT 'cutoff'::text time_grain WHERE config->>'kind'='snapshot'
   UNION ALL SELECT 'daily' WHERE config->>'kind'='event' UNION ALL SELECT 'monthly' WHERE config->>'kind'='event') bucket
 ),previous_complete_keys AS (
  SELECT cell.time_grain,cell.grain_id,(config->>'through')::date business_date,cell.measure_id,cell.dimensions
  FROM mart.analytics_serving_revisions revision JOIN mart.prepared_bindings binding
   ON binding.tenant_id=revision.tenant_id AND binding.revision_id=revision.parent_revision
  JOIN mart.prepared_datasets dataset ON dataset.tenant_id=binding.tenant_id AND dataset.data_id=binding.data_id
  CROSS JOIN LATERAL mart.business_prepared_cells(selected_tenant,binding.data_id,NULL,'cutoff',
   ARRAY(SELECT previous.measure_id FROM previous_observations previous JOIN current_observations observed USING(measure_id)
    WHERE date_trunc('month',previous.business_day) IS DISTINCT FROM date_trunc('month',observed.business_day))) cell
  WHERE config->>'kind'='snapshot' AND revision.tenant_id=selected_tenant AND revision.revision_id=selected_revision
  AND binding.family='business' AND binding.kind='snapshot' AND dataset.configuration=base_config
  AND EXISTS(SELECT 1 FROM jsonb_array_elements(config->'grains') grain WHERE grain->>'id'=cell.grain_id)
 ),all_keys AS (SELECT * FROM keys UNION SELECT * FROM previous_complete_keys)
 SELECT all_keys.*,encode(sha256(convert_to(dimensions::text,'UTF8')),'hex') FROM all_keys
$$;
REVOKE ALL ON FUNCTION mart.business_prepared_affected_keys(text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_prepared_affected_keys(text,text,jsonb,jsonb) TO dabboos_ingestor;

-- Re-read contributors to affected keys so removing a maximum/minimum, moving
-- ownership, distinct populations and conflicting labels remain exact.
CREATE FUNCTION mart.business_prepared_replacement_cells(selected_tenant text,selected_revision text,config jsonb,base_config jsonb)
 RETURNS TABLE(time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,dimension_key text,
 value numeric,fact_count bigint,minimum numeric,maximum numeric,data_through date,labels jsonb,conflicting_labels text[])
 LANGUAGE sql STABLE AS $$
 WITH keys AS MATERIALIZED (
  SELECT * FROM mart.business_prepared_affected_keys(selected_tenant,selected_revision,config,base_config)
 ),population AS MATERIALIZED (
  SELECT * FROM mart.business_prepared_population(selected_tenant,selected_revision,config,ARRAY(SELECT DISTINCT keys.measure_id FROM keys))
 ),expanded AS MATERIALIZED (
  SELECT keys.*,fact.amount,fact.item_count,fact.business_day data_through,
   coalesce((SELECT jsonb_object_agg(label.key,label.value) FROM jsonb_each(fact.labels) label WHERE EXISTS(
    SELECT 1 FROM jsonb_array_elements_text(grain->'dimensions') dimension
    WHERE label.key=CASE dimension WHEN 'business_line' THEN 'businessLine' ELSE dimension END)),'{}'::jsonb) labels
  FROM keys JOIN jsonb_array_elements(config->'grains') grain ON grain->>'id'=keys.grain_id
  JOIN population fact ON fact.measure_id=keys.measure_id
   AND (keys.time_grain='cutoff' OR keys.time_grain='daily' AND fact.business_day=keys.business_date
    OR keys.time_grain='monthly' AND date_trunc('month',fact.business_day)::date=keys.business_date)
   AND coalesce((SELECT jsonb_object_agg(attribute.key,attribute.value) FROM jsonb_each(fact.dimensions) attribute
    WHERE grain->'dimensions'?attribute.key),'{}'::jsonb)=keys.dimensions
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
REVOKE ALL ON FUNCTION mart.business_prepared_replacement_cells(text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_prepared_replacement_cells(text,text,jsonb,jsonb) TO dabboos_ingestor;
