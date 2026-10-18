-- Complete populations need only each measure's latest accepted observation.
-- Keep canonical readers/independent proofs and all delta/event/Finance paths unchanged.
CREATE FUNCTION mart.prepared_work_complete_snapshot_rows(selected_tenant text,selected_revision text,selected_family text,selected_through date)
RETURNS TABLE(measure_id text,kind text,business_day date,entity_id text,amount numeric,dimensions jsonb,labels jsonb,item_count bigint)
LANGUAGE sql STABLE AS $$
 WITH observations AS MATERIALIZED (
  SELECT DISTINCT ON(measure_id) measure_id,business_day
  FROM mart.prepared_snapshot_observations(selected_tenant,selected_revision,selected_family)
  WHERE selected_family IN ('review','business') AND business_day<=selected_through
  ORDER BY measure_id,business_day DESC
 )
 SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint
 FROM observations JOIN mart.analytics_serving_members member
 ON member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family
 AND member.month=date_trunc('month',observations.business_day)::date
 JOIN mart.review_facts fact ON fact.tenant_id=member.tenant_id AND fact.partition_id=member.partition_id
 AND fact.measure_id=observations.measure_id AND fact.business_day::date=observations.business_day
 WHERE fact.payload->>'kind'='snapshot'
$$;
REVOKE ALL ON FUNCTION mart.prepared_work_complete_snapshot_rows(text,text,text,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_work_complete_snapshot_rows(text,text,text,date) TO dabboos_ingestor;

CREATE OR REPLACE FUNCTION mart.prepared_work_start(selected_tenant text,selected_revision text,config jsonb,maximum_cells bigint,maximum_population bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE relation_name text;dimension text;label_key text;columns_sql text:='';attributes jsonb:='{}';position integer:=0;copied bigint;
BEGIN
 PERFORM mart.prepared_work_authorize(selected_tenant);
 IF maximum_cells<1 OR maximum_population<1 OR maximum_cells IS NULL OR maximum_population IS NULL THEN RAISE EXCEPTION 'Finite prepared workspace bounds required'; END IF;
 IF config IS NULL OR config IS DISTINCT FROM mart.prepared_configuration(selected_tenant,selected_revision,config->>'family',config->>'kind',(config->>'from')::date,(config->>'through')::date) THEN
  RAISE EXCEPTION 'Prepared configuration does not match governed inputs';
 END IF;
 FOREACH relation_name IN ARRAY ARRAY['prepared_work_state','prepared_work_population','prepared_work_cells','prepared_work_expanded','prepared_work_reference','prepared_work_labels','prepared_work_proof'] LOOP
  IF to_regclass('pg_temp.'||relation_name) IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('pg_temp.'||relation_name) AND relowner=current_user::regrole AND relpersistence='t') THEN RAISE EXCEPTION 'Unexpected prepared workspace owner'; END IF;
   EXECUTE format('DROP TABLE pg_temp.%I',relation_name);
  END IF;
 END LOOP;
 FOR dimension IN SELECT DISTINCT entry.dimension_key FROM jsonb_array_elements(config->'grains') grain CROSS JOIN LATERAL jsonb_array_elements_text(grain->'dimensions') entry(dimension_key) ORDER BY entry.dimension_key LOOP
  label_key:=CASE dimension WHEN 'business_line' THEN 'businessLine' ELSE dimension END;
  columns_sql:=columns_sql||format(',%I jsonb GENERATED ALWAYS AS (dimensions->%L) STORED,%I text GENERATED ALWAYS AS (labels->>%L) STORED','dimension_'||position,dimension,'label_'||position,label_key);
  attributes:=attributes||jsonb_build_object(dimension,jsonb_build_object('dimension','dimension_'||position,'label','label_'||position));position:=position+1;
 END LOOP;
 CREATE TEMPORARY TABLE prepared_work_state(tenant_id text NOT NULL,revision_id text NOT NULL,configuration jsonb NOT NULL,attributes jsonb NOT NULL,maximum_cells bigint NOT NULL,phase text NOT NULL,next_grain integer NOT NULL,started_at timestamptz NOT NULL,completed_at timestamptz) ON COMMIT DROP;
 EXECUTE 'CREATE TEMPORARY TABLE prepared_work_population(tenant_id text NOT NULL,measure_id text,kind text,business_day date,entity_id text,amount numeric,dimensions jsonb,labels jsonb,item_count bigint'||columns_sql||') ON COMMIT DROP';
 CREATE TEMPORARY TABLE prepared_work_cells(tenant_id text NOT NULL,time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,value numeric,fact_count bigint,minimum numeric,maximum numeric,data_through date,labels jsonb,conflicting_labels text[],dimension_key text GENERATED ALWAYS AS (md5(dimensions::text)) STORED) ON COMMIT DROP;
 CREATE UNIQUE INDEX ON prepared_work_cells(tenant_id,time_grain,grain_id,business_date,measure_id,dimension_key);
 CREATE TEMPORARY TABLE prepared_work_expanded(tenant_id text NOT NULL,time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,amount numeric,item_count bigint,data_through date,labels jsonb,dimension_key text) ON COMMIT DROP;
 CREATE TEMPORARY TABLE prepared_work_reference(tenant_id text NOT NULL,cell_id bigint,time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,value numeric,fact_count bigint,minimum numeric,maximum numeric,data_through date,labels jsonb,conflicting_labels text[],dimension_key text) ON COMMIT DROP;
 CREATE INDEX ON prepared_work_reference(tenant_id,time_grain,grain_id,business_date,measure_id,dimension_key);
 CREATE INDEX ON prepared_work_reference(tenant_id,cell_id);
 CREATE TEMPORARY TABLE prepared_work_labels(tenant_id text NOT NULL,cell_id bigint,labels jsonb,conflicting_labels text[]) ON COMMIT DROP;
 CREATE INDEX ON prepared_work_labels(tenant_id,cell_id);
 CREATE TEMPORARY TABLE prepared_work_proof(tenant_id text NOT NULL,rung text,grain_id text,expected_rows bigint,actual_rows bigint,exact boolean) ON COMMIT DROP;
 FOREACH relation_name IN ARRAY ARRAY['prepared_work_state','prepared_work_population','prepared_work_cells','prepared_work_expanded','prepared_work_reference','prepared_work_labels','prepared_work_proof'] LOOP
  EXECUTE format('ALTER TABLE pg_temp.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE pg_temp.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON pg_temp.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
 END LOOP;
 INSERT INTO pg_temp.prepared_work_state VALUES(selected_tenant,selected_revision,config,attributes,maximum_cells,'population',0,clock_timestamp(),NULL);
 EXECUTE $population$INSERT INTO pg_temp.prepared_work_population(tenant_id,measure_id,kind,business_day,entity_id,amount,dimensions,labels,item_count)
 WITH source AS MATERIALIZED (
  SELECT * FROM mart.prepared_work_input_rows($1,$2,$3::jsonb->>'family',$3::jsonb->>'kind',($3::jsonb->>'from')::date,($3::jsonb->>'through')::date) fact
  WHERE NOT ($3::jsonb->>'family' IN ('review','business') AND $3::jsonb->>'kind'='snapshot' AND $3::jsonb->>'snapshotPopulation'='complete') AND fact.kind=$3::jsonb->>'kind' AND fact.business_day<=($3::jsonb->>'through')::date
   AND (fact.kind='snapshot' OR fact.business_day>=($3::jsonb->>'from')::date)
  UNION ALL SELECT * FROM mart.prepared_work_complete_snapshot_rows($1,$2,$3::jsonb->>'family',($3::jsonb->>'through')::date)
  WHERE ($3::jsonb->>'family' IN ('review','business') AND $3::jsonb->>'kind'='snapshot' AND $3::jsonb->>'snapshotPopulation'='complete')
 ),observations AS (
  SELECT DISTINCT ON(measure_id) * FROM mart.prepared_snapshot_observations($1,$2,$3::jsonb->>'family')
  WHERE $3::jsonb->>'kind'='snapshot' AND business_day<=($3::jsonb->>'through')::date ORDER BY measure_id,business_day DESC
 ),latest AS (
  SELECT DISTINCT ON(measure_id,entity_id) * FROM source WHERE kind='snapshot' AND $3::jsonb->>'snapshotPopulation'='delta'
  ORDER BY measure_id,entity_id,business_day DESC
 ),population AS (
  SELECT * FROM source WHERE kind='event'
  UNION ALL SELECT * FROM latest
  UNION ALL SELECT source.* FROM source JOIN observations USING(measure_id,business_day)
   WHERE source.kind='snapshot' AND $3::jsonb->>'snapshotPopulation'='complete'
  UNION ALL SELECT measure_id,'snapshot',business_day,NULL,0::numeric,'{}'::jsonb,'{}'::jsonb,0::bigint
   FROM observations WHERE expected_count=0 AND expected_value=0 AND $3::jsonb->>'snapshotPopulation'='complete'
 ) SELECT $1,population.* FROM population LIMIT $4$population$ USING selected_tenant,selected_revision,config,maximum_population::bigint+1;
 GET DIAGNOSTICS copied=ROW_COUNT;
 IF copied>maximum_population THEN RAISE EXCEPTION 'Prepared population storage bound exceeded'; END IF;
 ANALYZE pg_temp.prepared_work_population;
 PERFORM mart.prepared_work_check_storage(selected_tenant);
END $$;
REVOKE ALL ON FUNCTION mart.prepared_work_start(text,text,jsonb,bigint,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_work_start(text,text,jsonb,bigint,bigint) TO dabboos_ingestor;
