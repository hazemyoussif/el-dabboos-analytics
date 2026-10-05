import { Pool } from 'pg';
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
/** Separate framework pool fixes its namespace without affecting product-repository sessions. */
export function createAuthenticationPool(connectionString: string, max = 4) {
    return new Pool({ connectionString,max,connectionTimeoutMillis: 5000,options: '-c search_path=auth,pg_catalog' });
}
