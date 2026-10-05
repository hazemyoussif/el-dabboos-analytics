import { readFile } from 'node:fs/promises';
import { bootstrapStaging } from '@el-dabboos/application';
import { createControlPool,createMartPool,migrateControl,migratePostgres,PostgresStagingBootstrap,assertControlReady,verifyControlAppRole,assertMartRuntimeReady } from '@el-dabboos/data';
import { provisionStagingDatabases } from '../../../packages/data/src/staging/infrastructure.ts';
import { stagingIdentities,grantStagingPrivileges } from '../../../packages/data/src/staging/roles.ts';
import type { StagingIdentity } from '../../../packages/data/src/staging/roles.ts';
import { stagingConnectionUrls,stagingAdminUrl } from './staging-config.ts';
async function execute(): Promise<void> {
    const [command,path,...extra] = process.argv.slice(2);
    if (extra.length || Boolean(path)!==(command==='bootstrap')) throw new Error('Invalid staging arguments');
    const urls = stagingConnectionUrls(process.env);
    if (command==='provision') {
        if (!process.env.STAGING_ADMIN_URL) throw new Error('Staging administrator configuration required');
        const pool = createControlPool(stagingAdminUrl(process.env.STAGING_ADMIN_URL,urls.controlMigrator),1);
        try { await provisionStagingDatabases(pool,Object.fromEntries(Object.entries(urls).map(([identity,url]) => [identity,decodeURIComponent(new URL(url).password)])) as Record<StagingIdentity,string>); }
        finally { await pool.end(); }
    } else if (command==='migrate') await migrate(urls);
    else if (command==='bootstrap') {
        const pool = createControlPool(urls.controlApp,1);
        try { await verifyControlAppRole(pool); process.stdout.write(`${JSON.stringify(await bootstrapStaging(new PostgresStagingBootstrap(pool),JSON.parse(await readFile(path!,'utf8'))))}\n`); }
        finally { await pool.end(); }
    } else if (command==='verify') await verify(urls);
    else throw new Error('Unknown staging command');
}
async function migrate(urls: Record<StagingIdentity,string>): Promise<void> {
    for (const identity of ['controlMigrator','martMigrator'] as const) {
        const pool = createControlPool(urls[identity],1);
        try {
            await (identity==='controlMigrator' ? migrateControl(pool) : migratePostgres(pool));
            const client = await pool.connect();
            try {
                await client.query('BEGIN'); await client.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
                for (const candidate of Object.keys(stagingIdentities) as StagingIdentity[]) if (stagingIdentities[candidate].database===stagingIdentities[identity].database) await grantStagingPrivileges(client,candidate);
                await client.query('COMMIT');
            } catch (error) { await client.query('ROLLBACK'); throw error; }
            finally { client.release(); }
        } finally { await pool.end(); }
    }
}
async function verify(urls: Record<StagingIdentity,string>): Promise<void> {
    const control = createControlPool(urls.controlApp,1), mart = createMartPool(urls.martRuntime,1);
    try { await assertControlReady(control); await verifyControlAppRole(control); await assertMartRuntimeReady(mart); process.stdout.write('Staging schemas and runtime roles verified; no source connectivity or serving activation performed.\n'); }
    finally { await Promise.all([control.end(),mart.end()]); }
}
try { await execute(); } catch { process.stderr.write('Staging operation failed; check approved manifest, database identities and schema. Sensitive configuration is not printed.\n'); process.exitCode=1; }
