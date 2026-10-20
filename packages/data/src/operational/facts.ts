import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { validateProductionFact } from '@el-dabboos/domain';
import type { ProductionFact,FactRevisionChange } from '@el-dabboos/domain';
import type { OperationalBaseline } from './contracts.ts';
import {measureOperationalWork} from './progress.ts';
import type {OperationalProgressObserver} from './progress.ts';

// Existing ingestion contract: at most 10,000 canonical facts in one write page.
const operationalFactWriteLimit=10000;

export function operationalFactKey(fact:ProductionFact) {
 return JSON.stringify([fact.tenantId,fact.sourceId,fact.sourceObject,fact.sourceRecordId,fact.componentId,fact.measureId,...(fact.kind==='snapshot'?[fact.entityId,fact.businessDate]:[])]);
}
/** Source observation metadata does not change business content. Stored provenance
 * remains attached to the last content change; the job cursor tracks discovery.
 */
function content(fact:ProductionFact) {
 const {batchId,sourceAsOf,frozenRevision,sourceRevision,sourceVersion,sourceUpdatedAt,...business}=fact;
 void batchId;void sourceAsOf;void frozenRevision;void sourceRevision;void sourceVersion;void sourceUpdatedAt;
 return stableContent(business);
}

interface CandidateReadOptions {
 observeProgress?:OperationalProgressObserver|undefined;
 /** Pending heads preserve sequential identity decisions before any writes occur. */
 pending?:Map<string,ProductionFact>;
}
/** Validate a bounded page and lock its existing heads without writing revisions. */
export async function planOperationalFacts(client:PoolClient,baseline:OperationalBaseline,facts:readonly ProductionFact[],options:CandidateReadOptions={}):Promise<FactRevisionChange[]> {
 if(!facts.length)return [];
 const {observeProgress,pending}=options;
 const prepared=facts.map(next=>{
  const mapping=baseline.mappings.find(mapping=>mapping.datasetId===next.datasetId);if(!mapping)throw new Error('Operational mapping scope conflict');
  validateProductionFact(next,mapping);
  return {key:operationalFactKey(next),next};
 });
 const keys=[...new Set(prepared.map(record=>record.key))];
 const rows=(await measureOperationalWork(observeProgress,'mart_heads',()=>client.query(`SELECT head.fact_key,revision.payload FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
  WHERE head.tenant_id=$1 AND head.fact_key=ANY($2::text[]) FOR UPDATE OF head`,[baseline.tenantId,keys]))).rows as {fact_key:string;payload:ProductionFact}[];
 const current=new Map(rows.map(row=>[row.fact_key,row.payload]));
 const changes:FactRevisionChange[]=[];
 for(const {key,next} of prepared) {
  const previous=pending?.get(key)??current.get(key);
  if(previous && BigInt(next.sourceRevision)<BigInt(previous.sourceRevision))throw new Error('Stale operational source revision');
  if(previous && content(previous)===content(next))continue;
  if(previous && next.sourceRevision===previous.sourceRevision && next.status!=='tombstone')throw new Error('Conflicting operational source revision');
  changes.push({...previous?{previous}:{},next});current.set(key,next);pending?.set(key,next);
 }
 return changes;
}

/** Direct page writers retain their existing behavior. Operational jobs plan first. */
export async function persistOperationalFacts(client:PoolClient,baseline:OperationalBaseline,facts:readonly ProductionFact[],observeProgress?:OperationalProgressObserver):Promise<FactRevisionChange[]> {
 const changes=await planOperationalFacts(client,baseline,facts,{observeProgress});
 await writeOperationalChanges(client,baseline.tenantId,changes,observeProgress);return changes;
}

/** Same owner transaction and tenant lock as planning; call after source handoff.
 * Bound each JSON write independently of the complete candidate's size.
 */
export async function writeOperationalChanges(client:PoolClient,tenantId:string,changes:readonly FactRevisionChange[],observeProgress?:OperationalProgressObserver) {
 for(let offset=0;offset<changes.length;offset+=operationalFactWriteLimit)await writeRevisionPage(client,tenantId,changes.slice(offset,offset+operationalFactWriteLimit),observeProgress);
}
async function writeRevisionPage(client:PoolClient,tenantId:string,changes:readonly FactRevisionChange[],observeProgress:OperationalProgressObserver|undefined) {
 const revisions=changes.map(({next})=>({key:operationalFactKey(next),revision:createHash('sha256').update(JSON.stringify(next)).digest('hex'),payload:next}));
 const heads=new Map(revisions.map(record=>[record.key,record.revision]));
 await measureOperationalWork(observeProgress,'mart_revision_write',()=>client.query(`INSERT INTO mart.analytics_fact_revisions(tenant_id,fact_key,revision_id,payload)
  SELECT $1,record.key,record.revision,record.payload FROM jsonb_to_recordset($2::jsonb) record(key text,revision text,payload jsonb)`,[tenantId,JSON.stringify(revisions)]));
 await measureOperationalWork(observeProgress,'mart_head_write',()=>client.query(`INSERT INTO mart.analytics_fact_heads(tenant_id,fact_key,revision_id)
  SELECT $1,record.key,record.revision FROM jsonb_to_recordset($2::jsonb) record(key text,revision text)
  ON CONFLICT(tenant_id,fact_key) DO UPDATE SET revision_id=EXCLUDED.revision_id`,[tenantId,JSON.stringify([...heads].map(([key,revision])=>({key,revision})))]));
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
