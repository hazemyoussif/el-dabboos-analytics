-- Structural sharing for Business revisions. Existing complete partitions remain
-- untouched. A sparse member stores only complete replacements of dirty roots.
CREATE TABLE mart.business_delta_storage (
 tenant_id text NOT NULL,partition_id text NOT NULL,
 PRIMARY KEY(tenant_id,partition_id),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.business_delta_origins
);
CREATE TABLE mart.business_delta_checked_roots (
 tenant_id text NOT NULL,partition_id text NOT NULL,source_object text NOT NULL,source_record_id text NOT NULL,
 PRIMARY KEY(tenant_id,partition_id,source_object,source_record_id),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.business_delta_storage
);
CREATE TABLE mart.business_delta_source_evidence (
 tenant_id text NOT NULL,partition_id text NOT NULL,measure_id text NOT NULL,scope_key text NOT NULL,
 dimensions jsonb,expected_value numeric NOT NULL,expected_count bigint NOT NULL CHECK(expected_count>=0),
 PRIMARY KEY(tenant_id,partition_id,measure_id,scope_key),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.business_delta_storage,
 CHECK((scope_key='summary')=(dimensions IS NULL))
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['business_delta_storage','business_delta_checked_roots','business_delta_source_evidence'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT,INSERT ON mart.%I TO dabboos_ingestor',relation_name);
  EXECUTE format('GRANT SELECT ON mart.%I TO dabboos_runtime',relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
  EXECUTE format('CREATE TRIGGER published_content_lock BEFORE INSERT ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.lock_review_contents()',relation_name);
 END LOOP;
END $$;

-- Optional keys bound replacement reads to their canonical PKs. Traversal stops
-- at the first complete partition, including previously published dense deltas.
CREATE FUNCTION mart.review_effective_facts(selected_tenant text,selected_partition text,selected_keys text[] DEFAULT NULL,selected_measures text[] DEFAULT NULL)
 RETURNS SETOF mart.review_facts LANGUAGE sql STABLE AS $$
 WITH RECURSIVE lineage(partition_id,depth) AS (
  SELECT selected_partition,0 WHERE selected_tenant=nullif(current_setting('mart.tenant_id',true),'')
  UNION ALL SELECT origin.base_partition,lineage.depth+1 FROM lineage
  JOIN mart.business_delta_storage sparse ON sparse.tenant_id=selected_tenant AND sparse.partition_id=lineage.partition_id
  JOIN mart.business_delta_origins origin ON origin.tenant_id=selected_tenant AND origin.partition_id=lineage.partition_id
 )
 SELECT fact.tenant_id,selected_partition,fact.fact_key,fact.payload,fact.measure_id,
  fact.business_day,fact.amount,fact.dimensions,fact.display_labels,fact.entity_id
 FROM lineage JOIN mart.review_facts fact ON fact.tenant_id=selected_tenant AND fact.partition_id=lineage.partition_id
 WHERE (selected_keys IS NULL OR fact.fact_key=ANY(selected_keys))
 AND (selected_measures IS NULL OR fact.measure_id=ANY(selected_measures)) AND NOT EXISTS(
  SELECT 1 FROM lineage newer JOIN mart.business_delta_replacements replaced
  ON replaced.tenant_id=selected_tenant AND replaced.partition_id=newer.partition_id
  WHERE newer.depth<lineage.depth AND replaced.source_object=fact.payload->>'sourceObject'
  AND replaced.source_record_id=fact.payload->>'sourceRecordId'
 )
$$;
REVOKE ALL ON FUNCTION mart.review_effective_facts(text,text,text[],text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.review_effective_facts(text,text,text[],text[]) TO dabboos_ingestor,dabboos_runtime;
CREATE VIEW mart.review_fact_population WITH (security_invoker=true) AS
 SELECT fact.* FROM mart.review_facts fact WHERE NOT EXISTS(
  SELECT 1 FROM mart.business_delta_storage sparse
  WHERE sparse.tenant_id=fact.tenant_id AND sparse.partition_id=fact.partition_id)
 UNION ALL
 SELECT extraction.tenant_id,extraction.partition_id,fact.fact_key,fact.payload,fact.measure_id,
  fact.business_day,fact.amount,fact.dimensions,fact.display_labels,fact.entity_id FROM mart.review_extractions extraction
 JOIN mart.business_delta_storage sparse USING(tenant_id,partition_id)
 CROSS JOIN LATERAL mart.review_effective_facts(extraction.tenant_id,extraction.partition_id) fact;
GRANT SELECT ON mart.review_fact_population TO dabboos_ingestor,dabboos_runtime;

-- Old/new footprints, limited to complete dirty identities, feed preparation.
CREATE FUNCTION mart.business_delta_changed_rows(selected_tenant text,selected_partition text)
 RETURNS SETOF mart.review_facts LANGUAGE sql STABLE AS $$
 WITH keys AS (
  SELECT coalesce(array_agg(format('[%s,%s,"whole",%s]',to_json(replaced.source_object)::text,to_json(replaced.source_record_id)::text,to_json(rule->>'measureId')::text)),'{}'::text[]) identities
  FROM mart.business_delta_replacements replaced JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  CROSS JOIN LATERAL jsonb_array_elements(extraction.mapping->'measures') rule
  WHERE replaced.tenant_id=selected_tenant AND replaced.partition_id=selected_partition
  AND rule->>'sourceObject'=replaced.source_object
 ),partitions AS (
  SELECT selected_partition partition_id UNION ALL SELECT base_partition FROM mart.business_delta_origins
  WHERE tenant_id=selected_tenant AND partition_id=selected_partition
 ) SELECT fact.* FROM partitions CROSS JOIN keys
 CROSS JOIN LATERAL mart.review_effective_facts(selected_tenant,partitions.partition_id,keys.identities) fact
$$;
REVOKE ALL ON FUNCTION mart.business_delta_changed_rows(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_delta_changed_rows(text,text) TO dabboos_ingestor;

-- Scoped source controls prove the changed population. The accepted parent's
-- exact controls prove the retained population; neither needs a full raw scan.
CREATE FUNCTION mart.business_sparse_controls_exact(selected_tenant text,selected_partition text)
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
  FROM actual FULL JOIN fresh ON fresh.measure_id=actual.measure_id AND fresh.dimensions IS NOT DISTINCT FROM actual.dimensions
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
 AND NOT EXISTS((SELECT * FROM expected EXCEPT ALL SELECT * FROM stored) UNION ALL (SELECT * FROM stored EXCEPT ALL SELECT * FROM expected))
$$;
REVOKE ALL ON FUNCTION mart.business_sparse_controls_exact(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_sparse_controls_exact(text,text) TO dabboos_ingestor;

-- Validate against the existing registered measures and the governed mapping;
-- no second metric/capability allowlist is introduced by sparse storage.
CREATE FUNCTION mart.business_sparse_metadata_exact(selected_tenant text,selected_partition text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM mart.review_extractions extraction
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 JOIN mart.business_delta_storage sparse USING(tenant_id,partition_id)
 WHERE extraction.tenant_id=selected_tenant AND extraction.partition_id=selected_partition
 AND extraction.completed AND part.family='business' AND part.month=extraction.month
 AND part.capabilities->>'tenantId'=selected_tenant AND jsonb_array_length(part.capabilities->'releases')=1
 AND part.capabilities->'releases'->0->>'financeReview'='pending'
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(part.capabilities->'releases'->0->'capabilities') capability
  WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'capabilities') mapped
   WHERE mapped=capability-'summary'-'analyses'))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') rule
  WHERE NOT EXISTS(SELECT 1 FROM mart.measure_definitions definition WHERE definition.measure_id=rule->>'measureId')
   OR NOT EXISTS(SELECT 1 FROM mart.review_controls control WHERE control.tenant_id=selected_tenant
    AND control.partition_id=selected_partition AND control.measure_id=rule->>'measureId' AND control.scope_key='summary'))
 AND NOT EXISTS(SELECT 1 FROM mart.review_facts fact WHERE fact.tenant_id=selected_tenant AND fact.partition_id=selected_partition AND (
  fact.payload->>'sourceAsOf' IS DISTINCT FROM to_char(extraction.source_cutoff AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  OR fact.payload->>'frozenRevision' IS DISTINCT FROM extraction.source_revision
  OR fact.payload->>'sourceId' IS DISTINCT FROM extraction.source_id
  OR fact.business_day IS NULL OR left(fact.business_day,7) IS DISTINCT FROM to_char(extraction.month,'YYYY-MM')
  OR fact.fact_key IS DISTINCT FROM format('[%s,%s,"whole",%s]',to_json(fact.payload->>'sourceObject')::text,to_json(fact.payload->>'sourceRecordId')::text,to_json(fact.measure_id)::text)
  OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') rule
   JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId'
   WHERE rule->>'measureId'=fact.measure_id AND rule->>'sourceObject'=fact.payload->>'sourceObject'
   AND definition.kind=fact.payload->>'kind'
   AND NOT EXISTS(SELECT 1 FROM jsonb_object_keys(fact.dimensions) dimension WHERE NOT rule->'dimensionMappings'?dimension))
  OR (fact.payload->>'kind'='snapshot' AND fact.entity_id IS DISTINCT FROM (fact.payload->>'sourceObject')||':'||(fact.payload->>'sourceRecordId'))
  OR NOT EXISTS(SELECT 1 FROM mart.business_delta_replacements replaced WHERE replaced.tenant_id=selected_tenant
   AND replaced.partition_id=selected_partition AND replaced.source_object=fact.payload->>'sourceObject'
   AND replaced.source_record_id=fact.payload->>'sourceRecordId')
 ))
 AND NOT EXISTS(SELECT 1 FROM mart.business_delta_replacements replaced WHERE replaced.tenant_id=selected_tenant AND replaced.partition_id=selected_partition
  AND NOT EXISTS(SELECT 1 FROM mart.business_delta_checked_roots checked WHERE checked.tenant_id=replaced.tenant_id
   AND checked.partition_id=replaced.partition_id AND checked.source_object=replaced.source_object AND checked.source_record_id=replaced.source_record_id))
 )
$$;
REVOKE ALL ON FUNCTION mart.business_sparse_metadata_exact(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_sparse_metadata_exact(text,text),mart.business_sparse_controls_exact(text,text) TO dabboos_runtime,dabboos_ingestor;

ALTER FUNCTION mart.business_partition_exact(text,text) RENAME TO business_complete_partition_exact;
CREATE FUNCTION mart.business_partition_exact(selected_tenant text,selected_partition text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM mart.business_delta_storage WHERE tenant_id=selected_tenant AND partition_id=selected_partition)
 THEN mart.business_sparse_metadata_exact(selected_tenant,selected_partition) AND mart.business_sparse_controls_exact(selected_tenant,selected_partition)
 ELSE mart.business_complete_partition_exact(selected_tenant,selected_partition) END
$$;
REVOKE ALL ON FUNCTION mart.business_partition_exact(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_partition_exact(text,text) TO dabboos_ingestor,dabboos_runtime;
