-- Ordinary records use the existing affected-row prepared storage. No new store,
-- job, publication state or source access is introduced by this migration.
CREATE INDEX sync_candidate_measure ON mart.analytics_sync_heads(tenant_id,candidate_id,measure_id,business_month);

CREATE FUNCTION mart.fact_prepared_parent(selected_tenant text,selected_revision text,config jsonb)
 RETURNS TABLE(data_id text,revision_id text,input_fingerprint text,statistics jsonb,configuration jsonb) LANGUAGE sql STABLE AS $$
 SELECT binding.data_id,binding.revision_id,binding.input_fingerprint,binding.statistics,dataset.configuration
 FROM mart.analytics_sync_candidates captured JOIN mart.analytics_sync_seals sealed USING(tenant_id,candidate_id)
 JOIN mart.analytics_serving_revisions revision ON revision.tenant_id=captured.tenant_id AND revision.revision_id=captured.candidate_id
 JOIN mart.prepared_revision_seals parent ON parent.tenant_id=revision.tenant_id AND parent.revision_id=revision.parent_revision
 JOIN mart.prepared_bindings binding ON binding.tenant_id=parent.tenant_id AND binding.revision_id=parent.revision_id
 JOIN mart.prepared_datasets dataset ON dataset.tenant_id=binding.tenant_id AND dataset.data_id=binding.data_id
 WHERE captured.tenant_id=selected_tenant AND captured.candidate_id=selected_revision AND config->>'family'='facts'
 AND revision.parent_revision=captured.specification->>'parent' AND binding.family='facts' AND binding.kind=config->>'kind'
 AND (config->>'kind'='event' AND binding.period=(config->>'from')::date AND dataset.configuration=config
  OR config->>'kind'='snapshot' AND binding.period<=(config->>'through')::date
   AND dataset.configuration-ARRAY['from','through']=config-ARRAY['from','through'])
 ORDER BY binding.period DESC LIMIT 1
$$;
REVOKE ALL ON FUNCTION mart.fact_prepared_parent(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.fact_prepared_parent(text,text,jsonb) TO dabboos_ingestor;

-- Read only the selected event month. Snapshot operands retain latest-per-entity
-- semantics, including rejection of duplicate observations before selection.
CREATE FUNCTION mart.fact_prepared_population(selected_tenant text,selected_revision text,config jsonb)
 RETURNS TABLE(fact_key text,payload jsonb) LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF config->>'family' IS DISTINCT FROM 'facts' OR config->>'snapshotPopulation' IS DISTINCT FROM 'delta'
 THEN RAISE EXCEPTION 'Ordinary prepared population required'; END IF;
 IF config->>'kind'='snapshot' AND EXISTS(
  SELECT fact.payload->>'measureId',fact.payload->>'entityId',fact.payload->>'businessDate'
  FROM mart.analytics_serving_members member JOIN mart.analytics_partition_facts link USING(tenant_id,partition_id)
  JOIN mart.analytics_fact_revisions fact ON fact.tenant_id=link.tenant_id AND fact.fact_key=link.fact_key AND fact.revision_id=link.revision_id
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='facts'
  AND member.month<=date_trunc('month',(config->>'through')::date) AND fact.payload->>'kind'='snapshot'
  AND fact.payload->>'status'='active' AND config->'measures'?(fact.payload->>'measureId')
  AND (fact.payload->>'businessDate')::date<=(config->>'through')::date
  GROUP BY fact.payload->>'measureId',fact.payload->>'entityId',fact.payload->>'businessDate'
  HAVING fact.payload->>'entityId' IS NULL OR count(*)>1)
 THEN RAISE EXCEPTION 'Complete unique snapshot identities required for preparation'; END IF;
 RETURN QUERY WITH source AS (
  SELECT link.fact_key,fact.payload FROM mart.analytics_serving_members member
  JOIN mart.analytics_partition_facts link USING(tenant_id,partition_id)
  JOIN mart.analytics_fact_revisions fact ON fact.tenant_id=link.tenant_id AND fact.fact_key=link.fact_key AND fact.revision_id=link.revision_id
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='facts'
  AND (config->>'kind'='event' AND member.month=(config->>'from')::date
   OR config->>'kind'='snapshot' AND member.month<=date_trunc('month',(config->>'through')::date))
  AND fact.payload->>'status'='active' AND fact.payload->>'kind'=config->>'kind'
  AND config->'measures'?(fact.payload->>'measureId') AND (fact.payload->>'businessDate')::date<=(config->>'through')::date
  AND (config->>'kind'='snapshot' OR (fact.payload->>'businessDate')::date>=(config->>'from')::date)
 ) SELECT source.* FROM source WHERE config->>'kind'='event'
 UNION ALL (SELECT DISTINCT ON(source.payload->>'measureId',source.payload->>'entityId') source.*
  FROM source WHERE config->>'kind'='snapshot'
  ORDER BY source.payload->>'measureId',source.payload->>'entityId',source.payload->>'businessDate' DESC);
END $$;
REVOKE ALL ON FUNCTION mart.fact_prepared_population(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.fact_prepared_population(text,text,jsonb) TO dabboos_ingestor;

-- Comparison projects only fields used by each output group. Transaction detail
-- changes cannot invalidate totals; label changes affect only their own groups.
CREATE FUNCTION mart.fact_prepared_updates(selected_tenant text,selected_revision text,config jsonb)
 RETURNS TABLE(time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,dimension_key text,numeric_changed boolean)
 LANGUAGE plpgsql STABLE AS $$
DECLARE parent_revision text;parent_config jsonb;
BEGIN
 SELECT parent.revision_id,parent.configuration INTO parent_revision,parent_config FROM mart.fact_prepared_parent(selected_tenant,selected_revision,config) parent;
 IF parent_revision IS NULL THEN RETURN; END IF;
 -- Check the changed record IDs in this period before opening either base
 -- population. Old membership also catches records moved out of the period.
 IF parent_config=config AND NOT EXISTS(
  SELECT 1 FROM mart.analytics_sync_heads changed
  WHERE changed.tenant_id=selected_tenant AND changed.candidate_id=selected_revision
  AND config->'measures'?changed.measure_id
  AND (config->>'kind'='event' AND changed.business_month=left(config->>'from',7)
   OR config->>'kind'='snapshot' AND changed.business_month<=left(config->>'through',7))
  UNION ALL SELECT 1 FROM mart.analytics_serving_members member
  JOIN mart.analytics_partition_facts link USING(tenant_id,partition_id)
  JOIN mart.analytics_sync_heads changed ON changed.tenant_id=link.tenant_id AND changed.fact_key=link.fact_key
   AND changed.candidate_id=selected_revision
  WHERE member.tenant_id=selected_tenant AND member.revision_id=parent_revision AND member.family='facts'
  AND config->'measures'?changed.measure_id
  AND (config->>'kind'='event' AND member.month=(config->>'from')::date
   OR config->>'kind'='snapshot' AND member.month<=date_trunc('month',(config->>'through')::date)))
 THEN RETURN; END IF;
 RETURN QUERY WITH source AS MATERIALIZED (
  SELECT false previous,fact.* FROM mart.fact_prepared_population(selected_tenant,selected_revision,config) fact
  WHERE config->>'kind'='snapshot' OR EXISTS(SELECT 1 FROM mart.analytics_sync_heads changed
   WHERE changed.tenant_id=selected_tenant AND changed.candidate_id=selected_revision AND changed.fact_key=fact.fact_key)
  UNION ALL SELECT true,fact.* FROM mart.fact_prepared_population(selected_tenant,parent_revision,parent_config) fact
  WHERE config->>'kind'='snapshot' OR EXISTS(SELECT 1 FROM mart.analytics_sync_heads changed
   WHERE changed.tenant_id=selected_tenant AND changed.candidate_id=selected_revision AND changed.fact_key=fact.fact_key)
 ),projected AS MATERIALIZED (
  SELECT source.previous,source.fact_key,bucket.time_grain,grain->>'id' grain_id,
   CASE bucket.time_grain WHEN 'cutoff' THEN (config->>'through')::date WHEN 'monthly' THEN date_trunc('month',(payload->>'businessDate')::date)::date
    ELSE (payload->>'businessDate')::date END business_date,payload->>'measureId' measure_id,
   (payload->>'value')::numeric amount,(payload->>'businessDate')::date data_through,
   coalesce((SELECT jsonb_object_agg(attribute.key,attribute.value) FROM jsonb_each(payload->'dimensions') attribute
    WHERE grain->'dimensions'?attribute.key),'{}'::jsonb) dimensions,
   coalesce((SELECT jsonb_object_agg(label.key,label.value) FROM jsonb_each(coalesce(payload->'displayLabels',payload->'transaction'->'labels','{}'::jsonb)) label
    WHERE EXISTS(SELECT 1 FROM jsonb_array_elements_text(grain->'dimensions') dimension
     WHERE label.key=CASE dimension WHEN 'business_line' THEN 'businessLine' ELSE dimension END)),'{}'::jsonb) labels
  FROM source CROSS JOIN jsonb_array_elements(config->'grains') grain
  CROSS JOIN LATERAL (SELECT 'cutoff'::text time_grain WHERE config->>'kind'='snapshot'
   UNION ALL SELECT 'daily' WHERE config->>'kind'='event' UNION ALL SELECT 'monthly' WHERE config->>'kind'='event') bucket
 ),differences AS MATERIALIZED (
  SELECT prior.fact_key prior_key,next.fact_key next_key,prior.time_grain prior_time,next.time_grain next_time,
   prior.grain_id prior_grain,next.grain_id next_grain,prior.business_date prior_day,next.business_date next_day,
   prior.measure_id prior_measure,next.measure_id next_measure,prior.dimensions prior_dimensions,next.dimensions next_dimensions,
   ROW(prior.business_date,prior.measure_id,prior.amount,prior.dimensions,prior.data_through)
    IS DISTINCT FROM ROW(next.business_date,next.measure_id,next.amount,next.dimensions,next.data_through) numeric_changed
  FROM (SELECT * FROM projected WHERE previous) prior FULL JOIN (SELECT * FROM projected WHERE NOT previous) next
   USING(fact_key,grain_id,time_grain)
  WHERE ROW(prior.business_date,prior.measure_id,prior.amount,prior.dimensions,prior.data_through,prior.labels)
   IS DISTINCT FROM ROW(next.business_date,next.measure_id,next.amount,next.dimensions,next.data_through,next.labels)
 ),affected AS (
  SELECT prior_time time_grain,prior_grain grain_id,prior_day business_date,prior_measure measure_id,prior_dimensions dimensions,differences.numeric_changed
   FROM differences WHERE prior_key IS NOT NULL
  UNION ALL SELECT next_time,next_grain,next_day,next_measure,next_dimensions,differences.numeric_changed
   FROM differences WHERE next_key IS NOT NULL
 ) SELECT affected.time_grain,affected.grain_id,affected.business_date,affected.measure_id,affected.dimensions,
  encode(sha256(convert_to(affected.dimensions::text,'UTF8')),'hex'),bool_or(affected.numeric_changed)
 FROM affected GROUP BY 1,2,3,4,5;
END $$;
REVOKE ALL ON FUNCTION mart.fact_prepared_updates(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.fact_prepared_updates(text,text,jsonb) TO dabboos_ingestor;

-- Join the recorded replacement keys before reading existing physical cells.
-- This is an ingestor-only keyed read of the existing prepared ancestry.
CREATE FUNCTION mart.prepared_replaced_cells(selected_tenant text,selected_parent text,selected_data text)
 RETURNS SETOF mart.prepared_cells LANGUAGE plpgsql STABLE AS $$
DECLARE source_data text;source_cutoff date;newer_data text[]:='{}'::text[];
BEGIN
 -- Bind one ancestor ID before opening its cells. Joining a recursive list to
 -- the full cell table lets the planner choose a scan of every dataset.
 FOR source_data IN
  WITH RECURSIVE lineage(data_id,depth) AS (
   SELECT selected_parent,0 UNION ALL SELECT origin.base_data_id,lineage.depth+1 FROM lineage
   JOIN mart.business_prepared_origins origin ON origin.tenant_id=selected_tenant AND origin.data_id=lineage.data_id
  ) SELECT data_id FROM lineage ORDER BY depth
 LOOP
  SELECT (configuration->>'through')::date INTO STRICT source_cutoff FROM mart.prepared_datasets
   WHERE tenant_id=selected_tenant AND data_id=source_data;
  RETURN QUERY WITH matched AS MATERIALIZED (
   SELECT cell.* FROM mart.business_prepared_keys requested
   JOIN mart.prepared_cells cell ON cell.tenant_id=selected_tenant AND cell.data_id=source_data
    AND requested.time_grain=cell.time_grain AND requested.grain_id=cell.grain_id
    AND requested.business_date=cell.business_date AND requested.measure_id=cell.measure_id
    AND requested.dimension_key=cell.dimension_key AND requested.dimensions=cell.dimensions
   WHERE requested.tenant_id=selected_tenant AND requested.data_id=selected_data AND requested.time_grain<>'cutoff'
   UNION ALL SELECT cell.* FROM mart.business_prepared_keys requested
   JOIN mart.prepared_cells cell ON cell.tenant_id=selected_tenant AND cell.data_id=source_data
    AND cell.time_grain='cutoff' AND cell.business_date=source_cutoff AND requested.grain_id=cell.grain_id
    AND requested.measure_id=cell.measure_id AND requested.dimension_key=cell.dimension_key AND requested.dimensions=cell.dimensions
   WHERE requested.tenant_id=selected_tenant AND requested.data_id=selected_data AND requested.time_grain='cutoff'
  ) SELECT cell.* FROM matched cell
  WHERE NOT EXISTS(SELECT 1 FROM mart.business_prepared_keys replaced
   WHERE replaced.tenant_id=selected_tenant AND replaced.data_id=ANY(newer_data)
   AND replaced.time_grain=cell.time_grain AND replaced.grain_id=cell.grain_id
   AND replaced.measure_id=cell.measure_id AND replaced.dimension_key=cell.dimension_key AND replaced.dimensions=cell.dimensions
   AND (cell.time_grain='cutoff' OR replaced.business_date=cell.business_date));
  newer_data:=array_append(newer_data,source_data);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION mart.prepared_replaced_cells(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_replaced_cells(text,text,text) TO dabboos_ingestor;

CREATE FUNCTION mart.fact_prepared_replacements(selected_tenant text,selected_revision text,config jsonb,selected_data text)
 RETURNS TABLE(time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,dimension_key text,
 value numeric,fact_count bigint,minimum numeric,maximum numeric,data_through date,labels jsonb,conflicting_labels text[])
 LANGUAGE sql STABLE AS $$
 WITH updates AS MATERIALIZED (
  SELECT * FROM mart.fact_prepared_updates(selected_tenant,selected_revision,config)
 ),projected AS MATERIALIZED (
  SELECT fact.payload->>'measureId' measure_id,(fact.payload->>'value')::numeric amount,
   (fact.payload->>'businessDate')::date business_day,grain->>'id' grain_id,
   coalesce((SELECT jsonb_object_agg(attribute.key,attribute.value) FROM jsonb_each(fact.payload->'dimensions') attribute
    WHERE grain->'dimensions'?attribute.key),'{}'::jsonb) dimensions,
   coalesce((SELECT jsonb_object_agg(label.key,label.value) FROM jsonb_each(coalesce(fact.payload->'displayLabels',fact.payload->'transaction'->'labels','{}'::jsonb)) label
    WHERE EXISTS(SELECT 1 FROM jsonb_array_elements_text(grain->'dimensions') dimension
     WHERE label.key=CASE dimension WHEN 'business_line' THEN 'businessLine' ELSE dimension END)),'{}'::jsonb) labels
  FROM mart.fact_prepared_population(selected_tenant,selected_revision,config) fact
  CROSS JOIN jsonb_array_elements(config->'grains') grain
  WHERE EXISTS(SELECT 1 FROM updates WHERE updates.measure_id=fact.payload->>'measureId' AND updates.grain_id=grain->>'id')
 ),contributors AS MATERIALIZED (
  SELECT updates.*,projected.amount,projected.business_day,projected.labels FROM updates JOIN projected
   ON projected.measure_id=updates.measure_id AND projected.grain_id=updates.grain_id AND projected.dimensions=updates.dimensions
   AND updates.business_date=CASE updates.time_grain WHEN 'cutoff' THEN (config->>'through')::date
    WHEN 'monthly' THEN date_trunc('month',projected.business_day)::date ELSE projected.business_day END
 ),prior_cells AS MATERIALIZED (
  SELECT prior.* FROM mart.fact_prepared_parent(selected_tenant,selected_revision,config) parent
  CROSS JOIN LATERAL mart.prepared_replaced_cells(selected_tenant,parent.data_id,selected_data) prior
 ),operands AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,
   CASE WHEN numeric_changed THEN amount END value,CASE WHEN numeric_changed THEN 1::bigint END fact_count,
   CASE WHEN numeric_changed THEN amount END minimum,CASE WHEN numeric_changed THEN amount END maximum,
   CASE WHEN numeric_changed THEN business_day END data_through,labels
  FROM contributors
  UNION ALL SELECT prior.time_grain,prior.grain_id,updates.business_date,prior.measure_id,prior.dimensions,prior.dimension_key,
   prior.value,prior.fact_count,prior.minimum,prior.maximum,prior.data_through,NULL::jsonb
  FROM prior_cells prior JOIN updates ON NOT updates.numeric_changed AND updates.time_grain=prior.time_grain
   AND updates.grain_id=prior.grain_id AND updates.measure_id=prior.measure_id AND updates.dimension_key=prior.dimension_key
   AND updates.dimensions=prior.dimensions AND (prior.time_grain='cutoff' OR prior.business_date=updates.business_date)
 ),groups AS MATERIALIZED (
  -- Reduce numbers and labels together. A join between separately reduced
  -- outputs can rescan the inherited numbers once for every label group.
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,
   sum(value) value,sum(fact_count)::bigint fact_count,min(minimum) minimum,max(maximum) maximum,max(data_through) data_through,
   array_agg(DISTINCT labels) FILTER(WHERE labels IS NOT NULL) label_sets
  FROM operands GROUP BY 1,2,3,4,5,6 HAVING sum(fact_count)>0 AND count(labels)>0
 ) SELECT groups.time_grain,groups.grain_id,groups.business_date,groups.measure_id,groups.dimensions,groups.dimension_key,
  groups.value,groups.fact_count,groups.minimum,groups.maximum,groups.data_through,
  coalesce(label_groups.labels,'{}'::jsonb),coalesce(label_groups.conflicts,'{}'::text[])
 FROM groups
 CROSS JOIN LATERAL (
  SELECT jsonb_object_agg(key,label) FILTER(WHERE choices=1) labels,array_agg(key ORDER BY key) FILTER(WHERE choices>1) conflicts
  FROM (SELECT attribute.key,min(attribute.value) label,count(DISTINCT attribute.value) choices
   FROM unnest(groups.label_sets) label_set(labels) CROSS JOIN LATERAL jsonb_each_text(label_set.labels) attribute
   GROUP BY attribute.key) fields
 ) label_groups
$$;
REVOKE ALL ON FUNCTION mart.fact_prepared_replacements(text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.fact_prepared_replacements(text,text,jsonb,text) TO dabboos_ingestor;

CREATE FUNCTION mart.prepare_fact_delta_keys(selected_tenant text,selected_revision text,config jsonb,maximum_cells bigint)
 RETURNS TABLE(data_id text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE parent record;created_data text;copied bigint;
BEGIN
 PERFORM mart.prepared_work_authorize(selected_tenant);
 IF config->>'family' IS DISTINCT FROM 'facts' THEN RETURN; END IF;
 IF maximum_cells IS NULL OR maximum_cells<1 OR config IS DISTINCT FROM mart.prepared_configuration(
  selected_tenant,selected_revision,'facts',config->>'kind',(config->>'from')::date,(config->>'through')::date)
 THEN RAISE EXCEPTION 'Governed configuration and finite cell bound required'; END IF;
 SELECT * INTO parent FROM mart.fact_prepared_parent(selected_tenant,selected_revision,config);
 IF NOT FOUND THEN RETURN; END IF;
 PERFORM mart.assert_sync_candidate_current(selected_tenant,selected_revision);
 created_data:=encode(sha256(convert_to(selected_revision||':'||config::text,'UTF8')),'hex');
 INSERT INTO mart.prepared_datasets VALUES(selected_tenant,created_data,config);
 INSERT INTO mart.business_prepared_origins VALUES(selected_tenant,created_data,parent.data_id,selected_revision,parent.revision_id);
 INSERT INTO mart.business_prepared_keys SELECT selected_tenant,created_data,time_grain,grain_id,business_date,measure_id,dimensions,dimension_key
 FROM mart.fact_prepared_updates(selected_tenant,selected_revision,config) LIMIT maximum_cells+1;
 GET DIAGNOSTICS copied=ROW_COUNT;
 IF copied>maximum_cells THEN RAISE EXCEPTION 'Prepared replacement key bound exceeded'; END IF;
 IF copied>0 THEN ANALYZE mart.business_prepared_keys (tenant_id,data_id); END IF;
 RETURN QUERY SELECT created_data;
END $$;
REVOKE ALL ON FUNCTION mart.prepare_fact_delta_keys(text,text,jsonb,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepare_fact_delta_keys(text,text,jsonb,bigint) TO dabboos_ingestor;

CREATE FUNCTION mart.materialize_fact_delta_cells(selected_tenant text,selected_revision text,selected_data text,maximum_cells bigint)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE config jsonb;copied bigint;
BEGIN
 PERFORM mart.prepared_work_authorize(selected_tenant);
 SELECT dataset.configuration INTO STRICT config FROM mart.prepared_datasets dataset
 JOIN mart.business_prepared_origins origin USING(tenant_id,data_id)
 WHERE dataset.tenant_id=selected_tenant AND dataset.data_id=selected_data AND origin.revision_id=selected_revision;
 IF maximum_cells IS NULL OR maximum_cells<1 OR config->>'family'<>'facts' OR config IS DISTINCT FROM mart.prepared_configuration(
  selected_tenant,selected_revision,'facts',config->>'kind',(config->>'from')::date,(config->>'through')::date)
 THEN RAISE EXCEPTION 'Governed configuration and finite cell bound required'; END IF;
 PERFORM mart.assert_sync_candidate_current(selected_tenant,selected_revision);
 IF EXISTS(SELECT 1 FROM mart.prepared_bindings WHERE tenant_id=selected_tenant AND data_id=selected_data)
 OR EXISTS(SELECT 1 FROM mart.prepared_cells WHERE tenant_id=selected_tenant AND data_id=selected_data)
 THEN RAISE EXCEPTION 'Prepared replacement requires a new unbound dataset'; END IF;
 INSERT INTO mart.prepared_cells SELECT selected_tenant,selected_data,cells.*
 FROM mart.fact_prepared_replacements(selected_tenant,selected_revision,config,selected_data) cells LIMIT maximum_cells+1;
 GET DIAGNOSTICS copied=ROW_COUNT;
 IF copied>maximum_cells THEN RAISE EXCEPTION 'Prepared replacement cell bound exceeded'; END IF;
 IF copied>0 THEN ANALYZE mart.prepared_cells (tenant_id,data_id); END IF;
 RETURN copied;
END $$;
REVOKE ALL ON FUNCTION mart.materialize_fact_delta_cells(text,text,text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.materialize_fact_delta_cells(text,text,text,bigint) TO dabboos_ingestor;

CREATE FUNCTION mart.fact_prepared_updates_exact(selected_tenant text,selected_revision text,config jsonb,selected_data text)
 RETURNS boolean LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM mart.fact_prepared_parent(selected_tenant,selected_revision,config) parent
  JOIN mart.business_prepared_origins origin ON origin.tenant_id=selected_tenant AND origin.data_id=selected_data
   AND origin.base_data_id=parent.data_id AND origin.base_revision=parent.revision_id AND origin.revision_id=selected_revision)
 THEN RETURN false; END IF;
 IF EXISTS(WITH expected AS MATERIALIZED (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key FROM mart.fact_prepared_updates(selected_tenant,selected_revision,config)
 ),actual AS MATERIALIZED (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key FROM mart.business_prepared_keys
  WHERE tenant_id=selected_tenant AND data_id=selected_data
 ) SELECT 1 FROM expected FULL JOIN actual USING(time_grain,grain_id,business_date,measure_id,dimension_key)
  WHERE expected.measure_id IS NULL OR actual.measure_id IS NULL OR expected.dimensions IS DISTINCT FROM actual.dimensions)
 THEN RETURN false; END IF;
 RETURN NOT EXISTS(WITH expected AS MATERIALIZED (
  SELECT * FROM mart.fact_prepared_replacements(selected_tenant,selected_revision,config,selected_data)
 ),actual AS MATERIALIZED (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,value,fact_count,minimum,maximum,data_through,labels,conflicting_labels
  FROM mart.prepared_cells WHERE tenant_id=selected_tenant AND data_id=selected_data
 ) SELECT 1 FROM expected FULL JOIN actual USING(time_grain,grain_id,business_date,measure_id,dimension_key)
 WHERE expected.measure_id IS NULL OR actual.measure_id IS NULL OR ROW(expected.dimensions,expected.value,expected.fact_count,
  expected.minimum,expected.maximum,expected.data_through,expected.labels,expected.conflicting_labels)
  IS DISTINCT FROM ROW(actual.dimensions,actual.value,actual.fact_count,actual.minimum,actual.maximum,actual.data_through,actual.labels,actual.conflicting_labels));
END $$;
REVOKE ALL ON FUNCTION mart.fact_prepared_updates_exact(text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.fact_prepared_updates_exact(text,text,jsonb,text) TO dabboos_ingestor;

-- Unchanged outputs retain their accepted dataset and observation date. A new
-- monthly membership ID alone is no longer a reason to prepare them again.
ALTER FUNCTION mart.prepared_input_signature(text,text,jsonb) RENAME TO prepared_partition_input_signature;
CREATE FUNCTION mart.prepared_input_signature(selected_tenant text,selected_revision text,config jsonb)
 RETURNS TABLE(fingerprint text,source_cutoff timestamptz) LANGUAGE plpgsql STABLE AS $$
DECLARE parent record;
BEGIN
 IF config->>'family'='facts' THEN
  SELECT selected.*,binding.source_cutoff INTO parent FROM mart.fact_prepared_parent(selected_tenant,selected_revision,config) selected
  JOIN mart.prepared_bindings binding ON binding.tenant_id=selected_tenant AND binding.revision_id=selected.revision_id
   AND binding.family='facts' AND binding.kind=config->>'kind' AND binding.period=(config->>'from')::date AND binding.data_id=selected.data_id;
  IF FOUND AND parent.configuration=config AND NOT EXISTS(SELECT 1 FROM mart.fact_prepared_updates(selected_tenant,selected_revision,config)) THEN
   RETURN QUERY SELECT parent.input_fingerprint::text,parent.source_cutoff::timestamptz; RETURN;
  END IF;
 END IF;
 RETURN QUERY SELECT * FROM mart.prepared_partition_input_signature(selected_tenant,selected_revision,config);
END $$;
REVOKE ALL ON FUNCTION mart.prepared_input_signature(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_input_signature(text,text,jsonb) TO dabboos_ingestor;

-- The existing reader serves retained rows for both ordinary and Command data.
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
  WHERE trusted.tenant_id=selected_tenant AND binding.family IN ('business','facts') AND binding.data_id=selected_data)
 THEN RAISE EXCEPTION 'Business prepared root is not currently published'; END IF;
 SELECT configuration INTO STRICT config FROM mart.prepared_datasets WHERE tenant_id=selected_tenant AND data_id=selected_data;
 IF coalesce(config->>'family','') NOT IN ('business','facts') THEN RAISE EXCEPTION 'Business prepared root required'; END IF;
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

CREATE OR REPLACE FUNCTION mart.business_prepared_statistics(selected_tenant text,selected_data text)
 RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE origin record;entry record;source_data text;newer_data text[]:='{}'::text[];
 totals jsonb:='{}'::jsonb;removed_measures text[];
BEGIN
 SELECT ancestor.*,dataset.configuration config,parent.configuration base_config,binding.statistics INTO origin
 FROM mart.business_prepared_origins ancestor JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
 JOIN mart.prepared_datasets parent ON parent.tenant_id=ancestor.tenant_id AND parent.data_id=ancestor.base_data_id
 JOIN mart.prepared_bindings binding ON binding.tenant_id=ancestor.tenant_id AND binding.revision_id=ancestor.base_revision
  AND binding.data_id=ancestor.base_data_id AND binding.family=dataset.configuration->>'family' AND binding.kind=dataset.configuration->>'kind'
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

CREATE OR REPLACE FUNCTION mart.guard_prepared_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE config jsonb;signature record; BEGIN
 SELECT configuration INTO STRICT config FROM mart.prepared_datasets WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id;
 IF config IS NULL OR config IS DISTINCT FROM mart.prepared_configuration(NEW.tenant_id,NEW.revision_id,NEW.family,NEW.kind,NEW.period,(config->>'through')::date) THEN
  RAISE EXCEPTION 'Prepared configuration does not match governed inputs';
 END IF;
 SELECT * INTO signature FROM mart.prepared_input_signature(NEW.tenant_id,NEW.revision_id,config);
 IF NEW.input_fingerprint IS DISTINCT FROM signature.fingerprint OR NEW.source_cutoff IS DISTINCT FROM signature.source_cutoff THEN
  RAISE EXCEPTION 'Prepared source signature mismatch';
 END IF;
 IF EXISTS(SELECT 1 FROM mart.prepared_revision_seals seal WHERE seal.tenant_id=NEW.tenant_id AND seal.revision_id=NEW.revision_id) THEN
  RAISE EXCEPTION 'Sealed prepared membership is immutable';
 END IF;
 IF EXISTS(SELECT 1 FROM mart.prepared_bindings previous JOIN mart.prepared_revision_seals seal USING(tenant_id,revision_id)
  WHERE previous.tenant_id=NEW.tenant_id AND previous.input_fingerprint=NEW.input_fingerprint AND previous.data_id=NEW.data_id AND previous.statistics=NEW.statistics) THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM mart.business_prepared_origins WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id) THEN
  IF NOT (CASE NEW.family
   WHEN 'business' THEN mart.business_prepared_delta_exact(NEW.tenant_id,NEW.revision_id,config,NEW.data_id)
   WHEN 'facts' THEN mart.fact_prepared_updates_exact(NEW.tenant_id,NEW.revision_id,config,NEW.data_id)
   ELSE false END) THEN
   RAISE EXCEPTION 'Prepared replacements differ from affected canonical outputs';
  END IF;
  IF NEW.statistics IS DISTINCT FROM mart.business_prepared_statistics(NEW.tenant_id,NEW.data_id) THEN
   RAISE EXCEPTION 'Business prepared delta statistics mismatch';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.kind='snapshot' AND config->>'snapshotPopulation'='complete' AND NOT mart.prepared_complete_controls_exact(NEW.tenant_id,NEW.revision_id,config,NEW.data_id) THEN
  RAISE EXCEPTION 'Complete prepared population differs from independent source controls';
 END IF;
 IF NEW.kind='snapshot' AND (CASE WHEN NEW.family IN ('review','business') AND config->>'snapshotPopulation'='complete' THEN
  EXISTS(WITH cutoffs AS (
   SELECT DISTINCT business_day FROM mart.prepared_snapshot_observations(NEW.tenant_id,NEW.revision_id,NEW.family)
   WHERE business_day<=(config->>'through')::date
  ) SELECT 1 FROM cutoffs CROSS JOIN LATERAL mart.prepared_work_complete_snapshot_rows(
   NEW.tenant_id,NEW.revision_id,NEW.family,cutoffs.business_day) source
   WHERE source.business_day=cutoffs.business_day AND source.item_count>0
   GROUP BY source.measure_id,source.entity_id,source.business_day HAVING source.entity_id IS NULL OR count(*)>1)
 ELSE EXISTS(SELECT 1 FROM mart.prepared_input_rows(NEW.tenant_id,NEW.revision_id,NEW.family) source
  WHERE source.kind='snapshot' AND source.item_count>0 AND source.business_day<=(config->>'through')::date
  GROUP BY source.measure_id,source.entity_id,source.business_day HAVING source.entity_id IS NULL OR count(*)>1) END) THEN
  RAISE EXCEPTION 'Complete unique snapshot identities required for preparation';
 END IF;
 IF NOT mart.prepared_work_cells_exact(NEW.tenant_id,NEW.revision_id,config,NEW.data_id) THEN
  RAISE EXCEPTION 'Prepared cells differ from canonical inputs';
 END IF;
 IF NEW.statistics IS DISTINCT FROM (SELECT coalesce(jsonb_object_agg(time_grain||':'||grain_id,row_count),'{}'::jsonb) FROM (
  SELECT time_grain,grain_id,count(*) row_count FROM mart.prepared_cells WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id GROUP BY 1,2) counted) THEN
  RAISE EXCEPTION 'Prepared row statistics mismatch';
 END IF;
 RETURN NEW;
END $$;

-- Preserve the same parent compatibility guard for the shared update storage.
CREATE OR REPLACE FUNCTION mart.guard_business_prepared_origin() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE config jsonb;base_config jsonb;
 BEGIN
 SELECT configuration INTO STRICT config FROM mart.prepared_datasets WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id;
 SELECT configuration INTO STRICT base_config FROM mart.prepared_datasets WHERE tenant_id=NEW.tenant_id AND data_id=NEW.base_data_id;
 IF coalesce(config->>'family','') NOT IN ('business','facts') OR base_config->>'family' IS DISTINCT FROM config->>'family'
 OR (config->>'family'='facts' AND config-ARRAY['from','through'] IS DISTINCT FROM base_config-ARRAY['from','through'])
 OR (config-ARRAY['from','through','measures','grains']) IS DISTINCT FROM (base_config-ARRAY['from','through','measures','grains'])
 OR (base_config->>'through')::date>(config->>'through')::date
 OR (config->>'kind'='event' AND (config->>'from' IS DISTINCT FROM base_config->>'from' OR config->>'through' IS DISTINCT FROM base_config->>'through'))
 OR NOT EXISTS(SELECT 1 FROM mart.analytics_serving_revisions revision JOIN mart.prepared_bindings binding
  ON binding.tenant_id=revision.tenant_id AND binding.revision_id=revision.parent_revision
  WHERE revision.tenant_id=NEW.tenant_id AND revision.revision_id=NEW.revision_id AND revision.parent_revision=NEW.base_revision
  AND binding.data_id=NEW.base_data_id AND binding.family=config->>'family' AND binding.kind=config->>'kind')
 THEN RAISE EXCEPTION 'Business prepared delta requires a compatible sealed publication parent'; END IF;
 RETURN NEW;
 END $$;
