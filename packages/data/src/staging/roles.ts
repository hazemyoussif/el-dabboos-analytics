import type { PoolClient } from 'pg';
export const stagingIdentities = {
    controlMigrator: { login: 'staging_control_migrator_login',group: 'control_migrator',database: 'el_dabboos_control_staging' },
    controlApp: { login: 'staging_control_app_login',group: 'control_app',database: 'el_dabboos_control_staging' },
    martMigrator: { login: 'staging_mart_migrator_login',group: 'dabboos_migrator',database: 'el_dabboos_analytics_staging' },
    martIngestor: { login: 'staging_mart_ingestor_login',group: 'dabboos_ingestor',database: 'el_dabboos_analytics_staging' },
    martRuntime: { login: 'staging_mart_runtime_login',group: 'dabboos_runtime',database: 'el_dabboos_analytics_staging' },
} as const;
export type StagingIdentity = keyof typeof stagingIdentities;
/** Non-inheriting memberships satisfy role classification without granting access to developer DBs. */
export async function provisionStagingLogin(client: PoolClient, identity: StagingIdentity, password: string): Promise<void> {
    const { login,group } = stagingIdentities[identity];
    for (const role of [group,...(identity==='martMigrator' ? ['dabboos_source_reader'] : [])]) {
        if (!(await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount) await client.query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`);
        const unsafe = (await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)',[role])).rowCount;
        if (unsafe) throw new Error('Unsafe staging role group');
    }
    const exists = (await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[login])).rowCount;
    if (!exists) {
        const sql = (await client.query("SELECT format('CREATE ROLE %I LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',$1::text,$2::text) sql",[login,password])).rows[0].sql;
        await client.query(sql);
        await client.query(`GRANT ${group} TO ${login} WITH INHERIT FALSE, SET FALSE`);
    }
    // Existing passwords are never silently rotated by provisioning; connection verification detects mismatches.
    const row = (await client.query(`SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,rolinherit,
      pg_has_role($1,$2,'MEMBER') member,pg_has_role($1,$2,'SET') can_set,
      EXISTS(SELECT 1 FROM pg_roles WHERE rolname<>$1 AND rolname<>$2 AND rolname<>'pg_database_owner' AND pg_has_role($1,oid,'MEMBER')) overlap
      FROM pg_roles WHERE rolname=$1`,[login,group])).rows[0];
    if (!row || unsafeLogin(row)) throw new Error('Unsafe staging login');
}
/** Copy only reviewed migration-owned privileges into this database, never cluster/global rights. */
export async function grantStagingPrivileges(client: PoolClient, identity: StagingIdentity): Promise<void> {
    const { login,group,database } = stagingIdentities[identity];
    if ((await client.query('SELECT current_database() name')).rows[0].name!==database) throw new Error('Wrong staging grant database');
    const schema = identity.startsWith('control') ? 'control' : 'mart';
    await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${login}`);
    const commands = (await client.query(`SELECT format('GRANT %s ON %s %I.%I TO %I',privilege_type,CASE WHEN relkind='S' THEN 'SEQUENCE' ELSE 'TABLE' END,nspname,relname,$2::text) sql
      FROM pg_class JOIN pg_namespace ON pg_namespace.oid=relnamespace CROSS JOIN LATERAL aclexplode(relacl)
      WHERE grantee=$1::regrole AND nspname=ANY($3::text[])`,[group,login,[schema,`${schema}_admin`,...(identity==='controlApp' ? ['auth'] : [])]])).rows;
    for (const command of commands) await client.query(command.sql);
    await grantStagingColumnPrivileges(client,group,login,[schema,`${schema}_admin`,...(identity==='controlApp' ? ['auth'] : [])]);
    const functions = (await client.query(`SELECT format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO %I',nspname,proname,pg_get_function_identity_arguments(pg_proc.oid),$2::text) sql
      FROM pg_proc JOIN pg_namespace ON pg_namespace.oid=pronamespace CROSS JOIN LATERAL aclexplode(proacl)
      WHERE grantee=$1::regrole AND nspname=$3 AND privilege_type='EXECUTE'`,[group,login,schema])).rows;
    for (const command of functions) await client.query(command.sql);
    await grantAdministrationSchema(client,identity);
    if (identity==='martRuntime') await grantRuntimePolicies(client,login);
}
/** Column ACLs are separate from relation ACLs; preserve the reviewed column boundary. */
async function grantStagingColumnPrivileges(client: PoolClient, group: string, login: string, schemas: string[]): Promise<void> {
    const commands = (await client.query(`SELECT format('GRANT %s (%I) ON TABLE %I.%I TO %I',privilege_type,attname,nspname,relname,$2::text) sql
      FROM pg_attribute JOIN pg_class ON pg_class.oid=attrelid JOIN pg_namespace ON pg_namespace.oid=relnamespace
      CROSS JOIN LATERAL aclexplode(attacl)
      WHERE grantee=$1::regrole AND nspname=ANY($3::text[]) AND attnum>0 AND NOT attisdropped`,[group,login,schemas])).rows;
    for (const command of commands) await client.query(command.sql);
}
async function grantAdministrationSchema(client: PoolClient, identity: StagingIdentity): Promise<void> {
    const { login } = stagingIdentities[identity];
    if (identity==='controlApp') await client.query(`GRANT USAGE ON SCHEMA control_admin,auth TO ${login}`);
    if (identity==='martRuntime'||identity==='martIngestor') await client.query(`GRANT USAGE ON SCHEMA mart_admin TO ${login}`);
}
async function grantRuntimePolicies(client: PoolClient, login: string): Promise<void> {
    const policies = (await client.query(`SELECT format('ALTER POLICY %I ON mart.%I TO dabboos_runtime,%I',polname,relname,$1::text) sql,polname
      FROM pg_policy JOIN pg_class ON pg_class.oid=polrelid JOIN pg_namespace ON pg_namespace.oid=relnamespace
      WHERE nspname='mart' AND NOT polpermissive AND (SELECT oid FROM pg_roles WHERE rolname='dabboos_runtime')=ANY(polroles)`,[login])).rows;
    if (policies.filter(policy => policy.polname==='runtime_release').length!==6) throw new Error('Staging serving policy set incomplete');
    for (const policy of policies) await client.query(policy.sql);
}

function unsafeLogin(row: Record<string,boolean>): boolean {
    return ['rolsuper','rolbypassrls','rolcreatedb','rolcreaterole','rolreplication','rolinherit','can_set','overlap'].some(field => row[field]) || !row.member;
}
