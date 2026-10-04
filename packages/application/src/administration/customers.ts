import type { CustomerAccount } from '@el-dabboos/domain';
import { authorizePlatform } from '../access-control.ts';
import type { PlatformAdministrationCommand } from './commands.ts';
import { AdministrationRuntime, found, saved } from './runtime.ts';
export async function createCustomer(runtime: AdministrationRuntime, identityId: string, command: Omit<Extract<PlatformAdministrationCommand, {
    action: 'customer.create';
}>, 'action'>) {
    return runtime.platformWrite({ identityId, action: 'customer.created', targetId: 'new-customer' }, async (transaction, actor) => {
        authorizePlatform(actor, 'platform:customers:manage');
        const customer = await transaction.customers.createCustomer({ ...runtime.metadata(), id: crypto.randomUUID(), name: command.name, status: 'active' });
        await runtime.audit(transaction, actor, 'customer.created', customer.id, customer.id);
        return customer;
    });
}
export async function updateCustomer(runtime: AdministrationRuntime, identityId: string, command: Omit<Extract<PlatformAdministrationCommand, {
    action: 'customer.update';
}>, 'action'>) {
    return runtime.platformWrite({ identityId, action: 'customer.updated', targetId: command.id }, async (transaction, actor) => {
        const now = runtime.clock().toISOString();
        authorizePlatform(actor, 'platform:customers:manage');
        const old = found(await transaction.customers.getCustomer(command.id));
        const customer = saved(await transaction.customers.updateCustomer({ ...old, name: command.name, status: command.status, updatedAt: now }, command.expectedVersion));
        await runtime.audit(transaction, actor, 'customer.updated', customer.id, customer.id);
        return customer;
    });
}
export async function listCustomers(runtime: AdministrationRuntime, identityId: string, cursor?: string) {
    return runtime.uow.write(async (transaction) => {
        const actor = await runtime.platformActor(transaction, identityId);
        authorizePlatform(actor, 'platform:customers:view');
        const customerSummary = async (customer: CustomerAccount) => {
            let next: string | undefined, count = 0;
            do {
                const page = await transaction.customers.listTenants(customer.id, { limit: 100, ...(next ? { cursor: next } : {}) });
                count += page.items.length;
                next = page.nextCursor;
            } while (next);
            return { ...customer, tenantCount: count };
        };
        const page = await transaction.customers.listCustomers({ limit: 100, ...(cursor ? { cursor } : {}) });
        return { ...page, items: await Promise.all(page.items.map(customerSummary)) };
    });
}
export async function getCustomer(runtime: AdministrationRuntime, identityId: string, id: string) {
    return runtime.uow.write(async (transaction) => {
        const actor = await runtime.platformActor(transaction, identityId);
        authorizePlatform(actor, 'platform:customers:view');
        const customerSummary = async (customer: CustomerAccount) => {
            let next: string | undefined, count = 0;
            do {
                const page = await transaction.customers.listTenants(customer.id, { limit: 100, ...(next ? { cursor: next } : {}) });
                count += page.items.length;
                next = page.nextCursor;
            } while (next);
            return { ...customer, tenantCount: count };
        };
        return customerSummary(found(await transaction.customers.getCustomer(id)));
    });
}
