import {AccessControlError} from '@el-dabboos/domain';
import {LoginAbuseGuard} from './abuse-guard.ts';
import { createControlPool,createAuthenticationPool,PostgresAdministrationStore,PostgresAuthenticationDirectory,PostgresEmployeeProvisioner,assertControlReady,verifyControlAppRole } from '@el-dabboos/data';
import { createAdministration,normalizeWorkspaceUser,resolveAuthenticatedPrincipal,resolvePlatformAccess,authorizePlatform } from '@el-dabboos/application';
import { ApiError } from '../errors.ts';
import { createLocalAuth,BetterAuthLocalProvider } from './local-provider.ts';
import type { LocalAuthConfig } from './config.ts';
import type {AdministrationActor,WorkspaceUserInput} from '@el-dabboos/application';
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
    const provisioningAbuse = new LoginAbuseGuard(),platformDirectory=new PostgresAdministrationStore(pool).directory;
    const provisionEmployee = async (actorIdentityId:string,input:{displayName:string;preferredLocale:'en'|'ar';email:string;password:string}) => {
        const access=await platformDirectory.platformAccess(actorIdentityId);
        if(!access) throw new AccessControlError('PLATFORM_FORBIDDEN');
        authorizePlatform(resolvePlatformAccess(access,actorIdentityId),'platform:users:manage');
        if (typeof input.password!=='string' || input.password.length<8 || input.password.length>1024) throw new AccessControlError('INVALID_ADMIN_INPUT');
        const release=provisioningAbuse.enter(actorIdentityId,actorIdentityId);
        if(!release) throw new ApiError(429,'USER_PROVISIONING_LIMITED','Try again later.');
        try {
            const hash=(await auth.$context).password.hash;
            return await employeeProvisioner.create(actorIdentityId,{displayName:input.displayName,preferredLocale:input.preferredLocale,email:input.email},{subject:crypto.randomUUID(),passwordHash:await hash(input.password)});
        } finally {release();}
    };
    const administration=createAdministration(new PostgresAdministrationStore(pool));
    const provisionWorkspaceEmployee=async(actor:AdministrationActor,input:WorkspaceUserInput&{password:string})=>{
        const normalized=normalizeWorkspaceUser(input);
        await administration.authorizeWorkspaceUserCreation(actor,normalized.roleIds);
        if(typeof input.password!=='string'||input.password.length<8||input.password.length>1024)throw new AccessControlError('INVALID_ADMIN_INPUT');
        const release=provisioningAbuse.enter(actor.identityId,actor.identityId);
        if(!release)throw new ApiError(429,'USER_PROVISIONING_LIMITED','Try again later.');
        try {
            const hash=(await auth.$context).password.hash;
            return await administration.createWorkspaceUser(actor,normalized,{subject:crypto.randomUUID(),passwordHash:await hash(input.password)});
        }finally{release();}
    };
    return { auth,directory,principal,provisionEmployee,provisionWorkspaceEmployee,config,ready,close: async () => { await Promise.all([pool.end(),frameworkPool.end()]); } };
}
export type LocalAuthenticationRuntime = Awaited<ReturnType<typeof openLocalAuthentication>>;
