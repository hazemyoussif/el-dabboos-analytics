-- Transaction-private background workspaces; no runtime or TEMP role expansion.
-- The existing non-bypass migration owner executes only these fixed operations.
ALTER TABLE mart.prepared_bindings ADD COLUMN prepared_at timestamptz NOT NULL DEFAULT clock_timestamp();

CREATE FUNCTION mart.prepared_work_authorize(selected_tenant text) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
BEGIN
 IF selected_tenant IS NULL OR btrim(selected_tenant)='' OR selected_tenant IS DISTINCT FROM nullif(current_setting('mart.tenant_id',true),'')
 OR NOT (pg_has_role(session_user,'dabboos_ingestor','MEMBER') OR pg_has_role(session_user,'dabboos_migrator','MEMBER'))
 OR pg_has_role(session_user,'dabboos_runtime','MEMBER')
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls)) THEN
  RAISE EXCEPTION 'Invalid prepared workspace identity';
 END IF;
END $$;
REVOKE ALL ON FUNCTION mart.prepared_work_authorize(text) FROM PUBLIC;

CREATE FUNCTION mart.prepared_work_assert(selected_tenant text,selected_revision text,config jsonb) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
BEGIN
 PERFORM mart.prepared_work_authorize(selected_tenant);
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('pg_temp.prepared_work_state') AND relowner=current_user::regrole AND relpersistence='t') THEN
  RAISE EXCEPTION 'Prepared workspace missing';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_temp.prepared_work_state WHERE tenant_id=selected_tenant AND revision_id=selected_revision AND configuration=config) THEN
  RAISE EXCEPTION 'Prepared workspace scope mismatch';
 END IF;
END $$;
REVOKE ALL ON FUNCTION mart.prepared_work_assert(text,text,jsonb) FROM PUBLIC;

CREATE FUNCTION mart.prepared_work_check_storage(selected_tenant text) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE stored_bytes bigint;
BEGIN
 PERFORM mart.prepared_work_authorize(selected_tenant);
 SELECT coalesce(sum(pg_total_relation_size(oid)),0) INTO stored_bytes FROM pg_class
 WHERE relnamespace=pg_my_temp_schema() AND relkind='r' AND relname LIKE 'prepared_work_%';
 IF stored_bytes>2147483648 THEN RAISE EXCEPTION 'Prepared workspace storage bound exceeded'; END IF;
END $$;
REVOKE ALL ON FUNCTION mart.prepared_work_check_storage(text) FROM PUBLIC;

CREATE FUNCTION mart.prepared_work_start(selected_tenant text,selected_revision text,config jsonb,maximum_cells bigint,maximum_population bigint)
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
  SELECT * FROM mart.prepared_input_rows($1,$2,$3::jsonb->>'family') fact
  WHERE fact.kind=$3::jsonb->>'kind' AND fact.business_day<=($3::jsonb->>'through')::date
   AND (fact.kind='snapshot' OR fact.business_day>=($3::jsonb->>'from')::date)
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

CREATE FUNCTION mart.prepared_work_grain_sql(attributes jsonb,config jsonb,grain jsonb) RETURNS text LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $$
DECLARE dimension text;label_key text;dimension_column text;label_column text;dimension_parts text[]:='{}';label_parts text[]:='{}';conflict_parts text[]:='{}';group_keys text[]:=ARRAY['raw.measure_id'];time_sql text;date_sql text;group_sql text;month_sql text:='date_trunc(''month'',raw.business_day)::date';
BEGIN
 FOR dimension IN SELECT jsonb_array_elements_text(grain->'dimensions') LOOP
  label_key:=CASE dimension WHEN 'business_line' THEN 'businessLine' ELSE dimension END;
  dimension_column:=format('raw.%I',attributes->dimension->>'dimension');label_column:=format('raw.%I',attributes->dimension->>'label');
  group_keys:=array_append(group_keys,dimension_column);
  dimension_parts:=array_append(dimension_parts,format('CASE WHEN %s IS NOT NULL THEN jsonb_build_object(%L,%s) ELSE ''{}''::jsonb END',dimension_column,dimension,dimension_column));
  label_parts:=array_append(label_parts,format('CASE WHEN min(%s)=max(%s) THEN jsonb_build_object(%L,min(%s)) ELSE ''{}''::jsonb END',label_column,label_column,label_key,label_column));
  conflict_parts:=array_append(conflict_parts,format('CASE WHEN min(%s)<>max(%s) THEN %L ELSE NULL::text END',label_column,label_column,label_key));
 END LOOP;
 IF config->>'kind'='snapshot' THEN
  time_sql:='''cutoff''::text';date_sql:='($2::jsonb->>''through'')::date';group_sql:=array_to_string(group_keys,',');
 ELSE
  time_sql:='CASE WHEN GROUPING(raw.business_day)=0 THEN ''daily'' ELSE ''monthly'' END';date_sql:=format('CASE WHEN GROUPING(raw.business_day)=0 THEN raw.business_day ELSE %s END',month_sql);
  group_sql:=format('GROUPING SETS ((raw.business_day,%s),(%s,%s))',array_to_string(group_keys,','),month_sql,array_to_string(group_keys,','));
 END IF;
 RETURN format('SELECT %s time_grain,%L::text grain_id,%s business_date,raw.measure_id,%s dimensions,sum(raw.amount) value,sum(raw.item_count)::bigint fact_count,min(raw.amount) FILTER(WHERE raw.item_count>0) minimum,max(raw.amount) FILTER(WHERE raw.item_count>0) maximum,max(raw.business_day) data_through,%s labels,%s conflicting_labels FROM pg_temp.prepared_work_population raw WHERE tenant_id=$1 GROUP BY %s',
 time_sql,grain->>'id',date_sql,coalesce(nullif(array_to_string(dimension_parts,'||'),''),'''{}''::jsonb'),coalesce(nullif(array_to_string(label_parts,'||'),''),'''{}''::jsonb'),
 CASE WHEN cardinality(conflict_parts)=0 THEN 'ARRAY[]::text[]' ELSE format('coalesce((SELECT array_agg(key ORDER BY key) FROM unnest(ARRAY[%s]::text[]) key WHERE key IS NOT NULL),''{}''::text[])',array_to_string(conflict_parts,',')) END,group_sql);
END $$;
REVOKE ALL ON FUNCTION mart.prepared_work_grain_sql(jsonb,jsonb,jsonb) FROM PUBLIC;

CREATE FUNCTION mart.prepared_work_generate(selected_tenant text,selected_revision text,config jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE state record;statement text;copied bigint;
BEGIN
 PERFORM mart.prepared_work_assert(selected_tenant,selected_revision,config);
 SELECT * INTO STRICT state FROM pg_temp.prepared_work_state WHERE tenant_id=selected_tenant;
 IF state.phase<>'population' THEN RAISE EXCEPTION 'Prepared workspace step out of order'; END IF;
 SELECT string_agg(mart.prepared_work_grain_sql(state.attributes,config,grain),' UNION ALL ' ORDER BY grain->>'id') INTO statement FROM jsonb_array_elements(config->'grains') grain;
 EXECUTE 'INSERT INTO pg_temp.prepared_work_cells(tenant_id,time_grain,grain_id,business_date,measure_id,dimensions,value,fact_count,minimum,maximum,data_through,labels,conflicting_labels) SELECT $1,cell.* FROM ('||statement||') cell LIMIT $3' USING selected_tenant,config,state.maximum_cells::bigint+1;
 GET DIAGNOSTICS copied=ROW_COUNT;
 IF copied>state.maximum_cells THEN RAISE EXCEPTION 'Prepared cell storage bound exceeded'; END IF;
 ANALYZE pg_temp.prepared_work_cells;
 UPDATE pg_temp.prepared_work_state SET phase='cells' WHERE tenant_id=selected_tenant;
 PERFORM mart.prepared_work_check_storage(selected_tenant);
END $$;
REVOKE ALL ON FUNCTION mart.prepared_work_generate(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_work_generate(text,text,jsonb) TO dabboos_ingestor;

CREATE FUNCTION mart.prepared_work_validate(selected_tenant text,selected_revision text,config jsonb,selected_grain text,selected_step text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
DECLARE state record;grain jsonb;scoped_config jsonb;passed boolean;
BEGIN
 PERFORM mart.prepared_work_assert(selected_tenant,selected_revision,config);
 SELECT * INTO STRICT state FROM pg_temp.prepared_work_state WHERE tenant_id=selected_tenant;
 grain:=config->'grains'->state.next_grain;
 IF grain IS NULL OR grain->>'id' IS DISTINCT FROM selected_grain THEN RAISE EXCEPTION 'Prepared grain out of order'; END IF;
 scoped_config:=jsonb_set(config,'{grains}',jsonb_build_array(grain));
 CASE selected_step
  WHEN 'expand' THEN
   IF state.phase<>'cells' THEN RAISE EXCEPTION 'Prepared workspace step out of order'; END IF;
   TRUNCATE pg_temp.prepared_work_expanded,pg_temp.prepared_work_reference,pg_temp.prepared_work_labels,pg_temp.prepared_work_proof;
   EXECUTE $step$INSERT INTO pg_temp.prepared_work_expanded WITH population AS NOT MATERIALIZED (SELECT measure_id,kind,business_day,entity_id,amount,dimensions,labels,item_count FROM pg_temp.prepared_work_population WHERE tenant_id=$1),expanded AS NOT MATERIALIZED (
  SELECT bucket.time_grain,grain->>'id' grain_id,
   CASE bucket.time_grain WHEN 'monthly' THEN date_trunc('month',fact.business_day)::date WHEN 'cutoff' THEN ($2::jsonb->>'through')::date ELSE fact.business_day END business_date,
   fact.measure_id,coalesce((SELECT jsonb_object_agg(attribute.key,attribute.value) FROM jsonb_each(fact.dimensions) attribute WHERE grain->'dimensions' ? attribute.key),'{}'::jsonb) dimensions,
   fact.amount,fact.item_count,fact.business_day data_through,
   coalesce((SELECT jsonb_object_agg(label.key,label.value) FROM jsonb_each(fact.labels) label WHERE EXISTS(
    SELECT 1 FROM jsonb_array_elements_text(grain->'dimensions') dimension WHERE label.key=CASE dimension WHEN 'business_line' THEN 'businessLine' ELSE dimension END)),'{}'::jsonb) labels
  FROM population fact CROSS JOIN jsonb_array_elements($2::jsonb->'grains') grain
  CROSS JOIN LATERAL (SELECT 'cutoff'::text time_grain WHERE $2::jsonb->>'kind'='snapshot'
   UNION ALL SELECT 'daily' WHERE $2::jsonb->>'kind'='event' UNION ALL SELECT 'monthly' WHERE $2::jsonb->>'kind'='event') bucket
 ) SELECT $1,expanded.*,md5(dimensions::text) FROM expanded$step$ USING selected_tenant,scoped_config;
   ANALYZE pg_temp.prepared_work_expanded;
   UPDATE pg_temp.prepared_work_state SET phase='expanded' WHERE tenant_id=selected_tenant;
  WHEN 'numeric' THEN
   IF state.phase<>'expanded' THEN RAISE EXCEPTION 'Prepared workspace step out of order'; END IF;
   EXECUTE $step$INSERT INTO pg_temp.prepared_work_reference SELECT $1,row_number() OVER(),reduced.*,'{}'::jsonb,ARRAY[]::text[],md5(dimensions::text) FROM (
   SELECT time_grain,grain_id,business_date,measure_id,dimensions,sum(amount) value,sum(item_count)::bigint fact_count,
   min(amount) FILTER(WHERE item_count>0) minimum,max(amount) FILTER(WHERE item_count>0) maximum,max(data_through) data_through
   FROM pg_temp.prepared_work_expanded WHERE tenant_id=$1 GROUP BY 1,2,3,4,5) reduced$step$ USING selected_tenant;
   ANALYZE pg_temp.prepared_work_reference;
   UPDATE pg_temp.prepared_work_state SET phase='numeric' WHERE tenant_id=selected_tenant;
  WHEN 'labels' THEN
   IF state.phase<>'numeric' THEN RAISE EXCEPTION 'Prepared workspace step out of order'; END IF;
   EXECUTE $step$INSERT INTO pg_temp.prepared_work_labels WITH label_values AS (
   SELECT cell.cell_id,label.key,min(label.value) label,count(DISTINCT label.value) choices
   FROM pg_temp.prepared_work_expanded expanded JOIN pg_temp.prepared_work_reference cell
   ON cell.tenant_id=expanded.tenant_id AND cell.time_grain=expanded.time_grain AND cell.grain_id=expanded.grain_id
   AND cell.business_date=expanded.business_date AND cell.measure_id=expanded.measure_id
   AND cell.dimension_key=expanded.dimension_key AND cell.dimensions=expanded.dimensions
   CROSS JOIN LATERAL jsonb_each_text(expanded.labels) label WHERE expanded.tenant_id=$1
   GROUP BY cell.cell_id,label.key
  ),label_groups AS (
   SELECT cell_id,coalesce(jsonb_object_agg(key,label) FILTER(WHERE choices=1),'{}'::jsonb) labels,
   coalesce(array_agg(key ORDER BY key) FILTER(WHERE choices>1),'{}'::text[]) conflicting_labels
   FROM label_values GROUP BY cell_id
  ) SELECT $1,cell_id,labels,conflicting_labels FROM label_groups$step$ USING selected_tenant;
   ANALYZE pg_temp.prepared_work_labels;
   UPDATE pg_temp.prepared_work_state SET phase='labels' WHERE tenant_id=selected_tenant;
  WHEN 'attach' THEN
   IF state.phase<>'labels' THEN RAISE EXCEPTION 'Prepared workspace step out of order'; END IF;
   EXECUTE $step$UPDATE pg_temp.prepared_work_reference cell SET labels=label.labels,conflicting_labels=label.conflicting_labels
   FROM pg_temp.prepared_work_labels label WHERE cell.tenant_id=$1 AND label.tenant_id=$1 AND cell.cell_id=label.cell_id$step$ USING selected_tenant;
   
   UPDATE pg_temp.prepared_work_state SET phase='attached' WHERE tenant_id=selected_tenant;
  WHEN 'compare' THEN
   IF state.phase<>'attached' THEN RAISE EXCEPTION 'Prepared workspace step out of order'; END IF;
   EXECUTE $step$INSERT INTO pg_temp.prepared_work_proof WITH compared AS (
   SELECT count(*) expected_count,bool_and(actual.measure_id IS NOT NULL AND
    ROW(expected.dimensions,expected.value,expected.fact_count,expected.minimum,expected.maximum,expected.data_through,expected.labels,expected.conflicting_labels)
    IS NOT DISTINCT FROM
    ROW(actual.dimensions,actual.value,actual.fact_count,actual.minimum,actual.maximum,actual.data_through,actual.labels,actual.conflicting_labels)) exact
   FROM pg_temp.prepared_work_reference expected LEFT JOIN LATERAL (
    SELECT candidate.* FROM pg_temp.prepared_work_cells candidate
    WHERE candidate.tenant_id=$1 AND candidate.grain_id=$2 AND candidate.time_grain=expected.time_grain
     AND candidate.grain_id=expected.grain_id AND candidate.business_date=expected.business_date
     AND candidate.measure_id=expected.measure_id AND candidate.dimension_key=expected.dimension_key
     AND candidate.dimensions=expected.dimensions LIMIT 1
   ) actual ON true
   WHERE expected.tenant_id=$1
  ),actual_count AS (SELECT count(*) total FROM pg_temp.prepared_work_cells WHERE tenant_id=$1 AND grain_id=$2)
  SELECT $1,$3,$2,expected_count,total,coalesce(exact,true) AND expected_count=total FROM compared,actual_count$step$ USING selected_tenant,selected_grain,'reference';
   SELECT exact INTO STRICT passed FROM pg_temp.prepared_work_proof WHERE tenant_id=selected_tenant AND grain_id=selected_grain;
   IF NOT passed THEN RAISE EXCEPTION 'Prepared cells differ from canonical inputs'; END IF;
   UPDATE pg_temp.prepared_work_state SET phase='cells',next_grain=next_grain+1 WHERE tenant_id=selected_tenant;
  ELSE RAISE EXCEPTION 'Unknown prepared validation step';
 END CASE;
 PERFORM mart.prepared_work_check_storage(selected_tenant);
END $$;
REVOKE ALL ON FUNCTION mart.prepared_work_validate(text,text,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_work_validate(text,text,jsonb,text,text) TO dabboos_ingestor;

CREATE FUNCTION mart.prepared_work_seal(selected_tenant text,selected_revision text,config jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
BEGIN
 PERFORM mart.prepared_work_assert(selected_tenant,selected_revision,config);
 IF NOT EXISTS(SELECT 1 FROM pg_temp.prepared_work_state WHERE tenant_id=selected_tenant AND phase='cells' AND next_grain=jsonb_array_length(config->'grains')) THEN RAISE EXCEPTION 'Prepared validation incomplete'; END IF;
 IF EXISTS(SELECT 1 FROM pg_temp.prepared_work_cells WHERE tenant_id=selected_tenant AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(config->'grains') grain WHERE grain->>'id'=grain_id)) THEN RAISE EXCEPTION 'Unexpected prepared grain'; END IF;
 UPDATE pg_temp.prepared_work_state SET phase='validated',completed_at=clock_timestamp() WHERE tenant_id=selected_tenant;
END $$;
REVOKE ALL ON FUNCTION mart.prepared_work_seal(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_work_seal(text,text,jsonb) TO dabboos_ingestor;

CREATE FUNCTION mart.prepared_work_read(selected_tenant text,selected_revision text,config jsonb)
RETURNS TABLE(time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,value numeric,fact_count bigint,minimum numeric,maximum numeric,data_through date,labels jsonb,conflicting_labels text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
BEGIN
 PERFORM mart.prepared_work_assert(selected_tenant,selected_revision,config);
 IF NOT EXISTS(SELECT 1 FROM pg_temp.prepared_work_state WHERE tenant_id=selected_tenant AND phase='validated') THEN RAISE EXCEPTION 'Prepared validation incomplete'; END IF;
 RETURN QUERY SELECT cell.time_grain,cell.grain_id,cell.business_date,cell.measure_id,cell.dimensions,cell.value,cell.fact_count,cell.minimum,cell.maximum,cell.data_through,cell.labels,cell.conflicting_labels FROM pg_temp.prepared_work_cells cell WHERE cell.tenant_id=selected_tenant;
END $$;
REVOKE ALL ON FUNCTION mart.prepared_work_read(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_work_read(text,text,jsonb) TO dabboos_ingestor;

CREATE FUNCTION mart.prepared_work_cells_exact(selected_tenant text,selected_revision text,config jsonb,selected_data text)
RETURNS boolean LANGUAGE sql VOLATILE AS $$
 WITH compared AS (
 SELECT count(*) expected_count,bool_and(actual.measure_id IS NOT NULL AND
  ROW(expected.dimensions,expected.value,expected.fact_count,expected.minimum,expected.maximum,expected.data_through,expected.labels,expected.conflicting_labels)
  IS NOT DISTINCT FROM ROW(actual.dimensions,actual.value,actual.fact_count,actual.minimum,actual.maximum,actual.data_through,actual.labels,actual.conflicting_labels)) exact
 FROM mart.prepared_work_read(selected_tenant,selected_revision,config) expected LEFT JOIN LATERAL (
  SELECT cell.* FROM mart.prepared_cells cell WHERE cell.tenant_id=selected_tenant AND cell.data_id=selected_data
   AND cell.time_grain=expected.time_grain AND cell.grain_id=expected.grain_id AND cell.business_date=expected.business_date AND cell.measure_id=expected.measure_id
   AND cell.dimension_key=encode(sha256(convert_to(expected.dimensions::text,'UTF8')),'hex') AND cell.dimensions=expected.dimensions LIMIT 1
 ) actual ON true
 ) SELECT coalesce(exact,true) AND expected_count=(SELECT count(*) FROM mart.prepared_cells WHERE tenant_id=selected_tenant AND data_id=selected_data) FROM compared
$$;
REVOKE ALL ON FUNCTION mart.prepared_work_cells_exact(text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_work_cells_exact(text,text,jsonb,text) TO dabboos_ingestor;

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
 IF NEW.kind='snapshot' AND config->>'snapshotPopulation'='complete' AND NOT mart.prepared_complete_controls_exact(NEW.tenant_id,NEW.revision_id,config,NEW.data_id) THEN
  RAISE EXCEPTION 'Complete prepared population differs from independent source controls';
 END IF;
 IF EXISTS(SELECT 1 FROM mart.prepared_input_rows(NEW.tenant_id,NEW.revision_id,NEW.family) source
  WHERE source.kind='snapshot' AND source.item_count>0 AND source.business_day<=(config->>'through')::date
  GROUP BY source.measure_id,source.entity_id,source.business_day HAVING source.entity_id IS NULL OR count(*)>1) THEN
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
