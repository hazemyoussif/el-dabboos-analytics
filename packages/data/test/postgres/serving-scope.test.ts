import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,cp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {migratePostgres,migrationDirectory} from '../../src/postgres/migrations.ts';
import {database,enabled} from './support.ts';
import {deploy,mapping,fact,batch,evidence,clock} from './fixtures.ts';
import {PostgresMappingReleases} from '../../src/postgres/mapping-releases.ts';
import {PostgresMartWriter} from '../../src/postgres/writer.ts';
import {tenantTransaction,verifyMartRuntimeRole} from '../../src/postgres/session.ts';
const relations=['mapping_releases','fact_revisions','fact_heads','ingestion_batches','batch_facts','extraction_runs'] as const;
const servingScopeMigration=new URL('../../migrations/postgres/017_statement_serving_scope.sql',import.meta.url);
test('statement scope preserves runtime visibility, unbound/pending exclusion, tenant denial, exact sets and readonly privileges',{skip:!enabled},async()=>{
 const db=await database(false);
 const directory=await mkdtemp('/tmp/serving-scope-before-');
 try {
  const baseline=pathToFileURL(directory+'/');
  await cp(migrationDirectory,baseline,{recursive:true});
  await rm(new URL('017_statement_serving_scope.sql',baseline));
  await rm(new URL('018_derived_exact_sets.sql',baseline));
  await rm(new URL('019_runtime_proof_access_paths.sql',baseline));
  await rm(new URL('020_runtime_certificate_sets.sql',baseline));
  await rm(new URL('021_certified_proof_results.sql',baseline));
  await rm(new URL('022_proof_result_invalidation.sql',baseline));
  await rm(new URL('023_empty_proof_invalidation.sql',baseline));
  await rm(new URL('024_business_certificate_null_scan.sql',baseline));
  await rm(new URL('025_historical_release_members.sql',baseline));
  await rm(new URL('026_operational_reconciliation_runs.sql',baseline));
  await rm(new URL('027_trusted_operational_serving.sql',baseline));
  await rm(new URL('028_operational_partition_access.sql',baseline));
  await rm(new URL('029_stored_anchor_capabilities.sql',baseline));
  await rm(new URL('030_operational_presence_access.sql',baseline));
  await rm(new URL('031_trusted_finance_snapshots.sql',baseline));
  await rm(new URL('032_finance_snapshot_invariants.sql',baseline));
  await rm(new URL('033_finance_snapshot_freeze.sql',baseline));
  await rm(new URL('034_event_serving_rollups.sql',baseline));
  await migratePostgres(db.migrator,baseline);
  for(const tenant of ['a','b','unbound']) {
   await deploy(db.migrator,mapping(tenant));
   await new PostgresMartWriter(db.migrator,{[tenant]:['fixture-company']},clock).commit(batch('visible',1,tenant),[{facts:[fact('visible',{tenantId:tenant,batchId:'visible'})]}],evidence);
  }
  await tenantTransaction(db.migrator,'unbound',client=>client.query("DELETE FROM mart.serving_bindings WHERE tenant_id='unbound'"));
  await new PostgresMappingReleases(db.migrator).registerCandidate({...mapping('pending'),approval:{status:'pending'}});
  const visibility=async()=>{
   const rows:Record<string,unknown>={};
   for(const tenant of ['a','b','unbound','pending']) rows[tenant]=await tenantTransaction(db.runtime,tenant,async client=>{
    const result:Record<string,unknown>={};
    for(const relation of relations) result[relation]=(await client.query(`SELECT to_jsonb(record)::text row FROM mart.${relation} record ORDER BY to_jsonb(record)::text`)).rows;
    return result;
   },true);
   return rows;
  };
  const before=await visibility();
  await db.migrator.query(await readFile(servingScopeMigration,'utf8'));
  assert.deepEqual(await visibility(),before);
  await verifyMartRuntimeRole(db.runtime);
  assert.equal((await db.runtime.query("SELECT * FROM mart.certified_serving_scope('a')")).rowCount,0);
  await tenantTransaction(db.runtime,'a',async client=>{
   assert.deepEqual((await client.query("SELECT * FROM mart.certified_serving_scope('a')")).rows,[{tenant_id:'a',dataset_id:'release'}]);
   assert.equal((await client.query("SELECT * FROM mart.certified_serving_scope('b')")).rowCount,0);
  });
  await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query('UPDATE mart.fact_heads SET source_revision=source_revision')),/permission/);
  await tenantTransaction(db.migrator,'a',async client=>{
   const cases=(await client.query("SELECT approval_case_ids FROM mart.mapping_releases WHERE tenant_id='a' AND dataset_id='release'")).rows[0].approval_case_ids as string[];
   for(const requested of [[...cases].reverse(),[...cases,cases[0]!]])assert.equal((await client.query("SELECT mart.business_certified('a','release','SYNTHETIC TEST ONLY',$1) valid",[requested])).rows[0].valid,true);
   for(const requested of [cases.slice(1),[...cases,'unknown'],[...cases,null],null])assert.equal((await client.query("SELECT mart.business_certified('a','release','SYNTHETIC TEST ONLY',$1) valid",[requested])).rows[0].valid,false);
  });
 } finally {await db.close();await rm(directory,{recursive:true});}
});
