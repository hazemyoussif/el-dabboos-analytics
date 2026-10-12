import type { ProductUser } from '@el-dabboos/domain';
import { authorizePlatform } from '../access-control.ts';
import type { PlatformAdministrationCommand } from './commands.ts';
import { AdministrationRuntime, fail, found, saved } from './runtime.ts';
export async function provisionUserForTenant(runtime: AdministrationRuntime, identityId: string, command: Omit<Extract<PlatformAdministrationCommand, {
    action: 'user.tenant_candidate';
}>, 'action'>) {
    return runtime.platformWrite({ identityId, action: 'membership.candidate_provisioned', targetId: command.userId }, async (transaction, actor) => {
        authorizePlatform(actor, 'platform:users:manage');
        authorizePlatform(actor, 'platform:tenants:manage');
        const user = found(await transaction.users.getUser(command.userId));
        found(await transaction.customers.getTenant(command.tenantId));
        const identities = await transaction.users.listIdentities(user.id);
        if (user.status !== 'active' || !identities.some(identity => identity.status === 'active'))
            fail('INVALID_ADMIN_INPUT');
        await transaction.provisioning.createAssignmentCandidate(command.tenantId, user.id);
        await transaction.appendAudit({ actorUserId: actor.userId, tenantId: command.tenantId, targetId: user.id, action: 'membership.candidate_provisioned', timestamp: runtime.clock().toISOString(), result: 'allowed' });
        return { userId: user.id, tenantId: command.tenantId };
    });
}
export async function updateUser(runtime: AdministrationRuntime, identityId: string, command: Omit<Extract<PlatformAdministrationCommand, {
    action: 'user.update';
}>, 'action'>) {
    return runtime.platformWrite({ identityId, action: 'user.updated', targetId: command.id }, async (transaction, actor) => {
        const now = runtime.clock().toISOString();
        authorizePlatform(actor, 'platform:users:manage');
        const old = found(await transaction.users.getUser(command.id));
        const user = saved(await transaction.users.updateUser({ ...old, displayName: command.displayName, preferredLocale: command.preferredLocale, status: command.status, updatedAt: now }, command.expectedVersion));
        await runtime.recovery(transaction, old.id);
        await runtime.audit(transaction, actor, command.status === 'suspended' ? 'user.suspended' : 'user.updated', user.id);
        return user;
    });
}
export async function disableIdentity(runtime: AdministrationRuntime, identityId: string, command: Omit<Extract<PlatformAdministrationCommand, {
    action: 'identity.disable';
}>, 'action'>) {
    return runtime.platformWrite({ identityId, action: 'identity.disabled', targetId: command.id }, async (transaction, actor) => {
        authorizePlatform(actor, 'platform:users:manage');
        const identity = found(await transaction.users.getIdentity(command.id));
        if (!await transaction.users.disableIdentity(command.id))
            fail('NOT_FOUND');
        await runtime.recovery(transaction, identity.userId);
        await runtime.audit(transaction, actor, 'identity.disabled', command.id);
        return { disabled: true };
    });
}
export async function listUsers(runtime: AdministrationRuntime, identityId: string, cursor?: string) {
    return runtime.uow.write(async (transaction) => {
        const actor = await runtime.platformActor(transaction, identityId);
        authorizePlatform(actor, 'platform:users:view');
        const userSummary = async (user: ProductUser) => ({ ...user, identities: (await transaction.users.listIdentities(user.id)).map(identity => ({ id: identity.id, provider: identity.provider, status: identity.status, ...(identity.loginHint ? { loginHint: identity.loginHint } : {}) })), platformAssignment: await transaction.users.getPlatformAssignment(user.id) });
        const page = await transaction.users.listUsers({ limit: 100, ...(cursor ? { cursor } : {}) });
        return { ...page, items: await Promise.all(page.items.map(userSummary)) };
    });
}
export async function getUser(runtime: AdministrationRuntime, identityId: string, id: string) {
    return runtime.uow.write(async (transaction) => {
        const actor = await runtime.platformActor(transaction, identityId);
        authorizePlatform(actor, 'platform:users:view');
        const userSummary = async (user: ProductUser) => ({ ...user, identities: (await transaction.users.listIdentities(user.id)).map(identity => ({ id: identity.id, provider: identity.provider, status: identity.status, ...(identity.loginHint ? { loginHint: identity.loginHint } : {}) })), platformAssignment: await transaction.users.getPlatformAssignment(user.id) });
        return userSummary(found(await transaction.users.getUser(id)));
    });
}
