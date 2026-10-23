import test from 'node:test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {enabled} from './support.ts';
import {syncFixture,acceptedState} from './sync-fixture.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

async function capturedFixture(){
 const fixture=await syncFixture();
 try{
  await assert.rejects(fixture.run(event=>{if(event.step==='sync_checkpoint'&&event.checkpoint==='capture')throw new Error('Synthetic stop');}),/Synthetic stop/);
  const candidate=(await fixture.db.admin.query('SELECT candidate_id,specification FROM mart.analytics_sync_candidates')).rows[0];
  return {...fixture,id:String(candidate.candidate_id),specification:candidate.specification};
 }catch(error){await fixture.db.close();throw error;}
}
async function copyCandidate(client:PoolClient,fixture:Awaited<ReturnType<typeof capturedFixture>>,id:string){
 await client.query('INSERT INTO mart.analytics_sync_candidates VALUES($1,$2,$3)',['a',id,JSON.stringify({...fixture.specification,candidateId:id})]);
}
async function copyHeads(client:PoolClient,original:string,id:string,limit=2){
 await client.query(`INSERT INTO mart.analytics_sync_heads
  SELECT tenant_id,$2,fact_key,revision_id,business_month,measure_id,status,source_object,source_record_id
  FROM mart.analytics_sync_heads WHERE tenant_id='a' AND candidate_id=$1 ORDER BY fact_key LIMIT $3`,[original,id,limit]);
}

test('bounded sync head insertion rejects each mismatched identity field and seals exact heads',{skip:!enabled},async()=>{
 const fixture=await capturedFixture();try{
  for(const field of ['business_month','measure_id','status','source_object','source_record_id']){
   await assert.rejects(tenantTransaction(fixture.db.ingestor,'a',async client=>{
    const id=`synthetic-invalid-${field}`;await copyCandidate(client,fixture,id);
    await client.query(`INSERT INTO mart.analytics_sync_heads
     SELECT tenant_id,$2,fact_key,revision_id,${['business_month','measure_id','status','source_object','source_record_id'].map(column=>column===field?"'synthetic-mismatch'":column).join(',')}
     FROM mart.analytics_sync_heads WHERE tenant_id='a' AND candidate_id=$1 ORDER BY fact_key LIMIT 1`,[fixture.id,id]);
   }),/Exact frozen candidate head identity required/);
  }
  await tenantTransaction(fixture.db.ingestor,'a',async client=>{
   const id='synthetic-exact';await copyCandidate(client,fixture,id);await copyHeads(client,fixture.id,id);
   await client.query('INSERT INTO mart.analytics_sync_dependencies SELECT tenant_id,$2,kind,page,payload FROM mart.analytics_sync_dependencies WHERE tenant_id=$1 AND candidate_id=$3',['a',id,fixture.id]);
   await client.query('INSERT INTO mart.analytics_sync_seals VALUES($1,$2)',['a',id]);
  });
  assert.equal((await fixture.db.admin.query("SELECT count(*)::int count FROM mart.analytics_sync_candidates WHERE candidate_id LIKE 'synthetic-invalid-%'")).rows[0].count,0);
  assert.equal((await fixture.db.admin.query("SELECT count(*)::int count FROM mart.analytics_sync_seals WHERE candidate_id='synthetic-exact'")).rows[0].count,1);
  assert.deepEqual(await acceptedState(fixture.db),fixture.initial);
 }finally{await fixture.db.close();}
});
test('head identity proof remains immutable after capture seals',{skip:!enabled},async()=>{
 const fixture=await capturedFixture();try{
  await assert.rejects(tenantTransaction(fixture.db.migrator,'a',client=>client.query("UPDATE mart.analytics_sync_heads SET source_record_id='synthetic-mismatch' WHERE candidate_id=$1",[fixture.id])),/immutable|Immutable/);
  await assert.rejects(tenantTransaction(fixture.db.migrator,'a',client=>client.query('DELETE FROM mart.analytics_sync_heads WHERE candidate_id=$1',[fixture.id])),/immutable|Immutable/);
  await assert.rejects(tenantTransaction(fixture.db.ingestor,'a',client=>client.query("INSERT INTO mart.analytics_sync_dependencies VALUES('a',$1,'lookup',1,'[]')",[fixture.id])),/Frozen source capture is immutable/);
  assert.deepEqual(await acceptedState(fixture.db),fixture.initial);
 }finally{await fixture.db.close();}
});
test('missing heads and dependency pages cannot seal and the whole incomplete capture rolls back',{skip:!enabled},async()=>{
 const fixture=await capturedFixture();try{
  for(const heads of [1,2]){
   const id=`synthetic-incomplete-${heads}`;
   await assert.rejects(tenantTransaction(fixture.db.ingestor,'a',async client=>{
    await copyCandidate(client,fixture,id);await copyHeads(client,fixture.id,id,heads);
    await client.query('INSERT INTO mart.analytics_sync_seals VALUES($1,$2)',['a',id]);
   }),heads===1?/Incomplete frozen candidate heads/:/Incomplete frozen candidate dependencies/);
  }
  for(const relation of ['analytics_sync_candidates','analytics_sync_heads','analytics_sync_seals']){
   assert.equal((await fixture.db.admin.query(`SELECT count(*)::int count FROM mart.${relation} WHERE candidate_id LIKE 'synthetic-incomplete-%'`)).rows[0].count,0);
  }
  // Upgrade validation must see unsealed rows even with no tenant selected.
  await tenantTransaction(fixture.db.ingestor,'a',async client=>{
   await copyCandidate(client,fixture,'synthetic-pre-upgrade');await copyHeads(client,fixture.id,'synthetic-pre-upgrade',1);
  });
  const upgrade=await readFile(new URL('../../migrations/postgres/083_sync_upgrade_visibility.sql',import.meta.url),'utf8');
  const client=await fixture.db.migrator.connect();
  try{
   await client.query('BEGIN');
   await assert.rejects(client.query(upgrade),/Unsealed sync heads must be resolved/);
  }finally{await client.query('ROLLBACK');client.release();}
  assert.equal((await fixture.db.admin.query("SELECT count(*)::int count FROM pg_policies WHERE policyname='sync_upgrade_scan'")).rows[0].count,0);
  assert.deepEqual(await acceptedState(fixture.db),fixture.initial);
 }finally{await fixture.db.close();}
});
