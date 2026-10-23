-- Select the actual lineage before reading payload rows. Each statement has
-- one tenant/partition equality, preventing a broad fact scan chosen from the
-- recursive lineage estimate. Newer root masking and all filter semantics stay.
CREATE OR REPLACE FUNCTION mart.review_effective_facts(selected_tenant text,selected_partition text,selected_keys text[] DEFAULT NULL,selected_measures text[] DEFAULT NULL)
 RETURNS SETOF mart.review_facts LANGUAGE plpgsql STABLE AS $$
DECLARE source_partition text;newer_partitions text[]:='{}'::text[];
BEGIN
 FOR source_partition IN
  WITH RECURSIVE lineage(partition_id,depth) AS (
   SELECT selected_partition,0 WHERE selected_tenant=nullif(current_setting('mart.tenant_id',true),'')
   UNION ALL SELECT origin.base_partition,lineage.depth+1 FROM lineage
   JOIN mart.business_delta_storage sparse ON sparse.tenant_id=selected_tenant AND sparse.partition_id=lineage.partition_id
   JOIN mart.business_delta_origins origin ON origin.tenant_id=selected_tenant AND origin.partition_id=lineage.partition_id
  ) SELECT partition_id FROM lineage ORDER BY depth
 LOOP
  IF selected_keys IS NOT NULL THEN
   RETURN QUERY WITH requested AS MATERIALIZED (
    SELECT DISTINCT fact_key FROM unnest(selected_keys) identities(fact_key) WHERE fact_key IS NOT NULL
   ) SELECT fact.tenant_id,selected_partition,fact.fact_key,fact.payload,fact.measure_id,
    fact.business_day,fact.amount,fact.dimensions,fact.display_labels,fact.entity_id
   FROM requested JOIN mart.review_facts fact ON fact.tenant_id=selected_tenant
    AND fact.partition_id=source_partition AND fact.fact_key=requested.fact_key
   WHERE (selected_measures IS NULL OR fact.measure_id=ANY(selected_measures)) AND NOT EXISTS(SELECT 1 FROM mart.business_delta_replacements replaced
    WHERE replaced.tenant_id=selected_tenant AND replaced.partition_id=ANY(newer_partitions)
    AND replaced.source_object=fact.payload->>'sourceObject'
    AND replaced.source_record_id=fact.payload->>'sourceRecordId');
  ELSIF selected_measures IS NOT NULL THEN
   RETURN QUERY SELECT fact.tenant_id,selected_partition,fact.fact_key,fact.payload,fact.measure_id,
    fact.business_day,fact.amount,fact.dimensions,fact.display_labels,fact.entity_id
   FROM mart.review_facts fact WHERE fact.tenant_id=selected_tenant AND fact.partition_id=source_partition
    AND fact.measure_id=ANY(selected_measures) AND NOT EXISTS(SELECT 1 FROM mart.business_delta_replacements replaced
    WHERE replaced.tenant_id=selected_tenant AND replaced.partition_id=ANY(newer_partitions)
    AND replaced.source_object=fact.payload->>'sourceObject'
    AND replaced.source_record_id=fact.payload->>'sourceRecordId');
  ELSE
   RETURN QUERY SELECT fact.tenant_id,selected_partition,fact.fact_key,fact.payload,fact.measure_id,
    fact.business_day,fact.amount,fact.dimensions,fact.display_labels,fact.entity_id
   FROM mart.review_facts fact WHERE fact.tenant_id=selected_tenant AND fact.partition_id=source_partition
    AND NOT EXISTS(SELECT 1 FROM mart.business_delta_replacements replaced
    WHERE replaced.tenant_id=selected_tenant AND replaced.partition_id=ANY(newer_partitions)
    AND replaced.source_object=fact.payload->>'sourceObject'
    AND replaced.source_record_id=fact.payload->>'sourceRecordId');
  END IF;
  newer_partitions:=array_append(newer_partitions,source_partition);
 END LOOP;
END $$;

-- Both immutable-content guards probe dataset membership for every inserted
-- cell/key. The publication-first primary key does not support that lookup.
CREATE INDEX prepared_binding_dataset_access ON mart.prepared_bindings(tenant_id,data_id);

-- Apply the same bounded ancestry read to prepared cells. Preserve the existing
-- non-bypass definer, currently published root authorization, forced RLS, grain,
-- measure/date filters and snapshot cutoff normalization.
CREATE OR REPLACE FUNCTION mart.business_prepared_cells(selected_tenant text,selected_data text,
 selected_grain text DEFAULT NULL,selected_time text DEFAULT NULL,selected_measures text[] DEFAULT NULL,
 selected_from date DEFAULT NULL,selected_through date DEFAULT NULL)
 RETURNS SETOF mart.prepared_cells LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
 DECLARE config jsonb;source_data text;newer_data text[]:='{}'::text[];
 BEGIN
 IF selected_tenant IS DISTINCT FROM nullif(current_setting('mart.tenant_id',true),'')
 OR NOT (pg_has_role(session_user,'dabboos_runtime','MEMBER') OR pg_has_role(session_user,'dabboos_ingestor','MEMBER') OR pg_has_role(session_user,'dabboos_migrator','MEMBER'))
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls))
 THEN RAISE EXCEPTION 'Invalid Business prepared read identity'; END IF;
 IF pg_has_role(session_user,'dabboos_runtime','MEMBER') AND NOT EXISTS(
  SELECT 1 FROM mart.analytics_trusted_serving trusted JOIN mart.prepared_revision_seals seal USING(tenant_id,revision_id)
  JOIN mart.prepared_bindings binding USING(tenant_id,revision_id)
  WHERE trusted.tenant_id=selected_tenant AND binding.family='business' AND binding.data_id=selected_data)
 THEN RAISE EXCEPTION 'Business prepared root is not currently published'; END IF;
 SELECT configuration INTO STRICT config FROM mart.prepared_datasets WHERE tenant_id=selected_tenant AND data_id=selected_data;
 IF config->>'family' IS DISTINCT FROM 'business' THEN RAISE EXCEPTION 'Business prepared root required'; END IF;
 FOR source_data IN
  WITH RECURSIVE lineage(data_id,depth) AS (
   SELECT selected_data,0 UNION ALL SELECT origin.base_data_id,lineage.depth+1 FROM lineage
   JOIN mart.business_prepared_origins origin ON origin.tenant_id=selected_tenant AND origin.data_id=lineage.data_id
  ) SELECT data_id FROM lineage ORDER BY depth
 LOOP
  RETURN QUERY SELECT cell.tenant_id,selected_data,cell.time_grain,cell.grain_id,
   CASE WHEN cell.time_grain='cutoff' THEN (config->>'through')::date ELSE cell.business_date END,
   cell.measure_id,cell.dimensions,cell.dimension_key,cell.value,cell.fact_count,cell.minimum,cell.maximum,cell.data_through,cell.labels,cell.conflicting_labels
  FROM mart.prepared_cells cell WHERE cell.tenant_id=selected_tenant AND cell.data_id=source_data
  AND (selected_grain IS NULL OR cell.grain_id=selected_grain) AND (selected_time IS NULL OR cell.time_grain=selected_time)
  AND (selected_measures IS NULL OR cell.measure_id=ANY(selected_measures)) AND config->'measures'?cell.measure_id
  AND EXISTS(SELECT 1 FROM jsonb_array_elements(config->'grains') grain WHERE grain->>'id'=cell.grain_id)
  AND (selected_from IS NULL OR CASE WHEN cell.time_grain='cutoff' THEN (config->>'through')::date ELSE cell.business_date END>=selected_from)
  AND (selected_through IS NULL OR CASE WHEN cell.time_grain='cutoff' THEN (config->>'through')::date ELSE cell.business_date END<=selected_through)
  AND NOT EXISTS(SELECT 1 FROM mart.business_prepared_keys replaced
   WHERE replaced.tenant_id=selected_tenant AND replaced.data_id=ANY(newer_data)
   AND replaced.time_grain=cell.time_grain AND replaced.grain_id=cell.grain_id
   AND replaced.measure_id=cell.measure_id AND replaced.dimension_key=cell.dimension_key AND replaced.dimensions=cell.dimensions
   AND (cell.time_grain='cutoff' OR replaced.business_date=cell.business_date));
  newer_data:=array_append(newer_data,source_data);
 END LOOP;
 END $$;
