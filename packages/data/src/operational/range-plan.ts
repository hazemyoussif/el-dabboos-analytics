import type {PoolClient} from 'pg';
import type {QuerySlot} from '../postgres/query-slots.ts';
export interface TrustedRangePartition {month:string;partitionId:string;monthly:boolean;availableFrom?:string;availableThrough?:string}
export interface TrustedRangeSegment {key:string|null;match_key:string|null;from:string;to:string;partition_id:string;grain:'daily'|'monthly'}
/** Output slots already encode visual grain; monthly selection never fabricates day points. */
export function planTrustedRange(slots:readonly QuerySlot[],partitions:readonly TrustedRangePartition[]):TrustedRangeSegment[] {
 return slots.flatMap(slot=>{
  if(!slot.from||!slot.to)return [];
  return partitions.flatMap(partition=>{
   const first=`${partition.month}-01`,last=monthEnd(first);
   const availableFrom=partition.availableFrom&&partition.availableFrom>first?partition.availableFrom:first;
   const availableThrough=partition.availableThrough&&partition.availableThrough<last?partition.availableThrough:last;
   const from=slot.from!>availableFrom?slot.from!:availableFrom,to=slot.to!<availableThrough?slot.to!:availableThrough;
   if(from>to)return [];
   return [{key:slot.key,match_key:slot.match_key,from,to,partition_id:partition.partitionId,grain:partition.monthly&&from===first&&to===last?'monthly' as const:'daily' as const}];
  });
 });
}
function monthEnd(first:string){const date=new Date(`${first}T00:00:00Z`);return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).toISOString().slice(0,10);}
/** Same baseline semantics plus exact partition reference permit immutable hybrid lineage. */
export async function trustedRangePartitions(client:PoolClient,tenantId:string):Promise<TrustedRangePartition[]> {
 const rows=(await client.query(`SELECT to_char(member.month,'YYYY-MM') AS month,member.partition_id,baseline.period_from::text available_from,
 greatest(baseline.period_to,(coalesce(cursor.cutoff,revision.cutoff) AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date)::text available_through,
 (proof.partition_id IS NOT NULL AND proof.definition_version=baseline.definition_version AND proof.mapping_version=baseline.mapping_version
 AND proof.business_timezone=baseline.specification->0->'measures'->0->>'timeZone') monthly
 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_baselines baseline USING(tenant_id) JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id)
 LEFT JOIN mart.analytics_source_cursors cursor USING(tenant_id) LEFT JOIN mart.analytics_aggregate_proofs proof USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 ORDER BY member.month`,[tenantId])).rows;
 return rows.map(row=>({month:row.month,partitionId:row.partition_id,monthly:row.monthly,availableFrom:row.available_from,availableThrough:row.available_through}));
}
