import { readFile } from 'node:fs/promises';
import { createControlPool, migrateControl, assertControlReady, verifyControlMigratorRole, importSqliteControl, PostgresSourceDefinitions } from '@el-dabboos/data';
import { provisionControlRoles } from '../../../packages/data/src/control/provision.ts';
function required(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error('Missing control configuration');
    return value;
}
async function bootstrapLocal(): Promise<void> {
    const adminUrl = new URL('postgresql://mart_bootstrap@127.0.0.1:55437/postgres');
    adminUrl.password = required('MART_LOCAL_ADMIN_PASSWORD');
    const migrator = required('CONTROL_LOCAL_MIGRATOR_PASSWORD'), app = required('CONTROL_LOCAL_APP_PASSWORD');
    validateLocalCredentials(migrator,app,decodeURIComponent(adminUrl.password));
    const pool = createControlPool(adminUrl.toString(),1);
    try {
        // CREATE DATABASE cannot run in a transaction; fail closed on a conflicting existing owner.
        if (!(await pool.query("SELECT 1 FROM pg_roles WHERE rolname='control_migrator'")).rowCount) await pool.query('CREATE ROLE control_migrator NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE');
        if (!(await pool.query("SELECT 1 FROM pg_database WHERE datname='el_dabboos_control'")).rowCount) await pool.query('CREATE DATABASE el_dabboos_control OWNER control_migrator');
        else if (!(await pool.query("SELECT 1 FROM pg_database JOIN pg_roles ON pg_roles.oid=datdba WHERE datname='el_dabboos_control' AND rolname='control_migrator'")).rowCount) throw new Error('Unexpected control database owner');
    } finally { await pool.end(); }
    adminUrl.pathname='/el_dabboos_control';
    const control = createControlPool(adminUrl.toString(),1);
    try { await provisionControlRoles(control,{ migrator,app }); } finally { await control.end(); }
}
async function execute(): Promise<void> {
    const [command,path,...extra] = process.argv.slice(2);
    if (extra.length && !(command==='import-sqlite' && extra.join(',')==='--dry-run')) throw new Error('Unexpected control arguments');
    if (command==='bootstrap-local') { if (path) throw new Error('Unexpected bootstrap arguments'); return bootstrapLocal(); }
    if (!['migrate','import-sqlite','source-create','verify'].includes(command ?? '')) throw new Error('Unknown control command');
    validateCommandPath(command,path);
    const pool = createControlPool(required('CONTROL_MIGRATOR_URL'),1);
    try {
        await verifyControlMigratorRole(pool);
        if (command==='migrate') process.stdout.write(`${JSON.stringify({ applied: await migrateControl(pool) })}\n`);
        else if (command==='verify') { await assertControlReady(pool); process.stdout.write('Control schema current\n'); }
        else if (command==='import-sqlite') process.stdout.write(`${JSON.stringify(await importSqliteControl(path!,pool,extra.length===1))}\n`);
        else if (command==='source-create') { await assertControlReady(pool); await new PostgresSourceDefinitions(pool).create(JSON.parse(await readFile(path!,'utf8'))); process.stdout.write('Source definition created\n'); }
        else throw new Error('Unexpected control arguments');
    } finally { await pool.end(); }
}
try { await execute(); } catch {
    process.stderr.write('Control operation failed. Check approved input, schema, credentials and role boundaries; sensitive database errors are not printed.\n');
    process.exitCode=1;
}

function validateCommandPath(command: string | undefined, path: string | undefined): void {
    const fileCommand = command==='import-sqlite' || command==='source-create';
    if (Boolean(path)!==fileCommand) throw new Error('Unexpected control arguments');
}

function validateLocalCredentials(migrator: string, app: string, administrator: string): void {
    if (migrator.length < 24 || app.length < 24 || new Set([migrator,app,administrator]).size !== 3) throw new Error('Distinct control credentials required');
    for (const [identity,password] of [['MIGRATOR',migrator],['DATABASE',app]]) {
        const url = new URL(required(`CONTROL_${identity}_URL`));
        const login = identity==='MIGRATOR' ? 'control_migrator_login' : 'control_app_login';
        if (!['postgres:','postgresql:'].includes(url.protocol) || url.hostname!=='127.0.0.1' || url.port!=='55437' || url.pathname!=='/el_dabboos_control' || url.username!==login || decodeURIComponent(url.password)!==password || url.search || url.hash) throw new Error('Local control credential mismatch');
    }
}
