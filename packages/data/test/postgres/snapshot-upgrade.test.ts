import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {Pool} from 'pg';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {migratePostgres,migrationDirectory} from '../../src/postgres/migrations.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';

async function preservedState(pool:Pool){
 return (await pool.query(`SELECT pg_relation_filenode('mart.review_facts') heap_identity,
  (SELECT jsonb_agg(payload ORDER BY fact_key) FROM mart.review_facts) facts,
  (SELECT jsonb_agg(to_jsonb(control) ORDER BY partition_id,measure_id,scope_key) FROM mart.review_controls control) controls,
  (SELECT jsonb_agg(to_jsonb(member) ORDER BY revision_id,family,month) FROM mart.analytics_serving_members member) membership,
  (SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a') trusted_revision,
  (SELECT jsonb_build_array(relrowsecurity,relforcerowsecurity) FROM pg_class WHERE oid='mart.review_facts'::regclass) rls`)).rows[0];
}
for(const version of [49,50,51])test(`populated schema-${version} upgrade covers reads without rewriting facts, controls, serving history or RLS`,{skip:!enabled},async()=>{
 const db=await database(false),directory=await mkdtemp('/tmp/dabboos-snapshot-upgrade-'),manifest=pathToFileURL(directory+'/');
 try{
  await cp(migrationDirectory,manifest,{recursive:true});
  if(version===49)await rm(new URL('050_review_snapshot_identity.sql',manifest));
  if(version<51)await rm(new URL('051_review_typed_cover.sql',manifest));
  await rm(new URL('052_review_amount_cover.sql',manifest));
  await migratePostgres(db.migrator,manifest);
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  await exposeReviewMonth(db.ingestor,fixture('2026-09',false,'review'));
  const before=await preservedState(db.admin);
  if(version===50){
   const replacement=await readFile(new URL('051_review_typed_cover.sql',migrationDirectory),'utf8');
   await writeFile(new URL('051_review_typed_cover.sql',manifest),replacement+'\nSELECT nonexistent_column;');
   await assert.rejects(migratePostgres(db.migrator,manifest),/nonexistent_column/);
   assert.deepEqual(await preservedState(db.admin),before);
   assert.equal((await db.admin.query("SELECT indnatts FROM pg_index WHERE indexrelid='mart.review_facts_typed_access'::regclass")).rows[0].indnatts,4,'a failed replacement restores the old index');
   assert.equal((await db.admin.query('SELECT max(version) version FROM mart_admin.mart_schema_migrations')).rows[0].version,50);
  }
  if(version===51){
   const indexState=async()=> (await db.admin.query("SELECT oid,relfilenode,pg_get_indexdef(oid) definition FROM pg_class WHERE oid='mart.review_facts_typed_access'::regclass")).rows[0];
   const originalIndex=await indexState(),replacement=await readFile(new URL('052_review_amount_cover.sql',migrationDirectory),'utf8');
   await writeFile(new URL('052_review_amount_cover.sql',manifest),replacement.replace('ALTER INDEX mart.review_facts_amount_cover','SELECT nonexistent_column;\nALTER INDEX mart.review_facts_amount_cover'));
   await assert.rejects(migratePostgres(db.migrator,manifest),/nonexistent_column/);
   assert.deepEqual(await indexState(),originalIndex);assert.deepEqual(await preservedState(db.admin),before);
   assert.equal((await db.admin.query("SELECT to_regclass('mart.review_facts_amount_cover') duplicate")).rows[0].duplicate,null);
   assert.equal((await db.admin.query('SELECT max(version) version FROM mart_admin.mart_schema_migrations')).rows[0].version,51);
  }
  assert.deepEqual(await migratePostgres(db.migrator),version===49?[50,51,52]:version===50?[51,52]:[52]);
  assert.deepEqual(await preservedState(db.admin),before);
  assert.deepEqual(await migratePostgres(db.migrator),[]);
  const index=(await db.admin.query("SELECT indisvalid,indisunique FROM pg_index WHERE indexrelid='mart.review_facts_snapshot_identity'::regclass")).rows[0];
  assert.deepEqual(index,{indisvalid:true,indisunique:false});
  const typed=(await db.admin.query("SELECT indisvalid,indisunique,indnkeyatts,indnatts FROM pg_index WHERE indexrelid='mart.review_facts_typed_access'::regclass")).rows[0];
  assert.deepEqual(typed,{indisvalid:true,indisunique:false,indnkeyatts:4,indnatts:5});
  assert.equal((await db.admin.query("SELECT to_regclass('mart.review_facts_typed_cover') duplicate")).rows[0].duplicate,null);
  const result=await new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}).execute({metric:'receivables_due_for_collection',groupBy:'customer',dateRange:{from:'2026-09-01',to:'2026-09-30'}},{tenantId:'a',locale:'en'});
  assert.equal(result.rows[0]?.value,1);assert.equal(result.metadata.release?.financeReview,'pending');
 }finally{await db.close();await rm(directory,{recursive:true});}
});
