import test from 'node:test';
import assert from 'node:assert/strict';
import type {ProductionFact} from '@el-dabboos/domain';
import {enabled} from './support.ts';
import {deltaFixture,deltaSource,observedFact} from './business-delta-fixture.ts';
import {fixture} from './business-fixture.ts';
import {exposeReviewMonth,exposeBusinessDeltaMonth} from '../../src/review/exposure.ts';
import {prepareRevision} from '../../src/prepared/preparation.ts';
import {deltaBounds} from './business-delta-fixture.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

type Fixture=Awaited<ReturnType<typeof deltaFixture>>;
async function population(fixture:Fixture,revision:string,through:string,tenant='a',family='business'){
 return tenantTransaction(fixture.db.ingestor,tenant,async client=>(await client.query(`SELECT measure_id,business_day::text AS business_day,entity_id,amount::text amount,dimensions,labels,item_count::text count
  FROM mart.prepared_work_complete_snapshot_rows('a',$1,$2,$3) ORDER BY measure_id,entity_id`,[revision,family,through])).rows.sort((left,right)=>left.measure_id.localeCompare(right.measure_id)||String(left.entity_id).localeCompare(String(right.entity_id))),true);
}
function expected(facts:readonly ProductionFact[]){
 return facts.filter(fact=>fact.kind==='snapshot').map(fact=>({measure_id:fact.measureId,business_day:fact.businessDate,entity_id:fact.entityId,amount:fact.value,dimensions:fact.dimensions,labels:fact.displayLabels??{},count:'1'}))
  .sort((left,right)=>left.measure_id.localeCompare(right.measure_id)||String(left.entity_id).localeCompare(String(right.entity_id)));
}
test('scoped complete snapshot reader matches dense accepted snapshot operands',{skip:!enabled},async()=>{
 const fixture=await deltaFixture(false);try{
  assert.deepEqual(await population(fixture,fixture.accepted.revisionId,'2026-10-20'),expected(fixture.initial));
  assert.deepEqual(await population(fixture,fixture.accepted.revisionId,'2026-10-19'),[],'future observations cannot supply an earlier snapshot');
  await tenantTransaction(fixture.db.ingestor,'a',client=>prepareRevision(client,{tenantId:'a',revisionId:fixture.accepted.revisionId},deltaBounds));
  assert.equal((await fixture.db.admin.query("SELECT count(*)::int count FROM mart.prepared_bindings WHERE revision_id=$1 AND family='business' AND kind='snapshot'",[fixture.accepted.revisionId])).rows[0].count,1);
 }finally{await fixture.db.close();}
});
test('scoped snapshot ancestry preserves replacements, deletions and independently dated retained measures',{skip:!enabled},async()=>{
 const fixture=await deltaFixture(false);try{
  const object=fixture.initial.find(fact=>fact.kind==='snapshot')!.sourceObject;
  const replacements=fixture.initial.filter(fact=>fact.sourceObject===object).map(fact=>{
   const updated=observedFact(fact,'2026-10-21T09:00:00.000Z',fact.kind==='snapshot'?'2026-10-21':fact.businessDate);
   return {...updated,value:'42.000000',...(updated.currency?{currency:{...updated.currency,transactionValue:'42.000000'}}:{})};
  });
  const changed=await exposeBusinessDeltaMonth(fixture.db.ingestor,deltaSource(fixture.source,'2026-10-21T09:00:00.000Z',[{object,id:'10',facts:replacements}],[object]));
  assert.deepEqual(await population(fixture,changed.revisionId,'2026-10-21'),expected([...fixture.initial.filter(fact=>fact.sourceObject!==object),...replacements]));
  const removed=await exposeBusinessDeltaMonth(fixture.db.ingestor,deltaSource(fixture.source,'2026-10-22T09:00:00.000Z',[{object,id:'10',facts:[]}],[object]));
  assert.deepEqual(await population(fixture,removed.revisionId,'2026-10-22'),expected(fixture.initial.filter(fact=>fact.sourceObject!==object)));
  assert.deepEqual(await population(fixture,fixture.accepted.revisionId,'2026-10-20'),expected(fixture.initial),'accepted ancestor bytes remain unchanged');
 }finally{await fixture.db.close();}
});
test('snapshot population excludes unrelated partitions, families and other tenants',{skip:!enabled},async()=>{
 const current=await deltaFixture(false);try{
  const other=await exposeReviewMonth(current.db.ingestor,fixture('2026-09'),'business');
  assert.deepEqual(await population(current,other.revisionId,'2026-10-20'),expected(current.initial));
  assert.deepEqual(await population(current,other.revisionId,'2026-10-20','b'),[]);
  const review=fixture('2026-09',false,'review'),facts:ProductionFact[]=[];
  for await(const page of review.facts)facts.push(...page);
  const published=await exposeReviewMonth(current.db.ingestor,{...review,facts:(async function*(){yield facts;})()},'review');
  assert.deepEqual(await population(current,published.revisionId,'2026-09-30','a','review'),expected(facts));
  assert.deepEqual(await population(current,published.revisionId,'2026-10-20','a','business'),expected(current.initial));
 }finally{await current.db.close();}
});
