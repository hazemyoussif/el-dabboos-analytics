import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

test('metadata chunk inventory equals the original canonical inventory for empty, historical and current populations',{skip:!enabled},async()=>{
 const migration=await readFile(new URL('../../migrations/postgres/053_prepared_serving.sql',import.meta.url),'utf8');
 const definition=migration.slice(migration.indexOf('CREATE FUNCTION mart.prepared_required_chunks('));
 const original=definition.slice(definition.indexOf('AS $$')+5,definition.indexOf('$$;')).replaceAll('selected_tenant','$1').replaceAll('selected_revision','$2');
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  async function compare(){
   await tenantTransaction(db.ingestor,'a',async client=>{
    const revision=(await client.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id;
    const expected=(await client.query(`SELECT family,kind,period::text,through::text FROM (${original}) inventory ORDER BY family,kind,period,through`,['a',revision])).rows;
    const actual=(await client.query('SELECT family,kind,period::text,through::text FROM mart.prepared_required_chunks($1,$2) ORDER BY family,kind,period,through',['a',revision])).rows;
    assert.deepEqual(actual,expected);
   },true);
  }
  await compare();
  for(const [family,month,current] of [['review','2026-08',false],['business','2026-08',false],['business','2026-09',true]] as const){
   await exposeReviewMonth(db.ingestor,fixture(month,current,family),family);
   await compare();
  }
 }finally{await db.close();}
});
