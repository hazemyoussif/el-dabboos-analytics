import { Pool } from 'pg';
import { AccessControlError } from '@el-dabboos/domain';
import type { AuthenticatedExternalIdentity,AuthenticationDirectory,AuthenticationSecurityAudit,AuthenticationSecurityEvent,LocalIdentityProvision,LocalIdentityProvisioner,LocalSessionRevoker } from '@el-dabboos/domain';
import { controlConnection } from '../control/session.ts';
import { usersRepository } from '../metadata/administration/users.ts';
import { metadataRows } from '../metadata/administration/mappers.ts';
/** Auth subjects never include tenant/source authority; every resolution reloads current product state. */
export class PostgresAuthenticationDirectory implements AuthenticationDirectory,AuthenticationSecurityAudit,LocalSessionRevoker {
    constructor(private readonly pool: Pool) {}
    async resolve(identity: AuthenticatedExternalIdentity) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await client.query('SET LOCAL search_path=control,pg_catalog');
            const connection = controlConnection(client);
            const repository = usersRepository(connection,metadataRows(connection));
            const binding = await repository.findIdentity(identity.provider,identity.subject);
            const user = binding ? await repository.getUser(binding.userId) : null;
            await client.query('COMMIT'); return binding && user ? { binding,user } : null;
        } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
    async record(event: AuthenticationSecurityEvent, userId?: string): Promise<void> {
        await this.pool.query('INSERT INTO control.authentication_security_events(id,event,user_id) VALUES ($1,$2,$3)',[crypto.randomUUID(),event,userId ?? null]);
    }
    async revoke(subject: string): Promise<void> {
        await this.pool.query('DELETE FROM auth.session WHERE "userId"=$1',[subject]);
    }
}
/** Migrator-only offline credential setup, serialized with all product metadata writes. */
export class PostgresLocalIdentityProvisioner implements LocalIdentityProvisioner {
    constructor(private readonly pool: Pool) {}
    async provision(command: LocalIdentityProvision, credential: { subject: string; passwordHash: string }) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(738421,11)');
            const user = (await client.query('SELECT version FROM control.users WHERE id=$1',[command.userId])).rows[0];
            if (!user || user.version!==command.expectedUserVersion) throw new Error('Local identity user/version conflict');
            if ((await client.query("SELECT 1 FROM control.identities WHERE user_id=$1 AND provider='local'",[command.userId])).rowCount) throw new Error('Local identity already provisioned');
            await client.query('INSERT INTO auth."user"(id,name,email) VALUES ($1,$1,$2)',[credential.subject,command.email]);
            await client.query('INSERT INTO auth.account(id,"accountId","providerId","userId",password) VALUES ($1,$2,\'credential\',$2,$3)',[crypto.randomUUID(),credential.subject,credential.passwordHash]);
            const identityId = crypto.randomUUID();
            await client.query('INSERT INTO control.identities(id,user_id,provider,provider_subject,status) VALUES ($1,$2,\'local\',$3,$4)',[identityId,command.userId,credential.subject,command.enableIdentity ? 'active' : 'disabled']);
            if (command.activateUser) await client.query("UPDATE control.users SET status='active',version=version+1,updated_at=$2 WHERE id=$1",[command.userId,new Date().toISOString()]);
            await client.query("INSERT INTO control.authentication_security_events(id,event,user_id,operator_reference) VALUES ($1,'local_identity_provisioned',$2,$3)",[crypto.randomUUID(),command.userId,command.operatorReference]);
            await client.query('COMMIT'); return { subject: credential.subject,identityId };
        } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
}
/** Platform-admin employee creation using the normal control-app role. Product user, credential, identity and audit commit atomically. */
export class PostgresEmployeeProvisioner {
    constructor(private readonly pool: Pool) {}
    async create(actorIdentityId: string,input:{displayName:string;preferredLocale:'en'|'ar';email:string},credential:{subject:string;passwordHash:string}) {
        const displayName=input.displayName.trim(),email=input.email.trim().toLowerCase();
        if (!displayName || displayName.length>200 || !['en','ar'].includes(input.preferredLocale) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) throw new AccessControlError('INVALID_ADMIN_INPUT');
        const client=await this.pool.connect();
        try {
            await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(738421,11)');
            const actor=(await client.query(`SELECT product_user.id
              FROM control.identities identity
              JOIN control.users product_user ON product_user.id=identity.user_id
              JOIN control.platform_assignments assignment ON assignment.user_id=product_user.id
              JOIN control.platform_assignment_roles assignment_role ON assignment_role.user_id=assignment.user_id
              JOIN control.roles role ON role.id=assignment_role.role_id
              JOIN control.role_permissions permission ON permission.role_id=role.id
              WHERE identity.id=$1 AND identity.status='active' AND product_user.status='active'
                AND assignment.status='active' AND role.scope='platform'
                AND permission.permission='platform:users:manage'
              LIMIT 1`,[actorIdentityId])).rows[0];
            if(!actor) throw new AccessControlError('PLATFORM_FORBIDDEN');
            const userId=crypto.randomUUID(),identityId=crypto.randomUUID(),now=new Date().toISOString();
            await client.query('INSERT INTO control.users(id,display_name,preferred_locale,status,version,created_at,updated_at) VALUES($1,$2,$3,\'active\',1,$4,$4)',[userId,displayName,input.preferredLocale,now]);
            await client.query('INSERT INTO auth."user"(id,name,email) VALUES($1,$2,$3)',[credential.subject,displayName,email]);
            await client.query('INSERT INTO auth.account(id,"accountId","providerId","userId",password) VALUES($1,$2,\'credential\',$2,$3)',[crypto.randomUUID(),credential.subject,credential.passwordHash]);
            await client.query('INSERT INTO control.identities(id,user_id,provider,provider_subject,login_hint,status) VALUES($1,$2,\'local\',$3,$4,\'active\')',[identityId,userId,credential.subject,email]);
            await client.query("INSERT INTO control.authentication_security_events(id,event,user_id,operator_reference) VALUES($1,'local_identity_provisioned',$2,'platform-admin-create')",[crypto.randomUUID(),userId]);
            await client.query("INSERT INTO control.admin_audit_events(event_id,actor_user_id,target_id,action,result,occurred_at) VALUES($1,$2,$3,'user.updated','allowed',$4)",[crypto.randomUUID(),actor.id,userId,now]);
            await client.query('COMMIT');
            return {id:userId,displayName,preferredLocale:input.preferredLocale,status:'active' as const,version:1,createdAt:now,updatedAt:now,identity:{id:identityId,provider:'local',status:'active' as const,loginHint:email}};
        } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
}
/** Separate framework pool fixes its namespace without affecting product-repository sessions. */
export function createAuthenticationPool(connectionString: string, max = 4) {
    return new Pool({ connectionString,max,connectionTimeoutMillis: 5000,options: '-c search_path=auth,pg_catalog' });
}
