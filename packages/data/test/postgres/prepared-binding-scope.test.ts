import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {snapshotSource} from './snapshot-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {prepareChunk,requiredPreparedChunks} from '../../src/prepared/preparation.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import type {PreparedStepEvent} from '../../src/prepared/contracts.ts';

for(const fault of ['missing','duplicate'] as const)test(`event proof excludes unrelated ${fault} snapshot identities while snapshot proof still rejects them`,{skip:!enabled},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const source=await snapshotSource('2026-09','business',[
   {measure:'review_customer_balance',entity:'one',customer:'a',value:'100.000000'},
   {measure:'review_customer_balance',entity:'two',customer:'b',value:'50.000000'}
  ]);
  const publication=await exposeReviewMonth(db.ingestor,source,'business');
  // Isolated synthetic corruption after acceptance: event rows stay valid; snapshot amounts and controls stay unchanged.
  // The event must not validate unrelated snapshot identities; an actual snapshot binding must still fail closed.
  // Corrupt the shared synthetic source, so canonical and optimized readers see the same invalid identities.
  // The ordinary immutable trigger remains enabled outside this isolated fixture setup.
  await db.admin.query('ALTER TABLE mart.review_facts DISABLE TRIGGER immutable_history');
  try{
   await db.admin.query("UPDATE mart.review_facts SET payload=jsonb_set(payload,'{entityId}',$1::jsonb) WHERE tenant_id='a' AND payload->>'kind'='snapshot'",[JSON.stringify(fault==='missing'?null:'SYNTHETIC DUPLICATE')]);
  }finally{await db.admin.query('ALTER TABLE mart.review_facts ENABLE TRIGGER immutable_history');}
  const events:PreparedStepEvent[]=[],scope={tenantId:'a',revisionId:publication.revisionId,observeStep:(event:PreparedStepEvent)=>events.push(event)},bounds={maxCellsPerChunk:50000,maxChunks:100};
  const chunks=await tenantTransaction(db.ingestor,'a',client=>requiredPreparedChunks(client,scope,bounds),true);
  const eventChunk=chunks.find(chunk=>chunk.family==='business'&&chunk.kind==='event')!;
  const snapshotChunk=chunks.find(chunk=>chunk.family==='business'&&chunk.kind==='snapshot')!;
  const previousMigration=await readFile(new URL('../../migrations/postgres/055_prepared_build_workspace.sql',import.meta.url),'utf8');
  await db.migrator.query(previousMigration.slice(previousMigration.indexOf('CREATE OR REPLACE FUNCTION mart.guard_prepared_binding()')));
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>prepareChunk(client,scope,eventChunk,bounds)),/Complete unique snapshot identities required/);
  await db.migrator.query(await readFile(new URL('../../migrations/postgres/057_prepared_snapshot_identity_scope.sql',import.meta.url),'utf8'));
  const prepared=await tenantTransaction(db.ingestor,'a',async client=>{
   const result=await prepareChunk(client,scope,eventChunk,bounds);
   await client.query('SAVEPOINT bad_statistics');
   await assert.rejects(client.query(`INSERT INTO mart.prepared_bindings(tenant_id,revision_id,family,kind,period,data_id,input_fingerprint,source_cutoff,statistics)
    SELECT tenant_id,revision_id,family,kind,period,data_id,input_fingerprint,source_cutoff,'{}'::jsonb FROM mart.prepared_bindings
    WHERE tenant_id=$1 AND revision_id=$2 AND family='business' AND kind='event'`,['a',publication.revisionId]),/Prepared row statistics mismatch/);
   await client.query('ROLLBACK TO SAVEPOINT bad_statistics');
   return result;
  });
  assert.ok(prepared.rows>0);assert.ok(events.some(event=>event.step==='binding'&&event.status==='completed'));
  assert.ok(events.some(event=>event.step==='validation'&&event.status==='completed'&&event.grain));
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>prepareChunk(client,scope,snapshotChunk,bounds)),/Complete unique snapshot identities required/);
  const committed=await tenantTransaction(db.ingestor,'a',client=>client.query('SELECT kind FROM mart.prepared_bindings WHERE tenant_id=$1 AND revision_id=$2',['a',publication.revisionId]),true);
  assert.deepEqual(committed.rows,[{kind:'event'}]);
 }finally{await db.close();}
});
