-- Coverage discovery consumes accepted manifest/aggregate metadata, never raw envelopes.
CREATE OR REPLACE FUNCTION mart.prepared_required_chunks(selected_tenant text,selected_revision text)
RETURNS TABLE(family text,kind text,period date,through date) LANGUAGE sql STABLE AS $$
 WITH members AS MATERIALIZED (
  SELECT member.family,member.month,member.partition_id,part.capabilities,
   CASE WHEN member.family='facts' THEN baseline.specification ELSE jsonb_build_array(extraction.mapping) END mappings
  FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
  JOIN mart.analytics_baselines baseline USING(tenant_id) LEFT JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision
 ),events AS (
  SELECT DISTINCT family,'event'::text kind,month period,(month+interval '1 month - 1 day')::date through
  FROM members WHERE family<>'receivables' AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(mappings) mapping,jsonb_array_elements(mapping->'measures') rule
   JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId' WHERE definition.kind='event')
 ),fact_cutoffs AS MATERIALIZED (
  SELECT DISTINCT member.month,base.business_date
  FROM members member JOIN mart.analytics_aggregate_bases base ON base.tenant_id=selected_tenant AND base.partition_id=member.partition_id
  WHERE member.family='facts' AND base.kind='snapshot'
 ),snapshots AS (
  SELECT 'facts'::text family,'snapshot'::text kind,business_date period,business_date through FROM fact_cutoffs
  UNION SELECT sources.family,'snapshot',observation.business_day,observation.business_day
  FROM (SELECT DISTINCT family FROM members WHERE family<>'facts') sources
  CROSS JOIN LATERAL mart.prepared_snapshot_observations(selected_tenant,selected_revision,sources.family) observation
 ),empty_facts AS (
  SELECT member.family,'snapshot'::text kind,cutoff.through period,cutoff.through
  FROM members member CROSS JOIN LATERAL (
   SELECT least((member.month+interval '1 month - 1 day')::date,max((release->'period'->>'to')::date)) through
   FROM jsonb_array_elements(member.capabilities->'releases') release
  ) cutoff
  WHERE member.family='facts' AND cutoff.through>=member.month AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(member.mappings) mapping,jsonb_array_elements(mapping->'measures') rule
   JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId' WHERE definition.kind='snapshot')
  AND NOT EXISTS(SELECT 1 FROM fact_cutoffs WHERE month=member.month)
 ) SELECT * FROM events UNION SELECT * FROM snapshots UNION SELECT * FROM empty_facts
$$;
