import type { Pool, PoolClient } from 'pg';
export const localControlLogins = { migrator: 'control_migrator_login', app: 'control_app_login' } as const;
/** Roles are cluster scoped; database/schema grants are control-only. Never touches mart roles/data. */
export async function provisionControlRoles(pool: Pool, passwords: { migrator: string; app: string }): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(738421,12)');
        for (const identity of ['migrator','app'] as const) await provisionIdentity(client,identity,passwords[identity]);
        await client.query("DO $$ BEGIN EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC',current_database()); END $$");
        await client.query("DO $$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO control_migrator,control_app',current_database()); END $$");
        await client.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
        await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
}
async function provisionIdentity(client: PoolClient, identity: keyof typeof localControlLogins, password: string): Promise<void> {
    const group = `control_${identity}`, login = localControlLogins[identity];
    if (!(await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[group])).rowCount) await client.query(`CREATE ROLE ${group} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
    const exists = (await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[login])).rowCount;
    const sql = (await client.query(exists ? "SELECT format('ALTER ROLE %I PASSWORD %L',$1::text,$2::text) sql" : "SELECT format('CREATE ROLE %I LOGIN INHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L IN ROLE %I',$1::text,$2::text,$3::text) sql",exists ? [login,password] : [login,password,group])).rows[0].sql;
    await client.query(sql);
    const unsafe = (await client.query(`SELECT 1 FROM pg_roles WHERE rolname IN ($1,$2) AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication OR (rolname=$1 AND rolcanlogin))`,[group,login])).rowCount;
    const overlap = (await client.query(`SELECT 1 FROM pg_roles WHERE rolname<>$1 AND rolname<>$2 AND NOT(rolname='pg_database_owner' AND $2='control_migrator') AND pg_has_role($1,oid,'MEMBER')`,[login,group])).rowCount;
    if (unsafe || overlap || !(await client.query("SELECT pg_has_role($1,$2,'MEMBER') valid",[login,group])).rows[0].valid) throw new Error('Unsafe control identity');
}
