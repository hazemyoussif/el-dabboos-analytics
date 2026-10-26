import {sameObservedOdooInput} from '../odoo-orm/observation.ts';
import {prepareActivatedPublication} from '../prepared/publication.ts';
import {businessCapabilities,businessDefinitionVersion} from '../business/definitions.ts';
import {randomUUID,createHash} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {validDateRange,validateProductionFact} from '@el-dabboos/domain';
import type {SourceMapping,ProductionFact} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {reviewCapabilities,reviewDefinitionVersion} from './definitions.ts';
import type {ReviewControl} from './source.ts';
import {captureBusinessDelta,persistBusinessDelta,recordUnchangedBusinessDelta} from './exposure-delta.ts';
import type {BusinessIdentityReplacement} from '../business/delta-store.ts';
import type {RecordedAllocationDeletion} from '../operational/contracts.ts';
import type {CommandAllocationChange} from '../business/allocation-changes.ts';
interface ReviewObservation {
 tenantId:string;month:string;mapping:SourceMapping;cutoff:string;revision:string;
 controls:()=>Promise<readonly ReviewControl[]>;assertAlive:()=>Promise<void>;completeSourceRead:()=>Promise<void>;
}
export interface ReviewExtraction extends ReviewObservation {facts:AsyncIterable<readonly ProductionFact[]>;requireEmptyMonth?:boolean}
export interface BusinessDeltaExtraction extends ReviewObservation {
 /** Unlisted recipes retain both their accepted facts/controls and observation clocks. */
 observedObjects?:readonly string[];
 replaceObjects?:readonly string[];
 discover?:(request:(object:string,ids:readonly string[])=>Promise<void>)=>Promise<void>;
 readReplacements?:(object:string,ids:readonly string[])=>AsyncIterable<readonly BusinessIdentityReplacement[]>;
 identityControls:(object:string,ids:readonly string[])=>Promise<readonly ReviewControl[]>;
 allocationChanges?:AsyncIterable<readonly CommandAllocationChange[]>;
 replacements:AsyncIterable<readonly BusinessIdentityReplacement[]>;
 allocationDeletions?:{
  discover(consume:(records:readonly RecordedAllocationDeletion[])=>Promise<void>,client:PoolClient):Promise<unknown>;
  replacements(object:string,ids:readonly string[]):AsyncIterable<readonly BusinessIdentityReplacement[]>;
 };
}
/** Atomic complete-month exposure; Finance approval is deliberately absent. */
export async function exposeReviewMonth(pool:Pool,source:ReviewExtraction,family:'review'|'business'='review') {
 return exposeMonth(pool,source,family);
}
/** Immutable Business delta, referencing accepted recipes without copying their rows. */
export async function exposeBusinessDeltaMonth(pool:Pool,source:BusinessDeltaExtraction){return exposeMonth(pool,source,'business');}
async function exposeMonth(pool:Pool,source:ReviewExtraction|BusinessDeltaExtraction,family:'review'|'business') {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(source.month)||!validDateRange({from:source.month+'-01',to:monthEnd(source.month)})||source.mapping.tenantId!==source.tenantId||!source.revision.trim()||!Number.isFinite(Date.parse(source.cutoff)))throw new Error('Complete bounded review month required');
 return tenantTransaction(pool,source.tenantId,async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`analytics:${source.tenantId}`]);
  const baseline=(await client.query('SELECT source_id,reporting_currency FROM mart.analytics_baselines WHERE tenant_id=$1',[source.tenantId])).rows[0];
  if(!baseline||baseline.source_id!==source.mapping.sourceId||baseline.reporting_currency!==source.mapping.reportingCurrency)throw new Error('Review tenant/source/currency baseline conflict');
  const parent=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1 FOR UPDATE',[source.tenantId])).rows[0]?.revision_id;
  if(!parent)throw new Error('Existing trusted manifest required');
  await assertNewCutoff(client,source,parent,family);
  await assertEmptyRequestedMonth(client,source,parent,family);
  const captured='replacements' in source?await captureBusinessDelta(client,{source,parent}):undefined;
  if(captured?.unchanged&&'replacements' in source){
   await source.assertAlive();await source.completeSourceRead();
   await recordUnchangedBusinessDelta(client,source,captured);
   return {revisionId:parent,partitionId:captured.baseline.partitionId,month:source.month,
    facts:0,controls:captured.controls.length,financeReview:'pending' as const,unchanged:true};
  }
  const partitionId=randomUUID(),revisionId=randomUUID();
  const capabilities=(family==='business'?businessCapabilities:reviewCapabilities)(source.mapping,{month:source.month,cutoff:source.cutoff,reference:`technical-exact:${partitionId}`});
  await client.query("INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,family,capabilities) VALUES($1,$2,$3,$5,$4)",[source.tenantId,partitionId,source.month+'-01',JSON.stringify(capabilities),family]);
  await client.query('INSERT INTO mart.review_extractions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true)',[source.tenantId,partitionId,source.month+'-01',source.mapping.sourceId,source.mapping.reportingCurrency,source.cutoff,source.revision,(family==='business'?businessDefinitionVersion:reviewDefinitionVersion)(),JSON.stringify(source.mapping)]);
  const persisted='replacements' in source?await persistBusinessDelta(client,{source,captured:captured!,partitionId}):
   {rows:await persistReviewFacts(client,partitionId,source,family),controls:await source.controls()};
  const {rows,controls}=persisted;
  await persistReviewControls(client,source.tenantId,partitionId,controls,family);
  await source.assertAlive();
  if(!(await client.query(`SELECT mart.${family==='business'?'business':'review'}_partition_exact($1,$2) exact`,[source.tenantId,partitionId])).rows[0].exact)throw new Error('Review source/mart controls do not match');
  if(captured)await captured.workspace.persistAllocationLinks(partitionId);
  // Source evidence is complete and exact; offline preparation must not retain its lease.
  await source.completeSourceRead();
  await client.query("INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose) VALUES($1,$2,$3,$4,$5,$6)",[source.tenantId,revisionId,parent,source.cutoff,[source.month+'-01'],family]);
  await client.query("INSERT INTO mart.analytics_serving_members SELECT tenant_id,$2,month,partition_id,family FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$3 AND NOT(family=$5 AND month=$4)",[source.tenantId,revisionId,parent,source.month+'-01',family]);
  await client.query("INSERT INTO mart.analytics_serving_members(tenant_id,revision_id,month,partition_id,family) VALUES($1,$2,$3,$4,$5)",[source.tenantId,revisionId,source.month+'-01',partitionId,family]);
  await prepareActivatedPublication(client,{tenantId:source.tenantId,revisionId});
  const promoted=await client.query('UPDATE mart.analytics_trusted_serving SET revision_id=$2 WHERE tenant_id=$1 AND revision_id=$3',[source.tenantId,revisionId,parent]);
  if(promoted.rowCount!==1)throw new Error('Review trusted parent conflict');
  return {revisionId,partitionId,month:source.month,facts:rows,controls:controls.length,financeReview:'pending' as const};
 },false,120000);
}
async function persistReviewFacts(client:PoolClient,partitionId:string,source:ReviewExtraction,family:'review'|'business') {
 let rows=0;
 for await(const page of source.facts){
  if(page.length>1000||(rows+=page.length)>(family==='business'?500000:250000))throw new Error('Bounded review extraction exceeded');
  const records=page.map(fact=>{
   validateProductionFact(fact,source.mapping);
   if(fact.businessDate.slice(0,7)!==source.month||fact.sourceAsOf!==source.cutoff||fact.frozenRevision!==source.revision)throw new Error('Review extraction lineage conflict');
   return {key:JSON.stringify([fact.sourceObject,fact.sourceRecordId,fact.componentId,fact.measureId]),payload:fact};
  });
  await client.query(`INSERT INTO mart.review_facts SELECT $1,$2,record.key,record.payload FROM jsonb_to_recordset($3::jsonb) record(key text,payload jsonb)`,[source.tenantId,partitionId,JSON.stringify(records)]);
 }
 return rows;
}
async function persistReviewControls(client:PoolClient,tenantId:string,partitionId:string,controls:readonly ReviewControl[],family:'review'|'business') {
 if(controls.length>(family==='business'?500128:100000))throw new Error('Bounded independent controls exceeded');
 for(let offset=0;offset<controls.length;offset+=1000){
  const records=controls.slice(offset,offset+1000).map(control=>({...control,key:control.dimensions===null?'summary':createHash('sha256').update(JSON.stringify(control.dimensions)).digest('hex')}));
  await client.query(`INSERT INTO mart.review_controls SELECT $1,$2,record.measure,record.key,record.dimensions,record.value::numeric,record.count::bigint
   FROM jsonb_to_recordset($3::jsonb) record(measure text,key text,dimensions jsonb,value text,count text)`,[tenantId,partitionId,JSON.stringify(records)]);
 }
}
function monthEnd(month:string){return new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10);}

async function assertEmptyRequestedMonth(client:PoolClient,source:ReviewExtraction|BusinessDeltaExtraction,parent:string,family:'review'|'business'){
 if(!('requireEmptyMonth' in source)||!source.requireEmptyMonth)return;
 const existing=await client.query('SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$2 AND family=$3 AND month=$4',[source.tenantId,parent,family,source.month+'-01']);
 if(existing.rowCount)throw new Error('New recipe month already has an accepted Business member');
}

/** One immutable API copy can serve repeated delta checks. Complete replacement
 * imports and a different source identity must still advance their observation. */
function sameObservedDelta(source:ReviewObservation,prior:{source_cutoff:Date;source_revision:string}){
 return 'replacements' in source&&sameObservedOdooInput({cutoff:prior.source_cutoff.toISOString(),revision:prior.source_revision},source);
}

async function assertNewCutoff(client:PoolClient,source:ReviewObservation,parent:string,family:'review'|'business'){
 const prior=(await client.query(`SELECT extraction.source_cutoff,extraction.source_revision FROM mart.analytics_serving_members member JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  WHERE member.tenant_id=$1 AND member.revision_id=$2 AND member.family=$4 AND member.month=$3`,[source.tenantId,parent,source.month+'-01',family])).rows[0];
 if(prior&&Date.parse(source.cutoff)<=prior.source_cutoff.getTime()&&!sameObservedDelta(source,prior))throw new Error('Newer review source cutoff required');
}
