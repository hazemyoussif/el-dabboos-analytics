import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
import { adoptLegacyServing } from '../operational/adoption.ts';

export const migrationDirectory = new URL('../../migrations/postgres/', import.meta.url);
/** Lock, ledger discovery and all migrations use one checked-out session. */
export async function migratePostgres(pool: Pool, directory: URL = migrationDirectory): Promise<number[]> {
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock(738421, 1)'); locked = true;
    const migrations = await loadPostgresMigrations(directory);
    await client.query(`CREATE SCHEMA IF NOT EXISTS mart_admin;
      REVOKE ALL ON SCHEMA mart_admin FROM PUBLIC;
      CREATE TABLE IF NOT EXISTS mart_admin.mart_schema_migrations (
        version integer PRIMARY KEY, name text NOT NULL, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT clock_timestamp());
      REVOKE ALL ON mart_admin.mart_schema_migrations FROM PUBLIC`);
    const { rows } = await client.query<{ version: number; name: string; sha256: string }>('SELECT version,name,sha256 FROM mart_admin.mart_schema_migrations ORDER BY version');
    for (const [i, row] of rows.entries()) {
      const m = migrations[i];
      if (row.version !== i + 1 || !m || m.version !== row.version || m.name !== row.name || m.checksum !== row.sha256) throw new Error('Migration history/checksum mismatch');
    }
    const applied: number[] = [];
    for (const m of migrations.slice(rows.length)) {
      await client.query('BEGIN');
      try {
        await client.query(m.sql);
        if(m.name==='040_unified_serving.sql')await adoptLegacyServing(client);
        await client.query('INSERT INTO mart_admin.mart_schema_migrations(version,name,sha256) VALUES ($1,$2,$3)', [m.version, m.name, m.checksum]);
        await client.query('COMMIT'); applied.push(m.version);
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
    return applied;
  } finally {
    try { if (locked) await client.query('SELECT pg_advisory_unlock(738421, 1)'); }
    finally { client.release(); }
  }
}

/** Shared immutable manifest for migration execution and read-only infrastructure verification. */
export async function loadPostgresMigrations(directory: URL = migrationDirectory) {
  const names = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  const migrations = await Promise.all(names.map(async name => {
    const match = /^(\d{3})_[a-z0-9_]+\.sql$/.exec(name);
    if (!match) throw new Error('Invalid migration filename');
    const sql = await readFile(new URL(name, directory), 'utf8');
    return { version: Number(match[1]), name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
  if (!migrations.length || migrations.some((migration, index) => migration.version !== index + 1)) throw new Error('Migration versions must be contiguous');
  return migrations;
}
