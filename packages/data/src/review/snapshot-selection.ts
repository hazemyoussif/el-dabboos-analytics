/** Parameters: tenant, required measures, cutoff day, serving family, definition version.
 * Select the latest accepted complete observation per measure before dimension/policy filters.
 * Validated snapshots have one contribution per entity/measure/day. The bounded lookup prevents
 * the planner from replacing latest-row fetches with a second scan of all historical envelopes.
 */
export const reviewSnapshotBase=`WITH published_partitions AS MATERIALIZED (
 SELECT member.partition_id,member.month,part.capabilities,extraction.mapping FROM mart.analytics_trusted_serving trusted
 JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family=$4 AND extraction.definition_version=$5
 AND member.month<=date_trunc('month',$3::date)
 ),observations AS MATERIALIZED (
 SELECT DISTINCT ON(control.measure_id) control.measure_id,published.partition_id,
 observation.business_day::text business_day
 FROM published_partitions published JOIN mart.review_controls control ON control.tenant_id=$1 AND control.partition_id=published.partition_id
 CROSS JOIN LATERAL mart.business_measure_observation($1,published.partition_id,control.measure_id) observation
 WHERE control.scope_key='summary' AND control.measure_id=ANY($2::text[])
 AND observation.business_day<=$3::date
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(published.mapping->'measures') rule WHERE rule->>'measureId'=control.measure_id)
 ORDER BY control.measure_id,business_day DESC
 ),identities AS MATERIALIZED (
 SELECT DISTINCT ON(fact.measure_id,fact.entity_id) fact.tenant_id,fact.partition_id,fact.measure_id,fact.entity_id,fact.business_day
 FROM mart.review_fact_population fact WHERE fact.tenant_id=$1 AND fact.measure_id=ANY($2::text[]) AND fact.entity_id IS NOT NULL
 AND fact.business_day<=$3::text AND fact.partition_id=ANY(ARRAY(SELECT partition_id FROM published_partitions))
 ORDER BY fact.measure_id,fact.entity_id,fact.business_day DESC
 ),latest AS MATERIALIZED (
 SELECT identities.* FROM identities JOIN observations observation ON identities.partition_id=observation.partition_id
 AND identities.measure_id=observation.measure_id AND identities.business_day=observation.business_day
 ),base AS (
 SELECT latest.measure_id,operand.* FROM latest JOIN LATERAL (
 SELECT fact.amount value,fact.dimensions,fact.display_labels labels,fact.business_day business_date
 FROM mart.review_fact_population fact WHERE fact.tenant_id=latest.tenant_id AND fact.partition_id=latest.partition_id
 AND fact.measure_id=latest.measure_id AND fact.entity_id=latest.entity_id AND fact.business_day=latest.business_day
 LIMIT 1
 ) operand ON true
 )`;
