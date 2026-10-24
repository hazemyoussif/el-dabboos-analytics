-- The builder has already persisted the complete affected key set. Reuse it
-- during cell construction instead of deriving and spilling the same set again.
-- Binding independently proves expected/actual key equality first, then uses
-- that proven set for its independent source-contributor cell comparison.
-- Aggregate distinct label sets with each cell before expanding label fields;
-- repeated contributor labels cannot create new values or conflicts. This avoids
-- a second global sort of every contributor/label pair and the expanded spool.
-- All identity, count, extrema, label, control, RLS and publication checks remain.
CREATE OR REPLACE FUNCTION mart.business_prepared_replacement_cells(selected_tenant text,selected_revision text,config jsonb,base_config jsonb,selected_data text)
 RETURNS TABLE(time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,dimension_key text,
 value numeric,fact_count bigint,minimum numeric,maximum numeric,data_through date,labels jsonb,conflicting_labels text[])
 LANGUAGE sql STABLE AS $$
 WITH keys AS MATERIALIZED (
  SELECT * FROM mart.business_prepared_affected_keys(selected_tenant,selected_revision,config,base_config)
  WHERE selected_data IS NULL
  UNION ALL
  SELECT stored.time_grain,stored.grain_id,stored.business_date,stored.measure_id,stored.dimensions,stored.dimension_key
  FROM mart.business_prepared_keys stored
  JOIN mart.business_prepared_origins origin USING(tenant_id,data_id)
  JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
  JOIN mart.prepared_datasets parent ON parent.tenant_id=origin.tenant_id AND parent.data_id=origin.base_data_id
  WHERE selected_data IS NOT NULL AND stored.tenant_id=selected_tenant AND stored.data_id=selected_data
  AND origin.revision_id=selected_revision AND dataset.configuration=config AND parent.configuration=base_config
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
 ),expanded AS (
  SELECT keys.*,projected.amount,projected.item_count,projected.data_through,projected.labels
  FROM keys JOIN projected USING(time_grain,grain_id,business_date,measure_id,dimensions)
 ),reduced AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,sum(amount) value,sum(item_count)::bigint fact_count,
   min(amount) FILTER(WHERE item_count>0) minimum,max(amount) FILTER(WHERE item_count>0) maximum,max(data_through) data_through,
   array_agg(DISTINCT labels) label_sets
  FROM expanded GROUP BY 1,2,3,4,5,6
 ) SELECT reduced.time_grain,reduced.grain_id,reduced.business_date,reduced.measure_id,reduced.dimensions,reduced.dimension_key,
 reduced.value,reduced.fact_count,reduced.minimum,reduced.maximum,reduced.data_through,
 coalesce(label_groups.labels,'{}'::jsonb),coalesce(label_groups.conflicting_labels,'{}'::text[])
 FROM reduced CROSS JOIN LATERAL (
  SELECT jsonb_object_agg(key,label) FILTER(WHERE choices=1) labels,
   array_agg(key ORDER BY key) FILTER(WHERE choices>1) conflicting_labels
  FROM (
   SELECT attribute.key,min(attribute.value) label,count(DISTINCT attribute.value) choices
   FROM unnest(reduced.label_sets) label_set(labels) CROSS JOIN LATERAL jsonb_each_text(label_set.labels) attribute
   GROUP BY attribute.key
  ) label_values
 ) label_groups
$$;

REVOKE ALL ON FUNCTION mart.business_prepared_replacement_cells(text,text,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_prepared_replacement_cells(text,text,jsonb,jsonb,text) TO dabboos_ingestor;

-- Independent callers still derive their own complete expected keys.
CREATE OR REPLACE FUNCTION mart.business_prepared_replacement_cells(selected_tenant text,selected_revision text,config jsonb,base_config jsonb)
 RETURNS TABLE(time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,dimension_key text,
 value numeric,fact_count bigint,minimum numeric,maximum numeric,data_through date,labels jsonb,conflicting_labels text[])
 LANGUAGE sql STABLE AS $$
 SELECT * FROM mart.business_prepared_replacement_cells(selected_tenant,selected_revision,config,base_config,NULL::text)
$$;

CREATE FUNCTION mart.prepare_business_delta_keys(selected_tenant text,selected_revision text,config jsonb,maximum_cells bigint)
 RETURNS TABLE(data_id text) LANGUAGE plpgsql SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
 DECLARE parent record;signature record;parent_revision text;created_data text;copied bigint;
 BEGIN
 PERFORM mart.prepared_work_authorize(selected_tenant);
 IF config->>'family' IS DISTINCT FROM 'business' THEN RETURN; END IF;
 IF maximum_cells IS NULL OR maximum_cells<1 OR config IS DISTINCT FROM mart.prepared_configuration(
  selected_tenant,selected_revision,'business',config->>'kind',(config->>'from')::date,(config->>'through')::date)
 THEN RAISE EXCEPTION 'Governed Business configuration and finite cell bound required'; END IF;
 SELECT revision.parent_revision INTO STRICT parent_revision FROM mart.analytics_serving_revisions revision
 WHERE revision.tenant_id=selected_tenant AND revision.revision_id=selected_revision;
 IF NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members member LEFT JOIN mart.business_delta_storage sparse USING(tenant_id,partition_id)
  LEFT JOIN mart.analytics_serving_members previous ON previous.tenant_id=member.tenant_id AND previous.revision_id=parent_revision
   AND previous.family=member.family AND previous.month=member.month
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='business'
  AND member.partition_id IS DISTINCT FROM previous.partition_id
  AND (sparse.partition_id IS NOT NULL OR config->>'kind'='snapshot' AND previous.partition_id IS NULL)
  AND (config->>'kind'='event' AND member.month=(config->>'from')::date
   OR config->>'kind'='snapshot' AND member.month<=date_trunc('month',(config->>'through')::date)))
 THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM mart.analytics_serving_members member
  LEFT JOIN mart.analytics_serving_members previous ON previous.tenant_id=member.tenant_id AND previous.revision_id=parent_revision
   AND previous.family=member.family AND previous.month=member.month
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='business'
  AND member.partition_id IS DISTINCT FROM previous.partition_id
  AND previous.partition_id IS NOT NULL
  AND (config->>'kind'='event' AND member.month=(config->>'from')::date
   OR config->>'kind'='snapshot' AND member.month<=date_trunc('month',(config->>'through')::date))
  AND NOT EXISTS(SELECT 1 FROM mart.business_delta_storage sparse WHERE sparse.tenant_id=member.tenant_id AND sparse.partition_id=member.partition_id))
 THEN RAISE EXCEPTION 'Sparse Business preparation requires complete delta lineage'; END IF;
 SELECT binding.data_id,dataset.configuration INTO parent FROM mart.prepared_bindings binding
 JOIN mart.prepared_revision_seals seal USING(tenant_id,revision_id) JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
 WHERE binding.tenant_id=selected_tenant AND binding.revision_id=parent_revision AND binding.family='business' AND binding.kind=config->>'kind'
 AND (config->>'kind'='event' AND binding.period=(config->>'from')::date
  OR config->>'kind'='snapshot' AND binding.period<=(config->>'through')::date)
 AND (dataset.configuration-ARRAY['from','through','measures','grains'])=(config-ARRAY['from','through','measures','grains'])
 ORDER BY binding.period DESC LIMIT 1;
 IF parent IS NULL THEN
  -- The first complete Business dataset has no prepared parent to reuse. This
  -- initialization exception never applies to a sparse input or existing kind.
  IF NOT EXISTS(SELECT 1 FROM mart.prepared_bindings binding WHERE binding.tenant_id=selected_tenant
    AND binding.revision_id=parent_revision AND binding.family='business' AND binding.kind=config->>'kind')
   AND NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members member JOIN mart.business_delta_storage sparse USING(tenant_id,partition_id)
    WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='business')
  THEN RETURN; END IF;
  RAISE EXCEPTION 'Accepted compatible Business prepared baseline required; no full-month fallback';
 END IF;
 SELECT * INTO STRICT signature FROM mart.prepared_input_signature(selected_tenant,selected_revision,config);
 created_data:=encode(sha256(convert_to('business-prepared-delta-v1:'||config::text||':'||parent.data_id||':'||signature.fingerprint,'UTF8')),'hex');
 INSERT INTO mart.prepared_datasets VALUES(selected_tenant,created_data,config);
 INSERT INTO mart.business_prepared_origins VALUES(selected_tenant,created_data,parent.data_id,selected_revision,parent_revision);
 INSERT INTO mart.business_prepared_keys SELECT selected_tenant,created_data,keys.*
 FROM mart.business_prepared_affected_keys(selected_tenant,selected_revision,config,parent.configuration) keys LIMIT maximum_cells+1;
 GET DIAGNOSTICS copied=ROW_COUNT;
 IF copied>maximum_cells THEN RAISE EXCEPTION 'Business affected cell-key bound exceeded'; END IF;
 -- Autovacuum cannot see this transaction's new dataset yet. Refresh the key
 -- distribution before planning joins against the newly bulk-loaded identity.
 -- Otherwise its estimate is one row and the contributor join becomes quadratic.
 IF copied>0 THEN ANALYZE mart.business_prepared_keys (tenant_id,data_id); END IF;
 RETURN QUERY SELECT created_data;
 END $$;
REVOKE ALL ON FUNCTION mart.prepare_business_delta_keys(text,text,jsonb,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepare_business_delta_keys(text,text,jsonb,bigint) TO dabboos_ingestor;

-- Called as the next statement in the same owning transaction. Splitting SQL
-- statements preserves the deadline and atomic rollback; it adds no checkpoint
-- or partial publication. Configuration, parent identity and cell bounds remain.
CREATE FUNCTION mart.materialize_business_delta_cells(selected_tenant text,selected_revision text,selected_data text,maximum_cells bigint)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
 DECLARE config jsonb;base_config jsonb;copied bigint;
 BEGIN
 PERFORM mart.prepared_work_authorize(selected_tenant);
 SELECT dataset.configuration,parent.configuration INTO STRICT config,base_config
 FROM mart.prepared_datasets dataset JOIN mart.business_prepared_origins origin USING(tenant_id,data_id)
 JOIN mart.prepared_datasets parent ON parent.tenant_id=origin.tenant_id AND parent.data_id=origin.base_data_id
 WHERE dataset.tenant_id=selected_tenant AND dataset.data_id=selected_data AND origin.revision_id=selected_revision;
 IF maximum_cells IS NULL OR maximum_cells<1 OR config IS DISTINCT FROM mart.prepared_configuration(
  selected_tenant,selected_revision,'business',config->>'kind',(config->>'from')::date,(config->>'through')::date)
 THEN RAISE EXCEPTION 'Governed Business configuration and finite cell bound required'; END IF;
 IF EXISTS(SELECT 1 FROM mart.prepared_bindings WHERE tenant_id=selected_tenant AND data_id=selected_data)
 OR EXISTS(SELECT 1 FROM mart.prepared_cells WHERE tenant_id=selected_tenant AND data_id=selected_data)
 THEN RAISE EXCEPTION 'Business cell materialization requires a new unbound dataset'; END IF;
 INSERT INTO mart.prepared_cells SELECT selected_tenant,selected_data,cells.*
 FROM mart.business_prepared_replacement_cells(selected_tenant,selected_revision,config,base_config,selected_data) cells LIMIT maximum_cells+1;
 GET DIAGNOSTICS copied=ROW_COUNT;
 IF copied>maximum_cells THEN RAISE EXCEPTION 'Business replacement cell bound exceeded'; END IF;
 IF copied>0 THEN ANALYZE mart.prepared_cells (tenant_id,data_id); END IF;
 RETURN copied;
 END $$;
REVOKE ALL ON FUNCTION mart.materialize_business_delta_cells(text,text,text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.materialize_business_delta_cells(text,text,text,bigint) TO dabboos_ingestor;

-- Preserve the original SQL entry point for existing explicit callers. The
-- application invokes the two bounded statements separately in one transaction.
CREATE OR REPLACE FUNCTION mart.prepare_business_delta_dataset(selected_tenant text,selected_revision text,config jsonb,maximum_cells bigint)
 RETURNS TABLE(data_id text) LANGUAGE plpgsql SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
 DECLARE created_data text;
 BEGIN
 SELECT created.data_id INTO created_data FROM mart.prepare_business_delta_keys(selected_tenant,selected_revision,config,maximum_cells) created;
 IF created_data IS NULL THEN RETURN; END IF;
 PERFORM mart.materialize_business_delta_cells(selected_tenant,selected_revision,created_data,maximum_cells);
 RETURN QUERY SELECT created_data;
 END $$;

-- This call follows the independent complete key-set equality check.
CREATE OR REPLACE FUNCTION mart.business_prepared_delta_exact(selected_tenant text,selected_revision text,config jsonb,selected_data text)
 RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE base_config jsonb;
BEGIN
 SELECT parent.configuration INTO base_config FROM mart.business_prepared_origins origin
 JOIN mart.prepared_datasets parent ON parent.tenant_id=origin.tenant_id AND parent.data_id=origin.base_data_id
 WHERE origin.tenant_id=selected_tenant AND origin.data_id=selected_data AND origin.revision_id=selected_revision;
 IF base_config IS NULL THEN RETURN false; END IF;
 IF EXISTS(WITH expected AS MATERIALIZED (
   SELECT * FROM mart.business_prepared_affected_keys(selected_tenant,selected_revision,config,base_config)
  ),actual AS MATERIALIZED (
   SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key
   FROM mart.business_prepared_keys WHERE tenant_id=selected_tenant AND data_id=selected_data
  ) SELECT 1 FROM expected FULL JOIN actual USING(time_grain,grain_id,business_date,measure_id,dimension_key)
  WHERE expected.measure_id IS NULL OR actual.measure_id IS NULL OR expected.dimensions IS DISTINCT FROM actual.dimensions)
 THEN RETURN false; END IF;
 IF EXISTS(WITH expected AS MATERIALIZED (
   SELECT * FROM mart.business_prepared_replacement_cells(selected_tenant,selected_revision,config,base_config,selected_data)
  ),actual AS MATERIALIZED (
   SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,value,fact_count,minimum,maximum,data_through,labels,conflicting_labels
   FROM mart.prepared_cells WHERE tenant_id=selected_tenant AND data_id=selected_data
  ) SELECT 1 FROM expected FULL JOIN actual USING(time_grain,grain_id,business_date,measure_id,dimension_key)
  WHERE expected.measure_id IS NULL OR actual.measure_id IS NULL
  OR ROW(expected.dimensions,expected.value,expected.fact_count,expected.minimum,expected.maximum,expected.data_through,expected.labels,expected.conflicting_labels)
   IS DISTINCT FROM ROW(actual.dimensions,actual.value,actual.fact_count,actual.minimum,actual.maximum,actual.data_through,actual.labels,actual.conflicting_labels))
 THEN RETURN false; END IF;
 RETURN mart.business_prepared_controls_exact(selected_tenant,selected_revision,config,selected_data);
END $$;
