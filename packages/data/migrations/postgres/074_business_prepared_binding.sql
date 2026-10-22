-- Validate Business sparse datasets against their accepted parent and scoped
-- canonical replacements. Existing complete and other-family checks are retained.
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
  IF NEW.family<>'business' OR NOT mart.business_prepared_delta_exact(NEW.tenant_id,NEW.revision_id,config,NEW.data_id) THEN
   RAISE EXCEPTION 'Business prepared replacements differ from affected canonical outputs';
  END IF;
  IF NEW.statistics IS DISTINCT FROM mart.business_prepared_statistics(NEW.tenant_id,NEW.data_id) THEN
   RAISE EXCEPTION 'Business prepared delta statistics mismatch';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.kind='snapshot' AND config->>'snapshotPopulation'='complete' AND NOT mart.prepared_complete_controls_exact(NEW.tenant_id,NEW.revision_id,config,NEW.data_id) THEN
  RAISE EXCEPTION 'Complete prepared population differs from independent source controls';
 END IF;
 IF NEW.kind='snapshot' AND EXISTS(SELECT 1 FROM mart.prepared_input_rows(NEW.tenant_id,NEW.revision_id,NEW.family) source
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
