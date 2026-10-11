import { createControlPool,createAuthenticationPool,PostgresAuthenticationDirectory,PostgresEmployeeProvisioner,assertControlReady,verifyControlAppRole } from '@el-dabboos/data';
import { resolveAuthenticatedPrincipal } from '@el-dabboos/application';
import { ApiError } from '../errors.ts';
import { createLocalAuth,BetterAuthLocalProvider } from './local-provider.ts';
import type { LocalAuthConfig } from './config.ts';
export async function openLocalAuthentication(url: string, config: LocalAuthConfig) {
    const pool = createControlPool(url,4), frameworkPool = createAuthenticationPool(url);
    for (const owned of [pool,frameworkPool]) owned.on('error',() => { process.stderr.write('Authentication database connection failed\n'); });
    const directory = new PostgresAuthenticationDirectory(pool), auth = createLocalAuth(frameworkPool,directory,config), provider = new BetterAuthLocalProvider(auth), employeeProvisioner = new PostgresEmployeeProvisioner(pool);
    const ready = async () => { await assertControlReady(pool); await verifyControlAppRole(pool); for (const table of ['user','account','session','verification']) await frameworkPool.query(`SELECT 1 FROM auth."${table}" LIMIT 0`); return true; };
    const principal = async (headers: Record<string,unknown>) => {
        const cookie = typeof headers.cookie==='string' ? headers.cookie : undefined;
        const resolved = await resolveAuthenticatedPrincipal(provider,directory,cookie);
        if (!resolved) throw new ApiError(401,'IDENTITY_REQUIRED','Sign in to continue.');
        return resolved;
    };
    try { await ready(); await auth.$context; }
    catch { await Promise.all([pool.end(),frameworkPool.end()]); throw new Error('Authentication database identity/schema check failed'); }
    const provisionEmployee = async (actorIdentityId:string,input:{displayName:string;preferredLocale:'en'|'ar';email:string;password:string}) => {
        if (typeof input.password!=='string' || input.password.length<8 || input.password.length>1024) throw new Error('Invalid employee password');
        const hash=(await auth.$context).password.hash;
        return employeeProvisioner.create(actorIdentityId,{displayName:input.displayName,preferredLocale:input.preferredLocale,email:input.email},{subject:crypto.randomUUID(),passwordHash:await hash(input.password)});
    };
    return { auth,directory,principal,provisionEmployee,config,ready,close: async () => { await Promise.all([pool.end(),frameworkPool.end()]); } };
}
export type LocalAuthenticationRuntime = Awaited<ReturnType<typeof openLocalAuthentication>>;
