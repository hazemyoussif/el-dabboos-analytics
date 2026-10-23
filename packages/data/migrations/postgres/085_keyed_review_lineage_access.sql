-- Explicit keys must use the canonical primary key. Keep the all-keys path
-- in a separate statement so nullable predicates cannot pull full raw history
-- into a keyed read. Preserve NULL=all, empty=none and sparse root masking.
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

-- NULL summaries and non-NULL dimension groups form disjoint identities. The
-- NULL flag plus JSONB equality is exactly null-safe equality, including {}.
-- Both join predicates are hashable; no digest/serialization convention is
-- assumed for old control keys. Duplicate stored groups remain a rejection.
CREATE OR REPLACE FUNCTION mart.business_sparse_controls_exact(selected_tenant text,selected_partition text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH origin AS (
  SELECT * FROM mart.business_delta_origins WHERE tenant_id=selected_tenant AND partition_id=selected_partition
 ),keys AS (
  SELECT coalesce(array_agg(format('[%s,%s,"whole",%s]',to_json(checked.source_object)::text,to_json(checked.source_record_id)::text,to_json(rule->>'measureId')::text)),'{}'::text[]) identities
  FROM mart.business_delta_checked_roots checked JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  CROSS JOIN LATERAL jsonb_array_elements(extraction.mapping->'measures') rule
  WHERE checked.tenant_id=selected_tenant AND checked.partition_id=selected_partition AND rule->>'sourceObject'=checked.source_object
 ),previous AS MATERIALIZED (
  SELECT fact.* FROM origin CROSS JOIN keys CROSS JOIN LATERAL mart.review_effective_facts(selected_tenant,origin.base_partition,keys.identities) fact
 ),current_rows AS (
  SELECT fact.* FROM previous fact WHERE NOT EXISTS(SELECT 1 FROM mart.business_delta_replacements changed
   WHERE changed.tenant_id=selected_tenant AND changed.partition_id=selected_partition
   AND changed.source_object=fact.payload->>'sourceObject' AND changed.source_record_id=fact.payload->>'sourceRecordId')
  UNION ALL SELECT * FROM mart.review_facts WHERE tenant_id=selected_tenant AND partition_id=selected_partition
 ),actual AS (
  SELECT measure_id,CASE WHEN grouping(dimensions)=1 THEN NULL ELSE dimensions END dimensions,sum(amount) value,count(*) count
  FROM current_rows GROUP BY GROUPING SETS((measure_id,dimensions),(measure_id))
 ),fresh AS (
  SELECT measure_id,dimensions,expected_value value,expected_count count FROM mart.business_delta_source_evidence
  WHERE tenant_id=selected_tenant AND partition_id=selected_partition
 ),scoped_difference AS (
  SELECT actual.measure_id actual_measure,fresh.measure_id expected_measure,actual.value actual_value,actual.count actual_count,
   fresh.value expected_value,fresh.count expected_count
  FROM actual FULL JOIN fresh ON fresh.measure_id=actual.measure_id AND (fresh.dimensions IS NULL)=(actual.dimensions IS NULL)
   AND coalesce(fresh.dimensions,'{}'::jsonb)=coalesce(actual.dimensions,'{}'::jsonb)
 ),removed AS (
  SELECT measure_id,CASE WHEN grouping(dimensions)=1 THEN NULL ELSE dimensions END dimensions,-sum(amount) value,-count(*) count
  FROM previous GROUP BY GROUPING SETS((measure_id,dimensions),(measure_id))
 ),operands AS (
  SELECT control.measure_id,control.dimensions,control.expected_value value,control.expected_count count
  FROM origin JOIN mart.review_controls control ON control.tenant_id=selected_tenant AND control.partition_id=origin.base_partition
  UNION ALL SELECT * FROM removed UNION ALL SELECT * FROM fresh
  UNION ALL SELECT rule->>'measureId',NULL::jsonb,0::numeric,0::bigint FROM mart.review_extractions extraction,
   LATERAL jsonb_array_elements(extraction.mapping->'measures') rule WHERE extraction.tenant_id=selected_tenant AND extraction.partition_id=selected_partition
 ),expected AS (
  SELECT measure_id,dimensions,sum(value) value,sum(count) count FROM operands GROUP BY measure_id,dimensions
  HAVING dimensions IS NULL OR sum(count)<>0 OR sum(value)<>0
 ),stored AS (
  SELECT measure_id,dimensions,expected_value value,expected_count::numeric count FROM mart.review_controls
  WHERE tenant_id=selected_tenant AND partition_id=selected_partition
 ) SELECT NOT EXISTS(SELECT 1 FROM scoped_difference WHERE
  coalesce(actual_value,0) IS DISTINCT FROM coalesce(expected_value,0) OR coalesce(actual_count,0) IS DISTINCT FROM coalesce(expected_count,0))
 AND NOT EXISTS(SELECT 1 FROM stored GROUP BY measure_id,dimensions HAVING count(*)>1)
 AND NOT EXISTS(SELECT 1 FROM expected FULL JOIN stored
  ON stored.measure_id=expected.measure_id AND (stored.dimensions IS NULL)=(expected.dimensions IS NULL)
   AND coalesce(stored.dimensions,'{}'::jsonb)=coalesce(expected.dimensions,'{}'::jsonb)
  WHERE expected.measure_id IS NULL OR stored.measure_id IS NULL
  OR expected.value IS DISTINCT FROM stored.value OR expected.count IS DISTINCT FROM stored.count)
$$;
