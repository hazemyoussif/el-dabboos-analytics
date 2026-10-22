-- Business prepared datasets share accepted cells. A replacement key with no
-- new physical cell is a deletion. Other prepared families are unchanged.
CREATE TABLE mart.business_prepared_origins (
 tenant_id text NOT NULL,data_id text NOT NULL,base_data_id text NOT NULL,revision_id text NOT NULL,base_revision text NOT NULL,
 PRIMARY KEY(tenant_id,data_id),CHECK(data_id<>base_data_id),
 FOREIGN KEY(tenant_id,data_id) REFERENCES mart.prepared_datasets,
 FOREIGN KEY(tenant_id,base_data_id) REFERENCES mart.prepared_datasets,
 FOREIGN KEY(tenant_id,revision_id) REFERENCES mart.analytics_serving_revisions,
 FOREIGN KEY(tenant_id,base_revision) REFERENCES mart.prepared_revision_seals
);
CREATE TABLE mart.business_prepared_keys (
 tenant_id text NOT NULL,data_id text NOT NULL,time_grain text NOT NULL,grain_id text NOT NULL,business_date date NOT NULL,
 measure_id text NOT NULL REFERENCES mart.measure_definitions,dimensions jsonb NOT NULL,dimension_key text NOT NULL,
 PRIMARY KEY(tenant_id,data_id,time_grain,grain_id,business_date,measure_id,dimension_key),
 FOREIGN KEY(tenant_id,data_id) REFERENCES mart.business_prepared_origins,
 CHECK(dimension_key=encode(sha256(convert_to(dimensions::text,'UTF8')),'hex'))
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['business_prepared_origins','business_prepared_keys'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT,INSERT ON mart.%I TO dabboos_ingestor',relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
 END LOOP;
END $$;
CREATE FUNCTION mart.guard_business_prepared_content() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.prepared_bindings WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id)
 THEN RAISE EXCEPTION 'Validated Business prepared delta is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_prepared_content_lock BEFORE INSERT ON mart.business_prepared_origins
 FOR EACH ROW EXECUTE FUNCTION mart.guard_business_prepared_content();
CREATE TRIGGER business_prepared_content_lock BEFORE INSERT ON mart.business_prepared_keys
 FOR EACH ROW EXECUTE FUNCTION mart.guard_business_prepared_content();
REVOKE ALL ON FUNCTION mart.guard_business_prepared_content() FROM PUBLIC;

-- Only the current published Business root is visible to runtime. The existing
-- non-bypass owner follows immutable ancestry with forced tenant RLS; runtime
-- receives no direct access to unpublished or historical ancestor datasets.
CREATE FUNCTION mart.business_prepared_cells(selected_tenant text,selected_data text,
 selected_grain text DEFAULT NULL,selected_time text DEFAULT NULL,selected_measures text[] DEFAULT NULL,
 selected_from date DEFAULT NULL,selected_through date DEFAULT NULL)
 RETURNS SETOF mart.prepared_cells LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
 DECLARE config jsonb;
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
 RETURN QUERY WITH RECURSIVE lineage(data_id,depth) AS (
  SELECT selected_data,0 UNION ALL SELECT origin.base_data_id,lineage.depth+1 FROM lineage
  JOIN mart.business_prepared_origins origin ON origin.tenant_id=selected_tenant AND origin.data_id=lineage.data_id
 ) SELECT cell.tenant_id,selected_data,cell.time_grain,cell.grain_id,
  CASE WHEN cell.time_grain='cutoff' THEN (config->>'through')::date ELSE cell.business_date END,
  cell.measure_id,cell.dimensions,cell.dimension_key,cell.value,cell.fact_count,cell.minimum,cell.maximum,cell.data_through,cell.labels,cell.conflicting_labels
 FROM lineage JOIN mart.prepared_cells cell ON cell.tenant_id=selected_tenant AND cell.data_id=lineage.data_id
 WHERE (selected_grain IS NULL OR cell.grain_id=selected_grain) AND (selected_time IS NULL OR cell.time_grain=selected_time)
 AND (selected_measures IS NULL OR cell.measure_id=ANY(selected_measures)) AND config->'measures'?cell.measure_id
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(config->'grains') grain WHERE grain->>'id'=cell.grain_id)
 AND (selected_from IS NULL OR CASE WHEN cell.time_grain='cutoff' THEN (config->>'through')::date ELSE cell.business_date END>=selected_from)
 AND (selected_through IS NULL OR CASE WHEN cell.time_grain='cutoff' THEN (config->>'through')::date ELSE cell.business_date END<=selected_through)
 AND NOT EXISTS(SELECT 1 FROM lineage newer JOIN mart.business_prepared_keys replaced
  ON replaced.tenant_id=selected_tenant AND replaced.data_id=newer.data_id
  WHERE newer.depth<lineage.depth AND replaced.time_grain=cell.time_grain AND replaced.grain_id=cell.grain_id
  AND replaced.measure_id=cell.measure_id AND replaced.dimension_key=cell.dimension_key AND replaced.dimensions=cell.dimensions
  AND (cell.time_grain='cutoff' OR replaced.business_date=cell.business_date));
 END $$;
REVOKE ALL ON FUNCTION mart.business_prepared_cells(text,text,text,text,text[],date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_prepared_cells(text,text,text,text,text[],date,date) TO dabboos_ingestor,dabboos_runtime;
