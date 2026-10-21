import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {syncFixture,acceptedState,syntheticFact,request,impact} from './sync-fixture.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {PostgresOperationalStatus} from '../../src/postgres/operational-evidence.ts';
import {PostgresCheckpointedSyncStore} from '../../src/operational/sync-store.ts';
import {CheckpointedAnalyticsSync} from '../../../application/src/analytics-sync.ts';
import {AnalyticsOperations} from '../../../application/src/analytics-operations.ts';
import {PostgresOperationalStore} from '../../src/operational/store.ts';
import type {OperationalProgressObserver} from '../../src/operational/progress.ts';

const interruptAt=(phase:string):OperationalProgressObserver=>event=>{
 if(event.step==='sync_checkpoint'&&event.checkpoint===phase)throw new Error(`Synthetic interruption after ${phase}`);
};
async function pending(f:Awaited<ReturnType<typeof syncFixture>>){return (await f.db.admin.query('SELECT candidate_id FROM mart.analytics_sync_pending')).rows[0]?.candidate_id as string|undefined;}

test('checkpointed sync resumes committed capture, evidence, months and preparation without reopening source; acceptance rolls back together',{skip:!enabled},async()=>{
 const f=await syncFixture(true);
 try{
  await assert.rejects(f.run(interruptAt('capture')),/Synthetic interruption/);
  const candidate=await pending(f);assert.ok(candidate);assert.equal(f.opens(),1);assert.equal(f.closes(),1);
  assert.deepEqual(await acceptedState(f.db),f.initial);
  assert.equal((await new PostgresOperationalStatus(f.db.runtime).status('a')).pendingCandidateRun,candidate);
  await assert.rejects(f.run(interruptAt('reconciliation')),/Synthetic interruption/);
  const evidence=(await f.db.admin.query('SELECT evidence FROM mart.analytics_sync_reconciliations')).rows;
  assert.equal(evidence.length,1);assert.ok(evidence[0].evidence.caseCount>0);
  await assert.rejects(f.run(interruptAt('month')),/Synthetic interruption/);
  const first=(await f.db.admin.query("SELECT partition_id FROM mart.analytics_serving_members WHERE revision_id=$1 AND family='facts' AND month='2026-01-01'",[candidate])).rows[0].partition_id;
  await assert.rejects(f.run(interruptAt('prepared_chunk')),/Synthetic interruption/);
  assert.equal((await f.db.admin.query("SELECT partition_id FROM mart.analytics_serving_members WHERE revision_id=$1 AND month='2026-01-01' AND family='facts'",[candidate])).rows[0].partition_id,first);
  const bindings=(await f.db.admin.query('SELECT data_id FROM mart.prepared_bindings WHERE revision_id=$1',[candidate])).rows;assert.ok(bindings.length>0);
  assert.deepEqual((await f.db.admin.query('SELECT evidence FROM mart.analytics_sync_reconciliations')).rows,evidence);
  await tenantTransaction(f.db.runtime,'a',async client=>{
   for(const relation of ['analytics_serving_members','analytics_serving_revisions','prepared_bindings','prepared_revision_seals'])assert.equal((await client.query(`SELECT count(*)::int count FROM mart.${relation} WHERE revision_id=$1`,[candidate])).rows[0].count,0,relation);
   for(const relation of ['analytics_partitions','analytics_aggregate_bases','analytics_monthly_bases','analytics_partition_facts'])assert.equal((await client.query(`SELECT count(*)::int count FROM mart.${relation} WHERE partition_id=$1`,[first])).rows[0].count,0,relation);
   assert.equal((await client.query('SELECT count(*)::int count FROM mart.analytics_fact_revisions')).rows[0].count,0);
   for(const relation of ['prepared_cells','prepared_datasets'])assert.equal((await client.query(`SELECT count(*)::int count FROM mart.${relation} WHERE data_id=$1`,[bindings[0].data_id])).rows[0].count,0,relation);
  },true);
  await f.db.migrator.query("CREATE FUNCTION mart.synthetic_acceptance_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic dependency acceptance failure'; END $$; CREATE TRIGGER synthetic_acceptance_failure BEFORE INSERT ON mart.analytics_lookup_dependency_checkpoints FOR EACH ROW EXECUTE FUNCTION mart.synthetic_acceptance_failure()");
  await assert.rejects(f.run(),/Synthetic dependency acceptance failure/);
  assert.deepEqual(await acceptedState(f.db),f.initial);
  assert.equal((await f.db.admin.query('SELECT count(*)::int count FROM mart.analytics_operation_runs WHERE run_id=$1',[candidate])).rows[0].count,0);
  assert.equal((await f.db.admin.query('SELECT count(*)::int count FROM mart.analytics_sync_acceptances')).rows[0].count,0);
  assert.equal(await pending(f),candidate);
  await f.db.migrator.query('DROP TRIGGER synthetic_acceptance_failure ON mart.analytics_lookup_dependency_checkpoints');
  // A different process/store resumes with an unusable source port.
  const run=await new CheckpointedAnalyticsSync({store:new PostgresCheckpointedSyncStore(f.db.ingestor),source:{open:async()=>{throw new Error('Source must remain closed');}},impact,clock:()=>new Date(),runId:()=> 'synthetic-resume'}).run(request);
  assert.equal(run.status,'passed');assert.equal(run.runId,candidate);assert.equal(f.opens(),1);
  const accepted=await acceptedState(f.db);assert.equal(accepted.release,candidate);assert.equal(accepted.heads.length,2);
  assert.equal(accepted.cursor[0].run_id,candidate);assert.equal(accepted.dependencies[0].run_id,candidate);assert.equal(accepted.lookups[0].run_id,candidate);
  assert.equal(await pending(f),undefined);
  assert.deepEqual((await f.db.admin.query('SELECT evidence FROM mart.analytics_sync_reconciliations')).rows,evidence);
  await tenantTransaction(f.db.runtime,'a',async client=>{
   assert.equal((await client.query('SELECT count(*)::int count FROM mart.analytics_fact_revisions')).rows[0].count,2);
   assert.ok((await client.query('SELECT count(*)::int count FROM mart.prepared_bindings WHERE revision_id=$1',[candidate])).rows[0].count>0);
  },true);
 }finally{await f.db.close();}
});

test('incomplete capture rolls back staging; exact mismatch retains private evidence without advancing accepted state',{skip:!enabled},async()=>{
 const f=await syncFixture();try{
  f.state.interrupt=true;await assert.rejects(f.run(),/Synthetic capture interruption/);
  assert.equal(await pending(f),undefined);assert.deepEqual(await acceptedState(f.db),f.initial);
  for(const table of ['analytics_sync_candidates','analytics_sync_heads','analytics_fact_revisions'])assert.equal((await f.db.admin.query(`SELECT count(*)::int count FROM mart.${table}`)).rows[0].count,0);
  f.state.interrupt=false;f.state.failControls=true;
  const run=await f.run();assert.equal(run.status,'failed');assert.ok(run.mismatchCount>0);assert.equal(await pending(f),undefined);
  assert.deepEqual(await acceptedState(f.db),f.initial);
  assert.equal((await f.db.admin.query('SELECT count(*)::int count FROM mart.analytics_sync_seals')).rows[0].count,1);
  await tenantTransaction(f.db.runtime,'a',async client=>{assert.equal((await client.query('SELECT count(*)::int count FROM mart.analytics_fact_revisions')).rows[0].count,0);},true);
 }finally{await f.db.close();}
});

test('unchanged sync accepts dependency observations and cutoff without creating a publication',{skip:!enabled},async()=>{
 const f=await syncFixture();try{
  f.state.changed=[];f.state.population=[];
  const run=await f.run();assert.equal(run.status,'unchanged');assert.equal(run.caseCount,0);
  const state=await acceptedState(f.db);assert.equal(state.release,f.initial.release);assert.deepEqual(state.heads,f.initial.heads);
  assert.equal(state.cursor[0].run_id,run.runId);assert.equal(state.dependencies[0].run_id,run.runId);assert.equal(state.lookups[0].run_id,run.runId);
  assert.equal((await f.db.admin.query('SELECT count(*)::int count FROM mart.analytics_serving_revisions WHERE revision_id=$1',[run.runId])).rows[0].count,0);
 }finally{await f.db.close();}
});

test('real labels, coordinates, backdated moves and tombstones survive checkpointed acceptance',{skip:!enabled},async()=>{
 const f=await syncFixture();try{
  await f.run();
  const renamed=syntheticFact('one','2026-01-15',{sourceRevision:'3',displayLabels:{businessLine:'SYNTHETIC RENAMED'},transaction:{
   sourceCompanyId:'1',state:'confirmed',documentType:'synthetic',paymentState:null,untaxedAmount:'100.000000',taxAmount:'0.000000',totalAmount:'100.000000',currency:'IQD',
   labels:{customer:null,salesperson:null,businessLine:'SYNTHETIC RENAMED',state:null},area:null,relatedLines:[],location:{latitude:'30',longitude:'31',shopGps:null}}});
  f.snapshot.cutoff='2026-03-02T00:00:00.000Z';f.state.changed=[renamed];f.state.population=[renamed,f.state.population[1]!];
  assert.equal((await f.run()).status,'passed');
  let payload=(await f.db.admin.query("SELECT payload FROM mart.analytics_fact_heads JOIN mart.analytics_fact_revisions USING(tenant_id,fact_key,revision_id) WHERE payload->>'sourceRecordId'='one'")).rows[0].payload;
  assert.equal(payload.displayLabels.businessLine,'SYNTHETIC RENAMED');assert.deepEqual(payload.transaction.location,{latitude:'30',longitude:'31',shopGps:null});
  const moved={...renamed,businessDate:'2026-02-01',sourceRevision:'4'};
  const tombstone={...f.state.population[1]!,status:'tombstone' as const,sourceRevision:'4'};
  f.snapshot.cutoff='2026-03-03T00:00:00.000Z';f.state.changed=[moved,tombstone];f.state.population=[moved,tombstone];
  const run=await f.run();assert.equal(run.status,'passed');
  payload=(await f.db.admin.query("SELECT payload FROM mart.analytics_fact_heads JOIN mart.analytics_fact_revisions USING(tenant_id,fact_key,revision_id) WHERE payload->>'sourceRecordId'='two'")).rows[0].payload;
  assert.equal(payload.status,'tombstone');
  const monthly=(await f.db.admin.query("SELECT to_char(member.month,'YYYY-MM') AS period,coalesce(sum(base.value),0)::text value FROM mart.analytics_serving_members member LEFT JOIN mart.analytics_aggregate_bases base USING(tenant_id,partition_id) WHERE revision_id=$1 AND family='facts' GROUP BY member.month ORDER BY member.month",[run.servingRelease])).rows;
  assert.deepEqual(monthly.map(row=>[row.period,Number(row.value)]),[['2026-01',0],['2026-02',100]]);
 }finally{await f.db.close();}
});

test('migration retains exact proof and deferred run guards for the existing atomic operational path',{skip:!enabled},async()=>{
 const f=await syncFixture();try{
  const id='synthetic-legacy-run';
  const run=await new AnalyticsOperations({store:new PostgresOperationalStore(f.db.ingestor,id),source:f.source,impact,clock:()=>new Date(),runId:()=>id}).run(request);
  assert.equal(run.status,'passed');assert.equal((await acceptedState(f.db)).heads.length,2);
  assert.equal((await f.db.admin.query('SELECT count(*)::int count FROM mart.analytics_sync_candidates')).rows[0].count,0);
  assert.equal((await f.db.admin.query('SELECT count(*)::int count FROM mart.analytics_aggregate_proofs')).rows[0].count,3);
 }finally{await f.db.close();}
});
