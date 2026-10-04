import type { AdminAuditEvent, AdministrationTransaction, AdministrationUnitOfWork, AuthorizationPolicy, MetadataWriteResult, PlatformContext, ResolvedTenantAccess } from '@el-dabboos/domain';
import { AccessControlError } from '@el-dabboos/domain';
import { assertRecoverableAdministrators, resolvePlatformAccess, resolveTenantAccess } from '../access-control.ts';
import { AuthorizationError, DefaultAuthorizationPolicy } from '../security.ts';
import type { AdministrationActor } from './commands.ts';
export function fail(code: string): never { throw new AccessControlError(code); }
export const found = <T>(value: T | null): T => value ?? fail('NOT_FOUND');
export const saved = <T>(writeResult: MetadataWriteResult<T>): T => writeResult.outcome === 'saved' ? writeResult.value : fail(writeResult.outcome === 'conflict' ? 'VERSION_CONFLICT' : 'NOT_FOUND');
export class AdministrationRuntime {
    readonly failureAuditEvents: AdminAuditEvent[] = [];
    constructor(readonly uow: AdministrationUnitOfWork, readonly policy: AuthorizationPolicy = new DefaultAuthorizationPolicy(), readonly clock: () => Date = () => new Date(), readonly candidates: Readonly<Record<string, readonly string[]>> = {}) { }
    metadata() { const timestamp = this.clock().toISOString(); return { version: 1, createdAt: timestamp, updatedAt: timestamp }; }
    async tenantActor(transaction: AdministrationTransaction, actor: AdministrationActor) { return resolveTenantAccess((await transaction.directory.tenantAccess(actor.identityId, actor.tenantId)) ?? fail('ACCESS_DENIED'), actor.identityId, actor.tenantId, actor.locale); }
    async platformActor(transaction: AdministrationTransaction, identityId: string) { return resolvePlatformAccess((await transaction.directory.platformAccess(identityId)) ?? fail('ACCESS_DENIED'), identityId); }
    audit(transaction: AdministrationTransaction, actor: ResolvedTenantAccess | PlatformContext, action: AdminAuditEvent['action'], targetId: string, customerId?: string) { return transaction.appendAudit({ actorUserId: actor.plane === 'tenant' ? actor.context.principal.userId : actor.userId, ...(actor.plane === 'tenant' ? { tenantId: actor.context.tenant.tenantId } : {}), ...(customerId ? { customerId } : {}), action, targetId, timestamp: this.clock().toISOString(), result: 'allowed' }); }
    private failed(actorUserId: string | undefined, action: AdminAuditEvent['action'], targetId: string, error: unknown, tenantId?: string) {
        if (!actorUserId)
            return;
        this.failureAuditEvents.push({ actorUserId, action, targetId, ...(tenantId ? { tenantId } : {}), timestamp: this.clock().toISOString(), result: error instanceof AccessControlError || error instanceof AuthorizationError ? 'denied' : 'error' });
        if (this.failureAuditEvents.length > 1000)
            this.failureAuditEvents.shift();
    }
    tenantWrite<T>(input: {
        actor: AdministrationActor;
        action: AdminAuditEvent['action'];
        targetId: string;
    }, operation: (transaction: AdministrationTransaction, actor: ResolvedTenantAccess) => Promise<T>): Promise<T> { let actorUserId: string | undefined; return this.uow.write(async (transaction) => { actorUserId = (await transaction.users.getIdentity(input.actor.identityId))?.userId; return operation(transaction, await this.tenantActor(transaction, input.actor)); }).catch(error => { this.failed(actorUserId, input.action, input.targetId, error, input.actor.tenantId); throw error; }); }
    platformWrite<T>(input: {
        identityId: string;
        action: AdminAuditEvent['action'];
        targetId: string;
    }, operation: (transaction: AdministrationTransaction, actor: PlatformContext) => Promise<T>): Promise<T> { let actorUserId: string | undefined; return this.uow.write(async (transaction) => { actorUserId = (await transaction.users.getIdentity(input.identityId))?.userId; return operation(transaction, await this.platformActor(transaction, input.identityId)); }).catch(error => { this.failed(actorUserId, input.action, input.targetId, error); throw error; }); }
    async recovery(transaction: AdministrationTransaction, userId: string) {
        for (const tenantId of await transaction.users.membershipTenantIds(userId))
            assertRecoverableAdministrators(await transaction.tenants.activeAdministratorUserIds(tenantId));
        assertRecoverableAdministrators(await transaction.users.activePlatformAdministratorUserIds());
    }
}
