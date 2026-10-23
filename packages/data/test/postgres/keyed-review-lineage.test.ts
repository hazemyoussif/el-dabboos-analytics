import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {businessCapabilities,businessDefinitionVersion} from '../../src/business/definitions.ts';
import {enabled} from './support.ts';
import {deltaFixture,deltaSource,changedInvoice,factControls} from './business-delta-fixture.ts';
import {exposeBusinessDeltaMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

type Fixture=Awaited<ReturnType<typeof deltaFixture>>;
async function rows(fixture:Fixture,partition:string,keys:string[]|null,measures:string[]|null=null,tenant='a'){
 return tenantTransaction(fixture.db.ingestor,tenant,async client=>(await client.query(`SELECT fact_key,payload
  FROM mart.review_effective_facts('a',$1,$2,$3) ORDER BY fact_key`,[partition,keys,measures])).rows,true);
}
test('keyed lineage equals dense reads with duplicate, empty, missing keys and measure filters',{skip:!enabled},async()=>{
 const fixture=await deltaFixture(false);try{
  const dense=await rows(fixture,fixture.accepted.partitionId,null),keys=dense.map(row=>row.fact_key);
  assert.ok(keys.length>1);
  assert.deepEqual(await rows(fixture,fixture.accepted.partitionId,keys),dense);
  assert.deepEqual(await rows(fixture,fixture.accepted.partitionId,[keys[0]!,keys[0]!,'missing']),dense.slice(0,1));
  assert.deepEqual(await rows(fixture,fixture.accepted.partitionId,[]),[]);
  assert.deepEqual(await rows(fixture,fixture.accepted.partitionId,keys,[]),[]);
  assert.deepEqual(await rows(fixture,fixture.accepted.partitionId,null,[]),[]);
  const measure=dense[0]!.payload.measureId;
  assert.deepEqual(await rows(fixture,fixture.accepted.partitionId,keys,[measure]),dense.filter(row=>row.payload.measureId===measure));
  assert.deepEqual(await rows(fixture,fixture.accepted.partitionId,null,[measure,measure]),dense.filter(row=>row.payload.measureId===measure));
  assert.deepEqual(await rows(fixture,fixture.accepted.partitionId,null,[measure],'b'),[]);
  assert.deepEqual(await rows(fixture,fixture.accepted.partitionId,keys,null,'b'),[]);
 }finally{await fixture.db.close();}
});
test('keyed sparse lineage preserves updates, deletions, retained roots and immutable ancestors',{skip:!enabled},async()=>{
 const fixture=await deltaFixture(false);try{
  const original=await rows(fixture,fixture.accepted.partitionId,null),keys=original.map(row=>row.fact_key);
  const cutoff='2026-10-20T10:00:00.000Z',updated=changedInvoice(fixture.initial,cutoff);
  const changed=await exposeBusinessDeltaMonth(fixture.db.ingestor,deltaSource(fixture.source,cutoff,[{object:'command_invoice',id:'10',facts:updated}]));
  const dense=await rows(fixture,changed.partitionId,null);
  assert.deepEqual(await rows(fixture,changed.partitionId,keys),dense);
  assert.ok(dense.some(row=>row.payload.dimensions.customer==='fixture:changed'));
  const removed=await exposeBusinessDeltaMonth(fixture.db.ingestor,deltaSource(fixture.source,'2026-10-20T11:00:00.000Z',[{object:'command_invoice',id:'10',facts:[]}]));
  const retained=await rows(fixture,removed.partitionId,null);
  assert.deepEqual(await rows(fixture,removed.partitionId,keys),retained);
  assert.equal(retained.some(row=>row.payload.sourceObject==='command_invoice'&&row.payload.sourceRecordId==='10'),false);
  assert.deepEqual(await rows(fixture,fixture.accepted.partitionId,keys),original);
 }finally{await fixture.db.close();}
});

type Corruption='none'|'dimensions'|'value'|'count'|'zero'|'stored_missing'|'stored_extra'|'empty_group'|'stored_duplicate';
async function privateSparseProof(fixture:Fixture,corruption:Corruption){
 const partition=randomUUID(),cutoff='2026-10-20T10:00:00.000Z';
 const updated=corruption==='zero'?[]:changedInvoice(fixture.initial,cutoff).map(fact=>corruption==='empty_group'?{...fact,dimensions:{}}:fact);
 const fresh=corruption==='zero'?[{measure:'command_invoice_total',dimensions:null,value:'0.000000',count:'0'}]:factControls(updated);
 const scoped=fresh.map(control=>({...control,scopeDimensions:control.dimensions}));
 const grouped=scoped.find(control=>control.dimensions!==null);
 if(corruption==='dimensions')grouped!.dimensions={...grouped!.dimensions,customer:'forged'};
 if(corruption==='value')grouped!.value='999.000000';
 if(corruption==='count')grouped!.count='999';
 const complete=corruption==='zero'?fixture.initial:[...fixture.initial.filter(fact=>fact.sourceObject!=='command_invoice'),...updated];
 const stored=factControls(complete);
 if(corruption==='stored_missing')stored.splice(stored.findIndex(control=>control.dimensions!==null),1);
 if(corruption==='stored_duplicate'){const duplicate={...stored.find(control=>control.dimensions!==null)!,scopeKey:'synthetic-duplicate'};stored.push(duplicate);}
 if(corruption==='stored_extra')stored.push({measure:'command_invoice_total',dimensions:{customer:'extra'},value:'0.000000',count:'0'});
 return tenantTransaction(fixture.db.ingestor,'a',async client=>{
  await client.query("INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,family,capabilities) VALUES('a',$1,'2026-10-01','business',$2)",[partition,JSON.stringify(businessCapabilities(fixture.source.mapping,{month:'2026-10',cutoff,reference:`technical-exact:${partition}`}))]);
  await client.query("INSERT INTO mart.review_extractions VALUES('a',$1,'2026-10-01',$2,'IQD',$3,$4,$5,$6,true)",[partition,fixture.source.mapping.sourceId,cutoff,updated[0]?.frozenRevision??'SYNTHETIC EMPTY',businessDefinitionVersion(),JSON.stringify(fixture.source.mapping)]);
  await client.query("INSERT INTO mart.business_delta_origins VALUES('a',$1,$2,$3);",[partition,fixture.accepted.revisionId,fixture.accepted.partitionId]);
  await client.query("INSERT INTO mart.business_delta_storage VALUES('a',$1)",[partition]);
  await client.query(`INSERT INTO mart.review_facts(tenant_id,partition_id,fact_key,payload)
   SELECT 'a',$1,format('[%s,%s,"whole",%s]',to_json(fact->>'sourceObject')::text,to_json(fact->>'sourceRecordId')::text,to_json(fact->>'measureId')::text),fact FROM jsonb_array_elements($2::jsonb) fact`,[partition,JSON.stringify(updated)]);
  await client.query(`INSERT INTO mart.business_delta_replacements SELECT DISTINCT 'a',$1,fact->>'sourceObject',fact->>'sourceRecordId' FROM jsonb_array_elements($2::jsonb) fact`,[partition,JSON.stringify(updated)]);
  await client.query("INSERT INTO mart.business_delta_checked_roots SELECT * FROM mart.business_delta_replacements WHERE tenant_id='a' AND partition_id=$1",[partition]);
  const records=`SELECT 'a',$1,control->>'measure',coalesce(control->>'scopeKey',CASE WHEN control->'dimensions'='null'::jsonb THEN 'summary' ELSE encode(sha256(convert_to(coalesce(control->'scopeDimensions',control->'dimensions')::text,'UTF8')),'hex') END),nullif(control->'dimensions','null'::jsonb),(control->>'value')::numeric,(control->>'count')::bigint FROM jsonb_array_elements($2::jsonb) control`;
  await client.query('INSERT INTO mart.review_controls '+records,[partition,JSON.stringify(stored)]);
  await client.query('INSERT INTO mart.business_delta_source_evidence '+records,[partition,JSON.stringify(scoped)]);
  return (await client.query("SELECT mart.business_sparse_controls_exact('a',$1) exact",[partition])).rows[0].exact;
 });
}
test('group comparison accepts exact and zero controls and rejects mismatched, missing, extra or duplicate groups',{skip:!enabled},async()=>{
 const fixture=await deltaFixture(false);try{
  assert.equal(await privateSparseProof(fixture,'none'),true);
  assert.equal(await privateSparseProof(fixture,'zero'),true);
  assert.equal(await privateSparseProof(fixture,'empty_group'),true);
  for(const corruption of ['dimensions','value','count','stored_missing','stored_extra','stored_duplicate'] as const)assert.equal(await privateSparseProof(fixture,corruption),false,corruption);
  assert.equal((await fixture.db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id,fixture.accepted.revisionId);
 }finally{await fixture.db.close();}
});
