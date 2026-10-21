import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {syncFixture,acceptedState} from './sync-fixture.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {PostgresCheckpointedSyncStore} from '../../src/operational/sync-store.ts';

async function capturedFixture(){
 const f=await syncFixture();
 try {
  await assert.rejects(f.run(event=>{if(event.step==='sync_checkpoint'&&event.checkpoint==='capture')throw new Error('Synthetic stop');}),/Synthetic stop/);
  const candidate=(await f.db.admin.query('SELECT candidate_id,specification FROM mart.analytics_sync_candidates')).rows[0];
  return {...f,id:candidate.candidate_id as string,specification:candidate.specification};
 }catch(error){await f.db.close();throw error;}
}
test('sealed source capture is immutable and incomplete reconciliation cannot be checkpointed',{skip:!enabled},async()=>{
 const f=await capturedFixture();try{
  await assert.rejects(tenantTransaction(f.db.ingestor,'a',client=>client.query("INSERT INTO mart.analytics_sync_dependencies VALUES('a',$1,'receivable',1,'[]')",[f.id])),/Frozen source capture is immutable/);
  await assert.rejects(tenantTransaction(f.db.ingestor,'a',client=>client.query("UPDATE mart.analytics_sync_candidates SET specification='{}' WHERE candidate_id=$1",[f.id])),/permission denied/);
  await assert.rejects(tenantTransaction(f.db.ingestor,'a',client=>client.query("INSERT INTO mart.analytics_sync_reconciliations VALUES('a',$1,$2)",[f.id,JSON.stringify({caseIds:[],caseCount:0,mismatchCount:0,evidenceHash:'no-changes'})])),/every frozen source control/);
  await assert.rejects(tenantTransaction(f.db.ingestor,'a',client=>client.query("DELETE FROM mart.analytics_sync_pending WHERE tenant_id='a'")),/acceptance or exact rejection/);
  assert.deepEqual(await acceptedState(f.db),f.initial);
 }finally{await f.db.close();}
});
test('pending capture prevents unrelated writes and the acceptance flag cannot commit incomplete accepted state',{skip:!enabled},async()=>{
 const f=await capturedFixture();try{
  await assert.rejects(tenantTransaction(f.db.ingestor,'a',client=>client.query("UPDATE mart.analytics_trusted_serving SET revision_id=revision_id WHERE tenant_id='a'")),/unpublished sync candidate/);
  await assert.rejects(tenantTransaction(f.db.ingestor,'a',async client=>{
   await client.query("SELECT set_config('mart.sync_accepting',$1,true)",[f.id]);
   await client.query("UPDATE mart.analytics_source_cursors SET cutoff=cutoff WHERE tenant_id='a'");
  }),/query returned no rows|violates foreign key|Sync acceptance/);
  assert.deepEqual(await acceptedState(f.db),f.initial);
  assert.equal((await f.db.admin.query('SELECT count(*)::int count FROM mart.analytics_sync_acceptances')).rows[0].count,0);
 }finally{await f.db.close();}
});
test('runtime cannot read private captures; tenant RLS and session lock prevent cross-tenant reads and concurrent writers',{skip:!enabled},async()=>{
 const f=await capturedFixture();try{
  for(const table of ['analytics_sync_candidates','analytics_sync_heads','analytics_sync_dependencies','analytics_sync_seals','analytics_sync_pending','analytics_sync_reconciliations','analytics_sync_acceptances']){
   await assert.rejects(tenantTransaction(f.db.runtime,'a',client=>client.query(`SELECT * FROM mart.${table}`)),/permission denied/);
   await tenantTransaction(f.db.ingestor,'b',async client=>assert.equal((await client.query(`SELECT count(*)::int count FROM mart.${table}`)).rows[0].count,0));
  }
  await tenantTransaction(f.db.runtime,'b',async client=>assert.equal((await client.query("SELECT mart.pending_sync_candidate('a') candidate")).rows[0].candidate,null),true);
  const store=new PostgresCheckpointedSyncStore(f.db.ingestor);
  await store.session('a',async()=>{
   await assert.rejects(store.session('a',async()=>{}),/already running/);
   assert.equal(await store.session('b',session=>session.pending()),null);
  });
  assert.equal((await store.session('a',session=>session.pending()))?.candidateId,f.id,'lock released after session completion');
 }finally{await f.db.close();}
});
test('resume refuses stale capture lineage before opening source',{skip:!enabled},async()=>{
 const f=await capturedFixture();try{
  // Isolated fixture corruption simulates restoring incompatible metadata.
  // Production roles cannot mutate a sealed candidate.
  await f.db.migrator.query('ALTER TABLE mart.analytics_sync_candidates DISABLE TRIGGER immutable_history');
  for(const patch of [{parent:'synthetic-other-parent'},{previousCursor:null},{source:{...f.specification.source,mappingVersion:'synthetic-other-version'}}]){
   await tenantTransaction(f.db.migrator,'a',client=>client.query('UPDATE mart.analytics_sync_candidates SET specification=$2 WHERE candidate_id=$1',[f.id,JSON.stringify({...f.specification,...patch})]));
   await assert.rejects(f.run(),/conflicts with accepted parent\/cursor\/definition/);
   assert.equal(f.opens(),1);
  }
  await tenantTransaction(f.db.migrator,'a',client=>client.query('UPDATE mart.analytics_sync_candidates SET specification=$2 WHERE candidate_id=$1',[f.id,JSON.stringify(f.specification)]));
  await f.db.migrator.query('ALTER TABLE mart.analytics_sync_candidates ENABLE TRIGGER immutable_history');
  assert.equal((await f.run()).status,'passed');assert.equal(f.opens(),1);
 }finally{await f.db.close();}
});
