/** Parameters: tenant, required measures, cutoff day, serving family, definition version.
 * Freeze eligible identities before dimension/policy filters; later fetches stay in that partition.
 * Validated snapshots have one contribution per entity/measure/day. The bounded lookup prevents
 * the planner from replacing latest-row fetches with a second scan of all historical envelopes.
 */
export const reviewSnapshotBase=`WITH published_partitions AS MATERIALIZED (
 SELECT member.partition_id FROM mart.analytics_trusted_serving trusted
 JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family=$4 AND extraction.definition_version=$5
 AND member.month<=date_trunc('month',$3::date)
 ),latest AS MATERIALIZED (
 SELECT DISTINCT ON(fact.measure_id,fact.entity_id) fact.tenant_id,fact.partition_id,fact.measure_id,fact.entity_id,fact.business_day
 FROM mart.review_facts fact
 WHERE fact.tenant_id=$1 AND fact.measure_id=ANY($2::text[]) AND fact.entity_id IS NOT NULL
 AND fact.business_day<=$3::text AND fact.partition_id=ANY(ARRAY(SELECT partition_id FROM published_partitions))
 ORDER BY fact.measure_id,fact.entity_id,fact.business_day DESC
 ),base AS (
 SELECT latest.measure_id,operand.* FROM latest JOIN LATERAL (
 SELECT fact.amount value,fact.dimensions,fact.display_labels labels,fact.business_day business_date
 FROM mart.review_facts fact WHERE fact.tenant_id=latest.tenant_id AND fact.partition_id=latest.partition_id
 AND fact.measure_id=latest.measure_id AND fact.entity_id=latest.entity_id AND fact.business_day=latest.business_day
 LIMIT 1
 ) operand ON true
 )`;
