-- Forward-only exact proof optimization; retains every population/content check.
-- Canonical reduction produces unique (grain, date, measure, dimensions) keys.
-- The stored primary key is unique. All canonical keys/content must match, and
-- equal cardinality rejects extra stored cells. No digest substitutes for values.
CREATE FUNCTION mart.prepared_cells_exact(selected_tenant text,selected_revision text,config jsonb,selected_data text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH compared AS (
  SELECT count(*) expected_count,bool_and(actual.measure_id IS NOT NULL AND
   ROW(expected.dimensions,expected.value,expected.fact_count,expected.minimum,expected.maximum,expected.data_through,expected.labels,expected.conflicting_labels)
   IS NOT DISTINCT FROM
   ROW(actual.dimensions,actual.value,actual.fact_count,actual.minimum,actual.maximum,actual.data_through,actual.labels,actual.conflicting_labels)) exact
  FROM mart.prepared_expected_cells(selected_tenant,selected_revision,config) expected
  LEFT JOIN mart.prepared_cells actual ON actual.tenant_id=selected_tenant AND actual.data_id=selected_data
   AND actual.time_grain=expected.time_grain AND actual.grain_id=expected.grain_id
   AND actual.business_date=expected.business_date AND actual.measure_id=expected.measure_id
   AND actual.dimension_key=encode(sha256(convert_to(expected.dimensions::text,'UTF8')),'hex')
   AND actual.dimensions=expected.dimensions
 ) SELECT coalesce(exact,true) AND expected_count=(SELECT count(*) FROM mart.prepared_cells WHERE tenant_id=selected_tenant AND data_id=selected_data)
 FROM compared
$$;
REVOKE ALL ON FUNCTION mart.prepared_cells_exact(text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_cells_exact(text,text,jsonb,text) TO dabboos_ingestor;

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
 IF NOT mart.prepared_cells_exact(NEW.tenant_id,NEW.revision_id,config,NEW.data_id) THEN
  RAISE EXCEPTION 'Prepared cells differ from canonical inputs';
 END IF;
 IF NEW.statistics IS DISTINCT FROM (SELECT coalesce(jsonb_object_agg(time_grain||':'||grain_id,row_count),'{}'::jsonb) FROM (
  SELECT time_grain,grain_id,count(*) row_count FROM mart.prepared_cells WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id GROUP BY 1,2) counted) THEN
  RAISE EXCEPTION 'Prepared row statistics mismatch';
 END IF;
 RETURN NEW;
END $$;
