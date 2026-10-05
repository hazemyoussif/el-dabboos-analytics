import { readFile } from 'node:fs/promises';
import { createControlPool,verifyControlMigratorRole,assertControlReady,PostgresLocalIdentityProvisioner } from '@el-dabboos/data';
import { provisionLocalIdentity } from '@el-dabboos/application';
import { hashPassword } from 'better-auth/crypto';
/** Privileged offline input: credential only from a protected pipe, never argv/environment/manifest. */
async function execute(): Promise<void> {
    const [command,path,...extra] = process.argv.slice(2);
    if (command!=='provision' || !path || extra.length || !process.env.CONTROL_MIGRATOR_URL || process.stdin.isTTY) throw new Error('Use a protected password input pipe and reviewed manifest');
    const manifest = JSON.parse(await readFile(path,'utf8'));
    let password = '';
    for await (const chunk of process.stdin) { password+=chunk.toString(); if (password.length>4096) throw new Error('Password input too long'); }
    password = password.replace(/\r?\n$/,'');
    const pool = createControlPool(process.env.CONTROL_MIGRATOR_URL,1);
    try {
        await verifyControlMigratorRole(pool); await assertControlReady(pool);
        const result = await provisionLocalIdentity(new PostgresLocalIdentityProvisioner(pool),manifest,password,hashPassword);
        process.stdout.write(`${JSON.stringify(result)}\n`);
    } finally { await pool.end(); }
}
try { await execute(); } catch { process.stderr.write('Local identity provisioning failed; check approved user/version and protected inputs. No credential values are printed.\n'); process.exitCode=1; }
