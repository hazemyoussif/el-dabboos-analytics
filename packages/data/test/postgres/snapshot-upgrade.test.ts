import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm} from 'node:fs/promises';
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
  (SELECT count(*)::integer FROM mart.review_controls) controls,
  (SELECT jsonb_agg(to_jsonb(member) ORDER BY revision_id,family,month) FROM mart.analytics_serving_members member) membership,
  (SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a') trusted_revision,
  (SELECT jsonb_build_array(relrowsecurity,relforcerowsecurity) FROM pg_class WHERE oid='mart.review_facts'::regclass) rls`)).rows[0];
}
test('populated schema-49 upgrade adds the snapshot index without rewriting facts, controls, serving history or RLS',{skip:!enabled},async()=>{
 const db=await database(false),directory=await mkdtemp('/tmp/dabboos-snapshot-upgrade-'),manifest=pathToFileURL(directory+'/');
 try{
  await cp(migrationDirectory,manifest,{recursive:true});
  await rm(new URL('050_review_snapshot_identity.sql',manifest));
  await migratePostgres(db.migrator,manifest);
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  await exposeReviewMonth(db.ingestor,fixture('2026-09',false,'review'));
  const before=await preservedState(db.admin);
  assert.deepEqual(await migratePostgres(db.migrator),[50]);
  assert.deepEqual(await preservedState(db.admin),before);
  assert.deepEqual(await migratePostgres(db.migrator),[]);
  const index=(await db.admin.query("SELECT indisvalid,indisunique FROM pg_index WHERE indexrelid='mart.review_facts_snapshot_identity'::regclass")).rows[0];
  assert.deepEqual(index,{indisvalid:true,indisunique:false});
  const result=await new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}).execute({metric:'receivables_due_for_collection',groupBy:'customer',dateRange:{from:'2026-09-01',to:'2026-09-30'}},{tenantId:'a',locale:'en'});
  assert.equal(result.rows[0]?.value,1);assert.equal(result.metadata.release?.financeReview,'pending');
 }finally{await db.close();await rm(directory,{recursive:true});}
});
