import type { AdministrationUnitOfWork } from '@el-dabboos/domain';
import { randomUUID } from 'node:crypto';
import { fail } from './runtime.ts';
/** Offline-only trusted bootstrap: no HTTP route can invoke this capability. */
export async function bootstrapAdministration(unitOfWork: AdministrationUnitOfWork, input: {
    displayName: string;
    provider: string;
    providerSubject: string;
    preferredLocale: 'en' | 'ar';
}, reference: string) {
    if (!reference.trim() || reference.length > 200 || !input.provider.trim() || input.provider.length > 200 || !input.providerSubject.trim() || input.providerSubject.length > 200)
        fail('INVALID_ADMIN_INPUT');
    return unitOfWork.write(async (transaction) => {
        if (await transaction.provisioning.bootstrapCompleted())
            fail('BOOTSTRAP_COMPLETED');
        const timestamp = new Date().toISOString(), meta = { version: 1, createdAt: timestamp, updatedAt: timestamp }, userId = randomUUID(), identityId = randomUUID();
        await transaction.provisioning.initializeProtectedRoles(timestamp);
        await transaction.users.createUser({ ...meta, id: userId, displayName: input.displayName, preferredLocale: input.preferredLocale, status: 'active' });
        await transaction.users.bindIdentity({ id: identityId, userId, provider: input.provider, providerSubject: input.providerSubject, status: 'active' });
        const result = await transaction.users.provisionPlatformAssignment({ ...meta, userId, roleIds: ['platform-admin'], status: 'active' }, null);
        if (result.outcome !== 'saved')
            fail('VERSION_CONFLICT');
        await transaction.provisioning.completeBootstrap(reference, timestamp);
        await transaction.appendAudit({ actorUserId: userId, targetId: userId, action: 'platform.access_changed', timestamp, result: 'allowed' });
        return { userId, identityId };
    });
}
/** Explicit platform provisioning of an inactive workspace's first protected admin. No existing-active-tenant bypass. */
export async function provisionTenantAdministrator(unitOfWork: AdministrationUnitOfWork, actorIdentityId: string, tenantId: string, targetIdentityId: string, expectedVersion: number) {
    return unitOfWork.write(async (transaction) => {
        const actor = await transaction.users.getIdentity(actorIdentityId), target = await transaction.users.getIdentity(targetIdentityId), tenant = await transaction.customers.getTenant(tenantId);
        if (!actor || actor.status !== 'active' || !(await transaction.users.activePlatformAdministratorUserIds()).includes(actor.userId))
            fail('ACCESS_DENIED');
        if (!target || target.status !== 'active' || (await transaction.users.getUser(target.userId))?.status !== 'active')
            fail('INVALID_ADMIN_INPUT');
        if (!tenant || tenant.status !== 'provisioning')
            fail('INVALID_ADMIN_INPUT');
        const timestamp = new Date().toISOString(), meta = { version: 1, createdAt: timestamp, updatedAt: timestamp };
        const member = await transaction.tenants.createMembership({ ...meta, id: randomUUID(), userId: target.userId, tenantId, status: 'active', roleIds: ['admin'], dataScopes: [] });
        const result = await transaction.customers.updateTenant({ ...tenant, status: 'active', updatedAt: timestamp }, expectedVersion);
        if (result.outcome !== 'saved')
            return fail('VERSION_CONFLICT');
        await transaction.appendAudit({ actorUserId: actor.userId, customerId: tenant.customerId, tenantId, targetId: member.id, action: 'membership.created', timestamp, result: 'allowed' });
        return result.value;
    });
}
/** Operationally provision a tenant-local candidate for normal bounded member assignment. */
export async function provisionAssignmentCandidate(unitOfWork: AdministrationUnitOfWork, actorIdentityId: string, tenantId: string, targetIdentityId: string) {
    return unitOfWork.write(async (transaction) => {
        const actor = await transaction.users.getIdentity(actorIdentityId), target = await transaction.users.getIdentity(targetIdentityId);
        if (!actor || actor.status !== 'active' || !(await transaction.users.activePlatformAdministratorUserIds()).includes(actor.userId))
            fail('ACCESS_DENIED');
        if (!target || target.status !== 'active' || (await transaction.users.getUser(target.userId))?.status !== 'active' || !await transaction.customers.getTenant(tenantId))
            fail('INVALID_ADMIN_INPUT');
        await transaction.provisioning.createAssignmentCandidate(tenantId, target.userId);
        await transaction.appendAudit({ actorUserId: actor.userId, tenantId, targetId: target.userId, action: 'membership.candidate_provisioned', timestamp: new Date().toISOString(), result: 'allowed' });
        return { userId: target.userId };
    });
}
