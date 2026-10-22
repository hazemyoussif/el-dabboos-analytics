-- An event edit must not invalidate every later snapshot simply because the
-- shared Business member has a new ID. Follow parents while this kind's payloads
-- and snapshot observation days are unchanged. Configuration remains in the hash.
CREATE FUNCTION mart.business_prepared_input_partition(selected_tenant text,selected_partition text,selected_kind text)
 RETURNS text LANGUAGE sql STABLE AS $$
 WITH RECURSIVE inputs(partition_id,depth) AS (
  SELECT selected_partition,0 WHERE selected_tenant=nullif(current_setting('mart.tenant_id',true),'')
  UNION ALL SELECT origin.base_partition,inputs.depth+1 FROM inputs
  JOIN mart.business_delta_storage sparse ON sparse.tenant_id=selected_tenant AND sparse.partition_id=inputs.partition_id
  JOIN mart.business_delta_origins origin ON origin.tenant_id=selected_tenant AND origin.partition_id=inputs.partition_id
  JOIN mart.review_extractions extraction ON extraction.tenant_id=selected_tenant AND extraction.partition_id=inputs.partition_id
  WHERE NOT EXISTS(SELECT 1 FROM mart.business_delta_replacements replaced,
   LATERAL jsonb_array_elements(extraction.mapping->'measures') rule JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId'
   WHERE replaced.tenant_id=selected_tenant AND replaced.partition_id=inputs.partition_id
   AND rule->>'sourceObject'=replaced.source_object AND definition.kind=selected_kind)
  AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') rule
   JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId'
   CROSS JOIN LATERAL mart.business_measure_observation(selected_tenant,inputs.partition_id,rule->>'measureId') observed
   LEFT JOIN LATERAL mart.business_measure_observation(selected_tenant,origin.base_partition,rule->>'measureId') previous ON true
   WHERE selected_kind='snapshot' AND definition.kind=selected_kind AND observed.business_day IS DISTINCT FROM previous.business_day)
 ) SELECT partition_id FROM inputs ORDER BY depth DESC LIMIT 1
$$;
REVOKE ALL ON FUNCTION mart.business_prepared_input_partition(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_prepared_input_partition(text,text,text) TO dabboos_ingestor;

ALTER FUNCTION mart.prepared_input_signature(text,text,jsonb) RENAME TO prepared_complete_input_signature;
CREATE FUNCTION mart.prepared_input_signature(selected_tenant text,selected_revision text,config jsonb)
 RETURNS TABLE(fingerprint text,source_cutoff timestamptz) LANGUAGE sql STABLE AS $$
 SELECT encode(sha256(convert_to(config::text||string_agg(mart.business_prepared_input_partition(selected_tenant,member.partition_id,config->>'kind'),',' ORDER BY member.month),'UTF8')),'hex'),
  max(extraction.source_cutoff)
 FROM mart.analytics_serving_members member JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 WHERE config->>'family'='business' AND member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='business'
 AND (config->>'kind'='snapshot' AND member.month<=date_trunc('month',(config->>'through')::date)
  OR config->>'kind'='event' AND member.month=(config->>'from')::date) HAVING count(*)>0
 UNION ALL SELECT * FROM mart.prepared_complete_input_signature(selected_tenant,selected_revision,config) WHERE config->>'family'<>'business'
$$;
REVOKE ALL ON FUNCTION mart.prepared_input_signature(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_input_signature(text,text,jsonb) TO dabboos_ingestor;
