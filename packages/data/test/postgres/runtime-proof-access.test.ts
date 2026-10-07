import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

test('set-based technical proof preserves correlated proof results and runtime tenant boundary',{skip:!enabled},async()=>{
 const db=await database();
 try {
  await deploy(db.migrator,mapping());
  const original=await readFile(new URL('../../migrations/postgres/006_ingestion_lifecycle.sql',import.meta.url),'utf8');
  const start=original.indexOf('CREATE FUNCTION mart.reconciliation_certified(');
  const end=original.indexOf('REVOKE ALL ON FUNCTION mart.reconciliation_certified',start);
  const previous=original.slice(start,end).replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION');
  const current=await readFile(new URL('../../migrations/postgres/020_runtime_certificate_sets.sql',import.meta.url),'utf8');
  const replacement=current.slice(current.indexOf('CREATE OR REPLACE FUNCTION'),current.indexOf('-- Most runtime'));
  await tenantTransaction(db.migrator,'a',async client=>{
   const cases=(await client.query("SELECT approval_case_ids FROM mart.mapping_releases WHERE tenant_id='a' AND dataset_id='release'")).rows[0].approval_case_ids as string[];
   const inputs=[cases,[...cases].reverse(),cases.slice(1),[],null,[...cases,cases[0]!],[...cases,null],[...cases,'missing']];
   const evaluate=async()=>{
    const results:unknown[]=[];
    for(const tenant of ['a','b']) for(const version of ['1','wrong']) for(const selected of inputs)
     results.push((await client.query('SELECT mart.reconciliation_certified($1,$2,$3,$4) valid',[tenant,'release',version,selected])).rows[0].valid);
    return results;
   };
   await client.query(previous);const before=await evaluate();
   await client.query(replacement);assert.deepEqual(await evaluate(),before);
   assert.equal(before[0],true);
  });
  await tenantTransaction(db.runtime,'b',async client=>{
   assert.equal((await client.query("SELECT mart.reconciliation_certified('a','release','1',ARRAY['fixture-certification-order_revenue']) valid")).rows[0].valid,false);
  },true);
 }finally{await db.close();}
});
