import type {PoolClient} from 'pg';
import {semanticCatalog} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {receivableMeasures} from '../receivable-aging.ts';
export async function financeCapabilities(client:PoolClient,context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities|null>{
   const row=(await client.query(`SELECT min(publication.snapshot_date)::text first,max(publication.snapshot_date)::text last,
    baseline.source_id,baseline.mapping_version,baseline.definition_version,baseline.specification,baseline.capabilities,trusted.revision_id
    FROM mart.trusted_finance_snapshots publication JOIN mart.analytics_baselines baseline USING(tenant_id)
    JOIN mart.analytics_trusted_serving trusted USING(tenant_id)
    WHERE publication.tenant_id=$1 GROUP BY baseline.tenant_id,trusted.revision_id`,[context.tenantId])).rows[0];
   if(!row)return null;
   const mappings=row.specification as import('@el-dabboos/domain').SourceMapping[];
   const approved=(row.capabilities as PublishedAnalyticsCapabilities).releases.flatMap(release=>release.capabilities);
   const capabilities=mappings.flatMap(mapping=>mapping.capabilities).filter(capability=>financeMetric(capability.metric)).flatMap(capability=>{
    const peers=approved.filter(peer=>peer.metric===capability.metric);
    return (peers.length?peers:[{metric:capability.metric,summary:true,dimensions:[],analyses:[]}]).map(peer=>({
     ...peer,
     dimensions:semanticCatalog[capability.metric].dimensions.filter(dimension=>dimension==='customer'||dimension==='month'),
     analyses:peer.analyses.filter(analysis=>analysis==='ranking'||analysis==='topN'),
    }));
   });
   return {tenantId:context.tenantId,mode:'certified',releases:[{datasetId:row.revision_id,sourceId:row.source_id,
    mappingId:'trusted-receivables',mappingVersion:row.mapping_version,certificationReference:row.definition_version,
    period:{from:row.first,to:row.last},selectionSemantics:'latest_snapshot',
    capabilities}]};
}
export function financeMetric(metric:AnalyticsQuery['metric']){return (receivableMeasures as readonly string[]).includes(metric)||metric==='overdue_receivable_percentage';}
