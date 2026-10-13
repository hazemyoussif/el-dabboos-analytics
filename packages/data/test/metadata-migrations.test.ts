import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrateMetadata, assertMetadataReady, metadataMigrations, MetadataSchemaError } from '../src/metadata/migrations.ts';
import { seedDemoAdministration } from '../src/metadata/demo-seed.ts';
import { createDashboardPersistenceSchema } from '../src/dashboard-sqlite.ts';
import { createDashboardLibrarySchema } from '../src/library-sqlite.ts';
const code = (code: string) => (e: unknown) => e instanceof MetadataSchemaError && e.code === code;
test('empty metadata migration, explicit synthetic reconciliation and idempotent readiness', () => {
    const db = new DatabaseSync(':memory:');
    try {
        assert.throws(() => assertMetadataReady(db), code('MIGRATION_REQUIRED'));
        migrateMetadata(db, { reconcile: seedDemoAdministration });
        assertMetadataReady(db);
        migrateMetadata(db);
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM metadata_schema_migrations').get()?.n, 6);
    }
    finally {
        db.close();
    }
});
test('legacy dashboard content, versions, ownership, folders and favorites survive byte for byte', () => {
    const db = new DatabaseSync(':memory:');
    try {
        createDashboardPersistenceSchema(db);
        createDashboardLibrarySchema(db);
        db.prepare('INSERT INTO dashboard_records VALUES (?,?,?,?,?,?,?,?,?,?)').run('deep-link', 'demo-iq', 'demo-iq-admin', 'tenant', '{"unchanged":true}', 7, 'demo-iq-admin', 'demo-iq-admin', 'before', 'after');
        db.exec("INSERT INTO dashboard_folders VALUES ('folder','demo-iq','demo-iq-admin','Personal','before','after'); INSERT INTO dashboard_library_preferences VALUES ('demo-iq','demo-iq-admin','deep-link','folder',1)");
        const before = ['dashboard_records', 'dashboard_folders', 'dashboard_library_preferences'].map(t => db.prepare(`SELECT * FROM ${t}`).all());
        migrateMetadata(db, { reconcile: seedDemoAdministration });
        assert.deepEqual(['dashboard_records', 'dashboard_folders', 'dashboard_library_preferences'].map(t => db.prepare(`SELECT * FROM ${t}`).all()), before);
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM dashboard_grants').get()?.n, 0);
    }
    finally {
        db.close();
    }
});
test('unknown legacy variants and analytics databases are refused without changes', () => {
    for (const sql of ['CREATE TABLE analytics_facts(id TEXT)', 'CREATE TABLE dashboard_records(id TEXT)']) {
        const db = new DatabaseSync(':memory:');
        try {
            db.exec(sql);
            assert.throws(() => migrateMetadata(db), code('UNKNOWN_LEGACY_SCHEMA'));
            assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='metadata_schema_migrations'").get(), undefined);
        }
        finally {
            db.close();
        }
    }
});
test('unreconciled foreign legacy owner rolls back entire upgrade', () => {
    const db = new DatabaseSync(':memory:');
    try {
        createDashboardPersistenceSchema(db);
        createDashboardLibrarySchema(db);
        db.prepare('INSERT INTO dashboard_records VALUES (?,?,?,?,?,?,?,?,?,?)').run('id', 'foreign', 'unknown', 'private', '{}', 1, 'unknown', 'unknown', 'before', 'after');
        assert.throws(() => migrateMetadata(db, { reconcile: seedDemoAdministration }));
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM dashboard_records').get()?.n, 1);
        assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='customers'").get(), undefined);
    }
    finally {
        db.close();
    }
});
test('changed checksums, history gaps and future schema fail readiness', () => {
    for (const [sql, error] of [["UPDATE metadata_schema_migrations SET sha256='tampered' WHERE version=1", 'CHECKSUM_MISMATCH'], ['DELETE FROM metadata_schema_migrations WHERE version=2', 'HISTORY_GAP'], ["INSERT INTO metadata_schema_migrations VALUES (7,'future','x','now')", 'NEWER_VERSION']] as const) {
        const db = new DatabaseSync(':memory:');
        try {
            migrateMetadata(db);
            db.exec(sql);
            assert.throws(() => assertMetadataReady(db), code(error));
            assert.throws(() => migrateMetadata(db), code(error));
        }
        finally {
            db.close();
        }
    }
});
test('migration failure restores foreign keys and leaves no partially applied schema', () => {
    const db = new DatabaseSync(':memory:');
    try {
        assert.throws(() => migrateMetadata(db, { reconcile: () => { throw new Error('seed failure'); } }));
        assert.equal(db.prepare('PRAGMA foreign_keys').get()?.foreign_keys, 1);
        assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='customers'").get(), undefined);
        migrateMetadata(db);
        assert.equal(metadataMigrations.length, 6);
    }
    finally {
        db.close();
    }
});
test('concurrent migration workers serialize one contiguous schema history on the same file', async () => {
    const { Worker } = await import('node:worker_threads');
    const { mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'metadata-lock-')), path = join(dir, 'metadata.db');
    const launch = () => new Promise<void>((resolve, reject) => { const w = new Worker(new URL('./fixtures/metadata-migration-worker.ts', import.meta.url), { workerData: { path }, execArgv: ['--experimental-transform-types', '--disable-warning=ExperimentalWarning'] }); w.on('error', reject); w.on('exit', n => n === 0 ? resolve() : reject(Error(`worker exit ${n}`))); });
    try {
        await Promise.all([launch(), launch()]);
        const db = new DatabaseSync(path);
        try {
            db.exec('PRAGMA foreign_keys=ON');
            assertMetadataReady(db);
            assert.equal(db.prepare('SELECT COUNT(*) AS n FROM metadata_schema_migrations').get()?.n, metadataMigrations.length);
        }
        finally {
            db.close();
        }
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
test('legacy dashboard adapter refuses the upgraded grant-aware metadata schema', async () => {
    const { SqliteDashboardRepository } = await import('../src/dashboard-sqlite.ts');
    const db = new DatabaseSync(':memory:');
    try {
        migrateMetadata(db);
        assert.throws(() => new SqliteDashboardRepository(db), code('LEGACY_ADAPTER_UNSUPPORTED'));
    }
    finally {
        db.close();
    }
});
test('missing current-version tables fail readiness rather than permitting fallback', () => {
    const db = new DatabaseSync(':memory:');
    try {
        migrateMetadata(db);
        db.exec('DROP TABLE tenant_assignment_candidates');
        assert.throws(() => assertMetadataReady(db), code('INCOMPLETE_SCHEMA'));
    }
    finally {
        db.close();
    }
});
