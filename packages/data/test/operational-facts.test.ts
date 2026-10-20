import test from 'node:test';
import assert from 'node:assert/strict';
import type { PoolClient } from 'pg';
import { persistOperationalFacts,planOperationalFacts,writeOperationalChanges,operationalFactKey } from '../src/operational/facts.ts';
import type { OperationalBaseline } from '../src/operational/contracts.ts';
import { fact,mapping } from './postgres/fixtures.ts';

function clientWith(rows:unknown[]=[]){
 const calls:{text:string;values?:unknown[]}[]=[];
 const client={query:async(text:string,values?:unknown[])=>{
  calls.push(values?{text,values}:{text});
  return {rows:calls.length===1?rows:[],rowCount:0};
 }} as unknown as PoolClient;
 return {client,calls};
}
function baseline():OperationalBaseline {
 const source=mapping();
 return {tenantId:'a',sourceId:source.sourceId,reportingCurrency:source.reportingCurrency,datasets:[source.datasetId],definitionVersion:'synthetic',mappingVersion:source.mappingVersion,mappings:[source],capabilities:{releases:[]},from:'2026-01-01',to:'2026-09-30'} as unknown as OperationalBaseline;
}

test('operational page persistence batches 500 facts into one head read and two writes',async()=>{
 const fixture=clientWith();
 const facts=Array.from({length:500},(_,index)=>fact(String(index+1),{sourceRevision:String(index+1)}));
 const changes=await persistOperationalFacts(fixture.client,baseline(),facts);
 assert.equal(changes.length,500);
 assert.equal(fixture.calls.length,3);
 assert.match(fixture.calls[0]!.text,/FOR UPDATE OF head/);
 assert.match(fixture.calls[1]!.text,/jsonb_to_recordset/);
 assert.match(fixture.calls[2]!.text,/ON CONFLICT\(tenant_id,fact_key\) DO UPDATE/);
 const revisions=JSON.parse(String(fixture.calls[1]!.values![1]));
 const heads=JSON.parse(String(fixture.calls[2]!.values![1]));
 assert.equal(revisions.length,500);
 assert.equal(heads.length,500);
});

test('batched persistence preserves sequential same-key revisions while writing one final head',async()=>{
 const fixture=clientWith();
 const first=fact('same',{sourceRevision:'1',sourceVersion:'one',value:'100.000000'});
 const second=fact('same',{sourceRevision:'2',sourceVersion:'two',value:'200.000000',currency:{mode:'native',transactionCurrency:'IQD',transactionValue:'200.000000',reportingCurrency:'IQD',policyReference:'test-native'}});
 const changes=await persistOperationalFacts(fixture.client,baseline(),[first,second]);
 assert.equal(changes.length,2);
 assert.equal(changes[0]!.previous,undefined);
 assert.deepEqual(changes[1]!.previous,first);
 const revisions=JSON.parse(String(fixture.calls[1]!.values![1]));
 const heads=JSON.parse(String(fixture.calls[2]!.values![1]));
 assert.equal(revisions.length,2);
 assert.equal(heads.length,1);
 assert.equal(heads[0].key,JSON.stringify(['a','fixture','fixture','same','whole','revenue']));
});


test('candidate planning defers writes and preserves a pending identity across source pages',async()=>{
 const original=fact('same');
 const first=fact('same',{sourceRevision:'2',sourceVersion:'v2',value:'200.000000'});
 const second=fact('same',{sourceRevision:'3',sourceVersion:'v3',value:'300.000000'});
 const fixture=clientWith([{fact_key:operationalFactKey(original),payload:original}]);
 const pending=new Map<string,import('@el-dabboos/domain').ProductionFact>();
 const changes=await planOperationalFacts(fixture.client,baseline(),[first],{pending});
 assert.deepEqual((await planOperationalFacts(fixture.client,baseline(),[{...first,batchId:'complete-month-page'}],{pending})),[]);
 const later=await planOperationalFacts(fixture.client,baseline(),[second],{pending});
 assert.deepEqual(changes[0]?.previous,original);
 assert.deepEqual(later[0]?.previous,first);
 assert.equal(fixture.calls.length,3);
 assert.ok(fixture.calls.every(call=>call.text.startsWith('SELECT')),'planning must not write candidate revisions or heads');
 await writeOperationalChanges(fixture.client,'a',[...changes,...later]);
 const revisions=JSON.parse(String(fixture.calls[3]!.values![1]));
 const heads=JSON.parse(String(fixture.calls[4]!.values![1]));
 assert.equal(revisions.length,2);assert.equal(heads.length,1);
 assert.equal(revisions[1].payload.sourceRevision,'3');
 assert.equal(heads[0].revision,revisions[1].revision);
});

test('new source metadata alone creates no event revision or head write',async()=>{
 const original=fact('same');
 const fixture=clientWith([{fact_key:operationalFactKey(original),payload:original}]);
 const changes=await persistOperationalFacts(fixture.client,baseline(),[{...original,sourceRevision:'2',sourceVersion:'v2',sourceUpdatedAt:'2026-10-01T09:30:00.000Z'}]);
 assert.deepEqual(changes,[]);assert.equal(fixture.calls.length,1);
 assert.equal(original.sourceRevision,'1');
});

test('stale and conflicting event revisions reject before any candidate writes',async()=>{
 const original=fact('same',{sourceRevision:'3',sourceVersion:'v3'});
 for(const next of [{...original,sourceRevision:'2',sourceVersion:'v2'},fact('same',{sourceRevision:'3',sourceVersion:'v3',value:'200.000000'})]) {
  const fixture=clientWith([{fact_key:operationalFactKey(original),payload:original}]);
  await assert.rejects(persistOperationalFacts(fixture.client,baseline(),[next]),/Stale|Conflicting/);
  assert.equal(fixture.calls.length,1);
 }
});
