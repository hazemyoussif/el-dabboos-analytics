import test from 'node:test';
import assert from 'node:assert/strict';
import type { PoolClient } from 'pg';
import { persistOperationalFacts } from '../src/operational/facts.ts';
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
