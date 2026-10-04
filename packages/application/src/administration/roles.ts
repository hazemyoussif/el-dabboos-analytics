import type { TenantAccessRole } from '@el-dabboos/domain';
import { validateAccessRole } from '@el-dabboos/domain';
import { assertCustomRoleDeletable, authorizeCustomRoleChange, authorizeTenantAdministration } from '../access-control.ts';
import type { AdministrationActor, TenantAdministrationCommand } from './commands.ts';
import { AdministrationRuntime, fail, found, saved } from './runtime.ts';
export async function createRole(runtime: AdministrationRuntime, actorInput: AdministrationActor, command: Omit<Extract<TenantAdministrationCommand, {
    action: 'role.create';
}>, 'action'>) {
    return runtime.tenantWrite({ actor: actorInput, action: 'role.created', targetId: actorInput.tenantId }, async (transaction, actor) => {
        const now = runtime.clock().toISOString();
        const current: TenantAccessRole | undefined = undefined;
        const next: TenantAccessRole & {
            protected: false;
        } = { ...runtime.metadata(), createdAt: now, version: 1, id: crypto.randomUUID(), scope: 'tenant', protected: false, tenantId: actorInput.tenantId, name: command.name, description: command.description, permissions: command.permissions, metricDomains: command.metricDomains, updatedAt: now };
        validateAccessRole(next);
        authorizeCustomRoleChange(actor, next, current);
        const result = await transaction.tenants.createCustomRole(next);
        await runtime.audit(transaction, actor, 'role.created', result.id);
        return result;
    });
}
export async function updateRole(runtime: AdministrationRuntime, actorInput: AdministrationActor, command: Omit<Extract<TenantAdministrationCommand, {
    action: 'role.update';
}>, 'action'>) {
    return runtime.tenantWrite({ actor: actorInput, action: 'role.updated', targetId: command.id }, async (transaction, actor) => {
        const now = runtime.clock().toISOString();
        const roles = await transaction.tenants.listRoles(actorInput.tenantId);
        const current = found(roles.find(role => role.id === command.id) ?? null);
        const next: TenantAccessRole & {
            protected: false;
        } = { ...runtime.metadata(), createdAt: current?.createdAt ?? now, version: current?.version ?? 1, id: current?.id ?? crypto.randomUUID(), scope: 'tenant', protected: false, tenantId: actorInput.tenantId, name: command.name, description: command.description, permissions: command.permissions, metricDomains: command.metricDomains, updatedAt: now };
        if (current?.protected)
            fail('PROTECTED_ROLE');
        validateAccessRole(next);
        authorizeCustomRoleChange(actor, next, current);
        const result = saved(await transaction.tenants.updateCustomRole(next, command.expectedVersion));
        await runtime.audit(transaction, actor, 'role.updated', result.id);
        return result;
    });
}
export async function deleteRole(runtime: AdministrationRuntime, actorInput: AdministrationActor, command: Omit<Extract<TenantAdministrationCommand, {
    action: 'role.delete';
}>, 'action'>) {
    return runtime.tenantWrite({ actor: actorInput, action: 'role.deleted', targetId: command.id }, async (transaction, actor) => {
        const roles = await transaction.tenants.listRoles(actorInput.tenantId);
        const metricDomain = found(roles.find(role => role.id === command.id) ?? null);
        assertCustomRoleDeletable(metricDomain, actorInput.tenantId, await transaction.tenants.roleIsReferenced(actorInput.tenantId, metricDomain.id));
        authorizeCustomRoleChange(actor, metricDomain);
        const result = await transaction.tenants.deleteUnassignedCustomRole(actorInput.tenantId, metricDomain.id, command.expectedVersion);
        if (result !== 'deleted')
            fail(result === 'conflict' ? 'VERSION_CONFLICT' : result === 'in_use' ? 'ROLE_IN_USE' : result === 'protected' ? 'PROTECTED_ROLE' : 'NOT_FOUND');
        await runtime.audit(transaction, actor, 'role.deleted', metricDomain.id);
        return { deleted: true };
    });
}
export async function listRoles(runtime: AdministrationRuntime, actorInput: AdministrationActor) {
    return runtime.uow.write(async (transaction) => {
        const actor = await runtime.tenantActor(transaction, actorInput);
        authorizeTenantAdministration(actor, actorInput.tenantId, 'roles:view');
        const roles = await transaction.tenants.listRoles(actorInput.tenantId);
        const counts = new Map<string, number>();
        let next: string | undefined;
        do {
            const page = await transaction.tenants.listMemberships(actorInput.tenantId, { limit: 100, ...(next ? { cursor: next } : {}) });
            for (const membership of page.items)
                for (const roleId of membership.roleIds)
                    counts.set(roleId, (counts.get(roleId) ?? 0) + 1);
            next = page.nextCursor;
        } while (next);
        return { items: roles.map(role => ({ ...role, membershipCount: counts.get(role.id) ?? 0 })), grantablePermissions: actor.context.authorization.permissions, grantableMetricDomains: actor.context.authorization.metricDomains };
    });
}
