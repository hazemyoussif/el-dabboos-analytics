-- Additive prepared serving storage. No existing data, policy, schema history or pointer is rewritten.
-- Preparation/activation are explicit operations; this migration performs neither.
-- Versioned source contracts describe populations, never reports or viewer selections.
CREATE TABLE mart_admin.prepared_source_contracts (
 family text NOT NULL,registry_version text NOT NULL,snapshot_population text NOT NULL CHECK(snapshot_population IN ('complete','delta')),
 PRIMARY KEY(family,registry_version)
);
INSERT INTO mart_admin.prepared_source_contracts VALUES
 ('facts','prepared-v1','delta'),('review','prepared-v1','complete'),('business','prepared-v1','complete'),('receivables','prepared-v1','complete');
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart_admin.prepared_source_contracts FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
GRANT USAGE ON SCHEMA mart_admin TO dabboos_ingestor;
GRANT SELECT ON mart_admin.prepared_source_contracts TO dabboos_ingestor,dabboos_runtime;
CREATE TABLE mart.prepared_datasets (
 tenant_id text NOT NULL,data_id text NOT NULL,configuration jsonb NOT NULL,
 PRIMARY KEY(tenant_id,data_id),CHECK(jsonb_typeof(configuration)='object')
);
CREATE TABLE mart.prepared_cells (
 tenant_id text NOT NULL,data_id text NOT NULL,time_grain text NOT NULL CHECK(time_grain IN ('daily','monthly','cutoff')),
 grain_id text NOT NULL,business_date date NOT NULL,measure_id text NOT NULL REFERENCES mart.measure_definitions,
 dimensions jsonb NOT NULL CHECK(jsonb_typeof(dimensions)='object'),
 dimension_key text NOT NULL CHECK(dimension_key=encode(sha256(convert_to(dimensions::text,'UTF8')),'hex')),
 value numeric NOT NULL,fact_count bigint NOT NULL CHECK(fact_count>=0),minimum numeric,maximum numeric,
 data_through date NOT NULL,labels jsonb NOT NULL,conflicting_labels text[] NOT NULL,
 PRIMARY KEY(tenant_id,data_id,time_grain,grain_id,business_date,measure_id,dimension_key),
 FOREIGN KEY(tenant_id,data_id) REFERENCES mart.prepared_datasets,
 CHECK(data_through>=business_date OR time_grain='cutoff'),
 CHECK(value NOT IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric))
);
CREATE INDEX prepared_cell_filters ON mart.prepared_cells USING gin(dimensions jsonb_path_ops);
CREATE TABLE mart.prepared_bindings (
 tenant_id text NOT NULL,revision_id text NOT NULL,family text NOT NULL CHECK(family IN ('facts','receivables','review','business')),
 kind text NOT NULL CHECK(kind IN ('event','snapshot')),period date NOT NULL,data_id text NOT NULL,
 input_fingerprint text NOT NULL,source_cutoff timestamptz NOT NULL,statistics jsonb NOT NULL,
 PRIMARY KEY(tenant_id,revision_id,family,kind,period),
 FOREIGN KEY(tenant_id,revision_id) REFERENCES mart.analytics_serving_revisions,
 FOREIGN KEY(tenant_id,data_id) REFERENCES mart.prepared_datasets
);
CREATE TABLE mart.prepared_revision_seals (
 tenant_id text NOT NULL,revision_id text NOT NULL,registry_version text NOT NULL,
 PRIMARY KEY(tenant_id,revision_id),FOREIGN KEY(tenant_id,revision_id) REFERENCES mart.analytics_serving_revisions
);
CREATE TABLE mart.prepared_activation (
 tenant_id text PRIMARY KEY,initial_revision text NOT NULL,
 max_cells_per_chunk bigint NOT NULL CHECK(max_cells_per_chunk>0 AND max_cells_per_chunk<=9007199254740991),
 max_chunks integer NOT NULL CHECK(max_chunks>0),
 FOREIGN KEY(tenant_id,initial_revision) REFERENCES mart.prepared_revision_seals(tenant_id,revision_id)
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['prepared_datasets','prepared_cells','prepared_bindings','prepared_revision_seals','prepared_activation'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT ON mart.%I TO dabboos_runtime',relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
 END LOOP;
END $$;
GRANT SELECT,INSERT ON mart.prepared_datasets,mart.prepared_cells,mart.prepared_bindings,mart.prepared_revision_seals TO dabboos_ingestor;
GRANT SELECT,INSERT ON mart.prepared_activation TO dabboos_migrator;
GRANT SELECT ON mart.prepared_activation TO dabboos_ingestor;
CREATE POLICY prepared_current ON mart.prepared_revision_seals AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(
 SELECT 1 FROM mart.analytics_trusted_serving trusted WHERE trusted.tenant_id=prepared_revision_seals.tenant_id AND trusted.revision_id=prepared_revision_seals.revision_id));
CREATE POLICY prepared_current ON mart.prepared_bindings AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(
 SELECT 1 FROM mart.prepared_revision_seals seal WHERE seal.tenant_id=prepared_bindings.tenant_id AND seal.revision_id=prepared_bindings.revision_id));
CREATE POLICY prepared_current ON mart.prepared_datasets AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(
 SELECT 1 FROM mart.prepared_bindings binding WHERE binding.tenant_id=prepared_datasets.tenant_id AND binding.data_id=prepared_datasets.data_id));
CREATE POLICY prepared_current ON mart.prepared_cells AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(
 SELECT 1 FROM mart.prepared_bindings binding WHERE binding.tenant_id=prepared_cells.tenant_id AND binding.data_id=prepared_cells.data_id));

-- Only the preparation identity may read canonical populations through this function.
CREATE FUNCTION mart.prepared_input_rows(selected_tenant text,selected_revision text,selected_family text)
RETURNS TABLE(measure_id text,kind text,business_day date,entity_id text,amount numeric,dimensions jsonb,labels jsonb,item_count bigint)
LANGUAGE sql STABLE AS $$
 SELECT fact.payload->>'measureId',fact.payload->>'kind',(fact.payload->>'businessDate')::date,
 fact.payload->>'entityId',(fact.payload->>'value')::numeric,fact.payload->'dimensions',
 coalesce(fact.payload->'displayLabels',fact.payload->'transaction'->'labels','{}'::jsonb),1::bigint
 FROM mart.analytics_serving_members member JOIN mart.analytics_partition_facts link ON link.tenant_id=member.tenant_id AND link.partition_id=member.partition_id
 JOIN mart.analytics_fact_revisions fact ON fact.tenant_id=link.tenant_id AND fact.fact_key=link.fact_key AND fact.revision_id=link.revision_id
 WHERE selected_family='facts' AND member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='facts'
 UNION ALL
 SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint
 FROM mart.analytics_serving_members member JOIN mart.review_facts fact USING(tenant_id,partition_id)
 WHERE selected_family IN ('review','business') AND member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family
 UNION ALL
 SELECT operand.key,'snapshot',evidence.snapshot_date,customer.customer_id,operand.value::numeric,
 jsonb_build_object('customer',customer.customer_id),jsonb_strip_nulls(jsonb_build_object('customer',customer.label)),1::bigint
 FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 JOIN mart.finance_snapshot_evidence evidence ON evidence.tenant_id=part.tenant_id AND evidence.snapshot_id=part.snapshot_id
 JOIN mart.finance_snapshot_customers customer ON customer.tenant_id=evidence.tenant_id AND customer.snapshot_id=evidence.snapshot_id
 CROSS JOIN LATERAL jsonb_each_text(customer.actual_values) operand
 WHERE selected_family='receivables' AND member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='receivables'
$$;
REVOKE ALL ON FUNCTION mart.prepared_input_rows(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_input_rows(text,text,text) TO dabboos_ingestor;

-- Accepted complete observations include independently controlled empty populations.
-- A missing observation is unavailable; it is never an implicit zero or delta.
CREATE FUNCTION mart.prepared_snapshot_observations(selected_tenant text,selected_revision text,selected_family text)
RETURNS TABLE(measure_id text,business_day date,expected_value numeric,expected_count bigint)
LANGUAGE sql STABLE AS $$
 SELECT control.measure_id,least((member.month+interval '1 month - 1 day')::date,
  (part.capabilities->'releases'->0->'period'->>'to')::date),control.expected_value,control.expected_count
 FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 JOIN mart.review_controls control USING(tenant_id,partition_id)
 JOIN mart.measure_definitions definition ON definition.measure_id=control.measure_id AND definition.kind='snapshot'
 WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family
 AND selected_family IN ('review','business') AND control.scope_key='summary'
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') rule WHERE rule->>'measureId'=control.measure_id)
 UNION ALL
 SELECT operand.key,evidence.snapshot_date,operand.value::numeric,evidence.customer_count
 FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 JOIN mart.finance_snapshot_evidence evidence ON evidence.tenant_id=part.tenant_id AND evidence.snapshot_id=part.snapshot_id
 CROSS JOIN LATERAL jsonb_each_text(evidence.totals) operand
 WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family AND selected_family='receivables'
$$;
REVOKE ALL ON FUNCTION mart.prepared_snapshot_observations(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_snapshot_observations(text,text,text) TO dabboos_ingestor;

-- Compare the stored totals against the independent accepted observation, not the
-- materializer's own population algorithm. Empty controls still require a real cell.
CREATE FUNCTION mart.prepared_complete_controls_exact(selected_tenant text,selected_revision text,config jsonb,selected_data text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH observations AS (
  SELECT DISTINCT ON(measure_id) * FROM mart.prepared_snapshot_observations(selected_tenant,selected_revision,config->>'family')
  WHERE business_day<=(config->>'through')::date ORDER BY measure_id,business_day DESC
 ),actual AS (
  SELECT measure_id,value,fact_count FROM mart.prepared_cells
  WHERE tenant_id=selected_tenant AND data_id=selected_data AND time_grain='cutoff' AND grain_id='[]'
  AND business_date=(config->>'through')::date
 ) SELECT NOT EXISTS(SELECT 1 FROM observations observation LEFT JOIN actual USING(measure_id)
  WHERE actual.measure_id IS NULL OR observation.expected_count IS NULL
  OR observation.expected_count IS DISTINCT FROM actual.fact_count OR observation.expected_value IS DISTINCT FROM actual.value)
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(config->'measures') measure
  WHERE NOT EXISTS(SELECT 1 FROM observations WHERE measure_id=measure))
$$;
REVOKE ALL ON FUNCTION mart.prepared_complete_controls_exact(text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_complete_controls_exact(text,text,jsonb,text) TO dabboos_ingestor;

-- Canonical background materialization. Runtime has no EXECUTE privilege.
CREATE FUNCTION mart.prepared_expected_cells(selected_tenant text,selected_revision text,config jsonb)
RETURNS TABLE(time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,value numeric,fact_count bigint,minimum numeric,maximum numeric,data_through date,labels jsonb,conflicting_labels text[])
LANGUAGE sql STABLE AS $$
 WITH source AS MATERIALIZED (
  SELECT * FROM mart.prepared_input_rows(selected_tenant,selected_revision,config->>'family') fact
  WHERE fact.kind=config->>'kind' AND fact.business_day<=(config->>'through')::date
   AND (fact.kind='snapshot' OR fact.business_day>=(config->>'from')::date)
 ),observations AS (
  SELECT DISTINCT ON(measure_id) * FROM mart.prepared_snapshot_observations(selected_tenant,selected_revision,config->>'family')
  WHERE config->>'kind'='snapshot' AND business_day<=(config->>'through')::date ORDER BY measure_id,business_day DESC
 ),latest AS (
  SELECT DISTINCT ON(measure_id,entity_id) * FROM source WHERE kind='snapshot' AND config->>'snapshotPopulation'='delta'
  ORDER BY measure_id,entity_id,business_day DESC
 ),population AS (
  SELECT * FROM source WHERE kind='event'
  UNION ALL SELECT * FROM latest
  UNION ALL SELECT source.* FROM source JOIN observations USING(measure_id,business_day)
   WHERE source.kind='snapshot' AND config->>'snapshotPopulation'='complete'
  UNION ALL SELECT measure_id,'snapshot',business_day,NULL,0::numeric,'{}'::jsonb,'{}'::jsonb,0::bigint
   FROM observations WHERE expected_count=0 AND expected_value=0 AND config->>'snapshotPopulation'='complete'
 ),expanded AS MATERIALIZED (
  SELECT bucket.time_grain,grain->>'id' grain_id,
   CASE bucket.time_grain WHEN 'monthly' THEN date_trunc('month',fact.business_day)::date WHEN 'cutoff' THEN (config->>'through')::date ELSE fact.business_day END business_date,
   fact.measure_id,coalesce((SELECT jsonb_object_agg(attribute.key,attribute.value) FROM jsonb_each(fact.dimensions) attribute WHERE grain->'dimensions' ? attribute.key),'{}'::jsonb) dimensions,
   fact.amount,fact.item_count,fact.business_day data_through,
   coalesce((SELECT jsonb_object_agg(label.key,label.value) FROM jsonb_each(fact.labels) label WHERE EXISTS(
    SELECT 1 FROM jsonb_array_elements_text(grain->'dimensions') dimension WHERE label.key=CASE dimension WHEN 'business_line' THEN 'businessLine' ELSE dimension END)),'{}'::jsonb) labels
  FROM population fact CROSS JOIN jsonb_array_elements(config->'grains') grain
  CROSS JOIN LATERAL (SELECT 'cutoff'::text time_grain WHERE config->>'kind'='snapshot'
   UNION ALL SELECT 'daily' WHERE config->>'kind'='event' UNION ALL SELECT 'monthly' WHERE config->>'kind'='event') bucket
 ),reduced AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,sum(amount) value,sum(item_count)::bigint fact_count,min(amount) FILTER(WHERE item_count>0) minimum,max(amount) FILTER(WHERE item_count>0) maximum,max(data_through) data_through
  FROM expanded GROUP BY 1,2,3,4,5
 ),label_values AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,label.key,min(label.value) label,count(DISTINCT label.value) choices
  FROM expanded CROSS JOIN LATERAL jsonb_each_text(labels) label GROUP BY 1,2,3,4,5,6
 ),label_groups AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,
   coalesce(jsonb_object_agg(key,label) FILTER(WHERE choices=1),'{}'::jsonb) labels,
   coalesce(array_agg(key ORDER BY key) FILTER(WHERE choices>1),'{}'::text[]) conflicting_labels
  FROM label_values GROUP BY 1,2,3,4,5
 ) SELECT reduced.*,coalesce(label_groups.labels,'{}'::jsonb),coalesce(label_groups.conflicting_labels,'{}'::text[])
 FROM reduced LEFT JOIN label_groups USING(time_grain,grain_id,business_date,measure_id,dimensions)
$$;
REVOKE ALL ON FUNCTION mart.prepared_expected_cells(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_expected_cells(text,text,jsonb) TO dabboos_ingestor;

CREATE FUNCTION mart.guard_prepared_cells() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.prepared_bindings binding WHERE binding.tenant_id=NEW.tenant_id AND binding.data_id=NEW.data_id) THEN
  RAISE EXCEPTION 'Validated prepared data is immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prepared_cells_lock BEFORE INSERT ON mart.prepared_cells FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_cells();
CREATE FUNCTION mart.prepared_required_chunks(selected_tenant text,selected_revision text)
RETURNS TABLE(family text,kind text,period date,through date) LANGUAGE sql STABLE AS $$
 WITH members AS MATERIALIZED (
  SELECT member.family,member.month,member.partition_id,part.snapshot_id,part.capabilities,
   CASE WHEN member.family='facts' THEN baseline.specification ELSE jsonb_build_array(extraction.mapping) END mappings
  FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
  JOIN mart.analytics_baselines baseline USING(tenant_id) LEFT JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision
 ),events AS (
  SELECT DISTINCT family,'event'::text kind,month period,(month+interval '1 month - 1 day')::date through
  FROM members WHERE family<>'receivables' AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(mappings) mapping,jsonb_array_elements(mapping->'measures') rule
   JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId' WHERE definition.kind='event')
 ),empty_snapshots AS (
  SELECT member.family,'snapshot'::text kind,cutoff.through period,cutoff.through
  FROM members member CROSS JOIN LATERAL (
   SELECT least((member.month+interval '1 month - 1 day')::date,max((release->'period'->>'to')::date)) through
   FROM jsonb_array_elements(member.capabilities->'releases') release
  ) cutoff
  WHERE member.family<>'receivables' AND cutoff.through>=member.month AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(member.mappings) mapping,jsonb_array_elements(mapping->'measures') rule
   JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId' WHERE definition.kind='snapshot')
  AND NOT EXISTS(SELECT 1 FROM mart.prepared_input_rows(selected_tenant,selected_revision,member.family) fact
   WHERE fact.kind='snapshot' AND fact.business_day>=member.month AND fact.business_day<(member.month+interval '1 month')::date)
 ),snapshots AS (
  SELECT family,'snapshot'::text kind,fact.business_day period,fact.business_day through
  FROM (SELECT DISTINCT family FROM members WHERE family<>'receivables') sources
  CROSS JOIN LATERAL mart.prepared_input_rows(selected_tenant,selected_revision,sources.family) fact
  WHERE fact.kind='snapshot' GROUP BY family,fact.business_day
  UNION SELECT sources.family,'snapshot',observation.business_day,observation.business_day
  FROM (SELECT DISTINCT family FROM members) sources
  CROSS JOIN LATERAL mart.prepared_snapshot_observations(selected_tenant,selected_revision,sources.family) observation
 ) SELECT * FROM events UNION SELECT * FROM snapshots UNION SELECT * FROM empty_snapshots
$$;
CREATE FUNCTION mart.prepared_configuration(selected_tenant text,selected_revision text,selected_family text,selected_kind text,selected_period date,selected_through date)
RETURNS jsonb LANGUAGE sql STABLE AS $$
 WITH members AS (
  SELECT member.family,baseline.reporting_currency,evidence.totals,
   CASE member.family WHEN 'facts' THEN baseline.definition_version WHEN 'receivables' THEN evidence.definition_version ELSE extraction.definition_version END definition_version,
   CASE WHEN member.family='facts' THEN baseline.specification ELSE jsonb_build_array(extraction.mapping) END mappings
  FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
  JOIN mart.analytics_baselines baseline USING(tenant_id) LEFT JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  LEFT JOIN mart.finance_snapshot_evidence evidence ON evidence.tenant_id=part.tenant_id AND evidence.snapshot_id=part.snapshot_id
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family
   AND (selected_kind='snapshot' AND member.month<=date_trunc('month',selected_through) OR selected_kind='event' AND member.month=selected_period)
 ),rules AS (
  SELECT rule FROM members,jsonb_array_elements(mappings) mapping,jsonb_array_elements(mapping->'measures') rule
  JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId' WHERE definition.kind=selected_kind
 ),dimensions AS (
  SELECT DISTINCT dimension FROM rules CROSS JOIN LATERAL jsonb_object_keys(rule->'dimensionMappings') dimension WHERE selected_family<>'receivables'
  UNION SELECT 'customer' WHERE selected_family='receivables'
 ),dimension_sets AS (
  SELECT '[]'::jsonb dimensions UNION SELECT jsonb_build_array(dimension) FROM dimensions
  UNION SELECT coalesce(jsonb_agg(dimension ORDER BY dimension),'[]'::jsonb) FROM dimensions
 ),configuration AS (
  SELECT jsonb_build_object('family',selected_family,'kind',selected_kind,'from',selected_period,'through',selected_through,
   'currency',min(reporting_currency),'definitionVersion',min(definition_version),'registryVersion','prepared-v1',
   'snapshotPopulation',(SELECT snapshot_population FROM mart_admin.prepared_source_contracts WHERE family=selected_family AND registry_version='prepared-v1'),
   'measures',CASE WHEN selected_family='receivables' THEN (SELECT jsonb_agg(measure ORDER BY measure) FROM (SELECT DISTINCT measure FROM members CROSS JOIN LATERAL jsonb_object_keys(totals) measure) declared)
    ELSE (SELECT coalesce(jsonb_agg(DISTINCT rule->>'measureId' ORDER BY rule->>'measureId'),'[]'::jsonb) FROM rules) END,
   'grains',(SELECT jsonb_agg(jsonb_build_object('id',dimensions::text,'dimensions',dimensions) ORDER BY dimensions::text) FROM dimension_sets)) value
  FROM members HAVING count(DISTINCT reporting_currency)=1 AND count(DISTINCT definition_version)=1
 ) SELECT value FROM configuration
$$;
CREATE FUNCTION mart.prepared_input_signature(selected_tenant text,selected_revision text,config jsonb)
RETURNS TABLE(fingerprint text,source_cutoff timestamptz) LANGUAGE sql STABLE AS $$
 SELECT encode(sha256(convert_to(config::text||string_agg(member.partition_id,',' ORDER BY member.month),'UTF8')),'hex'),
 max(CASE member.family WHEN 'facts' THEN creator.cutoff WHEN 'receivables' THEN evidence.source_cutoff ELSE extraction.source_cutoff END)
 FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 LEFT JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 LEFT JOIN mart.finance_snapshot_evidence evidence ON evidence.tenant_id=part.tenant_id AND evidence.snapshot_id=part.snapshot_id
 LEFT JOIN LATERAL (SELECT revision.cutoff FROM mart.analytics_serving_members owner JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id)
  WHERE owner.tenant_id=member.tenant_id AND owner.partition_id=member.partition_id AND NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members prior WHERE prior.tenant_id=owner.tenant_id AND prior.revision_id=revision.parent_revision AND prior.partition_id=owner.partition_id) ORDER BY revision.cutoff,revision.revision_id LIMIT 1) creator ON true
 WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=config->>'family'
 AND (config->>'kind'='snapshot' AND member.month<=date_trunc('month',(config->>'through')::date)
  OR config->>'kind'='event' AND member.month=(config->>'from')::date)
 HAVING count(*)>0
$$;
CREATE OR REPLACE FUNCTION mart.guard_prepared_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE config jsonb;signature record; BEGIN
 SELECT configuration INTO STRICT config FROM mart.prepared_datasets WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id;
 IF config IS DISTINCT FROM mart.prepared_configuration(NEW.tenant_id,NEW.revision_id,NEW.family,NEW.kind,NEW.period,(config->>'through')::date) THEN
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
 IF EXISTS(WITH expected AS (SELECT * FROM mart.prepared_expected_cells(NEW.tenant_id,NEW.revision_id,config)),actual AS (
  SELECT time_grain,grain_id,business_date,measure_id,dimensions,value,fact_count,minimum,maximum,data_through,labels,conflicting_labels
  FROM mart.prepared_cells WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id)
  SELECT * FROM ((SELECT * FROM expected EXCEPT ALL SELECT * FROM actual) UNION ALL (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)) delta) THEN
  RAISE EXCEPTION 'Prepared cells differ from canonical inputs';
 END IF;
 IF NEW.statistics IS DISTINCT FROM (SELECT coalesce(jsonb_object_agg(time_grain||':'||grain_id,row_count),'{}'::jsonb) FROM (
  SELECT time_grain,grain_id,count(*) row_count FROM mart.prepared_cells WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id GROUP BY 1,2) counted) THEN
  RAISE EXCEPTION 'Prepared row statistics mismatch';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prepared_binding_exact BEFORE INSERT ON mart.prepared_bindings FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_binding();
REVOKE ALL ON FUNCTION mart.guard_prepared_cells(),mart.guard_prepared_binding() FROM PUBLIC;
CREATE FUNCTION mart.guard_prepared_seal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.registry_version<>'prepared-v1' OR NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id) THEN
  RAISE EXCEPTION 'Prepared registry or input membership missing';
 END IF;
 IF EXISTS(WITH required AS (SELECT family,kind,period,through FROM mart.prepared_required_chunks(NEW.tenant_id,NEW.revision_id)),present AS (
  SELECT binding.family,binding.kind,binding.period,(dataset.configuration->>'through')::date through
  FROM mart.prepared_bindings binding JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
  WHERE binding.tenant_id=NEW.tenant_id AND binding.revision_id=NEW.revision_id)
  SELECT * FROM ((SELECT * FROM required EXCEPT SELECT * FROM present) UNION ALL (SELECT * FROM present EXCEPT SELECT * FROM required)) delta) THEN
  RAISE EXCEPTION 'Prepared revision coverage is incomplete';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prepared_seal_guard BEFORE INSERT ON mart.prepared_revision_seals FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_seal();
CREATE FUNCTION mart.guard_prepared_promotion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.prepared_activation WHERE tenant_id=NEW.tenant_id)
 AND NOT EXISTS(SELECT 1 FROM mart.prepared_revision_seals WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id) THEN
  RAISE EXCEPTION 'Activated serving requires complete prepared revision';
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER prepared_promotion_guard AFTER INSERT OR UPDATE ON mart.analytics_trusted_serving DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_promotion();
REVOKE ALL ON FUNCTION mart.prepared_required_chunks(text,text),mart.prepared_configuration(text,text,text,text,date,date),mart.prepared_input_signature(text,text,jsonb),mart.guard_prepared_seal(),mart.guard_prepared_promotion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_required_chunks(text,text),mart.prepared_configuration(text,text,text,text,date,date),mart.prepared_input_signature(text,text,jsonb) TO dabboos_ingestor;

CREATE FUNCTION mart.guard_prepared_activation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.prepared_bindings binding WHERE binding.tenant_id=NEW.tenant_id AND binding.revision_id=NEW.initial_revision
  AND (SELECT coalesce(sum(value::bigint),0) FROM jsonb_each_text(binding.statistics))>NEW.max_cells_per_chunk)
 OR (SELECT count(*) FROM mart.prepared_bindings WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.initial_revision)>NEW.max_chunks THEN
  RAISE EXCEPTION 'Activation storage bounds do not cover validated inputs';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted WHERE trusted.tenant_id=NEW.tenant_id AND trusted.revision_id=NEW.initial_revision) THEN
  RAISE EXCEPTION 'Activation requires the current prepared revision';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prepared_activation_guard BEFORE INSERT ON mart.prepared_activation FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_activation();
REVOKE ALL ON FUNCTION mart.guard_prepared_activation() FROM PUBLIC;
