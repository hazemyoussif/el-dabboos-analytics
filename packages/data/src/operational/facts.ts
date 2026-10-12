import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { validateProductionFact } from '@el-dabboos/domain';
import type { ProductionFact,FactRevisionChange } from '@el-dabboos/domain';
import type { OperationalBaseline } from './contracts.ts';

export function operationalFactKey(fact:ProductionFact) {
 return JSON.stringify([fact.tenantId,fact.sourceId,fact.sourceObject,fact.sourceRecordId,fact.componentId,fact.measureId,...(fact.kind==='snapshot'?[fact.entityId,fact.businessDate]:[])]);
}
function content(fact:ProductionFact) {
 const {batchId,sourceAsOf,frozenRevision,...business}=fact;void batchId;void sourceAsOf;void frozenRevision;
 if(fact.kind==='snapshot'){const {sourceRevision,sourceVersion,sourceUpdatedAt,...snapshot}=business;void sourceRevision;void sourceVersion;void sourceUpdatedAt;return stableContent(snapshot);}
 return stableContent(business);
}

/** Persist one bounded source page with one locked head read and two set-based writes. */
export async function persistOperationalFacts(client:PoolClient,baseline:OperationalBaseline,facts:readonly ProductionFact[]):Promise<FactRevisionChange[]> {
 if(!facts.length)return [];
 const prepared=facts.map(next=>{
  const mapping=baseline.mappings.find(mapping=>mapping.datasetId===next.datasetId);if(!mapping)throw new Error('Operational mapping scope conflict');
  validateProductionFact(next,mapping);
  return {key:operationalFactKey(next),next};
 });
 const keys=[...new Set(prepared.map(record=>record.key))];
 const rows=(await client.query(`SELECT head.fact_key,revision.payload FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
  WHERE head.tenant_id=$1 AND head.fact_key=ANY($2::text[]) FOR UPDATE OF head`,[baseline.tenantId,keys])).rows as {fact_key:string;payload:ProductionFact}[];
 const current=new Map(rows.map(row=>[row.fact_key,row.payload]));
 const revisions:{key:string;revision:string;payload:ProductionFact}[]=[];
 const heads=new Map<string,string>();
 const changes:FactRevisionChange[]=[];
 for(const {key,next} of prepared) {
  const previous=current.get(key);
  if(previous && content(previous)===content(next))continue;
  if(previous && BigInt(next.sourceRevision)<BigInt(previous.sourceRevision))throw new Error('Stale operational source revision');
  if(previous && next.sourceRevision===previous.sourceRevision && next.status!=='tombstone')throw new Error('Conflicting operational source revision');
  const revision=createHash('sha256').update(JSON.stringify(next)).digest('hex');
  revisions.push({key,revision,payload:next});heads.set(key,revision);
  changes.push({...previous?{previous}:{},next});current.set(key,next);
 }
 if(!changes.length)return [];
 await client.query(`INSERT INTO mart.analytics_fact_revisions(tenant_id,fact_key,revision_id,payload)
  SELECT $1,record.key,record.revision,record.payload FROM jsonb_to_recordset($2::jsonb) record(key text,revision text,payload jsonb)`,[baseline.tenantId,JSON.stringify(revisions)]);
 await client.query(`INSERT INTO mart.analytics_fact_heads(tenant_id,fact_key,revision_id)
  SELECT $1,record.key,record.revision FROM jsonb_to_recordset($2::jsonb) record(key text,revision text)
  ON CONFLICT(tenant_id,fact_key) DO UPDATE SET revision_id=EXCLUDED.revision_id`,[baseline.tenantId,JSON.stringify([...heads].map(([key,revision])=>({key,revision})))]);
 return changes;
}

export async function persistOperationalFact(client:PoolClient,baseline:OperationalBaseline,next:ProductionFact):Promise<FactRevisionChange|null> {
 return (await persistOperationalFacts(client,baseline,[next]))[0]??null;
}
export async function activeOperationalFacts(client:PoolClient,tenantId:string,object:string,after:string,limit:number) {
 return (await client.query(`SELECT head.fact_key,revision.payload FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.fact_key>$2 AND head.source_object=$3 AND head.status='active' ORDER BY head.fact_key LIMIT $4`,[tenantId,after,object,limit])).rows as {fact_key:string;payload:ProductionFact}[];
}

function stableContent(value:unknown):string {return JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);}

/** Date-less ineligible headers retire their previous footprint; unseen drafts create no fact. */
export async function retiredOperationalFacts(client:PoolClient,tenantId:string,record:{object:string;id:string;version:string;revision:string;updatedAt:string},source:{cutoff:string;revision:string}):Promise<ProductionFact[]> {
 const rows=(await client.query(`SELECT revision.payload FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.source_object=$2 AND head.status='active' AND head.source_record_id=$3`,[tenantId,record.object,record.id])).rows;
 return rows.map(row=>({...row.payload,status:'tombstone',sourceVersion:record.version,sourceRevision:record.revision,sourceUpdatedAt:record.updatedAt,sourceAsOf:source.cutoff,frozenRevision:source.revision,batchId:`retired:${source.cutoff}`}));
}
