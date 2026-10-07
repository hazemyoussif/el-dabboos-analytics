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
export async function persistOperationalFact(client:PoolClient,baseline:OperationalBaseline,next:ProductionFact):Promise<FactRevisionChange|null> {
 const mapping=baseline.mappings.find(mapping=>mapping.datasetId===next.datasetId);if(!mapping)throw new Error('Operational mapping scope conflict');
 validateProductionFact(next,mapping);
 const key=operationalFactKey(next);
 const previous=(await client.query('SELECT revision.payload FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id) WHERE head.tenant_id=$1 AND head.fact_key=$2 FOR UPDATE OF head',[baseline.tenantId,key])).rows[0]?.payload as ProductionFact|undefined;
 if(previous && content(previous)===content(next))return null;
 if(previous && BigInt(next.sourceRevision)<BigInt(previous.sourceRevision))throw new Error('Stale operational source revision');
 if(previous && next.sourceRevision===previous.sourceRevision && next.status!=='tombstone')throw new Error('Conflicting operational source revision');
 const revision=createHash('sha256').update(JSON.stringify(next)).digest('hex');
 await client.query('INSERT INTO mart.analytics_fact_revisions(tenant_id,fact_key,revision_id,payload) VALUES($1,$2,$3,$4)',[baseline.tenantId,key,revision,JSON.stringify(next)]);
 await client.query('INSERT INTO mart.analytics_fact_heads(tenant_id,fact_key,revision_id) VALUES($1,$2,$3) ON CONFLICT(tenant_id,fact_key) DO UPDATE SET revision_id=EXCLUDED.revision_id',[baseline.tenantId,key,revision]);
 return {...(previous?{previous}:{}),next};
}
export async function activeOperationalFacts(client:PoolClient,tenantId:string,object:string,after:string,limit:number) {
 return (await client.query(`SELECT head.fact_key,revision.payload FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.fact_key>$2 AND head.source_object=$3 AND head.status='active' ORDER BY head.fact_key LIMIT $4`,[tenantId,after,object,limit])).rows as {fact_key:string;payload:ProductionFact}[];
}

function stableContent(value:unknown):string {return JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);}

/** Date-less ineligible headers retire their previous footprint; unseen drafts create no fact. */
export async function retiredOperationalFacts(client:PoolClient,tenantId:string,record:{object:string;id:string;version:string;revision:string;updatedAt:string},source:{cutoff:string;revision:string}):Promise<ProductionFact[]> {
 const rows=(await client.query(`SELECT revision.payload FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.source_object=$2 AND head.status='active' AND payload->>'sourceRecordId'=$3`,[tenantId,record.object,record.id])).rows;
 return rows.map(row=>({...row.payload,status:'tombstone',sourceVersion:record.version,sourceRevision:record.revision,sourceUpdatedAt:record.updatedAt,sourceAsOf:source.cutoff,frozenRevision:source.revision,batchId:`retired:${source.cutoff}`}));
}
