import { authorizeTenantAdministration } from '../access-control.ts';
import type { AdministrationActor, TenantAdministrationCommand } from './commands.ts';
import { AdministrationRuntime, fail, found, saved } from './runtime.ts';
export async function updateWorkspace(runtime: AdministrationRuntime, actorInput: AdministrationActor, command: Omit<Extract<TenantAdministrationCommand, {
    action: 'tenant.update';
}>, 'action'>) {
    return runtime.tenantWrite({ actor: actorInput, action: 'tenant.updated', targetId: actorInput.tenantId }, async (transaction, actor) => {
        const now = runtime.clock().toISOString();
        authorizeTenantAdministration(actor, actorInput.tenantId, 'tenant:manage');
        if (actor.context.authorization.enforcedFilters.length)
            fail('ADMIN_FORBIDDEN');
        const current = found(await transaction.customers.getTenant(actorInput.tenantId));
        const next = { ...current, name: command.name, configuration: { ...current.configuration, defaultLocale: command.defaultLocale }, updatedAt: now };
        const result = saved(await transaction.customers.updateTenant(next, command.expectedVersion));
        await runtime.audit(transaction, actor, 'tenant.updated', result.id);
        return result;
    });
}
export async function getWorkspace(runtime: AdministrationRuntime, actorInput: AdministrationActor) { return runtime.uow.write(async (transaction) => { const actor = await runtime.tenantActor(transaction, actorInput); authorizeTenantAdministration(actor, actorInput.tenantId, 'tenant:view'); return { tenant: found(await transaction.customers.getTenant(actorInput.tenantId)), customer: found(await transaction.customers.getCustomer(found(await transaction.customers.getTenant(actorInput.tenantId)).customerId)) }; }); }
