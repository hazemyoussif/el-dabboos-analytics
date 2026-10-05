import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { administrationConnection } from '../metadata/administration/connection.ts';
export function createControlPool(connectionString: string, max = 8): Pool {
    return new Pool({ connectionString, max, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
}
export function controlConnection(client: PoolClient) {
    const query = (sql: string, args: unknown[]) => {
        let index = 0;
        const ordered = sql.replace(/ORDER BY ([a-zA-Z_][a-zA-Z0-9_.]*(?:,[a-zA-Z_][a-zA-Z0-9_.]*)*)/g,
            (_, fields: string) => `ORDER BY ${fields.split(',').map(field => `${field} COLLATE "C"`).join(',')}`)
            .replace(/\bid>\?/g, 'id COLLATE "C">?');
        return client.query(ordered.replace(/\?/g, () => `$${++index}`), args);
    };
    return administrationConnection({
        one: async (sql, ...args) => (await query(sql, args)).rows[0],
        all: async (sql, ...args) => (await query(sql, args)).rows,
        run: async (sql, ...args) => ({ changes: (await query(sql, args)).rowCount ?? 0 }),
    });
}
/** Refuse credential overlap, elevated attributes, DDL and migration-history writes at startup. */
export async function verifyControlAppRole(pool: Pool): Promise<void> {
    const row = (await pool.query(`SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,
      pg_has_role(current_user,'control_app','MEMBER') app,
      EXISTS(SELECT 1 FROM pg_roles WHERE rolname='control_app' AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) unsafe_group,
      EXISTS(SELECT 1 FROM pg_roles WHERE rolname<>current_user AND rolname<>'control_app' AND pg_has_role(current_user,oid,'MEMBER')) overlap,
      has_database_privilege(current_database(),'CREATE') database_create,
      has_schema_privilege('control','CREATE') schema_create,
      has_schema_privilege('public','CREATE') public_create,
      has_table_privilege('control_admin.schema_migrations','INSERT,UPDATE,DELETE,TRUNCATE') history_write
      FROM pg_roles WHERE rolname=current_user`)).rows[0];
    if (!row || !row.app || row.unsafe_group || row.overlap || row.rolsuper || row.rolbypassrls || row.rolcreatedb || row.rolcreaterole || row.rolreplication || row.database_create || row.schema_create || row.public_create || row.history_write) throw new Error('Unsafe control application identity');
}
/** Operator credentials must belong only to the control migrator group, including before bootstrap. */
export async function verifyControlMigratorRole(pool: Pool): Promise<void> {
    const row = (await pool.query(`SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,
      pg_has_role(current_user,'control_migrator','MEMBER') migrator,
      EXISTS(SELECT 1 FROM pg_roles WHERE rolname='control_migrator' AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) unsafe_group,
      EXISTS(SELECT 1 FROM pg_roles WHERE rolname<>current_user AND rolname NOT IN ('control_migrator','pg_database_owner') AND pg_has_role(current_user,oid,'MEMBER')) overlap,
      has_database_privilege(current_database(),'CREATE') database_create
      FROM pg_roles WHERE rolname=current_user`)).rows[0];
    if (!row || !row.migrator || row.unsafe_group || row.overlap || !row.database_create || row.rolsuper || row.rolbypassrls || row.rolcreatedb || row.rolcreaterole || row.rolreplication) throw new Error('Unsafe control migrator identity');
}
