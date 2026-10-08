import type {PoolClient} from 'pg';
import type {PublishedAnalyticsCapabilities,SourceMapping,MetricId} from '@el-dabboos/domain';
import {semanticCatalog} from '@el-dabboos/domain';
/** Exact daily proofs extend technical time grouping, never business definitions or policy dimensions. */
export async function dailyEventCapabilities(client:PoolClient,tenantId:string,capabilities:PublishedAnalyticsCapabilities):Promise<PublishedAnalyticsCapabilities> {
 const row=(await client.query(`SELECT baseline.specification,
 NOT EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 LEFT JOIN mart.analytics_aggregate_proofs proof USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=baseline.tenant_id AND (proof.partition_id IS NULL OR proof.definition_version<>baseline.definition_version
 OR proof.mapping_version<>baseline.mapping_version OR proof.business_timezone<>baseline.specification->0->'measures'->0->>'timeZone')) proved
 FROM mart.analytics_baselines baseline WHERE baseline.tenant_id=$1`,[tenantId])).rows[0];
 if(!row?.proved)return capabilities;
 const mappings=row.specification as SourceMapping[];
 const daily=new Set(mappings.flatMap(mapping=>mapping.capabilities.filter(capability=>capability.dimensions.includes('date')).map(capability=>capability.metric)));
 return {...capabilities,releases:capabilities.releases.map(release=>({...release,capabilities:release.capabilities.map(capability=>
 daily.has(capability.metric)&&dailyEventMetric(capability.metric)&&capability.dimensions.includes('month')&&!capability.dimensions.includes('date')?{...capability,dimensions:[...capability.dimensions,'date' as const]}:capability
 )}))};
}
function dailyEventMetric(metric:MetricId){const semantics=semanticCatalog[metric].semantics;return semantics.kind==='additive'||semantics.kind==='distinct_count'||semantics.kind==='ratio'&&semantics.basis!=='snapshot';}
