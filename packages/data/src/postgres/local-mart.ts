import { readFile } from 'node:fs/promises';
import type { Pool, PoolClient } from 'pg';
import { createMartPool, verifyMartRuntimeRole } from './session.ts';
import { loadPostgresMigrations } from './migrations.ts';

export const localMartLogins = { migrator: 'mart_migrator_login',ingestor: 'mart_ingestor_login',runtime: 'mart_runtime_login' } as const;
type MartIdentity = keyof typeof localMartLogins;
type LocalEnvironment = Readonly<Record<string,string|undefined>>;
export function localMartUrls(environment: LocalEnvironment): Record<MartIdentity,string> {
  return Object.fromEntries(Object.entries(localMartLogins).map(([identity,login]) => {
    const raw = environment[`MART_${identity.toUpperCase()}_URL`];
    let url: URL;
    try { url = new URL(raw ?? ''); } catch { throw new Error('Local mart connection configuration required'); }
    if (!['postgres:','postgresql:'].includes(url.protocol) || url.hostname!=='127.0.0.1' || url.port!=='55437' || url.pathname!=='/el_dabboos_analytics' || url.username!==login || !url.password || url.search || url.hash) throw new Error('Invalid isolated local mart identity');
    return [identity,url.toString()];
  })) as Record<MartIdentity,string>;
}
export function localMartBootstrapConfig(environment: LocalEnvironment) {
  const passwords = Object.fromEntries(['ADMIN','MIGRATOR','INGESTOR','RUNTIME'].map(identity => {
    const password = environment[`MART_LOCAL_${identity}_PASSWORD`];
    if (!password || password.length<24 || password.includes('\0')) throw new Error('Local mart provisioning configuration required');
    return [identity,password];
  })) as Record<'ADMIN'|'MIGRATOR'|'INGESTOR'|'RUNTIME',string>;
  if (new Set(Object.values(passwords)).size!==4) throw new Error('Distinct local credentials required');
  const urls = localMartUrls(environment);
  for (const identity of Object.keys(localMartLogins) as MartIdentity[]) {
    if (decodeURIComponent(new URL(urls[identity]).password)!==passwords[identity.toUpperCase() as keyof typeof passwords]) throw new Error('Local mart credential configuration mismatch');
  }
  const admin = new URL('postgresql://mart_bootstrap@127.0.0.1:55437/el_dabboos_analytics');
  admin.password = passwords.ADMIN;
  return { adminUrl: admin.toString(),passwords,urls };
}
async function verifyLogin(client: PoolClient,identity: MartIdentity): Promise<void> {
  // PostgreSQL adds implicit pg_database_owner membership for a migrator-owned database.
  const row = (await client.query(`SELECT current_user identity,rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,
    pg_has_role(current_user,$1,'MEMBER') correct_group,
    EXISTS (SELECT 1 FROM pg_roles WHERE rolname=$1 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) unsafe_group,
    EXISTS (SELECT 1 FROM pg_roles WHERE rolname<>current_user AND rolname<>$1 AND NOT (rolname='pg_database_owner' AND $1='dabboos_migrator') AND pg_has_role(current_user,oid,'MEMBER')) overlap
    FROM pg_roles WHERE rolname=current_user`,[`dabboos_${identity}`])).rows[0];
  if (!row || row.identity!==localMartLogins[identity] || !row.rolcanlogin || row.rolsuper || row.rolbypassrls || row.rolcreatedb || row.rolcreaterole || row.rolreplication || !row.correct_group || row.overlap || row.unsafe_group) throw new Error('Unsafe local mart role boundary');
}
/** Administrator-only, transactional and repeatable; never changes mappings or serving. */
export async function provisionLocalMart(environment: LocalEnvironment): Promise<void> {
  const config = localMartBootstrapConfig(environment);
  const pool = createMartPool(config.adminUrl,1);
  try { await provisionLocalMartRoles(pool,{ migrator: config.passwords.MIGRATOR,ingestor: config.passwords.INGESTOR,runtime: config.passwords.RUNTIME }); }
  finally { await pool.end(); }
}
/** Infrastructure role provisioning, also exercised against disposable synthetic PostgreSQL. */
export async function provisionLocalMartRoles(pool: Pool,passwords: Record<MartIdentity,string>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(738421,3)');
    const groups = (await client.query("SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname=ANY($1::text[])",[['dabboos_migrator','dabboos_ingestor','dabboos_runtime','dabboos_source_reader']])).rows;
    if (!groups.length) await client.query(await readFile(new URL('../../../../infra/postgres/roles.sql',import.meta.url),'utf8'));
    else if (groups.length!==4 || groups.some(group => group.rolcanlogin || group.rolsuper || group.rolbypassrls || group.rolcreatedb || group.rolcreaterole || group.rolreplication)) throw new Error('Unsafe existing mart group roles');
    // roles.sql ran in another database when the cluster groups already existed.
    await client.query("DO $$ BEGIN EXECUTE format('GRANT CREATE ON DATABASE %I TO dabboos_migrator',current_database()); END $$");
    for (const identity of Object.keys(localMartLogins) as MartIdentity[]) await provisionLogin(client,identity,passwords[identity]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function provisionLogin(client: PoolClient,identity: MartIdentity,password: string): Promise<void> {
  const login = localMartLogins[identity];
  const exists = (await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[login])).rowCount;
  // PostgreSQL utility DDL has no bind placeholders; server-side format quotes identifiers/literals.
  const sql = (await client.query(exists
    ? "SELECT format('ALTER ROLE %I PASSWORD %L', $1::text,$2::text) sql"
    : "SELECT format('CREATE ROLE %I LOGIN INHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L IN ROLE %I', $1::text,$2::text,$3::text) sql",exists ? [login,password] : [login,password,`dabboos_${identity}`])).rows[0].sql;
  await client.query(sql);
  await client.query(`SET LOCAL ROLE ${login}`);
  await verifyLogin(client,identity);
  await client.query('RESET ROLE');
}
export async function verifyLocalMart(environment: LocalEnvironment) {
  const urls = localMartUrls(environment);
  const versions: number[] = [];
  for (const identity of Object.keys(localMartLogins) as MartIdentity[]) await verifyConnection(identity,urls[identity],versions);
  return { database: 'el_dabboos_analytics',port: 55437,migrations: versions,identities: localMartLogins,roles: 'separate; non-superuser; no BYPASSRLS',runtime: 'read-only',ingestor: 'no DDL, approval or binding grants' };
}
async function verifyConnection(identity: MartIdentity,url: string,versions: number[]): Promise<void> {
  const pool: Pool = createMartPool(url,1);
  try {
    if (identity==='runtime') await verifyMartRuntimeRole(pool);
    const client = await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      await verifyLogin(client,identity);
      if (identity==='migrator') versions.push(...await verifySchema(client));
      else await verifyRestrictedGrants(client,identity);
      await client.query('COMMIT');
    } finally { client.release(true); }
  } finally { await pool.end(); }
}
async function verifySchema(client: PoolClient): Promise<number[]> {
  const manifest = await loadPostgresMigrations();
  const rows = (await client.query('SELECT version,name,sha256 FROM mart_admin.mart_schema_migrations ORDER BY version')).rows;
  if (rows.length!==manifest.length || rows.some((row,index) => row.version!==manifest[index]!.version || row.name!==manifest[index]!.name || row.sha256!==manifest[index]!.checksum)) throw new Error('Local mart schema not current');
  if (!(await client.query("SELECT has_database_privilege(current_database(),'CREATE') allowed")).rows[0].allowed) throw new Error('Migrator schema privilege missing');
  return rows.map(row => row.version);
}
async function verifyRestrictedGrants(client: PoolClient,identity: 'ingestor'|'runtime'): Promise<void> {
  const row = (await client.query(`SELECT has_database_privilege(current_database(),'CREATE') database_create,
    has_schema_privilege('mart','CREATE') schema_create,
    has_table_privilege('mart.mapping_releases','INSERT,UPDATE,DELETE,TRUNCATE') mapping_write,
    has_table_privilege('mart.serving_bindings','INSERT,UPDATE,DELETE,TRUNCATE') binding_write,
    EXISTS (SELECT 1 FROM pg_class JOIN pg_namespace ON pg_namespace.oid=relnamespace WHERE nspname='mart' AND relkind IN ('r','v','p') AND has_table_privilege(pg_class.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) any_write,
    has_table_privilege('mart.ingestion_batches','INSERT') ingestion_write`)).rows[0];
  if (row.database_create || row.schema_create || row.mapping_write || row.binding_write || (identity==='runtime' ? row.any_write : !row.ingestion_write)) throw new Error('Unsafe local mart grants');
}
