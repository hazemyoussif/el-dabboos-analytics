import type {ProductionFact} from '@el-dabboos/domain';
import {database} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture,pages} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import type {BusinessDeltaExtraction} from '../../src/review/exposure.ts';
import type {BusinessIdentityReplacement} from '../../src/business/delta-store.ts';
import type {ReviewControl} from '../../src/review/source.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {prepareRevision} from '../../src/prepared/preparation.ts';

export const deltaBounds={maxCellsPerChunk:100000,maxChunks:100};
export const deltaContext={tenantId:'a',locale:'en' as const};
export const deltaRange={from:'2026-10-01',to:'2026-10-20'};

/** Small canonical synthetic data only. No developer env or external source. */
export async function deltaFixture(prepare=true){
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const source=fixture('2026-10',true,'business',true),facts:ProductionFact[]=[];
  for await(const page of source.facts)facts.push(...page);
  const cutoff='2026-10-20T09:00:00.000Z';
  const initial=facts.map(fact=>observedFact(fact,cutoff,fact.kind==='snapshot'?'2026-10-20':fact.businessDate));
  const accepted=await exposeReviewMonth(db.ingestor,{...source,cutoff,revision:revision(cutoff),facts:pages(initial),controls:async()=>factControls(initial)},'business');
  if(prepare){
   await tenantTransaction(db.ingestor,'a',client=>prepareRevision(client,{tenantId:'a',revisionId:accepted.revisionId},deltaBounds));
   await tenantTransaction(db.migrator,'a',client=>client.query('INSERT INTO mart.prepared_activation VALUES($1,$2,$3,$4)',
    ['a',accepted.revisionId,deltaBounds.maxCellsPerChunk,deltaBounds.maxChunks]));
  }
  return {db,source,initial,accepted};
 }catch(error){await db.close();throw error;}
}
export function observedFact(fact:ProductionFact,cutoff:string,day=fact.businessDate):ProductionFact{
 return {...fact,businessDate:day,sourceAsOf:cutoff,sourceVersion:cutoff,
  sourceRevision:String(BigInt(Date.parse(cutoff))*1000n),frozenRevision:revision(cutoff)};
}
function revision(cutoff:string){return 'SYNTHETIC BUSINESS DELTA '+cutoff;}
export function changedInvoice(facts:readonly ProductionFact[],cutoff:string,id='10'){
 return facts.filter(fact=>fact.sourceObject==='command_invoice').map(fact=>{
  const value=fact.measureId==='command_invoice_total'&&id==='10'?'5.000000':fact.value;
  return {...observedFact(fact,cutoff),sourceRecordId:id,value,
   dimensions:{...fact.dimensions,customer:id==='10'?'fixture:changed':'fixture:customer'},
   ...(fact.currency?{currency:{...fact.currency,transactionValue:value}}:{})};
 });
}
export function deltaSource(source:Awaited<ReturnType<typeof fixture>>,cutoff:string,replacements:readonly BusinessIdentityReplacement[],objects=['command_invoice']):BusinessDeltaExtraction{
 return {tenantId:'a',month:source.month,mapping:source.mapping,cutoff,revision:revision(cutoff),observedObjects:objects,
  replacements:replacementPages(replacements),assertAlive:async()=>{},completeSourceRead:async()=>{},
  controls:async()=>{throw new Error('Full source controls must not run during a delta');},
  identityControls:async(object,ids)=>factControls(replacements.filter(replacement=>replacement.object===object&&ids.includes(replacement.id)).flatMap(replacement=>replacement.facts))};
}
export async function* replacementPages(replacements:readonly BusinessIdentityReplacement[]){yield replacements;}
export function factControls(facts:readonly ProductionFact[]):ReviewControl[]{
 const grouped=new Map<string,{measure:ProductionFact['measureId'];dimensions:ProductionFact['dimensions']|null;value:bigint;count:bigint}>();
 for(const fact of facts)for(const dimensions of [null,fact.dimensions]){
  const key=JSON.stringify([fact.measureId,dimensions]),prior=grouped.get(key);
  grouped.set(key,{measure:fact.measureId,dimensions,value:(prior?.value??0n)+BigInt(fact.value.replace('.','')),count:(prior?.count??0n)+1n});
 }
 return [...grouped.values()].map(group=>({measure:group.measure,dimensions:group.dimensions,value:decimal(group.value),count:String(group.count)}));
}
function decimal(value:bigint){
 const sign=value<0n?'-':'',absolute=value<0n?-value:value;
 return `${sign}${absolute/1000000n}.${String(absolute%1000000n).padStart(6,'0')}`;
}
export async function storedCounts(db:Awaited<ReturnType<typeof database>>){
 return (await db.admin.query(`SELECT
  (SELECT count(*)::int FROM mart.review_facts) facts,(SELECT count(*)::int FROM mart.prepared_cells) cells,
  (SELECT count(*)::int FROM mart.prepared_datasets) datasets,(SELECT count(*)::int FROM mart.analytics_serving_revisions) revisions,
  (SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a') trusted`)).rows[0];
}
