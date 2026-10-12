import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantTransaction, verifyMartRuntimeRole } from '../../src/postgres/session.ts';
import { deploy, mapping } from './fixtures.ts';
import { database, enabled } from './support.ts';
test('roles/RLS: forced scope, read-only runtime, immutable history, no DDL or role escalation and pool reuse', { skip: !enabled }, async () => {
  const db = await database();
  try {
    await verifyMartRuntimeRole(db.runtime);
    assert.equal((await db.runtime.query('SELECT count(*)::int count FROM mart_admin.mart_schema_migrations')).rows[0].count,42);
    await assert.rejects(db.runtime.query('UPDATE mart_admin.mart_schema_migrations SET name=name'));
    for(const relation of ['analytics_partition_facts','analytics_drill_partitions','analytics_fact_revisions']){assert.equal((await db.runtime.query(`SELECT * FROM mart.${relation}`)).rowCount,0);await assert.rejects(db.runtime.query(`DELETE FROM mart.${relation}`));}
    await assert.rejects(verifyMartRuntimeRole(db.ingestor), /read-only/);
    await assert.rejects(verifyMartRuntimeRole(db.migrator), /read-only/);
    await assert.rejects(verifyMartRuntimeRole(db.admin), /read-only/);
    assert.equal((await db.admin.query("SELECT has_schema_privilege('dabboos_source_reader','mart','USAGE') allowed")).rows[0].allowed,false);
    for (const tenant of ['a','b']) await deploy(db.migrator,mapping(tenant));
    assert.equal((await db.runtime.query('SELECT * FROM mart.mapping_releases')).rowCount,0);
    for (const tenant of ['a','b','a']) await tenantTransaction(db.runtime,tenant,async c => {
      assert.deepEqual((await c.query('SELECT tenant_id FROM mart.mapping_releases')).rows, [{ tenant_id: tenant }]);
      assert.equal((await c.query('SELECT * FROM mart.mapping_releases WHERE tenant_id=$1', [tenant === 'a' ? 'b' : 'a'])).rowCount,0);
    }, true);
    assert.equal((await db.runtime.query('SELECT * FROM mart.mapping_releases')).rowCount,0);
    await db.admin.query("DELETE FROM mart.serving_bindings WHERE tenant_id='b'");
    assert.equal((await tenantTransaction(db.runtime,'b',c => c.query('SELECT * FROM mart.mapping_releases'),true)).rowCount,0);
    for (const sql of ["INSERT INTO mart.fact_heads VALUES ('a','release','x',1)","UPDATE mart.mapping_releases SET business_basis='x'","DELETE FROM mart.fact_revisions", "UPDATE mart.fact_heads SET source_revision=2", "DELETE FROM mart.fact_heads",'CREATE TABLE mart.forbidden(id int)','CREATE SCHEMA forbidden','SELECT * FROM mart.data_quality_rejects','SET ROLE dabboos_migrator']) await assert.rejects(tenantTransaction(db.runtime,'a',c => c.query(sql)));
    for (const sql of ['CREATE TABLE mart.forbidden(id int)',"UPDATE mart.fact_revisions SET value=0",'DELETE FROM mart.fact_revisions',"UPDATE mart.mapping_releases SET business_basis='x'"]) await assert.rejects(tenantTransaction(db.ingestor,'a',c => c.query(sql)));
    await assert.rejects(tenantTransaction(db.ingestor,'a',c => c.query(`INSERT INTO mart.ingestion_batches(tenant_id,batch_id,dataset_id,source_id,mapping_id,mapping_version,company_ids,adapter_version,started_at,source_as_of,frozen_revision,status,request_fingerprint,source_objects,request_limit,completeness,deletion_evidence,pagination_complete) VALUES ('b','bad','release','fixture','synthetic','1',ARRAY['test'],'1',now(),now(),'freeze','running',repeat('a',64),ARRAY['fixture'],1,'incremental','explicit',true)`)), /row-level security/);
    await db.admin.query(`INSERT INTO mart.ingestion_batches(tenant_id,batch_id,dataset_id,source_id,mapping_id,mapping_version,company_ids,adapter_version,started_at,source_as_of,frozen_revision,status,request_fingerprint,source_objects,request_limit,completeness,deletion_evidence,pagination_complete) VALUES ('b','foreign','release','fixture','synthetic','1',ARRAY['test'],'1',now(),now(),'freeze','running',repeat('b',64),ARRAY['fixture'],1,'incremental','explicit',true)`);
    assert.equal((await tenantTransaction(db.ingestor,'a',c => c.query("UPDATE mart.ingestion_batches SET status='failed' WHERE tenant_id='b'"))).rowCount,0);
    assert.equal((await db.admin.query("SELECT status FROM mart.ingestion_batches WHERE tenant_id='b' AND batch_id='foreign'")).rows[0].status,'running');
    assert.equal((await db.admin.query("SELECT count(*) n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mart' AND c.relkind='r' AND c.relname<>'measure_definitions' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)")).rows[0].n,'0');
    await assert.rejects(tenantTransaction(db.runtime,'a',c => c.query('SELECT pg_sleep(0.2)'),true,20), /statement timeout/);
    assert.equal((await tenantTransaction(db.runtime,'b',c => c.query('SELECT 1 n'),true)).rows[0].n,1);
  } finally { await db.close(); }
});
