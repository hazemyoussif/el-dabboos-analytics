import type { ManagedMembership } from '@el-dabboos/domain';
import { AccessControlError } from '@el-dabboos/domain';
import { authorizeDashboardAccessChange, authorizeDashboardResource, authorizeTenantAdministration, validateDashboardGrants } from '../access-control.ts';
import { AuthorizationError } from '../security.ts';
import type { AdministrationActor, TenantAdministrationCommand } from './commands.ts';
import { AdministrationRuntime, fail, found, saved } from './runtime.ts';
export async function changeDashboardAccess(runtime: AdministrationRuntime, actorInput: AdministrationActor, command: Omit<Extract<TenantAdministrationCommand, {
    action: 'dashboard.access';
}>, 'action'>) {
    return runtime.tenantWrite({ actor: actorInput, action: 'dashboard.access_changed', targetId: command.id }, async (transaction, actor) => {
        const roles = await transaction.tenants.listRoles(actorInput.tenantId);
        const record = found(await transaction.dashboards.getTenantRecord(actorInput.tenantId, command.id)), access = found(await transaction.dashboards.getAccess(actorInput.tenantId, command.id));
        authorizeDashboardAccessChange(record, access, actor, runtime.policy);
        const memberships: ManagedMembership[] = [];
        const retainedDormant = new Set<string>();
        for (const grant of command.grants)
            if (grant.subjectType === 'membership') {
                const membership = found(await transaction.tenants.getMembership(actorInput.tenantId, grant.subjectId));
                memberships.push(membership);
                if (membership.status === 'suspended') {
                    if (!access.grants.some(old => old.subjectType === 'membership' && old.subjectId === grant.subjectId && old.access === grant.access))
                        fail('INVALID_GRANTS');
                    retainedDormant.add(grant.subjectId);
                }
            }
        if (command.grants.length > 1000 || new Set(command.grants.map(grant => JSON.stringify([grant.subjectType, grant.subjectId]))).size !== command.grants.length)
            fail('INVALID_GRANTS');
        validateDashboardGrants(actorInput.tenantId, command.grants.filter(grant => grant.subjectType !== 'membership' || !retainedDormant.has(grant.subjectId)), roles, memberships);
        const result = saved(await transaction.dashboards.replaceAccess({ dashboardId: record.id, tenantId: actorInput.tenantId, version: command.expectedVersion, scope: command.scope, grants: command.grants }, command.expectedVersion, actor.context.principal.userId));
        await runtime.audit(transaction, actor, 'dashboard.access_changed', record.id);
        return result;
    });
}
export async function listDashboardAccess(runtime: AdministrationRuntime, actorInput: AdministrationActor, cursor?: string) {
    return runtime.uow.write(async (transaction) => {
        const actor = await runtime.tenantActor(transaction, actorInput);
        authorizeTenantAdministration(actor, actorInput.tenantId, 'dashboard_access:view');
        const items = [];
        let next = cursor;
        do {
            const page = await transaction.dashboards.listTenantCandidates(actorInput.tenantId, { limit: 100, ...(next ? { cursor: next } : {}) });
            for (const record of page.items) {
                const access = found(await transaction.dashboards.getAccess(actorInput.tenantId, record.id));
                try {
                    authorizeDashboardResource(record, access, actor, runtime.policy);
                    items.push({ id: record.id, title: record.spec.title, ownerUserId: record.ownerUserId, ...access });
                }
                catch (error) {
                    if (!(error instanceof AuthorizationError) && !(error instanceof AccessControlError && error.code === 'DASHBOARD_NOT_FOUND'))
                        throw error;
                }
            }
            next = page.nextCursor;
        } while (next && items.length < 100);
        return { items, ...(next ? { nextCursor: next } : {}) };
    });
}
