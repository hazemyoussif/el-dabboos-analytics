import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Pool, PoolClient } from 'pg';
import { verifyControlMigratorRole } from './session.ts';
const migrationDirectory = new URL('../../migrations/control/', import.meta.url);
export async function loadControlMigrations(directory: URL = migrationDirectory) {
    const names = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
    const migrations = await Promise.all(names.map(async name => {
        const match = /^(\d{3})_[a-z0-9_]+\.sql$/.exec(name);
        if (!match) throw new Error('Invalid control migration filename');
        const sql = await readFile(new URL(name, directory), 'utf8');
        return { version: Number(match[1]), name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    }));
    if (!migrations.length || migrations.some((migration, index) => migration.version !== index + 1)) throw new Error('Control migration versions must be contiguous');
    return migrations;
}
export async function assertControlReady(client: Pick<PoolClient, 'query'>, directory: URL = migrationDirectory): Promise<void> {
    const manifest = await loadControlMigrations(directory);
    const rows = (await client.query('SELECT version,name,sha256 FROM control_admin.schema_migrations ORDER BY version')).rows;
    if (rows.length !== manifest.length || rows.some((row, index) => row.version !== manifest[index]!.version || row.name !== manifest[index]!.name || row.sha256 !== manifest[index]!.checksum)) throw new Error('Control schema not current; explicit migration required');
}
/** Explicit operator command only. A session lock serializes the immutable migration history. */
export async function migrateControl(pool: Pool, directory: URL = migrationDirectory): Promise<number[]> {
    await verifyControlMigratorRole(pool);
    const manifest = await loadControlMigrations(directory);
    const client = await pool.connect();
    try {
        await client.query('SELECT pg_advisory_lock(738421,10)');
        await client.query(`CREATE SCHEMA IF NOT EXISTS control_admin;
          REVOKE ALL ON SCHEMA control_admin FROM PUBLIC;
          CREATE TABLE IF NOT EXISTS control_admin.schema_migrations(version integer PRIMARY KEY,name text NOT NULL,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT clock_timestamp());
          GRANT USAGE ON SCHEMA control_admin TO control_app;
          GRANT SELECT ON control_admin.schema_migrations TO control_app`);
        const rows = (await client.query('SELECT version,name,sha256 FROM control_admin.schema_migrations ORDER BY version')).rows;
        if (rows.some((row, index) => row.version !== index + 1 || !manifest[index] || row.name !== manifest[index]!.name || row.sha256 !== manifest[index]!.checksum)) throw new Error('Control migration history/checksum mismatch');
        const applied: number[] = [];
        for (const migration of manifest.slice(rows.length)) {
            await client.query('BEGIN');
            try {
                await client.query(migration.sql);
                await client.query('INSERT INTO control_admin.schema_migrations(version,name,sha256) VALUES ($1,$2,$3)', [migration.version,migration.name,migration.checksum]);
                await client.query('COMMIT');
                applied.push(migration.version);
            } catch (error) { await client.query('ROLLBACK'); throw error; }
        }
        return applied;
    } finally {
        try { await client.query('SELECT pg_advisory_unlock(738421,10)'); } finally { client.release(); }
    }
}
