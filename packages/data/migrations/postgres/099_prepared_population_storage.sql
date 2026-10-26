-- A reusable completion grain inside the existing prepared revision lifecycle.
-- Source inputs stay sparse and bounded; completed pairs are never source facts.
CREATE TABLE mart_admin.prepared_population_definitions (
 definition_id text PRIMARY KEY,version integer NOT NULL CHECK(version>0),
 entity_measure text NOT NULL REFERENCES mart.measure_definitions,
 item_measure text NOT NULL REFERENCES mart.measure_definitions,
 amount_measure text NOT NULL REFERENCES mart.measure_definitions,
 entity_dimension text NOT NULL,item_dimension text NOT NULL,partition_dimension text NOT NULL,unit_dimension text
);
INSERT INTO mart_admin.prepared_population_definitions VALUES
 ('customer-products-v1',1,'coverage_customer_population','coverage_forecast_quantity','coverage_net_quantity','customer','product','coverage_year','uom');
GRANT SELECT ON mart_admin.prepared_population_definitions TO dabboos_ingestor,dabboos_runtime;
CREATE TRIGGER immutable_definition BEFORE UPDATE OR DELETE ON mart_admin.prepared_population_definitions
 FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();

CREATE TABLE mart.prepared_population_datasets (
 tenant_id text NOT NULL,data_id text NOT NULL,definition_id text NOT NULL REFERENCES mart_admin.prepared_population_definitions,
 source_revision_id text NOT NULL,source_inputs jsonb NOT NULL,entity_count bigint NOT NULL CHECK(entity_count>=0),item_count bigint NOT NULL CHECK(item_count>=0),
 expected_rows bigint NOT NULL CHECK(expected_rows>=0),entities_per_chunk integer NOT NULL CHECK(entities_per_chunk>0),
 maximum_cells bigint NOT NULL CHECK(maximum_cells>0),maximum_chunks integer NOT NULL CHECK(maximum_chunks>0),
 PRIMARY KEY(tenant_id,data_id),CHECK(expected_rows=entity_count*item_count),
 FOREIGN KEY(tenant_id,source_revision_id) REFERENCES mart.analytics_serving_revisions
);
CREATE TABLE mart.prepared_population_sources (
 tenant_id text NOT NULL,data_id text NOT NULL,axis text NOT NULL CHECK(axis IN('entity','item','amount')),
 source_data_id text NOT NULL,
 PRIMARY KEY(tenant_id,data_id,axis),FOREIGN KEY(tenant_id,data_id) REFERENCES mart.prepared_population_datasets,
 FOREIGN KEY(tenant_id,source_data_id) REFERENCES mart.prepared_datasets
);
CREATE TABLE mart.prepared_population_rows (
 tenant_id text NOT NULL,data_id text NOT NULL,partition_key text NOT NULL,chunk_no integer NOT NULL CHECK(chunk_no>=0),
 entity_key text NOT NULL,item_key text NOT NULL,amount numeric(30,6) NOT NULL,recorded boolean NOT NULL,
 PRIMARY KEY(tenant_id,data_id,partition_key,entity_key,item_key),
 FOREIGN KEY(tenant_id,data_id) REFERENCES mart.prepared_population_datasets,
 CHECK(amount::text NOT IN('NaN','Infinity','-Infinity'))
);
CREATE INDEX prepared_population_status ON mart.prepared_population_rows
 (tenant_id,data_id,partition_key,(amount>0),entity_key,item_key);
CREATE TABLE mart.prepared_population_chunks (
 tenant_id text NOT NULL,data_id text NOT NULL,partition_key text NOT NULL,chunk_no integer NOT NULL CHECK(chunk_no>=0),
 first_entity text NOT NULL,last_entity text NOT NULL,entity_count bigint NOT NULL CHECK(entity_count>0),row_count bigint NOT NULL CHECK(row_count>=0),
 PRIMARY KEY(tenant_id,data_id,partition_key,chunk_no),FOREIGN KEY(tenant_id,data_id) REFERENCES mart.prepared_population_datasets
);
CREATE TABLE mart.prepared_population_seals (
 tenant_id text NOT NULL,data_id text NOT NULL,row_count bigint NOT NULL CHECK(row_count>=0),
 PRIMARY KEY(tenant_id,data_id),FOREIGN KEY(tenant_id,data_id) REFERENCES mart.prepared_population_datasets
);
CREATE TABLE mart.prepared_population_bindings (
 tenant_id text NOT NULL,revision_id text NOT NULL,definition_id text NOT NULL REFERENCES mart_admin.prepared_population_definitions,
 data_id text NOT NULL,input_fingerprint text NOT NULL,inputs jsonb NOT NULL,
 PRIMARY KEY(tenant_id,revision_id,definition_id),
 FOREIGN KEY(tenant_id,revision_id) REFERENCES mart.analytics_serving_revisions,
 FOREIGN KEY(tenant_id,data_id) REFERENCES mart.prepared_population_seals
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['prepared_population_datasets','prepared_population_sources','prepared_population_rows','prepared_population_chunks','prepared_population_seals','prepared_population_bindings'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT,INSERT ON mart.%I TO dabboos_ingestor',relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
 END LOOP;
END $$;
GRANT SELECT ON mart.prepared_population_bindings,mart.prepared_population_rows,mart.prepared_population_seals,mart.prepared_population_datasets TO dabboos_runtime;
CREATE POLICY trusted_population_binding ON mart.prepared_population_bindings AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted JOIN mart.prepared_revision_seals seal USING(tenant_id,revision_id)
 WHERE trusted.tenant_id=prepared_population_bindings.tenant_id AND trusted.revision_id=prepared_population_bindings.revision_id));
CREATE POLICY trusted_population_dataset ON mart.prepared_population_datasets AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.prepared_population_bindings binding WHERE binding.tenant_id=prepared_population_datasets.tenant_id AND binding.data_id=prepared_population_datasets.data_id));
CREATE POLICY trusted_population_rows ON mart.prepared_population_rows AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.prepared_population_bindings binding WHERE binding.tenant_id=prepared_population_rows.tenant_id AND binding.data_id=prepared_population_rows.data_id));
CREATE POLICY trusted_population_seal ON mart.prepared_population_seals AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.prepared_population_bindings binding WHERE binding.tenant_id=prepared_population_seals.tenant_id AND binding.data_id=prepared_population_seals.data_id));

-- Only registered semantic inputs select the algorithm. There is no report ID.
CREATE FUNCTION mart.prepared_population_inputs(selected_tenant text,selected_revision text,selected_definition text)
RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('definition',definition.definition_id,'version',definition.version,
 'basis',(SELECT rule->'population' FROM mart.analytics_serving_members member JOIN mart.review_extractions extraction USING(tenant_id,partition_id),
  LATERAL jsonb_array_elements(extraction.mapping->'measures') rule WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision
  AND member.family='business' AND rule->>'measureId'=definition.entity_measure ORDER BY member.month DESC LIMIT 1),
 'observation',(SELECT jsonb_build_object('businessDay',observed.business_day,'sourceAsOf',observed.source_cutoff,'sourceRevision',observed.source_revision)
  FROM mart.analytics_serving_members member,LATERAL mart.business_measure_observation(selected_tenant,member.partition_id,definition.entity_measure) observed
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='business'
  ORDER BY member.month DESC LIMIT 1),
 'entityDimension',definition.entity_dimension,'itemDimension',definition.item_dimension,'partitionDimension',definition.partition_dimension,'unitDimension',definition.unit_dimension,
 'currency',min(selected.currency),'through',min(selected.through),'axes',jsonb_object_agg(axis.name,
 jsonb_build_object('measure',axis.measure,'data_id',selected.data_id,'grain_id',selected.grain_id,'day',selected.through)))
 FROM mart_admin.prepared_population_definitions definition
 CROSS JOIN LATERAL(VALUES('entity',definition.entity_measure),('item',definition.item_measure),('amount',definition.amount_measure)) axis(name,measure)
 JOIN LATERAL(
  SELECT binding.data_id,dataset.configuration->>'through' through,dataset.configuration->>'currency' currency,grain.value->>'id' grain_id
  FROM mart.prepared_bindings binding JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
  CROSS JOIN LATERAL(SELECT value FROM jsonb_array_elements(dataset.configuration->'grains')
   ORDER BY jsonb_array_length(value->'dimensions') DESC,value->>'id' LIMIT 1) grain
  WHERE binding.tenant_id=selected_tenant AND binding.revision_id=selected_revision AND binding.family='business' AND binding.kind='snapshot'
   AND dataset.configuration->'measures'?axis.measure AND dataset.configuration->>'snapshotPopulation'='complete'
  ORDER BY dataset.configuration->>'through' DESC,binding.period DESC LIMIT 1
 ) selected ON true WHERE definition.definition_id=selected_definition
 GROUP BY definition.definition_id,definition.version,definition.entity_dimension,definition.item_dimension,definition.partition_dimension,definition.unit_dimension
 HAVING count(*)=3 AND count(DISTINCT selected.currency)=1 AND count(DISTINCT selected.through)=1
$$;
REVOKE ALL ON FUNCTION mart.prepared_population_inputs(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_population_inputs(text,text,text) TO dabboos_ingestor;

CREATE FUNCTION mart.prepared_population_input_rows(selected_tenant text,inputs jsonb,selected_axis text)
RETURNS TABLE(partition_key text,entity_key text,item_key text,amount numeric,uom text,fact_count bigint)
LANGUAGE sql STABLE AS $$
 SELECT cell.dimensions->>(inputs->>'partitionDimension'),cell.dimensions->>(inputs->>'entityDimension'),
 cell.dimensions->>(inputs->>'itemDimension'),cell.value,cell.dimensions->>(inputs->>'unitDimension'),cell.fact_count
 FROM mart.business_prepared_cells(selected_tenant,inputs->'axes'->selected_axis->>'data_id',
 inputs->'axes'->selected_axis->>'grain_id','cutoff',ARRAY[inputs->'axes'->selected_axis->>'measure'],
 (inputs->'axes'->selected_axis->>'day')::date,(inputs->'axes'->selected_axis->>'day')::date) cell
 WHERE selected_axis IN('entity','item','amount') AND cell.fact_count>0
$$;
REVOKE ALL ON FUNCTION mart.prepared_population_input_rows(text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_population_input_rows(text,jsonb,text) TO dabboos_ingestor;
