-- Count replacements at each concrete parent dataset before crossing the
-- prepared-reader boundary. The former reader-then-join counted all inherited
-- cells for affected measures before applying the replacement keys. This keeps
-- the same ancestry masking, snapshot identity, grain and count semantics.
CREATE OR REPLACE FUNCTION mart.business_prepared_statistics(selected_tenant text,selected_data text)
 RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE origin record;entry record;source_data text;newer_data text[]:='{}'::text[];
 totals jsonb:='{}'::jsonb;removed_measures text[];
BEGIN
 SELECT ancestor.*,dataset.configuration config,parent.configuration base_config,binding.statistics INTO origin
 FROM mart.business_prepared_origins ancestor JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
 JOIN mart.prepared_datasets parent ON parent.tenant_id=ancestor.tenant_id AND parent.data_id=ancestor.base_data_id
 JOIN mart.prepared_bindings binding ON binding.tenant_id=ancestor.tenant_id AND binding.revision_id=ancestor.base_revision
  AND binding.data_id=ancestor.base_data_id AND binding.family='business' AND binding.kind=dataset.configuration->>'kind'
 WHERE ancestor.tenant_id=selected_tenant AND ancestor.data_id=selected_data;
 IF FOUND THEN
  SELECT coalesce(jsonb_object_agg(previous.key,previous.value),'{}'::jsonb) INTO totals
  FROM jsonb_each(origin.statistics) previous WHERE EXISTS(
   SELECT 1 FROM jsonb_array_elements(origin.config->'grains') grain
   WHERE previous.key=CASE WHEN origin.config->>'kind'='snapshot' THEN 'cutoff:' ELSE 'daily:' END||(grain->>'id')
    OR origin.config->>'kind'='event' AND previous.key='monthly:'||(grain->>'id'));
  removed_measures:=ARRAY(SELECT measure FROM jsonb_array_elements_text(origin.base_config->'measures') measure
   WHERE NOT origin.config->'measures'?measure);
 END IF;
 FOR entry IN SELECT cell.time_grain||':'||cell.grain_id key,count(*)::bigint count
  FROM mart.prepared_cells cell WHERE cell.tenant_id=selected_tenant AND cell.data_id=selected_data GROUP BY 1
 LOOP
  totals:=jsonb_set(totals,ARRAY[entry.key],to_jsonb(coalesce((totals->>entry.key)::bigint,0)+entry.count));
 END LOOP;
 IF cardinality(removed_measures)>0 THEN
  FOR entry IN SELECT cell.time_grain||':'||cell.grain_id key,count(*)::bigint count
   FROM mart.business_prepared_cells(selected_tenant,origin.base_data_id,NULL,NULL,removed_measures) cell
   WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(origin.config->'grains') grain WHERE grain->>'id'=cell.grain_id)
   GROUP BY 1
  LOOP
   totals:=jsonb_set(totals,ARRAY[entry.key],to_jsonb(coalesce((totals->>entry.key)::bigint,0)-entry.count));
  END LOOP;
 END IF;
 FOR source_data IN
  WITH RECURSIVE lineage(data_id,depth) AS (
   SELECT origin.base_data_id,0 WHERE origin.base_data_id IS NOT NULL
    AND EXISTS(SELECT 1 FROM mart.business_prepared_keys requested
     WHERE requested.tenant_id=selected_tenant AND requested.data_id=selected_data
     AND origin.base_config->'measures'?requested.measure_id
     AND EXISTS(SELECT 1 FROM jsonb_array_elements(origin.base_config->'grains') grain WHERE grain->>'id'=requested.grain_id))
   UNION ALL SELECT parent.base_data_id,lineage.depth+1 FROM lineage
   JOIN mart.business_prepared_origins parent ON parent.tenant_id=selected_tenant AND parent.data_id=lineage.data_id
  ) SELECT data_id FROM lineage ORDER BY depth
 LOOP
  FOR entry IN SELECT cell.time_grain||':'||cell.grain_id key,count(*)::bigint count
   FROM mart.prepared_cells cell JOIN mart.business_prepared_keys requested
    ON requested.tenant_id=selected_tenant AND requested.data_id=selected_data
    AND requested.time_grain=cell.time_grain AND requested.grain_id=cell.grain_id
    AND requested.measure_id=cell.measure_id AND requested.dimension_key=cell.dimension_key AND requested.dimensions=cell.dimensions
    AND (cell.time_grain='cutoff' OR requested.business_date=cell.business_date)
   WHERE cell.tenant_id=selected_tenant AND cell.data_id=source_data AND origin.base_config->'measures'?requested.measure_id
   AND EXISTS(SELECT 1 FROM jsonb_array_elements(origin.base_config->'grains') grain WHERE grain->>'id'=requested.grain_id)
   AND NOT EXISTS(SELECT 1 FROM mart.business_prepared_keys replaced
    WHERE replaced.tenant_id=selected_tenant AND replaced.data_id=ANY(newer_data)
    AND replaced.time_grain=cell.time_grain AND replaced.grain_id=cell.grain_id AND replaced.measure_id=cell.measure_id
    AND replaced.dimension_key=cell.dimension_key AND replaced.dimensions=cell.dimensions
    AND (cell.time_grain='cutoff' OR replaced.business_date=cell.business_date))
   GROUP BY 1
  LOOP
   totals:=jsonb_set(totals,ARRAY[entry.key],to_jsonb(coalesce((totals->>entry.key)::bigint,0)-entry.count));
  END LOOP;
  newer_data:=array_append(newer_data,source_data);
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_each_text(totals) count WHERE count.value::bigint<0) THEN RETURN NULL; END IF;
 RETURN (SELECT coalesce(jsonb_object_agg(count.key,count.value::bigint),'{}'::jsonb)
  FROM jsonb_each_text(totals) count WHERE count.value::bigint>0);
END $$;
