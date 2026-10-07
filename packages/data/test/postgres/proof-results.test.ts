import assert from 'node:assert/strict';
import test from 'node:test';
import {database,enabled} from './support.ts';
import {deploy,mapping,batch,fact,evidence,clock} from './fixtures.ts';
import {tenantTransaction,verifyMartRuntimeRole} from '../../src/postgres/session.ts';
import {PostgresMartWriter} from '../../src/postgres/writer.ts';

test('verified results preserve proof outputs, deny runtime access and invalidate atomically on input writes',{skip:!enabled},async()=>{
 const db=await database();
 try {
  await deploy(db.migrator,mapping());
  await tenantTransaction(db.migrator,'a',async client=>{
   await client.query("SELECT mart.refresh_proof_results('a','release')");
   const cases=(await client.query('SELECT case_ids FROM mart.technical_proof_results')).rows[0].case_ids as string[];
   for(const scope of ['a','b']) for(const version of ['1','wrong']) for(const selected of [cases,[...cases].reverse(),[...cases,cases[0]!],[],null,[...cases,null],[...cases,'missing']]) {
    const result=(await client.query('SELECT mart.reconciliation_certified($1,$2,$3,$4) cached,mart.reconciliation_certified_uncached($1,$2,$3,$4) live',[scope,'release',version,selected])).rows[0];
    assert.equal(result.cached,result.live);
   }
  });
  await verifyMartRuntimeRole(db.runtime);
  for(const sql of ['SELECT * FROM mart.technical_proof_results',"SELECT mart.refresh_proof_results('a','release')","SELECT mart.reconciliation_certified_uncached('a','release','1',ARRAY['missing'])"])
   await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query(sql),true),/permission/);
  await assert.rejects(tenantTransaction(db.migrator,'a',async client=>{
   await client.query("UPDATE mart.fact_heads SET source_revision=source_revision");
   await client.query("SELECT mart.refresh_proof_results('b','release')");
  }),/tenant scope/);
  const writer=new PostgresMartWriter(db.migrator,{a:['fixture-company']},clock);
  await writer.commit(batch('changed',1),[{facts:[fact('changed',{batchId:'changed'})]}],evidence);
  assert.equal((await tenantTransaction(db.migrator,'a',client=>client.query('SELECT count(*)::int count FROM mart.technical_proof_results'))).rows[0].count,0);
  await tenantTransaction(db.migrator,'a',client=>client.query("SELECT mart.refresh_proof_results('a','release')"));
  assert.equal((await tenantTransaction(db.migrator,'a',client=>client.query('SELECT count(*)::int count FROM mart.technical_proof_results'))).rows[0].count,1);
  await tenantTransaction(db.migrator,'a',client=>client.query('TRUNCATE mart.reconciliation_batches'));
  assert.equal((await tenantTransaction(db.migrator,'a',client=>client.query('SELECT count(*)::int count FROM mart.technical_proof_results'))).rows[0].count,0);
 }finally{await db.close();}
});
