import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
test('business guard preserves exact sets, duplicates, nulls, array shape and tenant/reference denial',{skip:!enabled},async()=>{
 const db=await database();
 try {
  await deploy(db.migrator,mapping('a'));
  const old=await readFile(new URL('../../migrations/postgres/020_runtime_certificate_sets.sql',import.meta.url),'utf8');
  await tenantTransaction(db.migrator,'a',async client=>{
   await client.query(old.slice(old.indexOf('CREATE OR REPLACE FUNCTION mart.business_certified')).replace('mart.business_certified','pg_temp.original_business'));
   const cases=(await client.query("SELECT case_ids FROM mart.release_certifications WHERE tenant_id='a'")).rows[0].case_ids as string[];
   for(const requested of [cases,[...cases].reverse(),[...cases,cases[0]!],cases.slice(1),[...cases,'unknown'],[...cases,null],[],null,[cases],[[null]]]) {
    for(const tenant of ['a','b'])for(const reference of ['SYNTHETIC TEST ONLY','missing']) {
     const row=(await client.query('SELECT mart.business_certified($1,$2,$3,$4::text[]) actual,pg_temp.original_business($1,$2,$3,$4::text[]) expected',[tenant,'release',reference,requested])).rows[0];
     assert.equal(row.actual,row.expected);
    }
   }

  });
 }finally{await db.close();}
});
