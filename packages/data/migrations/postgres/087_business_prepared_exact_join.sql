-- Compare unique cell identities in separate bounded statements. Expected keys
-- are distinct, expected cells are grouped, and physical identities are primary
-- keys. Compare dimensions and every nullable payload field exactly as before.
CREATE OR REPLACE FUNCTION mart.business_prepared_delta_exact(selected_tenant text,selected_revision text,config jsonb,selected_data text)
 RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE base_config jsonb;
BEGIN
 SELECT parent.configuration INTO base_config FROM mart.business_prepared_origins origin
 JOIN mart.prepared_datasets parent ON parent.tenant_id=origin.tenant_id AND parent.data_id=origin.base_data_id
 WHERE origin.tenant_id=selected_tenant AND origin.data_id=selected_data AND origin.revision_id=selected_revision;
 IF base_config IS NULL THEN RETURN false; END IF;
 IF EXISTS(WITH expected AS MATERIALIZED (
   SELECT * FROM mart.business_prepared_affected_keys(selected_tenant,selected_revision,config,base_config)
  ),actual AS MATERIALIZED (
   SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key
   FROM mart.business_prepared_keys WHERE tenant_id=selected_tenant AND data_id=selected_data
  ) SELECT 1 FROM expected FULL JOIN actual USING(time_grain,grain_id,business_date,measure_id,dimension_key)
  WHERE expected.measure_id IS NULL OR actual.measure_id IS NULL OR expected.dimensions IS DISTINCT FROM actual.dimensions)
 THEN RETURN false; END IF;
 IF EXISTS(WITH expected AS MATERIALIZED (
   SELECT * FROM mart.business_prepared_replacement_cells(selected_tenant,selected_revision,config,base_config)
  ),actual AS MATERIALIZED (
   SELECT time_grain,grain_id,business_date,measure_id,dimensions,dimension_key,value,fact_count,minimum,maximum,data_through,labels,conflicting_labels
   FROM mart.prepared_cells WHERE tenant_id=selected_tenant AND data_id=selected_data
  ) SELECT 1 FROM expected FULL JOIN actual USING(time_grain,grain_id,business_date,measure_id,dimension_key)
  WHERE expected.measure_id IS NULL OR actual.measure_id IS NULL
  OR ROW(expected.dimensions,expected.value,expected.fact_count,expected.minimum,expected.maximum,expected.data_through,expected.labels,expected.conflicting_labels)
   IS DISTINCT FROM ROW(actual.dimensions,actual.value,actual.fact_count,actual.minimum,actual.maximum,actual.data_through,actual.labels,actual.conflicting_labels))
 THEN RETURN false; END IF;
 RETURN mart.business_prepared_controls_exact(selected_tenant,selected_revision,config,selected_data);
END $$;
