import { Pool } from 'pg';
import type { PoolClient } from 'pg';

export function createMartPool(connectionString: string, max = 8): Pool {
  if (!connectionString || !Number.isInteger(max) || max < 1 || max > 64) throw new Error('Invalid PostgreSQL pool configuration');
  return new Pool({ connectionString, max, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
}
/** Trusted application scope, scoped to a transaction even on pool reuse and errors. */
export async function tenantTransaction<T>(pool: Pool, tenantId: string, operation: (client: PoolClient) => Promise<T>, readOnly: boolean | 'repeatable-write' = false, timeoutMs = 15000): Promise<T> {
  if (!tenantId.trim() || tenantId.length > 200 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new Error('Invalid mart transaction scope');
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query(readOnly === 'repeatable-write' ? 'BEGIN ISOLATION LEVEL REPEATABLE READ' : readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
    await client.query("SELECT set_config('mart.tenant_id', $1, true), set_config('statement_timeout', $2, true)", [tenantId, String(timeoutMs)]);
    const value = await operation(client);
    await client.query('COMMIT'); return value;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { broken = true; }
    throw error;
  } finally { client.release(broken); }
}

/** Refuse accidentally supplied migrator/ingestor/superuser credentials at the runtime boundary. */
export async function verifyMartRuntimeRole(pool: Pool): Promise<void> {
  const { rows } = await pool.query(`SELECT r.rolsuper, r.rolbypassrls, r.rolcreatedb,r.rolcreaterole,r.rolreplication,
    pg_has_role(current_user,'dabboos_runtime','MEMBER') AS runtime,
    pg_has_role(current_user,'dabboos_ingestor','MEMBER') AS ingestor,
    pg_has_role(current_user,'dabboos_migrator','MEMBER') AS migrator,
    has_database_privilege(current_database(),'CREATE') database_create,
    has_schema_privilege('mart','CREATE') schema_create,
    EXISTS(SELECT 1 FROM pg_class JOIN pg_namespace ON pg_namespace.oid=relnamespace WHERE nspname IN ('mart','mart_admin') AND relkind IN ('r','v','p') AND has_table_privilege(pg_class.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) any_write
    FROM pg_roles r WHERE r.rolname=current_user`);
  const role = rows[0];
  if (!role || !role.runtime || role.ingestor || role.migrator || role.rolsuper || role.rolbypassrls || role.rolcreatedb || role.rolcreaterole || role.rolreplication || role.database_create || role.schema_create || role.any_write) throw new Error('PostgreSQL runtime requires its dedicated read-only identity');
}
