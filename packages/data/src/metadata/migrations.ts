import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
export class MetadataSchemaError extends Error {
    constructor(readonly code: string) { super(`Metadata schema: ${code}. Run the explicit metadata migration command against an approved backup.`); }
}
const files = ['001-baseline.sql', '002-administration.sql', '003-sharing.sql', '004-assignment-candidates.sql'];
export const metadataMigrations = files.map((name, index) => {
    const sql = readFileSync(new URL(`./migrations/${name}`, import.meta.url), 'utf8');
    return { version: index + 1, name, sql, sha256: createHash('sha256').update(sql).digest('hex') };
});
export const metadataSchemaVersion = metadataMigrations.length;
type History = {
    version: number;
    name: string;
    sha256: string;
};
const hasHistory = (db: DatabaseSync) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='metadata_schema_migrations'").get();
function checkHistory(db: DatabaseSync): number {
    if (!hasHistory(db))
        return 0;
    const rows = db.prepare('SELECT version,name,sha256 FROM metadata_schema_migrations ORDER BY version').all() as unknown as History[];
    for (const [index, row] of rows.entries()) {
        const expected = metadataMigrations[index];
        if (!expected || row.version > metadataSchemaVersion)
            throw new MetadataSchemaError('NEWER_VERSION');
        if (row.version !== expected.version)
            throw new MetadataSchemaError('HISTORY_GAP');
        if (row.name !== expected.name || row.sha256 !== expected.sha256)
            throw new MetadataSchemaError('CHECKSUM_MISMATCH');
    }
    return rows.length;
}
export function assertMetadataReady(db: DatabaseSync): void {
    if (checkHistory(db) !== metadataSchemaVersion)
        throw new MetadataSchemaError('MIGRATION_REQUIRED');
    if (db.prepare('PRAGMA foreign_keys').get()?.foreign_keys !== 1)
        throw new MetadataSchemaError('FOREIGN_KEYS_DISABLED');
    if (db.prepare('PRAGMA foreign_key_check').all().length)
        throw new MetadataSchemaError('FOREIGN_KEY_VIOLATION');
    for (const table of ['dashboard_records', 'dashboard_folders', 'dashboard_library_preferences', 'dashboard_grants', 'customers', 'tenants', 'users', 'identities', 'roles', 'memberships', 'platform_assignments', 'admin_audit_events', 'bootstrap_state', 'tenant_assignment_candidates']) {
        try {
            db.prepare(`SELECT 1 FROM ${table} LIMIT 0`).all();
        }
        catch {
            throw new MetadataSchemaError('INCOMPLETE_SCHEMA');
        }
    }
}
const normalizeSql = (sql: string) => sql.toLowerCase().replace(/if\s+not\s+exists/g, '').replace(/[\s;]/g, '');
function legacyBaseline(db: DatabaseSync): boolean {
    const schema = (connection: DatabaseSync) => connection.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name!='metadata_schema_migrations' ORDER BY type,name").all();
    const actual = schema(db);
    if (!actual.length)
        return false;
    const reference = new DatabaseSync(':memory:');
    try {
        reference.exec(metadataMigrations[0]!.sql);
        const expected = schema(reference);
        if (actual.length !== expected.length || actual.some((row, i) => row.name !== expected[i]?.name || row.type !== expected[i]?.type || normalizeSql(String(row.sql)) !== normalizeSql(String(expected[i]?.sql))))
            throw new MetadataSchemaError('UNKNOWN_LEGACY_SCHEMA');
    }
    finally {
        reference.close();
    }
    return true;
}
/** One write lock covers recognition, seed/reconciliation, rebuild and history. No runtime auto-upgrade. */
export function migrateMetadata(db: DatabaseSync, options: {
    reconcile?: (db: DatabaseSync) => void;
} = {}): void {
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
    try {
        let current = checkHistory(db);
        const legacy = current === 0 && legacyBaseline(db);
        db.exec(`CREATE TABLE IF NOT EXISTS metadata_schema_migrations (version INTEGER PRIMARY KEY,name TEXT NOT NULL,sha256 TEXT NOT NULL,applied_at TEXT NOT NULL)`);
        for (const migration of metadataMigrations) {
            if (migration.version <= current)
                continue;
            if (migration.version === 3) {
                for (const table of ['dashboard_folders', 'dashboard_library_preferences']) {
                    if (db.prepare(`SELECT 1 FROM ${table} p WHERE NOT EXISTS(SELECT 1 FROM tenants t WHERE t.id=p.tenant_id) OR NOT EXISTS(SELECT 1 FROM users u WHERE u.id=p.user_id) LIMIT 1`).get())
                        throw new MetadataSchemaError('LEGACY_RECONCILIATION_REQUIRED');
                }
            }
            if (!(legacy && migration.version === 1))
                db.exec(migration.sql);
            if (migration.version === 2)
                options.reconcile?.(db);
            if (db.prepare('PRAGMA foreign_key_check').all().length)
                throw new MetadataSchemaError('FOREIGN_KEY_VIOLATION');
            db.prepare('INSERT INTO metadata_schema_migrations(version,name,sha256,applied_at) VALUES (?,?,?,?)').run(migration.version, migration.name, migration.sha256, new Date().toISOString());
            current = migration.version;
        }
        db.exec('COMMIT');
    }
    catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
    assertMetadataReady(db);
}
