import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { provisionStagingDatabases } from '../../src/staging/infrastructure.ts';
import { stagingIdentities,grantStagingPrivileges } from '../../src/staging/roles.ts';
import type { StagingIdentity } from '../../src/staging/roles.ts';
import { migrateControl,assertControlReady } from '../../src/control/migrations.ts';
import { verifyControlAppRole } from '../../src/control/session.ts';
import { migratePostgres } from '../../src/postgres/migrations.ts';
import { assertMartRuntimeReady } from '../../src/postgres/readiness.ts';
import { tenantTransaction } from '../../src/postgres/session.ts';
import { enabled,database } from './support.ts';
test('staging roles isolate developer DBs, reject escalation and retain pending-serving RLS', { skip: !enabled },async () => {
    const endpoint = new URL(process.env.PG_TEST_ADMIN_URL!);
    if (!['localhost','127.0.0.1','postgres'].includes(endpoint.hostname) || endpoint.pathname!=='/foundation_test') throw new Error('Isolated test endpoint required');
    const fixture = await database();
    const developerDatabase = (await fixture.admin.query('SELECT current_database() name')).rows[0].name;
    const admin = new Pool({ connectionString: endpoint.toString() });
    const passwords = Object.fromEntries(Object.keys(stagingIdentities).map(identity => [identity,randomBytes(32).toString('hex')])) as Record<StagingIdentity,string>;
    const pools = Object.fromEntries(Object.entries(stagingIdentities).map(([identity,role]) => {
        const url = new URL(endpoint); url.pathname=`/${role.database}`; url.username=role.login; url.password=passwords[identity as StagingIdentity];
        return [identity,new Pool({ connectionString: url.toString() })];
    })) as Record<StagingIdentity,Pool>;
    try {
        await provisionStagingDatabases(admin,passwords);
        await provisionStagingDatabases(admin,passwords);
        await migrateControl(pools.controlMigrator); await migratePostgres(pools.martMigrator);
        for (const identity of Object.keys(pools) as StagingIdentity[]) {
            const client = await pools[identity.startsWith('control') ? 'controlMigrator' : 'martMigrator'].connect();
            try { await grantStagingPrivileges(client,identity); } finally { client.release(); }
        }
        await assertControlReady(pools.controlApp); await verifyControlAppRole(pools.controlApp); await assertMartRuntimeReady(pools.martRuntime);
        for (const identity of Object.keys(pools) as StagingIdentity[]) {
            const url = new URL(endpoint); url.pathname=`/${developerDatabase}`; url.username=stagingIdentities[identity].login; url.password=passwords[identity];
            const developer = new Pool({ connectionString: url.toString() });
            try { await assert.rejects(developer.query('SELECT * FROM mart.measure_definitions')); } finally { await developer.end(); }
            await assert.rejects(pools[identity].query(`SET ROLE ${stagingIdentities[identity].group}`));
        }
        await tenantTransaction(pools.martMigrator,'test',client => client.query("INSERT INTO mart.mapping_releases VALUES ('test','pending','fixture','fixture','1','test','IQD','pending',NULL,'{}')"));
        assert.equal((await tenantTransaction(pools.martRuntime,'test',client => client.query('SELECT * FROM mart.mapping_releases'),true)).rowCount,0);
        await assert.rejects(pools.martRuntime.query('UPDATE mart.mapping_releases SET business_basis=business_basis'));
        await assert.rejects(pools.controlApp.query('SELECT * FROM mart.mapping_releases'));
        await assert.rejects(pools.martIngestor.query('SELECT * FROM control.users'));
        await assert.rejects(assertMartRuntimeReady(pools.martMigrator));
        await pools.martMigrator.query('ALTER POLICY runtime_release ON mart.mapping_releases TO dabboos_runtime');
        await assert.rejects(assertMartRuntimeReady(pools.martRuntime),/serving policy/);
        const client = await pools.martMigrator.connect();
        try { await grantStagingPrivileges(client,'martRuntime'); } finally { client.release(); }
        const checksum = (await pools.martMigrator.query('SELECT sha256 FROM mart_admin.mart_schema_migrations WHERE version=8')).rows[0].sha256;
        await pools.martMigrator.query("UPDATE mart_admin.mart_schema_migrations SET sha256='changed' WHERE version=8");
        await assert.rejects(assertMartRuntimeReady(pools.martRuntime),/schema not current/);
        await pools.martMigrator.query('UPDATE mart_admin.mart_schema_migrations SET sha256=$1 WHERE version=8',[checksum]);
        await assertMartRuntimeReady(pools.martRuntime);
    } finally {
        await Promise.all(Object.values(pools).map(pool => pool.end()));
        for (const database of ['el_dabboos_control_staging','el_dabboos_analytics_staging']) await admin.query(`DROP DATABASE IF EXISTS ${database}`);
        for (const role of Object.values(stagingIdentities)) await admin.query(`DROP ROLE IF EXISTS ${role.login}`);
        await admin.end(); await fixture.close();
    }
});
