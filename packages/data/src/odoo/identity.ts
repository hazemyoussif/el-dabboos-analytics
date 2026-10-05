import type { Pool } from 'pg';
const sourceTables = ['sale_order','account_move','res_partner','res_users','business_line','res_country_state','res_currency','account_move_line','sale_order_line','sale_order_line_invoice_rel'];
/** Check dedicated read-only privileges before extraction. No provisioning, writes or credential logging. */
export async function verifyOdooSourceIdentity(pool: Pool): Promise<void> {
  const role = (await pool.query('SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user')).rows[0];
  if (!role || role.rolsuper || role.rolbypassrls || role.rolcreatedb || role.rolcreaterole) throw new Error('Dedicated read-only source identity required');
  const scope = (await pool.query("SELECT has_database_privilege(current_database(),'CREATE') database_create,has_schema_privilege('public','CREATE') schema_create")).rows[0];
  if (scope.database_create || scope.schema_create) throw new Error('Source identity must not have DDL privileges');
  for (const table of sourceTables) {
    const permission = (await pool.query("SELECT has_table_privilege($1,'SELECT') readable,has_table_privilege($1,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') writable",[`public.${table}`])).rows[0];
    if (!permission.readable || permission.writable) throw new Error('Least-privilege source grants required');
  }
}
