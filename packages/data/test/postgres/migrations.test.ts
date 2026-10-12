import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { migratePostgres, migrationDirectory } from '../../src/postgres/migrations.ts';
import { database, enabled } from './support.ts';

test('migrations: empty, rerun, same-session concurrent runners and ledger', { skip: !enabled }, async () => {
  const db = await database(false);
  try {
    const results = await Promise.all([migratePostgres(db.migrator), migratePostgres(db.migrator)]);
    assert.deepEqual(results.flat().sort((left,right)=>left-right), Array.from({length:40},(_,index)=>index+1));
    assert.deepEqual(await migratePostgres(db.migrator), []);
    const { rows } = await db.migrator.query('SELECT * FROM mart_admin.mart_schema_migrations ORDER BY version');
    assert.equal(rows.length, 40); assert.match(rows[0].sha256, /^[a-f0-9]{64}$/); assert.equal(rows[0].name, '001_production_foundation.sql');
    assert.equal((await db.migrator.query("SELECT to_regclass('mart.fact_revisions') AS name")).rows[0].name, 'mart.fact_revisions');
    const index=(await db.migrator.query("SELECT indexdef FROM pg_indexes WHERE schemaname='mart' AND indexname='analytics_partition_facts_revision_lookup'")).rows[0];
    const range=(await db.migrator.query("SELECT indexdef FROM pg_indexes WHERE schemaname='mart' AND indexname='analytics_fact_revisions_drill_range'")).rows[0];
    const membership=(await db.migrator.query("SELECT indexdef FROM pg_indexes WHERE schemaname='mart' AND indexname='analytics_serving_members_partition_lookup'")).rows[0];
    assert.ok(range.indexdef.includes('(tenant_id, measure_id, business_date, fact_key, revision_id)'));
    assert.ok(index.indexdef.includes('(tenant_id, fact_key, revision_id)'));
    assert.ok(membership.indexdef.includes('(tenant_id, partition_id)'));
    const historicalGuard=(await db.migrator.query("SELECT pg_get_functiondef('mart.guard_historical_binding()'::regprocedure) AS definition")).rows[0].definition;
    assert.doesNotMatch(historicalGuard,/Historical September anchor regression|1447166500\.000000|1465712000\.000000|18545500\.000000|1461335500\.000000|2895\.000000/);
  } finally { await db.close(); }
});
test('migrations: checksum refusal, failed SQL rollback, gaps and newer database refusal', { skip: !enabled }, async () => {
  const db = await database(); const tmp = await mkdtemp('/tmp/dabboos-migrations-'); const url = pathToFileURL(`${tmp}/`);
  try {
    await cp(migrationDirectory, url, { recursive: true });
    await writeFile(new URL('001_production_foundation.sql', url), '-- tampered');
    await assert.rejects(migratePostgres(db.migrator, url), /checksum/);
    await cp(migrationDirectory, url, { recursive: true });
    await writeFile(new URL('041_failure.sql', url), 'CREATE TABLE mart.rolled_back (id integer); SELECT nonexistent_column;');
    await assert.rejects(migratePostgres(db.migrator, url));
    assert.equal((await db.migrator.query("SELECT to_regclass('mart.rolled_back') AS name")).rows[0].name, null);
    assert.equal((await db.migrator.query('SELECT count(*) AS n FROM mart_admin.mart_schema_migrations')).rows[0].n, '40');
    await rm(new URL('041_failure.sql', url));
    await writeFile(new URL('042_gap.sql', url), 'SELECT 1');
    await assert.rejects(migratePostgres(db.migrator, url), /contiguous/);
    await rm(new URL('042_gap.sql', url)); await rm(new URL('040_historical_finance_snapshot_anchor.sql', url));
    await assert.rejects(migratePostgres(db.migrator, url), /history/);
  } finally { await db.close(); await rm(tmp, { recursive: true }); }
});
