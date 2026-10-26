-- Transaction-private normalized axes. No source history is read here.
CREATE FUNCTION mart.prepared_population_work_open(selected_tenant text,selected_revision text,selected_definition text,maximum_cells bigint,maximum_chunks integer)
RETURNS jsonb LANGUAGE plpgsql AS $$
<<population_work>>
DECLARE inputs jsonb;entity_total bigint;item_total bigint;chunk_size integer;chunks bigint;content_id text;details jsonb; BEGIN
 IF selected_tenant IS DISTINCT FROM nullif(current_setting('mart.tenant_id',true),'') OR maximum_cells<1 OR maximum_chunks<1 THEN
  RAISE EXCEPTION 'Bounded tenant population preparation required'; END IF;
 inputs=mart.prepared_population_inputs(selected_tenant,selected_revision,selected_definition);
 IF inputs IS NULL THEN RAISE EXCEPTION 'Complete prepared population inputs unavailable'; END IF;
 CREATE TEMP TABLE IF NOT EXISTS population_work_meta(tenant_id text,revision_id text,definition_id text,inputs jsonb,details jsonb) ON COMMIT DROP;
 IF EXISTS(SELECT 1 FROM pg_temp.population_work_meta meta WHERE meta.tenant_id=selected_tenant AND meta.revision_id=selected_revision
  AND meta.definition_id=selected_definition AND meta.inputs=population_work.inputs AND (meta.details->>'maximumCells')::bigint=maximum_cells AND (meta.details->>'maximumChunks')::integer=maximum_chunks) THEN
  SELECT meta.details INTO details FROM pg_temp.population_work_meta meta;RETURN details;
 END IF;
 CREATE TEMP TABLE IF NOT EXISTS population_work_entities(partition_key text NOT NULL,entity_key text NOT NULL,PRIMARY KEY(partition_key,entity_key)) ON COMMIT DROP;
 CREATE TEMP TABLE IF NOT EXISTS population_work_items(item_key text PRIMARY KEY,uom text) ON COMMIT DROP;
 CREATE TEMP TABLE IF NOT EXISTS population_work_amounts(partition_key text NOT NULL,entity_key text NOT NULL,item_key text NOT NULL,amount numeric NOT NULL,uom text,
  PRIMARY KEY(partition_key,entity_key,item_key)) ON COMMIT DROP;
 TRUNCATE pg_temp.population_work_meta,pg_temp.population_work_entities,pg_temp.population_work_items,pg_temp.population_work_amounts;
 IF EXISTS(SELECT 1 FROM mart.prepared_population_input_rows(selected_tenant,inputs,'entity') WHERE fact_count<>1 OR amount<>1)
 OR EXISTS(SELECT 1 FROM mart.prepared_population_input_rows(selected_tenant,inputs,'item')
  WHERE fact_count<>1 OR amount<=0 OR inputs->>'unitDimension' IS NOT NULL AND (uom IS NULL OR uom='unassigned'))
 OR EXISTS(SELECT 1 FROM mart.prepared_population_input_rows(selected_tenant,inputs,'amount') WHERE fact_count<>1)
 THEN RAISE EXCEPTION 'Unique complete population axis states required'; END IF;
 INSERT INTO pg_temp.population_work_entities SELECT partition_key,entity_key FROM mart.prepared_population_input_rows(selected_tenant,inputs,'entity');
 INSERT INTO pg_temp.population_work_items SELECT item_key,uom FROM mart.prepared_population_input_rows(selected_tenant,inputs,'item');
 INSERT INTO pg_temp.population_work_amounts SELECT partition_key,entity_key,item_key,amount,uom FROM mart.prepared_population_input_rows(selected_tenant,inputs,'amount');
 IF EXISTS(SELECT 1 FROM pg_temp.population_work_amounts amount LEFT JOIN pg_temp.population_work_entities entity USING(partition_key,entity_key)
  LEFT JOIN pg_temp.population_work_items item USING(item_key)
  WHERE entity.entity_key IS NULL OR item.item_key IS NULL OR inputs->>'unitDimension' IS NOT NULL AND amount.uom IS DISTINCT FROM item.uom)
 THEN RAISE EXCEPTION 'Contribution is outside the complete population or product unit'; END IF;
 SELECT count(*) INTO entity_total FROM pg_temp.population_work_entities;
 SELECT count(*) INTO item_total FROM pg_temp.population_work_items;
 IF item_total>maximum_cells THEN RAISE EXCEPTION 'Prepared item axis exceeds chunk bound'; END IF;
 chunk_size=greatest(1,least(200,maximum_cells/greatest(item_total,1)))::integer;
 SELECT coalesce(sum(ceil(total::numeric/chunk_size)),0) INTO chunks FROM(SELECT count(*) total FROM pg_temp.population_work_entities GROUP BY partition_key) counted;
 IF item_total=0 THEN chunks=0; END IF;
 IF chunks>maximum_chunks THEN RAISE EXCEPTION 'Prepared population chunk bound exceeded'; END IF;
 SELECT encode(sha256(convert_to(jsonb_build_array(selected_definition,inputs->>'version',
  (SELECT encode(sha256(convert_to(coalesce(string_agg(jsonb_build_array(partition_key,entity_key)::text,E'\n' ORDER BY partition_key COLLATE "C",entity_key COLLATE "C"),''),'UTF8')),'hex') FROM pg_temp.population_work_entities),
  (SELECT encode(sha256(convert_to(coalesce(string_agg(jsonb_build_array(item_key,uom)::text,E'\n' ORDER BY item_key COLLATE "C"),''),'UTF8')),'hex') FROM pg_temp.population_work_items),
  (SELECT encode(sha256(convert_to(coalesce(string_agg(jsonb_build_array(partition_key,entity_key,item_key,trim_scale(amount)::text)::text,E'\n'
   ORDER BY partition_key COLLATE "C",entity_key COLLATE "C",item_key COLLATE "C"),''),'UTF8')),'hex') FROM pg_temp.population_work_amounts))::text,'UTF8')),'hex') INTO content_id;
 details=jsonb_build_object('dataId',content_id,'inputFingerprint',encode(sha256(convert_to(inputs::text,'UTF8')),'hex'),'inputs',inputs,
  'maximumCells',maximum_cells,'maximumChunks',maximum_chunks,'entityCount',entity_total,'itemCount',item_total,'rows',entity_total*item_total,'entitiesPerChunk',chunk_size,'chunks',chunks);
 INSERT INTO pg_temp.population_work_meta VALUES(selected_tenant,selected_revision,selected_definition,inputs,details);
 ANALYZE pg_temp.population_work_entities;ANALYZE pg_temp.population_work_items;ANALYZE pg_temp.population_work_amounts;
 RETURN details;
END $$;

CREATE FUNCTION mart.prepared_population_chunk_plan(selected_tenant text,selected_data text)
RETURNS TABLE(partition_key text,chunk_no integer,first_entity text,last_entity text,entity_count bigint,expected_rows bigint)
LANGUAGE sql STABLE AS $$
 SELECT partition_key,chunk_no,min(entity_key COLLATE "C"),max(entity_key COLLATE "C"),count(*),count(*)*dataset.item_count
 FROM mart.prepared_population_datasets dataset CROSS JOIN LATERAL (
  SELECT partition_key,entity_key,((row_number() OVER(PARTITION BY partition_key ORDER BY entity_key COLLATE "C")-1)/dataset.entities_per_chunk)::integer chunk_no
  FROM mart.prepared_population_input_rows(selected_tenant,dataset.source_inputs,'entity')
 ) entities WHERE dataset.tenant_id=selected_tenant AND dataset.data_id=selected_data AND dataset.item_count>0
 GROUP BY partition_key,chunk_no,dataset.item_count
$$;

CREATE FUNCTION mart.prepared_population_chunk_exact(selected_tenant text,selected_data text,selected_partition text,selected_chunk integer)
RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH dataset AS(SELECT * FROM mart.prepared_population_datasets WHERE tenant_id=selected_tenant AND data_id=selected_data),
 plan AS(SELECT * FROM mart.prepared_population_chunk_plan(selected_tenant,selected_data) WHERE partition_key=selected_partition AND chunk_no=selected_chunk),
 entities AS MATERIALIZED(SELECT entity.* FROM dataset,plan,LATERAL mart.prepared_population_input_rows(selected_tenant,dataset.source_inputs,'entity') entity
  WHERE entity.partition_key=plan.partition_key AND entity.entity_key COLLATE "C" BETWEEN (plan.first_entity COLLATE "C") AND (plan.last_entity COLLATE "C")),
 items AS MATERIALIZED(SELECT item.* FROM dataset,LATERAL mart.prepared_population_input_rows(selected_tenant,dataset.source_inputs,'item') item),
 contributions AS MATERIALIZED(SELECT contribution.* FROM dataset,plan,LATERAL mart.prepared_population_input_rows(selected_tenant,dataset.source_inputs,'amount') contribution
  WHERE contribution.partition_key=plan.partition_key AND contribution.entity_key COLLATE "C" BETWEEN (plan.first_entity COLLATE "C") AND (plan.last_entity COLLATE "C")),
 expected AS(SELECT entity.partition_key,entity.entity_key,item.item_key,coalesce(contribution.amount,0)::numeric(30,6) amount,contribution.item_key IS NOT NULL recorded
  FROM entities entity CROSS JOIN items item LEFT JOIN contributions contribution ON contribution.partition_key=entity.partition_key AND contribution.entity_key=entity.entity_key AND contribution.item_key=item.item_key),
 actual AS(SELECT partition_key,entity_key,item_key,amount,recorded FROM mart.prepared_population_rows
  WHERE tenant_id=selected_tenant AND data_id=selected_data AND partition_key=selected_partition AND chunk_no=selected_chunk)
 SELECT EXISTS(SELECT 1 FROM plan) AND NOT EXISTS((SELECT * FROM expected EXCEPT ALL SELECT * FROM actual) UNION ALL (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected))
$$;

CREATE FUNCTION mart.prepared_population_build_chunk(selected_tenant text,selected_data text,selected_partition text,selected_chunk integer)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE dataset mart.prepared_population_datasets;plan record;inserted bigint; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('prepared-population:'||selected_tenant||':'||selected_data,0));
 SELECT * INTO STRICT dataset FROM mart.prepared_population_datasets WHERE tenant_id=selected_tenant AND data_id=selected_data;
 IF NOT EXISTS(SELECT 1 FROM pg_temp.population_work_meta meta WHERE meta.tenant_id=selected_tenant
  AND meta.inputs=dataset.source_inputs AND meta.details->>'dataId'=selected_data) THEN RAISE EXCEPTION 'Matching frozen population workspace required'; END IF;
 IF EXISTS(SELECT 1 FROM mart.prepared_population_seals WHERE tenant_id=selected_tenant AND data_id=selected_data) THEN RAISE EXCEPTION 'Sealed population is immutable'; END IF;
 IF EXISTS(SELECT 1 FROM mart.prepared_population_chunks WHERE tenant_id=selected_tenant AND data_id=selected_data AND partition_key=selected_partition AND chunk_no=selected_chunk) THEN RETURN 0; END IF;
 SELECT * INTO STRICT plan FROM mart.prepared_population_chunk_plan(selected_tenant,selected_data) WHERE partition_key=selected_partition AND chunk_no=selected_chunk;
 INSERT INTO mart.prepared_population_rows(tenant_id,data_id,partition_key,chunk_no,entity_key,item_key,amount,recorded)
 SELECT selected_tenant,selected_data,selected_partition,selected_chunk,entity.entity_key,item.item_key,coalesce(contribution.amount,0),contribution.item_key IS NOT NULL
 FROM pg_temp.population_work_entities entity CROSS JOIN pg_temp.population_work_items item
 LEFT JOIN pg_temp.population_work_amounts contribution ON contribution.partition_key=entity.partition_key AND contribution.entity_key=entity.entity_key AND contribution.item_key=item.item_key
 WHERE entity.partition_key=selected_partition AND entity.entity_key COLLATE "C" BETWEEN (plan.first_entity COLLATE "C") AND (plan.last_entity COLLATE "C");
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>plan.expected_rows
 THEN RAISE EXCEPTION 'Prepared population differs from exact axis completion'; END IF;
 INSERT INTO mart.prepared_population_chunks VALUES(selected_tenant,selected_data,selected_partition,selected_chunk,plan.first_entity,plan.last_entity,plan.entity_count,inserted);
 RETURN inserted;
END $$;
REVOKE ALL ON FUNCTION mart.prepared_population_work_open(text,text,text,bigint,integer),mart.prepared_population_chunk_plan(text,text),
 mart.prepared_population_chunk_exact(text,text,text,integer),mart.prepared_population_build_chunk(text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_population_work_open(text,text,text,bigint,integer),mart.prepared_population_chunk_plan(text,text),
 mart.prepared_population_chunk_exact(text,text,text,integer),mart.prepared_population_build_chunk(text,text,text,integer) TO dabboos_ingestor;
