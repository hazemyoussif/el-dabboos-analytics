-- Select published observations first, then follow only each selected partition's
-- immutable ancestry. Never expand the shared all-history population view.
CREATE OR REPLACE FUNCTION mart.prepared_work_complete_snapshot_rows(selected_tenant text,selected_revision text,selected_family text,selected_through date)
RETURNS TABLE(measure_id text,kind text,business_day date,entity_id text,amount numeric,dimensions jsonb,labels jsonb,item_count bigint)
LANGUAGE sql STABLE AS $$
 WITH RECURSIVE observations AS MATERIALIZED (
  SELECT DISTINCT ON(measure_id) measure_id,business_day
  FROM mart.prepared_snapshot_observations(selected_tenant,selected_revision,selected_family)
  WHERE selected_family IN ('review','business') AND business_day<=selected_through
  ORDER BY measure_id,business_day DESC
 ), roots AS MATERIALIZED (
  SELECT member.partition_id,observation.measure_id,observation.business_day
  FROM observations observation JOIN mart.analytics_serving_members member
   ON member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family=selected_family
   AND member.month=date_trunc('month',observation.business_day)::date
 ), lineage(root_partition,partition_id,measure_id,business_day,depth) AS (
  SELECT partition_id,partition_id,measure_id,business_day,0 FROM roots
  UNION ALL
  SELECT lineage.root_partition,origin.base_partition,lineage.measure_id,lineage.business_day,lineage.depth+1
  FROM lineage JOIN mart.business_delta_storage sparse ON sparse.tenant_id=selected_tenant AND sparse.partition_id=lineage.partition_id
  JOIN mart.business_delta_origins origin ON origin.tenant_id=selected_tenant AND origin.partition_id=lineage.partition_id
 )
 SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint
 FROM lineage JOIN mart.review_facts fact ON fact.tenant_id=selected_tenant AND fact.partition_id=lineage.partition_id
  AND fact.measure_id=lineage.measure_id AND fact.business_day=to_char(lineage.business_day,'YYYY-MM-DD')
 WHERE fact.payload->>'kind'='snapshot' AND NOT EXISTS(
  SELECT 1 FROM lineage newer JOIN mart.business_delta_replacements replaced
   ON replaced.tenant_id=selected_tenant AND replaced.partition_id=newer.partition_id
  WHERE newer.root_partition=lineage.root_partition AND newer.measure_id=lineage.measure_id AND newer.depth<lineage.depth
   AND replaced.source_object=fact.payload->>'sourceObject' AND replaced.source_record_id=fact.payload->>'sourceRecordId'
 )
$$;
REVOKE ALL ON FUNCTION mart.prepared_work_complete_snapshot_rows(text,text,text,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_work_complete_snapshot_rows(text,text,text,date) TO dabboos_ingestor;

-- Retain identity validation at every accepted observation, using the same
-- bounded reader instead of reopening the unscoped population view.
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
