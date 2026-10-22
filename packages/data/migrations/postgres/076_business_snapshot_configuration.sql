-- Mixed Business recipe dates do not establish an earlier observation for a
-- newly observed snapshot measure. Keep every other family/basis rule unchanged.
CREATE OR REPLACE FUNCTION mart.prepared_configuration(selected_tenant text,selected_revision text,selected_family text,selected_kind text,selected_period date,selected_through date)
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
  AND (selected_family<>'business' OR selected_kind<>'snapshot' OR EXISTS(
   SELECT 1 FROM mart.prepared_snapshot_observations(selected_tenant,selected_revision,'business') observation
   WHERE observation.measure_id=rule->>'measureId' AND observation.business_day<=selected_through))
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
