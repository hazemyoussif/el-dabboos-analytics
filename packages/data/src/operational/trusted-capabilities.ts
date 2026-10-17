import type {PoolClient} from 'pg';
import type {AnalyticsQuery,PublishedAnalyticsCapabilities,PublishedAnalyticsRelease,PublishedMetricCapability} from '@el-dabboos/domain';
import {semanticCatalog} from '@el-dabboos/domain';
import {monthEnd} from '../calendar.ts';
import {dailyEventCapabilities} from './daily-capabilities.ts';

/** Only immutable members of the current revision contribute capability and coverage. */
export async function trustedFactCapabilities(client:PoolClient,tenantId:string,through:string):Promise<PublishedAnalyticsCapabilities> {
 const rows=(await client.query<{month:string;capabilities:PublishedAnalyticsCapabilities}>(`SELECT to_char(member.month,'YYYY-MM') AS month,part.capabilities
 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id) WHERE trusted.tenant_id=$1 AND member.family='facts' ORDER BY month`,[tenantId])).rows;
 const metrics=[...new Set(rows.flatMap(row=>row.capabilities.releases.flatMap(release=>release.capabilities.map(capability=>capability.metric))))];
 const releases:PublishedAnalyticsRelease[]=metrics.map(metric=>{
  const peers=rows.flatMap(row=>row.capabilities.releases.flatMap(release=>release.capabilities.filter(capability=>capability.metric===metric).map(capability=>({month:row.month,release,capability}))));
  const first=peers[0]!,last=peers.at(-1)!,semantics=semanticCatalog[metric].semantics;
  const snapshot=semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';
  const end=monthEnd(last.month),to=snapshot||end<through?end:through;
  return {...first.release,period:{from:snapshot?monthEnd(first.month):first.month+'-01',to},selectionSemantics:snapshot?'latest_snapshot':'event_intersection',capabilities:[commonCapability(peers.map(peer=>peer.capability))]};
 });
 return dailyEventCapabilities(client,tenantId,{tenantId,mode:'certified',releases});
}
function commonCapability(peers:PublishedMetricCapability[]):PublishedMetricCapability {
 const first=peers[0]!;
 return {...first,dimensions:first.dimensions.filter(dimension=>peers.every(peer=>peer.dimensions.includes(dimension))),analyses:first.analyses.filter(analysis=>peers.every(peer=>peer.analyses.includes(analysis)))};
}
export async function trustedMetricMonths(client:PoolClient,tenantId:string,metric:AnalyticsQuery['metric']):Promise<string[]> {
 const rows=(await client.query(`SELECT DISTINCT to_char(member.month,'YYYY-MM') AS month
 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id),jsonb_array_elements(part.capabilities->'releases') release,jsonb_array_elements(release->'capabilities') capability
 WHERE trusted.tenant_id=$1 AND member.family='facts' AND capability->>'metric'=$2 ORDER BY month`,[tenantId,metric])).rows;
 return rows.map(row=>String(row.month));
}
