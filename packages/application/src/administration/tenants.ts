import { assertRecoverableAdministrators, authorizePlatform } from '../access-control.ts';
import type { PlatformAdministrationCommand } from './commands.ts';
import { AdministrationRuntime, found, saved } from './runtime.ts';
export async function createTenant(runtime: AdministrationRuntime, identityId: string, command: Omit<Extract<PlatformAdministrationCommand, {
    action: 'tenant.create';
}>, 'action'>) {
    return runtime.platformWrite({ identityId, action: 'tenant.created', targetId: command.customerId }, async (transaction, actor) => {
        authorizePlatform(actor, 'platform:tenants:manage');
        found(await transaction.customers.getCustomer(command.customerId));
        const tenant = await transaction.customers.createTenant({ ...runtime.metadata(), id: crypto.randomUUID(), customerId: command.customerId, name: command.name, status: 'provisioning', configuration: command.configuration });
        await runtime.audit(transaction, actor, 'tenant.created', tenant.id, tenant.customerId);
        return tenant;
    });
}
export async function updateTenant(runtime: AdministrationRuntime, identityId: string, command: Omit<Extract<PlatformAdministrationCommand, {
    action: 'tenant.update';
}>, 'action'>) {
    return runtime.platformWrite({ identityId, action: 'tenant.updated', targetId: command.id }, async (transaction, actor) => {
        const now = runtime.clock().toISOString();
        authorizePlatform(actor, 'platform:tenants:manage');
        const old = found(await transaction.customers.getTenant(command.id));
        if (command.status === 'active')
            assertRecoverableAdministrators(await transaction.tenants.activeAdministratorUserIds(old.id));
        const tenant = saved(await transaction.customers.updateTenant({ ...old, name: command.name, status: command.status, configuration: command.configuration, updatedAt: now }, command.expectedVersion));
        await runtime.audit(transaction, actor, command.status === 'suspended' ? 'tenant.suspended' : 'tenant.updated', tenant.id, tenant.customerId);
        return tenant;
    });
}
export async function customerTenants(runtime: AdministrationRuntime, identityId: string, customerId: string, cursor?: string) { return runtime.uow.write(async (transaction) => { authorizePlatform(await runtime.platformActor(transaction, identityId), 'platform:tenants:view'); found(await transaction.customers.getCustomer(customerId)); return transaction.customers.listTenants(customerId, { limit: 100, ...(cursor ? { cursor } : {}) }); }); }
export async function getTenant(runtime: AdministrationRuntime, identityId: string, id: string) { return runtime.uow.write(async (transaction) => { const actor = await runtime.platformActor(transaction, identityId); authorizePlatform(actor, 'platform:tenants:view'); return found(await transaction.customers.getTenant(id)); }); }
