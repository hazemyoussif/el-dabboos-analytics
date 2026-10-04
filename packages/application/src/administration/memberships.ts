import type { ManagedMembership } from '@el-dabboos/domain';
import { compileMembershipScopes, validateScopeValues } from '@el-dabboos/domain';
import { assertRecoverableAdministrators, authorizeMembershipAssignment, authorizeMembershipChange, authorizeMembershipLifecycle, authorizeScopeChange, authorizeTenantAdministration } from '../access-control.ts';
import type { AdministrationActor, ScopeValues, TenantAdministrationCommand } from './commands.ts';
import { AdministrationRuntime, fail, found, saved } from './runtime.ts';
export async function createMembership(runtime: AdministrationRuntime, actorInput: AdministrationActor, command: Omit<Extract<TenantAdministrationCommand, {
    action: 'membership.create';
}>, 'action'>, available: ScopeValues = {}) {
    return runtime.tenantWrite({ actor: actorInput, action: 'membership.created', targetId: actorInput.tenantId }, async (transaction, actor) => {
        const roles = await transaction.tenants.listRoles(actorInput.tenantId);
        const selected = (ids: readonly string[]) => ids.map(id => found(roles.find(role => role.id === id) ?? null));
        if (!runtime.candidates[actorInput.tenantId]?.includes(command.userId) && !(await transaction.tenants.listAssignmentCandidates(actorInput.tenantId)).some(user => user.id === command.userId))
            fail('NOT_FOUND');
        found(await transaction.users.getUser(command.userId));
        compileMembershipScopes(command.dataScopes);
        if (command.dataScopes.length) {
            authorizeTenantAdministration(actor, actorInput.tenantId, 'data_scopes:manage');
            validateScopeValues(command.dataScopes, available);
        }
        const next: ManagedMembership = { ...runtime.metadata(), id: crypto.randomUUID(), tenantId: actorInput.tenantId, userId: command.userId, status: 'active', roleIds: command.roleIds, dataScopes: command.dataScopes };
        authorizeMembershipAssignment(actor, next, selected(next.roleIds));
        const result = await transaction.tenants.createMembership(next);
        await runtime.audit(transaction, actor, 'membership.created', result.id);
        return result;
    });
}
export async function changeMembershipRoles(runtime: AdministrationRuntime, actorInput: AdministrationActor, command: Omit<Extract<TenantAdministrationCommand, {
    action: 'membership.roles';
}>, 'action'>) {
    return runtime.tenantWrite({ actor: actorInput, action: 'membership.roles_changed', targetId: command.id }, async (transaction, actor) => {
        const now = runtime.clock().toISOString();
        const roles = await transaction.tenants.listRoles(actorInput.tenantId);
        const selected = (ids: readonly string[]) => ids.map(id => found(roles.find(role => role.id === id) ?? null));
        const current = found(await transaction.tenants.getMembership(actorInput.tenantId, command.id));
        const next = { ...current, updatedAt: now, ...({ roleIds: command.roleIds }) };
        authorizeMembershipChange(actor, current, next, selected(current.roleIds), selected(next.roleIds));
        const result = saved(await transaction.tenants.updateMembership(next, command.expectedVersion));
        assertRecoverableAdministrators(await transaction.tenants.activeAdministratorUserIds(actorInput.tenantId));
        await runtime.audit(transaction, actor, 'membership.roles_changed', current.id);
        return result;
    });
}
export async function changeMembershipStatus(runtime: AdministrationRuntime, actorInput: AdministrationActor, command: Omit<Extract<TenantAdministrationCommand, {
    action: 'membership.status';
}>, 'action'>) {
    return runtime.tenantWrite({ actor: actorInput, action: 'membership.updated', targetId: command.id }, async (transaction, actor) => {
        const now = runtime.clock().toISOString();
        const roles = await transaction.tenants.listRoles(actorInput.tenantId);
        const selected = (ids: readonly string[]) => ids.map(id => found(roles.find(role => role.id === id) ?? null));
        const current = found(await transaction.tenants.getMembership(actorInput.tenantId, command.id));
        const next = { ...current, updatedAt: now, ...({ status: command.status }) };
        {
            authorizeMembershipLifecycle(actor, current, selected(current.roleIds));
        }
        const result = saved(await transaction.tenants.updateMembership(next, command.expectedVersion));
        assertRecoverableAdministrators(await transaction.tenants.activeAdministratorUserIds(actorInput.tenantId));
        await runtime.audit(transaction, actor, command.status === 'suspended' ? 'membership.suspended' : 'membership.updated', current.id);
        return result;
    });
}
export async function changeMembershipScopes(runtime: AdministrationRuntime, actorInput: AdministrationActor, command: Omit<Extract<TenantAdministrationCommand, {
    action: 'membership.scopes';
}>, 'action'>, available: ScopeValues = {}) {
    return runtime.tenantWrite({ actor: actorInput, action: 'membership.scope_changed', targetId: command.id }, async (transaction, actor) => {
        const now = runtime.clock().toISOString();
        const roles = await transaction.tenants.listRoles(actorInput.tenantId);
        const selected = (ids: readonly string[]) => ids.map(id => found(roles.find(role => role.id === id) ?? null));
        const current = found(await transaction.tenants.getMembership(actorInput.tenantId, command.id));
        const next = { ...current, updatedAt: now, ...({ dataScopes: command.dataScopes }) };
        {
            authorizeScopeChange(actor, actorInput.tenantId, current.dataScopes, next.dataScopes, selected(current.roleIds));
            validateScopeValues(next.dataScopes, available);
        }
        const result = saved(await transaction.tenants.updateMembership(next, command.expectedVersion));
        assertRecoverableAdministrators(await transaction.tenants.activeAdministratorUserIds(actorInput.tenantId));
        await runtime.audit(transaction, actor, 'membership.scope_changed', current.id);
        return result;
    });
}
export async function tenantMembership(runtime: AdministrationRuntime, actorInput: AdministrationActor, id: string) {
    return runtime.uow.write(async (transaction) => {
        const actor = await runtime.tenantActor(transaction, actorInput);
        authorizeTenantAdministration(actor, actorInput.tenantId, 'users:view');
        const membership = found(await transaction.tenants.getMembership(actorInput.tenantId, id)), user = found(await transaction.users.getUser(membership.userId));
        return { ...membership, user: { id: user.id, displayName: user.displayName, status: user.status }, identities: (await transaction.users.listIdentities(user.id)).map(identity => ({ id: identity.id, provider: identity.provider, status: identity.status, ...(identity.loginHint ? { loginHint: identity.loginHint } : {}) })) };
    });
}
export async function listAssignmentCandidates(runtime: AdministrationRuntime, actorInput: AdministrationActor) { return runtime.uow.write(async (transaction) => { const actor = await runtime.tenantActor(transaction, actorInput); authorizeTenantAdministration(actor, actorInput.tenantId, 'users:view'); return { items: (await transaction.tenants.listAssignmentCandidates(actorInput.tenantId)).map(user => ({ id: user.id, displayName: user.displayName, status: user.status })) }; }); }
export async function listMemberships(runtime: AdministrationRuntime, actorInput: AdministrationActor, cursor?: string) {
    return runtime.uow.write(async (transaction) => {
        const actor = await runtime.tenantActor(transaction, actorInput);
        authorizeTenantAdministration(actor, actorInput.tenantId, 'users:view');
        const page = await transaction.tenants.listMemberships(actorInput.tenantId, { limit: 100, ...(cursor ? { cursor } : {}) });
        const roles = await transaction.tenants.listRoles(actorInput.tenantId);
        const items = [];
        for (const membership of page.items) {
            const user = found(await transaction.users.getUser(membership.userId));
            const identities = await transaction.users.listIdentities(user.id);
            items.push({ ...membership, user: { id: user.id, displayName: user.displayName, status: user.status }, identities: identities.map(identity => ({ id: identity.id, status: identity.status, provider: identity.provider, loginHint: identity.loginHint })), roles: roles.filter(role => membership.roleIds.includes(role.id)).map(role => ({ id: role.id, name: role.name })) });
        }
        return { ...page, items };
    });
}
export async function listMembershipScopes(runtime: AdministrationRuntime, actorInput: AdministrationActor, cursor?: string) {
    return runtime.uow.write(async (transaction) => {
        const actor = await runtime.tenantActor(transaction, actorInput);
        authorizeTenantAdministration(actor, actorInput.tenantId, 'data_scopes:view');
        const page = await transaction.tenants.listMemberships(actorInput.tenantId, { limit: 100, ...(cursor ? { cursor } : {}) });
        const roles = await transaction.tenants.listRoles(actorInput.tenantId);
        const items = [];
        for (const membership of page.items) {
            const user = found(await transaction.users.getUser(membership.userId));
            const identities = await transaction.users.listIdentities(user.id);
            items.push({ ...membership, user: { id: user.id, displayName: user.displayName, status: user.status }, identities: identities.map(identity => ({ id: identity.id, status: identity.status, provider: identity.provider, loginHint: identity.loginHint })), roles: roles.filter(role => membership.roleIds.includes(role.id)).map(role => ({ id: role.id, name: role.name })) });
        }
        return { ...page, items };
    });
}
