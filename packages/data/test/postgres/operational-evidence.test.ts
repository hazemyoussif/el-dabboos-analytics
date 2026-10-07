import test from 'node:test';
import assert from 'node:assert/strict';
import type { AnalyticsJobRun } from '@el-dabboos/domain';
import { database,enabled } from './support.ts';
import { deploy,mapping } from './fixtures.ts';
import { tenantTransaction } from '../../src/postgres/session.ts';
import { PostgresOperationalStatus,readOperationalEvidenceHash,recordOperationalRun,writeOperationalCursor } from '../../src/postgres/operational-evidence.ts';

function run(patch:Partial<AnalyticsJobRun>={}):AnalyticsJobRun {
 return {tenantId:'a',actorId:'synthetic-admin',trigger:'manual',kind:'sync',runId:'synthetic-run',sourceCutoff:'2026-01-01T10:00:00Z',sourceRevision:'freeze-1',mappingVersion:'1',definitionVersion:'1',startedAt:'2026-01-01T10:00:01Z',completedAt:'2026-01-01T10:00:02Z',status:'passed',recordsChanged:1,partitionsAffected:1,caseCount:1,mismatchCount:0,evidenceHash:'replaced-with-persisted-hash',servingRelease:'release',...patch};
}
test('operational evidence: append-only exact cases, cursor guards, immutable certificate and tenant/runtime isolation',{skip:!enabled},async()=>{
 const db=await database();
 try {
  await deploy(db.migrator,mapping());
  const caseIds=['fixture-certification-revenue'];
  await tenantTransaction(db.ingestor,'a',async client=>{
   const evidenceHash=await readOperationalEvidenceHash(client,'a',caseIds);
   await assert.rejects(tenantTransaction(db.migrator,'a',other=>recordOperationalRun(other,run({runId:'forged',evidenceHash:'forged'}),caseIds)),/exact source\/mart/);
   await recordOperationalRun(client,run({evidenceHash}),caseIds);
   await writeOperationalCursor(client,{tenantId:'a',runId:'synthetic-run',cursor:{cutoff:'2026-01-01T10:00:00Z',objects:{sale_order:'synthetic-modification-cursor'}}});
  });
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>writeOperationalCursor(client,{tenantId:'a',runId:'synthetic-run',cursor:{cutoff:'2026-01-01T11:00:00Z',objects:{}}})),/bounded sync/);
  await assert.rejects(tenantTransaction(db.migrator,'a',client=>client.query('UPDATE mart.analytics_operation_runs SET actor_id=$1',['changed'])),/Immutable|immutable/);
  await assert.rejects(tenantTransaction(db.runtime,'a',client=>recordOperationalRun(client,run({status:'unchanged',caseCount:0,recordsChanged:0,partitionsAffected:0,evidenceHash:'no-changes',runId:'evil'}),[])),/permission/);
  const status=await new PostgresOperationalStatus(db.runtime,600).status('a');
  assert.equal(status.latest[0]?.runId,'synthetic-run');assert.equal(status.cursor?.cutoff,'2026-01-01T10:00:00.000Z');assert.equal(status.trustedCertificationRelease,'release');
  const other=await new PostgresOperationalStatus(db.runtime).status('b');assert.deepEqual(other.latest,[]);assert.equal(other.cursor,null);assert.equal(other.trustedCertificationRelease,null);
  await tenantTransaction(db.migrator,'a',async client=>assert.equal((await client.query('SELECT count(*) FROM mart.release_certifications WHERE tenant_id=$1',['a'])).rows[0].count,'1'));
 }finally{await db.close();}
});
test('cursor advancement and run audit roll back together on transaction failure',{skip:!enabled},async()=>{
 const db=await database();
 try {
  const unchanged=run({status:'unchanged',recordsChanged:0,partitionsAffected:0,caseCount:0,evidenceHash:'no-changes'});
  await assert.rejects(tenantTransaction(db.ingestor,'a',async client=>{
   await recordOperationalRun(client,unchanged,[]);
   await writeOperationalCursor(client,{tenantId:'a',runId:unchanged.runId,cursor:{cutoff:unchanged.sourceCutoff,objects:{}}});
   throw new Error('synthetic promotion failure');
  }),/synthetic/);
  const status=await new PostgresOperationalStatus(db.runtime).status('a');assert.equal(status.cursor,null);assert.deepEqual(status.latest,[]);
 }finally{await db.close();}
});
