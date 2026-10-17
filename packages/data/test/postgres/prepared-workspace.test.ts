import test from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {prepareRevision} from '../../src/prepared/preparation.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

async function rejectedStep(client:PoolClient,operation:()=>Promise<unknown>,pattern:RegExp){
 await client.query('SAVEPOINT rejected_step');
 await assert.rejects(operation,pattern);
 await client.query('ROLLBACK TO SAVEPOINT rejected_step');
}
test('controlled preparation works without ingestion TEMP and rejects workspace tampering, skipped proof and runtime access',{skip:!enabled},async()=>{
 const db=await database();
 try{
  const name=(await db.admin.query('SELECT current_database() name')).rows[0].name;
  await db.admin.query(`REVOKE TEMPORARY ON DATABASE ${name} FROM PUBLIC`);
  assert.equal((await db.ingestor.query("SELECT has_database_privilege(current_database(),'TEMPORARY') allowed")).rows[0].allowed,false);
  await assert.rejects(db.ingestor.query('CREATE TEMPORARY TABLE forbidden_workspace(value integer)'),/permission denied/);
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const publication=await exposeReviewMonth(db.ingestor,fixture('2026-09'),'business');
  await tenantTransaction(db.ingestor,'a',async client=>{
   const config=(await client.query("SELECT mart.prepared_configuration($1,$2,'business','event','2026-09-01','2026-09-30') config",['a',publication.revisionId])).rows[0].config;
   const params=['a',publication.revisionId,JSON.stringify(config)];
   await rejectedStep(client,()=>client.query('SELECT mart.prepared_work_start($1,$2,$3,50000,50000)',['b',...params.slice(1)]),/identity/);
   await rejectedStep(client,()=>client.query('SELECT mart.prepared_work_start($1,$2,$3,1,1)',params),/population storage bound/);
   await client.query('SELECT mart.prepared_work_start($1,$2,$3,50000,50000)',params);
   await rejectedStep(client,()=>client.query('DELETE FROM pg_temp.prepared_work_population'),/permission denied/);
   await rejectedStep(client,()=>client.query('SELECT mart.prepared_work_read($1,$2,$3)',params),/incomplete/);
   await rejectedStep(client,()=>client.query('SELECT mart.prepared_work_seal($1,$2,$3)',params),/incomplete/);
   await client.query('SELECT mart.prepared_work_generate($1,$2,$3)',params);
   await rejectedStep(client,()=>client.query('SELECT mart.prepared_work_validate($1,$2,$3,$4,$5)',[...params,config.grains[0].id,'compare']),/out of order/);
   await rejectedStep(client,()=>client.query('SELECT mart.prepared_work_start($1,$2,$3,50000,50000)',['a',publication.revisionId,JSON.stringify({...config,currency:'SYNTHETIC_WRONG'})]),/governed inputs/);
   await prepareRevision(client,{tenantId:'a',revisionId:publication.revisionId},{maxCellsPerChunk:50000,maxChunks:100});
   const bindings=(await client.query('SELECT data_id,configuration,prepared_at FROM mart.prepared_bindings JOIN mart.prepared_datasets USING(tenant_id,data_id) WHERE tenant_id=$1 AND revision_id=$2',['a',publication.revisionId])).rows;
   assert.ok(bindings.length>0);assert.ok(bindings.every(binding=>binding.prepared_at instanceof Date));
   for(const binding of bindings){
    assert.equal((await client.query('SELECT mart.prepared_cells_exact($1,$2,$3,$4) exact',['a',publication.revisionId,JSON.stringify(binding.configuration),binding.data_id])).rows[0].exact,true);
   }
  });
  const client=await db.ingestor.connect();
  try{assert.equal((await client.query("SELECT to_regclass('pg_temp.prepared_work_state') workspace")).rows[0].workspace,null);}finally{client.release();}
  await assert.rejects(db.runtime.query('SELECT mart.prepared_work_start($1,$2,$3,1,1)',['a',publication.revisionId,'{}']),/permission denied/);
  await assert.rejects(db.runtime.query('SELECT mart.prepared_work_read($1,$2,$3)',['a',publication.revisionId,'{}']),/permission denied/);
  await assert.rejects(db.ingestor.query("SELECT mart.prepared_work_grain_sql('{}','{}','{}')"),/permission denied/);
 }finally{await db.close();}
});
