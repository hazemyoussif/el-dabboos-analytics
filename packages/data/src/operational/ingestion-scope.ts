import type {PoolClient} from 'pg';
import type {ProductionFact} from '@el-dabboos/domain';
import {operationalFactKey} from './facts.ts';

/** Discover all changes, but only update covered months and deliberate forward catch-up.
 * A date move outside coverage retires the old footprint at its original date.
 * Unseen older identities are loaded later by the explicit complete-month job.
 */
export async function coveredOperationalFacts(client:PoolClient,tenantId:string,facts:readonly ProductionFact[],months:ReadonlySet<string>) {
 const outside=facts.filter(fact=>!months.has(fact.businessDate.slice(0,7)));
 if(!outside.length)return [...facts];
 const rows=(await client.query(`SELECT head.fact_key,revision.payload FROM mart.analytics_fact_heads head
 JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.fact_key=ANY($2::text[]) AND head.status='active'`,[tenantId,outside.map(operationalFactKey)])).rows as {fact_key:string;payload:ProductionFact}[];
 const previous=new Map(rows.map(row=>[row.fact_key,row.payload]));
 return facts.flatMap(next=>{
  if(months.has(next.businessDate.slice(0,7)))return [next];
  const prior=previous.get(operationalFactKey(next));
  if(!prior||!months.has(prior.businessDate.slice(0,7)))return [];
  return [{...prior,status:'tombstone' as const,sourceVersion:next.sourceVersion,sourceRevision:next.sourceRevision,
   ...(next.sourceUpdatedAt?{sourceUpdatedAt:next.sourceUpdatedAt}:{}),batchId:next.batchId,sourceAsOf:next.sourceAsOf,frozenRevision:next.frozenRevision}];
 });
}
