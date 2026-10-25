import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { openControlStorage } from '../../../../apps/api/src/control-storage.ts';
import { parseRuntimeConfig } from '../../../../apps/api/src/startup-config.ts';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { enabled } from './support.ts';
import { controlDatabase } from './control-support.ts';
import { migrateControl, loadControlMigrations, assertControlReady } from '../../src/control/migrations.ts';
import { importSqliteControl, controlImportTables } from '../../src/control/import-sqlite.ts';
import { migrateMetadata } from '../../src/metadata/migrations.ts';
import { seedDemoAdministration } from '../../src/metadata/demo-seed.ts';
import { PostgresAdministrationStore } from '../../src/control/administration.ts';
import { SqliteAdministrationStore } from '../../src/metadata/administration.ts';
import { verifyControlAppRole } from '../../src/control/session.ts';
import { PostgresSourceDefinitions, PostgresControlMappings } from '../../src/control/sources.ts';
import { createAdministration, bootstrapAdministration } from '../../../application/src/index.ts';
const actor = { identityId: 'synthetic:demo-iq-admin',tenantId: 'demo-iq',locale: 'en' as const };
async function sqliteFixture() {
    const directory = await mkdtemp(join(tmpdir(),'control-fixture-'));
    const path = join(directory,'dashboards.db'), database = new DatabaseSync(path);
    migrateMetadata(database,{ reconcile: seedDemoAdministration });
    database.prepare('INSERT INTO admin_audit_events VALUES (?,?,?,?,?,?,?,?)').run('audit-fixture','demo-iq-admin','demo-iq',null,'iq-admin','membership.updated','allowed','2026-10-05T00:00:00.000Z');
    const spec = '{ "schemaVersion": 2, "title": {"en":"Exact text","ar":"اختبار"}, "id": "portable", "locale": "en", "widgets": [{"id":"orders","type":"kpi","series":[{"id":"orders","metric":"order_count"}]}], "filters": {}, "layout": {"columns":1} }';
    database.prepare('INSERT INTO dashboard_records VALUES (?,?,?,?,?,?,?,?,?,?)').run('dashboard','demo-iq','demo-iq-admin','restricted',spec,7,'demo-iq-admin','demo-iq-admin','2026-01-01','2026-10-05');
    database.prepare('INSERT INTO dashboard_grants VALUES (?,?,?,?,?,?,?)').run('demo-iq','dashboard','membership','iq-analyst','view',null,'iq-analyst');
    database.prepare('INSERT INTO dashboard_folders VALUES (?,?,?,?,?,?)').run('folder','demo-iq','demo-iq-admin','My folder','2026-01-01','2026-10-05');
    database.prepare('INSERT INTO dashboard_library_preferences VALUES (?,?,?,?,?)').run('demo-iq','demo-iq-admin','dashboard','folder',1);
    database.close();
    return { path,directory };
}
test('control migration bootstrap, rerun, runtime schema checks and credential separation', { skip: !enabled }, async () => {
    const database = await controlDatabase(false);
    try {
        assert.deepEqual(await migrateControl(database.migrator),[1,2,3,4,5,6,7,8,9,10]);
        assert.deepEqual(await migrateControl(database.migrator),[]);
        await assertControlReady(database.app);
        await verifyControlAppRole(database.app);
        await assert.rejects(migrateControl(database.app));
        await assert.rejects(verifyControlAppRole(database.migrator));
        for (const pool of [database.martRuntime,database.martIngestor]) {
            await assert.rejects(pool.query('SELECT * FROM control.customers'));
            await assert.rejects(pool.query('SET ROLE control_app'));
        }
        await assert.rejects(database.app.query('UPDATE control_admin.schema_migrations SET sha256=sha256'));
        await assert.rejects(database.app.query('CREATE TABLE control.forbidden(id text)'));
        await assert.rejects(database.app.query('SET ROLE dabboos_ingestor'));
        await assert.rejects(database.app.query('SET ROLE dabboos_runtime'));
    } finally { await database.close(); }
});
test('control history refuses changed checksums, gaps and newer schemas', { skip: !enabled }, async () => {
    const database = await controlDatabase();
    try {
        await database.migrator.query("UPDATE control_admin.schema_migrations SET sha256='bad' WHERE version=1");
        await assert.rejects(migrateControl(database.migrator));
        const manifest = await loadControlMigrations();
        await database.migrator.query('UPDATE control_admin.schema_migrations SET sha256=$1 WHERE version=1',[manifest[0]!.checksum]);
        await database.migrator.query('DELETE FROM control_admin.schema_migrations WHERE version=2');
        await assert.rejects(migrateControl(database.migrator));
        await database.migrator.query('INSERT INTO control_admin.schema_migrations(version,name,sha256) VALUES (2,$1,$2)',[manifest[1]!.name,manifest[1]!.checksum]);
        await database.migrator.query("INSERT INTO control_admin.schema_migrations(version,name,sha256) VALUES (11,'future','future')");
        await assert.rejects(migrateControl(database.migrator));
        await assert.rejects(assertControlReady(database.app));
    } finally { await database.close(); }
});
test('control failed migration rolls back DDL and history; manifest gaps reject before DDL', { skip: !enabled }, async () => {
    const database = await controlDatabase(), directory = await mkdtemp(join(tmpdir(),'control-migrations-'));
    try {
        for (const migration of await loadControlMigrations()) await writeFile(join(directory,migration.name),migration.sql);
        await writeFile(join(directory,'011_failure.sql'),'CREATE TABLE control.rollback_probe(id text); SELECT missing_column;');
        await assert.rejects(migrateControl(database.migrator,pathToFileURL(directory+'/')));
        assert.equal((await database.admin.query("SELECT to_regclass('control.rollback_probe') table_name")).rows[0].table_name,null);
        assert.equal((await database.admin.query('SELECT count(*)::int count FROM control_admin.schema_migrations')).rows[0].count,10);
        await rm(join(directory,'011_failure.sql'));
        await writeFile(join(directory,'012_gap.sql'),'SELECT 1;');
        await assert.rejects(migrateControl(database.migrator,pathToFileURL(directory+'/')));
    } finally { await database.close(); await rm(directory,{ recursive: true,force: true }); }
});
test('auth migration 007 atomically rolls back auth schema, grants and audit before safe rerun', { skip: !enabled }, async () => {
    const database = await controlDatabase(false), directory = await mkdtemp(join(tmpdir(),'auth-migration-'));
    try {
        const migrations = await loadControlMigrations();
        for (const migration of migrations.slice(0,6)) await writeFile(join(directory,migration.name),migration.sql);
        assert.deepEqual(await migrateControl(database.migrator,pathToFileURL(directory+'/')),[1,2,3,4,5,6]);
        const auth = migrations[6]!;
        await writeFile(join(directory,auth.name),auth.sql+'\nSELECT auth_intentional_failure;');
        await assert.rejects(migrateControl(database.migrator,pathToFileURL(directory+'/')));
        assert.equal((await database.admin.query("SELECT to_regnamespace('auth') schema")).rows[0].schema,null);
        assert.equal((await database.admin.query("SELECT to_regclass('control.authentication_security_events') audit")).rows[0].audit,null);
        assert.equal((await database.admin.query('SELECT count(*)::int count FROM control_admin.schema_migrations')).rows[0].count,6);
        await assert.rejects(assertControlReady(database.app));
        await writeFile(join(directory,auth.name),auth.sql);
        assert.deepEqual(await migrateControl(database.migrator,pathToFileURL(directory+'/')),[7]);
        assert.deepEqual(await migrateControl(database.migrator),[8,9,10]);
        await assertControlReady(database.app);
        await database.app.query('SELECT id FROM auth.session LIMIT 0');
        await assert.rejects(database.app.query('CREATE TABLE auth.forbidden(id text)'));
        await assert.rejects(database.martRuntime.query('SELECT * FROM auth.account'));
    } finally { await database.close(); await rm(directory,{ recursive:true,force:true }); }
});
test('SQLite import preserves all rows, JSON bytes, IDs, versions, timestamps and immutable audit; dry run is rollback', { skip: !enabled }, async () => {
    const database = await controlDatabase(), fixture = await sqliteFixture();
    try {
        const bytes = await readFile(fixture.path);
        const dry = await importSqliteControl(fixture.path,database.migrator,true);
        assert.equal(dry.tables.length,controlImportTables.length);
        assert.equal((await database.app.query('SELECT count(*)::int count FROM control.users')).rows[0].count,0);
        const result = await importSqliteControl(fixture.path,database.migrator);
        assert.ok(result.tables.every(table => table.exactRows));
        assert.equal((await database.app.query('SELECT version FROM control.dashboard_records')).rows[0].version,7);
        assert.deepEqual(await readFile(fixture.path),bytes);
        await assert.rejects(importSqliteControl(fixture.path,database.migrator));
        await assert.rejects(database.app.query("DELETE FROM control.admin_audit_events WHERE event_id='audit-fixture'"));
        await assert.rejects(database.migrator.query("UPDATE control.admin_audit_events SET target_id='changed'"));
    } finally { await database.close(); await rm(fixture.directory,{ recursive: true,force: true }); }
});
test('administration and library contracts have SQLite/PostgreSQL parity over imported metadata', { skip: !enabled }, async () => {
    const database = await controlDatabase(), fixture = await sqliteFixture();
    const sqlite = new DatabaseSync(fixture.path);
    try {
        await importSqliteControl(fixture.path,database.migrator);
        const stores = [new SqliteAdministrationStore(sqlite),new PostgresAdministrationStore(database.app)];
        const outputs = [];
        for (const store of stores) {
            const service = createAdministration(store);
            await assert.rejects(service.changeMembershipStatus(actor,{ id: 'iq-admin',expectedVersion: 1,status: 'suspended' }));
            await service.changeMembershipScopes(actor,{ id: 'iq-analyst',expectedVersion: 1,dataScopes: [{ dimension: 'branch',values: ['baghdad'] }] },{ branch: ['baghdad'] });
            const membership = await store.read(transaction => transaction.tenants.getMembership('demo-iq','iq-analyst'));
            assert.equal(membership?.version,2);
            await assert.rejects(service.changeMembershipStatus(actor,{ id: 'iq-analyst',expectedVersion: 1,status: 'suspended' }));
            const access = await store.read(transaction => transaction.dashboards.getAccess('demo-iq','dashboard'));
            const preference = await store.library.getPreference({ tenantId: 'demo-iq',userId: 'demo-iq-admin' },'dashboard');
            await store.library.deleteFolder({ tenantId: 'demo-iq',userId: 'demo-iq-admin' },'folder');
            const cleared = await store.library.getPreference({ tenantId: 'demo-iq',userId: 'demo-iq-admin' },'dashboard');
            outputs.push({ membership,access,preference,cleared,tenant: await store.profiles.get('demo-iq','en'),roles: await store.read(transaction => transaction.tenants.listRoles('demo-iq')) });
        }
        // Each application write supplies its own clock; compare the preserved values and CAS behavior.
        const normalize = (value: unknown) => JSON.parse(JSON.stringify(value,(key,value) => key==='updatedAt' ? undefined : value));
        assert.deepEqual(normalize(outputs[0]),normalize(outputs[1]));
    } finally { sqlite.close(); await database.close(); await rm(fixture.directory,{ recursive: true,force: true }); }
});
test('PostgreSQL bootstrap is explicit one-use; fresh identities use issuer and subject', { skip: !enabled }, async () => {
    const database = await controlDatabase();
    try {
        const store = new PostgresAdministrationStore(database.app);
        const command = { displayName: 'Operator',provider: 'trusted/issuer',providerSubject: 'stable-subject',preferredLocale: 'en' as const };
        const result = await bootstrapAdministration(store,command,'operator-verification');
        await assert.rejects(bootstrapAdministration(store,command,'replay'));
        assert.equal((await createAdministration(store).resolvePlatform(result.identityId)).plane,'platform');
        assert.equal((await store.read(transaction => transaction.users.findIdentity('trusted/issuer','stable-subject')))?.id,result.identityId);
    } finally { await database.close(); }
});
test('source definitions support multiple sources/tenants; scope, secret references and governed mappings fail closed', { skip: !enabled }, async () => {
    const database = await controlDatabase(), fixture = await sqliteFixture();
    try {
        await importSqliteControl(fixture.path,database.migrator);
        const sources = new PostgresSourceDefinitions(database.app);
        const source = { sourceId: 'source-a',tenantId: 'demo-iq',type: 'odoo-postgres' as const,connectionRef: 'odoo-staging-main',enabled: true,companyIds: ['1'] };
        await sources.create(source);
        await sources.create({ ...source,sourceId: 'source-b',companyIds: ['1','2'] });
        await sources.create({ ...source,sourceId: 'source-eg',tenantId: 'demo-eg' });
        assert.equal((await sources.list('demo-iq')).length,2);
        assert.equal(await sources.get('demo-eg','source-a'),null);
        await assert.rejects(sources.create(source));
        await assert.rejects(sources.create({ ...source,sourceId: 'missing-tenant',tenantId: 'unknown' }));
        const mappings = new PostgresControlMappings(database.app);
        const definition = { mappingId: 'authoring',sourceId: 'source-a',tenantId: 'demo-iq',datasetId: 'sales',version: 1,recipe: 'odoo-comparison-v1' as const,businessBasis: 'Signed header basis',reportingCurrency: 'IQD' as const,businessOwner: 'owner',measures: ['order_count' as const],dimensions: ['customer' as const] };
        await mappings.create(definition);
        await assert.rejects(mappings.create(definition));
        await assert.rejects(database.app.query("UPDATE control.source_mappings SET lifecycle_status='approved'"));
        await assert.rejects(database.migrator.query("UPDATE control.source_mappings SET lifecycle_status='approved',evidence_ref='forged'"));
        await assert.rejects(database.migrator.query("UPDATE control.source_mappings SET business_basis='changed'"));
        await database.migrator.query("UPDATE control.source_mappings SET lifecycle_status='candidate'");
        await assert.rejects(database.app.query("INSERT INTO control.source_measure_mappings VALUES ('authoring',1,'refund_count')"));
        assert.equal((await mappings.get('demo-iq','authoring',1))?.status,'candidate');
        assert.equal(await mappings.get('demo-eg','authoring',1),null);
        assert.equal((await database.app.query('SELECT count(*)::int count FROM control.source_mapping_lifecycle_events')).rows[0].count,2);
        await assert.rejects(database.app.query("INSERT INTO control.source_mapping_lifecycle_events(mapping_id,version,new_status,database_actor) VALUES ('authoring',1,'approved','forged')"));
        assert.equal((await database.app.query('SELECT lifecycle_status FROM control.source_mappings')).rows[0].lifecycle_status,'candidate');
    } finally { await database.close(); await rm(fixture.directory,{ recursive: true,force: true }); }
});

test('PostgreSQL runtime storage never opens SQLite metadata and closes its pool', { skip: !enabled }, async () => {
    const database = await controlDatabase(), path = join(tmpdir(),`absent-control-${Date.now()}.db`);
    try {
        const config = parseRuntimeConfig({ CONTROL_PROVIDER: 'postgres',CONTROL_DATABASE_URL: database.appUrl },{ analyticsPath: '/tmp/unused-demo.db',dashboardPath: path });
        const storage = await openControlStorage(config);
        try { assert.equal(await storage.ready(),true); assert.equal((await storage.store.read(transaction => transaction.users.listUsers({ limit: 10 }))).items.length,0); }
        finally { await storage.close(); }
        assert.equal(existsSync(path),false);
    } finally { await database.close(); }
});
test('PostgreSQL CAS races, cross-tenant grants and audit failure keep atomic state', { skip: !enabled }, async () => {
    const database = await controlDatabase(), fixture = await sqliteFixture();
    try {
        await importSqliteControl(fixture.path,database.migrator);
        const first = new PostgresAdministrationStore(database.app), second = new PostgresAdministrationStore(database.app);
        const record = (await first.read(transaction => transaction.dashboards.getTenantRecord('demo-iq','dashboard')))!;
        const command = { ...record,expectedVersion: 7,updatedBy: 'demo-iq-admin',updatedAt: '2026-10-05T10:00:00.000Z' };
        const results = await Promise.all([first.write(transaction => transaction.dashboards.updateOwned(command)),second.write(transaction => transaction.dashboards.updateOwned(command))]);
        assert.equal(results.filter(result => result.outcome==='saved').length,1);
        assert.equal(results.filter(result => result.outcome==='conflict').length,1);
        const crossTenant = await first.write(transaction => transaction.dashboards.replaceAccess({ tenantId: 'demo-eg',dashboardId: 'dashboard',version: 8,scope: 'restricted',grants: [] },8,'demo-iq-admin'));
        assert.equal(crossTenant.outcome,'not_found');
        await assert.rejects(first.write(transaction => transaction.dashboards.replaceAccess({ tenantId: 'demo-iq',dashboardId: 'dashboard',version: 8,scope: 'restricted',grants: [{ subjectType: 'membership',subjectId: 'eg-analyst',access: 'view' }] },8,'demo-iq-admin')));
        assert.equal((await first.read(transaction => transaction.dashboards.getAccess('demo-iq','dashboard')))?.version,8);
        const before = await first.read(transaction => transaction.tenants.getMembership('demo-iq','iq-analyst'));
        await database.admin.query("CREATE FUNCTION control.test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$; CREATE TRIGGER synthetic_audit_failure BEFORE INSERT ON control.admin_audit_events FOR EACH ROW EXECUTE FUNCTION control.test_audit_failure()");
        await assert.rejects(createAdministration(first).changeMembershipStatus(actor,{ id: 'iq-analyst',expectedVersion: 1,status: 'suspended' }));
        assert.deepEqual(await first.read(transaction => transaction.tenants.getMembership('demo-iq','iq-analyst')),before);
    } finally { await database.close(); await rm(fixture.directory,{ recursive: true,force: true }); }
});
test('unknown and orphan SQLite source data fail without target changes', { skip: !enabled }, async () => {
    const database = await controlDatabase(), fixture = await sqliteFixture();
    try {
        const source = new DatabaseSync(fixture.path);
        source.exec('CREATE TABLE unknown_metadata(id text)'); source.close();
        await assert.rejects(importSqliteControl(fixture.path,database.migrator));
        const orphan = new DatabaseSync(fixture.path);
        orphan.exec("DROP TABLE unknown_metadata; UPDATE dashboard_library_preferences SET folder_id='unknown-folder'"); orphan.close();
        await assert.rejects(importSqliteControl(fixture.path,database.migrator));
        assert.equal((await database.app.query('SELECT count(*)::int count FROM control.customers')).rows[0].count,0);
    } finally { await database.close(); await rm(fixture.directory,{ recursive: true,force: true }); }
});
