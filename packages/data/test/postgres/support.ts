import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { migratePostgres } from '../../src/postgres/migrations.ts';
export const enabled = !!process.env.PG_TEST_ADMIN_URL;
export async function database(migrate = true) {
  const raw = process.env.PG_TEST_ADMIN_URL;
  if (!raw) throw new Error('PG_TEST_ADMIN_URL required');
  const url = new URL(raw);
  if (!['127.0.0.1', 'localhost', 'postgres'].includes(url.hostname) || url.pathname !== '/foundation_test') throw new Error('Only isolated foundation_test database is allowed');
  const admin = new Pool({ connectionString: raw });
  const version = await admin.query('SHOW server_version');
  if (!String(version.rows[0].server_version).startsWith('18.6')) throw new Error('PostgreSQL 18.6 required');
  const roles = await readFile(new URL('../../../../infra/postgres/roles.sql', import.meta.url), 'utf8');
  // Serialize cluster-scoped test role creation across test files/processes.
  const c = await admin.connect();
  try {
    await c.query('SELECT pg_advisory_lock(738421,2)');
    if (!(await c.query("SELECT 1 FROM pg_roles WHERE rolname='dabboos_migrator'")).rowCount) await c.query(roles);
    for (const role of ['migrator','ingestor','runtime']) {
      if (!(await c.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [`foundation_test_${role}`])).rowCount) {
        await c.query(`CREATE ROLE foundation_test_${role} LOGIN PASSWORD 'foundation_test_only' NOSUPERUSER NOBYPASSRLS IN ROLE dabboos_${role}`);
      }
    }
  } finally { await c.query('SELECT pg_advisory_unlock(738421,2)'); c.release(); }
  const name = `foundation_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE DATABASE ${name} OWNER dabboos_migrator`);
  const pools = Object.fromEntries(['migrator','ingestor','runtime','admin'].map(role => {
    const u = new URL(raw); u.pathname = `/${name}`;
    if (role !== 'admin') { u.username = `foundation_test_${role}`; u.password = 'foundation_test_only'; }
    return [role, new Pool({ connectionString: u.toString(), max: role === 'runtime' ? 1 : 4 })];
  })) as Record<'migrator'|'ingestor'|'runtime'|'admin', Pool>;
  if (migrate) await migratePostgres(pools.migrator);
  return { ...pools, async close() { await Promise.all(Object.values(pools).map(p => p.end())); await admin.query(`DROP DATABASE ${name}`); await admin.end(); } };
}
