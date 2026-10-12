import type { PoolClient } from 'pg';
import type { FactRevisionChange,ProductionFact } from '@el-dabboos/domain';
import { persistOperationalFacts } from './facts.ts';
import type { OperationalBaseline,OperationalSnapshot } from './contracts.ts';
/** Bounded checks of distinct governed identities. Load payloads only for missing IDs. */
export async function sweepOperationalFacts(client:PoolClient,baseline:OperationalBaseline,source:OperationalSnapshot) {
 const changes:FactRevisionChange[]=[];
 for(const object of ['sale_order','account_move'])for await(const page of source.presence(object,identityPages(client,baseline.tenantId,object))) {
  const present=new Set(page.present),missing=page.ids.filter(id=>!present.has(id));if(!missing.length)continue;
  const rows=(await client.query(`SELECT revision.payload FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
   WHERE head.tenant_id=$1 AND head.source_object=$2 AND head.status='active' AND head.source_record_id=ANY($3::text[])`,[baseline.tenantId,object,missing])).rows;
  const retired=rows.map(row=>{
   const previous=row.payload as ProductionFact;
   return {...previous,status:'tombstone' as const,sourceRevision:String(BigInt(Date.parse(source.cutoff))*1000n),sourceVersion:`presence:${source.cutoff}`,sourceUpdatedAt:source.cutoff,sourceAsOf:source.cutoff,frozenRevision:source.revision,batchId:`sweep:${source.cutoff}`};
  });
  changes.push(...await persistOperationalFacts(client,baseline,retired));
 }
 return changes;
}
async function *identityPages(client:PoolClient,tenantId:string,object:string) {
 let after='';
 while(true) {
  const rows=(await client.query(`SELECT DISTINCT source_record_id FROM mart.analytics_fact_heads WHERE tenant_id=$1 AND source_object=$2 AND status='active' AND source_record_id>$3 ORDER BY source_record_id LIMIT 1000`,[tenantId,object,after])).rows;
  if(!rows.length)break;const ids=rows.map(row=>String(row.source_record_id));yield ids;after=ids.at(-1)!;
 }
}
