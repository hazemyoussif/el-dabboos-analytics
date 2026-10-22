import {salesCommandDefinitionVersion} from '../business/sales-command-mapping.ts';
import type {PoolClient} from 'pg';
import type {AnalyticsContext,AnalyticsQuery,PublishedAnalyticsCapabilities,PublishedAnalyticsRelease} from '@el-dabboos/domain';
import {businessEventWindows} from '../business/history.ts';
import {businessDefinitionVersion} from '../business/definitions.ts';
import {observedBusinessReleases} from '../business/observations.ts';
import type {SourceMapping} from '@el-dabboos/domain';
import {reviewMetrics,productReviewMetrics,reviewDefinitionVersion} from './definitions.ts';
export async function reviewPublication(client:PoolClient,context:AnalyticsContext,family:'review'|'business'):Promise<{revision:string|undefined;releases:PublishedAnalyticsRelease[]}> {
 const rows=(await client.query(`SELECT trusted.revision_id,part.capabilities,extraction.definition_version,extraction.mapping,extraction.mapping->>'mappingId' mapping_id,extraction.mapping->>'mappingVersion' mapping_version,
  (SELECT jsonb_agg(jsonb_build_object('object',recipe.object,'cutoff',recipe.cutoff,'day',recipe.day)) FROM (
   SELECT DISTINCT rule->>'sourceObject' object,observation.source_cutoff cutoff,observation.business_day::text AS "day"
   FROM jsonb_array_elements(extraction.mapping->'measures') rule
   CROSS JOIN LATERAL mart.business_measure_observation(extraction.tenant_id,extraction.partition_id,rule->>'measureId') observation
  ) recipe) observations
 FROM mart.analytics_trusted_serving trusted
 LEFT JOIN mart.analytics_serving_members member ON member.tenant_id=trusted.tenant_id AND member.revision_id=trusted.revision_id AND member.family=$2
 LEFT JOIN mart.analytics_partitions part ON part.tenant_id=member.tenant_id AND part.partition_id=member.partition_id
 LEFT JOIN mart.review_extractions extraction ON extraction.tenant_id=member.tenant_id AND extraction.partition_id=member.partition_id
 WHERE trusted.tenant_id=$1 ORDER BY member.month`,[context.tenantId,family])).rows;
 const exposed=rows.filter(row=>row.capabilities!==null).flatMap(row=>{
  if(row.definition_version!==(family==='business'?businessDefinitionVersion:reviewDefinitionVersion)())throw new Error('Explicit review definition migration required');
  const currentCommand=row.mapping_id==='business-purpose-v1-sales-command'&&row.mapping_version===salesCommandDefinitionVersion();
  const releases=(row.capabilities as PublishedAnalyticsCapabilities).releases;
  const observed=family==='business'?releases.flatMap(release=>observedBusinessReleases(release,row.mapping as SourceMapping,row.observations)):releases;
  return observed.map(release=>({...release,capabilities:release.capabilities.filter(capability=>(!capability.metric.startsWith('command_')||currentCommand)&&(context.enforcedFilters??[]).every(filter=>capability.dimensions.includes(filter.dimension)))}));
 });
 return {revision:rows[0]?.revision_id,releases:family==='business'?[...exposed,...businessEventWindows(exposed)]:exposed};
}

export function reviewQuery(query:AnalyticsQuery,context:AnalyticsContext) {
 return reviewMetrics.includes(query.metric)||productReviewMetrics.includes(query.metric)&&[query.groupBy,...(query.filters??[]).map(filter=>filter.dimension),...(context.enforcedFilters??[]).map(filter=>filter.dimension)].some(dimension=>dimension==='product'||dimension==='product_category');
}
