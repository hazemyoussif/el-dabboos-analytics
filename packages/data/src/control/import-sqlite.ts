import { validateDashboardSpec } from '@el-dabboos/domain';
import { DatabaseSync } from 'node:sqlite';
import type { SQLInputValue } from 'node:sqlite';
import type { Pool, PoolClient } from 'pg';
import { assertMetadataReady, migrateMetadata } from '../metadata/migrations.ts';
import { assertControlReady } from './migrations.ts';
/** Dependency order is explicit, shared with exact row parity verification. */
export const controlImportTables = ['customers','tenants','users','identities','roles','role_permissions','role_metric_domains','memberships','membership_roles','membership_scopes','platform_assignments','platform_assignment_roles','admin_audit_events','bootstrap_state','dashboard_records','dashboard_grants','dashboard_folders','dashboard_library_preferences','tenant_assignment_candidates'] as const;
function verifySourceSchema(source: DatabaseSync): void {
    assertMetadataReady(source);
    if (source.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok') throw new Error('Corrupt SQLite metadata');
    const reference = new DatabaseSync(':memory:');
    try {
        migrateMetadata(reference);
        const schema = (database: DatabaseSync) => database.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
        if (JSON.stringify(schema(source)) !== JSON.stringify(schema(reference))) throw new Error('Unknown SQLite metadata schema');
    } finally { reference.close(); }
}
function canonicalRows(rows: Record<string,unknown>[]): string {
    return JSON.stringify(rows.map(row => Object.fromEntries(Object.entries(row).sort(([left],[right]) => left.localeCompare(right)))).sort((left,right) => JSON.stringify(left).localeCompare(JSON.stringify(right))));
}
async function copyTable(source: DatabaseSync, client: PoolClient, table: typeof controlImportTables[number]) {
    const rows = source.prepare(`SELECT * FROM ${table}`).all();
    if (table === 'dashboard_records') for (const row of rows) validateDashboardSpec(JSON.parse(String(row.spec_json)));
    if ((await client.query(`SELECT 1 FROM control.${table} LIMIT 1`)).rowCount) throw new Error('Control import requires empty target');
    for (const row of rows) {
        const entries = Object.entries(row);
        await client.query(`INSERT INTO control.${table}(${entries.map(([key]) => `"${key}"`).join(',')}) VALUES (${entries.map((_,index) => `$${index+1}`).join(',')})`, entries.map(([,value]) => value as SQLInputValue));
    }
    const target = (await client.query(`SELECT * FROM control.${table}`)).rows;
    if (canonicalRows(rows) !== canonicalRows(target)) throw new Error('Control import row equivalence failed');
    const keys = source.prepare(`PRAGMA table_info(${table})`).all().filter(column => column.pk).sort((left,right) => Number(left.pk)-Number(right.pk)).map(column => String(column.name));
    return { table, rows: rows.length, primaryKeys: keys, exactRows: true };
}
/** Open source read-only, retain one SQLite snapshot, insert/verify atomically. Dry run rolls back. */
export async function importSqliteControl(path: string, pool: Pool, dryRun = false) {
    const client = await pool.connect();
    let source: DatabaseSync | undefined;
    try {
        source = new DatabaseSync(path,{ readOnly: true });
        source.exec('PRAGMA foreign_keys=ON; BEGIN');
        verifySourceSchema(source);
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(738421,11)');
        await assertControlReady(client);
        const tables = [];
        for (const table of controlImportTables) tables.push(await copyTable(source,client,table));
        await client.query('SET CONSTRAINTS ALL IMMEDIATE');
        if ((await client.query("SELECT 1 FROM pg_constraint WHERE connamespace='control'::regnamespace AND contype='f' AND NOT convalidated")).rowCount) throw new Error('Unvalidated control foreign keys');
        await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
        return { dryRun,tables,foreignKeys: 'validated',versions: 'exact',dashboardJson: 'exact text',audit: 'exact rows',membershipRolesScopes: 'exact rows' };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { source?.close(); client.release(); }
}
