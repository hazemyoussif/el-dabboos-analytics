import type { Pool } from 'pg';
import type { AnalyticsContext, PublishedAnalyticsRelease, PublishedMetricCapability, MetricId } from '@el-dabboos/domain';
import { semanticCatalog } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';
import { certifiedMapping } from './mapping-releases.ts';
import { projectPublishedRelease } from './published-capabilities.ts';
import type { PublishedReconciliationCoverage } from './published-capabilities.ts';
import {readDerivedCoverage} from './read-derived-coverage.ts';

export interface HistoricalCollection {
  reference:string; from:string; to:string;
  members:{datasetId:string;from:string;to:string;kind:'events'|'aging';release:PublishedAnalyticsRelease}[];
  release:PublishedAnalyticsRelease;
}
/** Membership alone is insufficient: intersect currently proven output pairs across every month. */
export async function readHistoricalCollection(pool:Pool,context:AnalyticsContext,metrics?:readonly MetricId[]):Promise<HistoricalCollection|null> {
  return tenantTransaction(pool,context.tenantId,async client=>{
    const rows=(await client.query(`SELECT binding.reference,binding.period_from::text coverage_from,binding.period_to::text coverage_to,
      member.period_from::text member_from,member.period_to::text member_to,member.kind,mapping.*
      FROM mart.historical_serving_bindings binding JOIN mart.historical_release_members member USING(tenant_id,reference)
      JOIN mart.mapping_releases mapping USING(tenant_id,dataset_id) WHERE binding.tenant_id=$1 ORDER BY member.period_from,member.kind`,[context.tenantId])).rows;
    if (!rows.length) return null;
    const coverage=(await client.query<PublishedReconciliationCoverage & {dataset_id:string}>(`SELECT member.dataset_id,coverage.*
      FROM mart.historical_serving_bindings binding JOIN mart.historical_release_members member USING(tenant_id,reference)
      CROSS JOIN LATERAL mart.published_reconciliation_coverage($1,member.dataset_id) coverage WHERE binding.tenant_id=$1`,[context.tenantId])).rows;
    const members:HistoricalCollection['members']=[];
    for (const row of rows) {
      const mapping=certifiedMapping(row);
      const derived=await readDerivedCoverage(client,context.tenantId,row.dataset_id,{metrics:mapping.capabilities.filter(capability=>semanticCatalog[capability.metric].semantics.kind==='ratio' && (!metrics || metrics.includes(capability.metric))).map(capability=>capability.metric)});
      const projected=projectPublishedRelease(mapping,coverage.filter(control=>control.dataset_id===row.dataset_id),context,derived);
      const release=projected.releases.find(release=>release.period?.to===row.member_to);
      if (!release) throw new Error('Historical monthly proof unavailable');
      members.push({datasetId:row.dataset_id as string,from:row.member_from as string,to:row.member_to as string,kind:row.kind as 'events'|'aging',release});
    }
    const first=new Date(rows[0].coverage_from),last=new Date(rows[0].coverage_to);
    const expectedMonths=(last.getUTCFullYear()-first.getUTCFullYear())*12+last.getUTCMonth()-first.getUTCMonth()+1;
    if (members.length!==expectedMonths*2 || new Set(members.map(member=>`${member.from}/${member.kind}`)).size!==members.length) throw new Error('Historical collection scope conflict');
    const events=members.filter(member=>member.kind==='events');
    const capabilities:PublishedMetricCapability[]=events[0]!.release.capabilities.flatMap(capability=>{
      const semantics=semanticCatalog[capability.metric].semantics;
      if (semantics.kind!=='additive' && !(semantics.kind==='ratio' && semantics.basis!=='snapshot')) return [];
      const peers=events.map(member=>member.release.capabilities.find(peer=>peer.metric===capability.metric));
      if (peers.some(peer=>!peer?.summary)) return [];
      const dimensions=capability.dimensions.filter(dimension=>peers.every(peer=>peer!.dimensions.includes(dimension)));
      return [{metric:capability.metric,summary:true,dimensions:[...new Set([...dimensions,'month' as const])],analyses:['comparison','movingAverage','runningTotal','percentageContribution','ranking','topN'],comparisons:['month_over_month'],analysisDimensions:{comparison:['month'],movingAverage:['month']},movingAverageWindows:[3,6].filter(window=>window<=events.length)}];
    });
    const reference=String(rows[0].reference),from=String(rows[0].coverage_from),to=String(rows[0].coverage_to);
    const balances=members.filter(member=>member.kind==='aging');
    const snapshots:PublishedMetricCapability[]=balances[0]!.release.capabilities.filter(capability=>balances.every(member=>member.release.capabilities.some(peer=>peer.metric===capability.metric && peer.summary))).map(capability=>({metric:capability.metric,summary:true,dimensions:[...capability.dimensions.filter(dimension=>balances.every(member=>member.release.capabilities.find(peer=>peer.metric===capability.metric)?.dimensions.includes(dimension))),'month'],analyses:[]}));
    const release:PublishedAnalyticsRelease={...events[0]!.release,datasetId:reference,certificationReference:reference,period:{from,to},capabilities:[...capabilities,...snapshots]};
    return {reference,from,to,members,release};
  },true,120000);
}
