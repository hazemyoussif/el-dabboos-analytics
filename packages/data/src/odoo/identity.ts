import type { Pool, PoolClient } from 'pg';
export type OdooCredentialPolicy = 'least_privilege'|'staging_read_only';
const sourceTables = ['sale_order','account_move','res_partner','res_users','business_line','res_country_state','res_currency','account_move_line','sale_order_line','sale_order_line_invoice_rel'];
/** Strict by default. Staging exception verifies access inside RR/RO without changing source privileges. */
export async function verifyOdooSourceIdentity(pool: Pool,policy: OdooCredentialPolicy = 'least_privilege'): Promise<void> {
  if (!['least_privilege','staging_read_only'].includes(policy)) throw new Error('Invalid source credential policy');
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await verifyCredentialPrivileges(client,policy);
    for (const table of sourceTables) {
      const permission = (await client.query("SELECT has_table_privilege($1,'SELECT') readable,has_table_privilege($1,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') writable",[`public.${table}`])).rows[0];
      if (!permission.readable || policy==='least_privilege' && permission.writable) throw new Error('Least-privilege source grants required');
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function verifyCredentialPrivileges(client: PoolClient,policy: OdooCredentialPolicy): Promise<void> {
  const role = (await client.query("SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,current_setting('transaction_read_only') read_only FROM pg_roles WHERE rolname=current_user")).rows[0];
  if (!role || role.read_only!=='on') throw new Error('Read-only source transaction required');
  if (policy==='least_privilege' && (role.rolsuper || role.rolbypassrls || role.rolcreatedb || role.rolcreaterole)) throw new Error('Dedicated read-only source identity required');
  const scope = (await client.query("SELECT has_database_privilege(current_database(),'CREATE') database_create,has_schema_privilege('public','CREATE') schema_create")).rows[0];
  if (policy==='least_privilege' && (scope.database_create || scope.schema_create)) throw new Error('Source identity must not have DDL privileges');
}
