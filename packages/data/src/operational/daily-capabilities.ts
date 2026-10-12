import type {PoolClient} from 'pg';
import type {PublishedAnalyticsCapabilities,SourceMapping,MetricId,DimensionId} from '@el-dabboos/domain';
import {semanticCatalog,requiredMeasures,timeDimensions} from '@el-dabboos/domain';
/** Complete joint-tuple proofs expose source-defined dimensions without a separate business sign-off per grouping. */
export async function dailyEventCapabilities(client:PoolClient,tenantId:string,capabilities:PublishedAnalyticsCapabilities):Promise<PublishedAnalyticsCapabilities> {
 const row=(await client.query(`SELECT baseline.specification,
 EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 WHERE trusted.tenant_id=baseline.tenant_id AND member.family='facts') AND
 NOT EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted JOIN (SELECT * FROM mart.analytics_serving_members WHERE family='facts') member USING(tenant_id,revision_id)
 LEFT JOIN mart.analytics_aggregate_proofs proof USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=baseline.tenant_id AND (proof.partition_id IS NULL OR proof.definition_version<>baseline.definition_version
 OR proof.mapping_version<>baseline.mapping_version OR proof.business_timezone<>baseline.specification->0->'measures'->0->>'timeZone')) proved
 FROM mart.analytics_baselines baseline WHERE baseline.tenant_id=$1`,[tenantId])).rows[0];
 if(!row?.proved)return capabilities;
 const mappings=row.specification as SourceMapping[];
 return {...capabilities,releases:capabilities.releases.map(release=>({...release,capabilities:release.capabilities.map(capability=>
  dailyEventMetric(capability.metric)?{...capability,dimensions:[...new Set([...capability.dimensions,...mappedEventDimensions(capability.metric,mappings)])]}:capability
 )}))};
}
function mappedEventDimensions(metric:MetricId,mappings:readonly SourceMapping[]):DimensionId[] {
 return semanticCatalog[metric].dimensions.filter(dimension=>timeDimensions.includes(dimension)||requiredMeasures(metric).every(measure=>{
  const rules=mappings.flatMap(mapping=>mapping.measures.filter(rule=>rule.measureId===measure));
  return rules.length>0&&rules.every(rule=>Object.hasOwn(rule.dimensionMappings,dimension));
 }));
}

function dailyEventMetric(metric:MetricId){const semantics=semanticCatalog[metric].semantics;return semantics.kind==='additive'||semantics.kind==='distinct_count'||semantics.kind==='ratio'&&semantics.basis!=='snapshot';}
