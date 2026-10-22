-- A prepared parent must already be sealed on this publication's exact parent
-- revision. Immutable ancestry cannot be attached or changed after binding.
CREATE FUNCTION mart.guard_business_prepared_origin() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE config jsonb;base_config jsonb;
 BEGIN
 SELECT configuration INTO STRICT config FROM mart.prepared_datasets WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id;
 SELECT configuration INTO STRICT base_config FROM mart.prepared_datasets WHERE tenant_id=NEW.tenant_id AND data_id=NEW.base_data_id;
 IF config->>'family' IS DISTINCT FROM 'business' OR base_config->>'family' IS DISTINCT FROM 'business'
 OR (config-ARRAY['from','through','measures','grains']) IS DISTINCT FROM (base_config-ARRAY['from','through','measures','grains'])
 OR (base_config->>'through')::date>(config->>'through')::date
 OR (config->>'kind'='event' AND (config->>'from' IS DISTINCT FROM base_config->>'from' OR config->>'through' IS DISTINCT FROM base_config->>'through'))
 OR NOT EXISTS(SELECT 1 FROM mart.analytics_serving_revisions revision JOIN mart.prepared_bindings binding
  ON binding.tenant_id=revision.tenant_id AND binding.revision_id=revision.parent_revision
  WHERE revision.tenant_id=NEW.tenant_id AND revision.revision_id=NEW.revision_id AND revision.parent_revision=NEW.base_revision
  AND binding.data_id=NEW.base_data_id AND binding.family='business' AND binding.kind=config->>'kind')
 THEN RAISE EXCEPTION 'Business prepared delta requires a compatible sealed publication parent'; END IF;
 RETURN NEW;
 END $$;
CREATE TRIGGER business_prepared_origin_guard BEFORE INSERT ON mart.business_prepared_origins
 FOR EACH ROW EXECUTE FUNCTION mart.guard_business_prepared_origin();
REVOKE ALL ON FUNCTION mart.guard_business_prepared_origin() FROM PUBLIC;

-- Counts reuse accepted statistics, subtract replaced cells and add new cells.
CREATE FUNCTION mart.business_prepared_statistics(selected_tenant text,selected_data text)
 RETURNS jsonb LANGUAGE sql STABLE AS $$
 WITH origin AS (
  SELECT origin.*,dataset.configuration config,binding.statistics FROM mart.business_prepared_origins origin
  JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
  JOIN mart.prepared_bindings binding ON binding.tenant_id=origin.tenant_id AND binding.revision_id=origin.base_revision
   AND binding.data_id=origin.base_data_id AND binding.family='business' AND binding.kind=dataset.configuration->>'kind'
  WHERE origin.tenant_id=selected_tenant AND origin.data_id=selected_data
 ),operands AS (
  SELECT entry.key,entry.value::bigint count FROM origin,jsonb_each_text(origin.statistics) entry
  WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(origin.config->'grains') grain
   WHERE entry.key=CASE WHEN origin.config->>'kind'='snapshot' THEN 'cutoff:' ELSE 'daily:' END||(grain->>'id')
    OR origin.config->>'kind'='event' AND entry.key='monthly:'||(grain->>'id'))
  UNION ALL SELECT cell.time_grain||':'||cell.grain_id,count(*) FROM mart.prepared_cells cell
   WHERE cell.tenant_id=selected_tenant AND cell.data_id=selected_data GROUP BY cell.time_grain,cell.grain_id
  UNION ALL SELECT cell.time_grain||':'||cell.grain_id,-count(*) FROM origin
   CROSS JOIN LATERAL mart.business_prepared_cells(selected_tenant,origin.base_data_id,NULL,NULL,
    ARRAY(SELECT measure FROM jsonb_array_elements_text((SELECT configuration->'measures' FROM mart.prepared_datasets
     WHERE tenant_id=selected_tenant AND data_id=origin.base_data_id)) measure WHERE NOT origin.config->'measures'?measure)) cell
   WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(origin.config->'grains') grain WHERE grain->>'id'=cell.grain_id)
   GROUP BY cell.time_grain,cell.grain_id
  UNION ALL SELECT cell.time_grain||':'||cell.grain_id,-count(*) FROM origin
   CROSS JOIN LATERAL mart.business_prepared_cells(selected_tenant,origin.base_data_id,NULL,NULL,
    ARRAY(SELECT DISTINCT measure_id FROM mart.business_prepared_keys WHERE tenant_id=selected_tenant AND data_id=selected_data)) cell
   JOIN mart.business_prepared_keys replaced ON replaced.tenant_id=selected_tenant AND replaced.data_id=selected_data
    AND replaced.time_grain=cell.time_grain AND replaced.grain_id=cell.grain_id AND replaced.measure_id=cell.measure_id
    AND replaced.dimension_key=cell.dimension_key AND replaced.dimensions=cell.dimensions
    AND (cell.time_grain='cutoff' OR replaced.business_date=cell.business_date)
   GROUP BY cell.time_grain,cell.grain_id
 ),counts AS (SELECT key,sum(count)::bigint count FROM operands GROUP BY key)
 SELECT CASE WHEN bool_or(count<0) THEN NULL ELSE coalesce(jsonb_object_agg(key,count) FILTER(WHERE count>0),'{}'::jsonb) END FROM counts
$$;
REVOKE ALL ON FUNCTION mart.business_prepared_statistics(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_prepared_statistics(text,text) TO dabboos_ingestor;

CREATE FUNCTION mart.business_prepared_controls_exact(selected_tenant text,selected_revision text,config jsonb,selected_data text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH expected AS (
  SELECT control.measure_id,control.expected_value,control.expected_count
  FROM mart.analytics_serving_members member JOIN mart.review_controls control USING(tenant_id,partition_id)
  WHERE config->>'kind'='event' AND member.tenant_id=selected_tenant AND member.revision_id=selected_revision
  AND member.family='business' AND member.month=(config->>'from')::date AND control.scope_key='summary' AND config->'measures'?control.measure_id
  UNION ALL (SELECT DISTINCT ON(measure_id) measure_id,expected_value,expected_count
   FROM mart.prepared_snapshot_observations(selected_tenant,selected_revision,'business')
   WHERE config->>'kind'='snapshot' AND business_day<=(config->>'through')::date AND config->'measures'?measure_id
   ORDER BY measure_id,business_day DESC)
 ),actual AS (
  SELECT cell.measure_id,cell.value,cell.fact_count FROM mart.business_prepared_cells(selected_tenant,selected_data,'[]',
   CASE WHEN config->>'kind'='event' THEN 'monthly' ELSE 'cutoff' END,ARRAY(SELECT jsonb_array_elements_text(config->'measures'))) cell
 ) SELECT NOT EXISTS(SELECT 1 FROM expected FULL JOIN actual USING(measure_id)
  WHERE expected.measure_id IS NULL OR expected.expected_count IS NULL
  OR expected.expected_value IS DISTINCT FROM coalesce(actual.value,0) OR expected.expected_count IS DISTINCT FROM coalesce(actual.fact_count,0)
  OR config->>'kind'='snapshot' AND actual.measure_id IS NULL)
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(config->'measures') measure WHERE NOT EXISTS(SELECT 1 FROM expected WHERE expected.measure_id=measure))
$$;
REVOKE ALL ON FUNCTION mart.business_prepared_controls_exact(text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_prepared_controls_exact(text,text,jsonb,text) TO dabboos_ingestor;

CREATE FUNCTION mart.business_prepared_delta_exact(selected_tenant text,selected_revision text,config jsonb,selected_data text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH origin AS (
  SELECT parent.configuration base_config FROM mart.business_prepared_origins origin
  JOIN mart.prepared_datasets parent ON parent.tenant_id=origin.tenant_id AND parent.data_id=origin.base_data_id
  WHERE origin.tenant_id=selected_tenant AND origin.data_id=selected_data AND origin.revision_id=selected_revision
 ),expected_keys AS (
  SELECT keys.* FROM origin CROSS JOIN LATERAL mart.business_prepared_affected_keys(selected_tenant,selected_revision,config,origin.base_config) keys
 ),actual_keys AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key FROM mart.business_prepared_keys WHERE tenant_id=selected_tenant AND data_id=selected_data
 ),expected_cells AS (
  SELECT cells.* FROM origin CROSS JOIN LATERAL mart.business_prepared_replacement_cells(selected_tenant,selected_revision,config,origin.base_config) cells
 ),actual_cells AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,value,fact_count,minimum,maximum,data_through,labels,conflicting_labels
  FROM mart.prepared_cells WHERE tenant_id=selected_tenant AND data_id=selected_data
 ) SELECT EXISTS(SELECT 1 FROM origin)
 AND NOT EXISTS((SELECT * FROM expected_keys EXCEPT ALL SELECT * FROM actual_keys) UNION ALL (SELECT * FROM actual_keys EXCEPT ALL SELECT * FROM expected_keys))
 AND NOT EXISTS((SELECT * FROM expected_cells EXCEPT ALL SELECT * FROM actual_cells) UNION ALL (SELECT * FROM actual_cells EXCEPT ALL SELECT * FROM expected_cells))
 AND mart.business_prepared_controls_exact(selected_tenant,selected_revision,config,selected_data)
$$;
REVOKE ALL ON FUNCTION mart.business_prepared_delta_exact(text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_prepared_delta_exact(text,text,jsonb,text) TO dabboos_ingestor;
