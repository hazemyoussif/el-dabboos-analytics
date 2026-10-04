import type { CustomerAccount, CustomerTenantRepository } from '@el-dabboos/domain';
import { AccessControlError, validateTenantConfiguration } from '@el-dabboos/domain';
import type { MetadataConnection } from './connection.ts';
import type { MetadataRows } from './mappers.ts';
function fail(code: string): never { throw new AccessControlError(code); }
export function customersRepository(connection: MetadataConnection, rows: MetadataRows): CustomerTenantRepository {
    const { insert, update, page } = connection;
    const { convert, tenant, getCustomer, getTenant } = rows;
    return {
        listCustomers: async (pageRequest) => page('customers', pageRequest, '', convert<CustomerAccount>), getCustomer: async (id) => getCustomer(id), createCustomer: async (customer) => { insert('customers', { ...customer, version: 1 }); return getCustomer(customer.id)!; }, updateCustomer: async (customer, expectedVersion) => update('customers', customer.id, { name: customer.name, status: customer.status, updatedAt: customer.updatedAt }, expectedVersion, () => getCustomer(customer.id)),
        listTenants: async (id, pageRequest) => page('tenants', pageRequest, id, tenant, 'customer_id'), getTenant: async (id) => getTenant(id), createTenant: async (tenant) => { validateTenantConfiguration(tenant); const { configuration, ...rest } = tenant; insert('tenants', { ...rest, country_code: configuration.countryCode, default_locale: configuration.defaultLocale, arabic_dialect: configuration.arabicDialect, reporting_currency: configuration.reportingCurrency, time_zone: configuration.timeZone, version: 1 }); return getTenant(tenant.id)!; },
        updateTenant: async (tenant, expectedVersion) => {
            validateTenantConfiguration(tenant);
            const old = getTenant(tenant.id);
            if (old && old.customerId !== tenant.customerId)
                fail('IMMUTABLE_TENANT');
            if (old && old.status !== 'provisioning' && tenant.status === 'provisioning')
                fail('INVALID_LIFECYCLE_TRANSITION');
            if (old && old.status !== 'provisioning' && (['countryCode', 'arabicDialect', 'reportingCurrency', 'timeZone'] as const).some(key => old.configuration[key] !== tenant.configuration[key]))
                fail('INVALID_TENANT_CONFIGURATION');
            const command = tenant.configuration;
            return update('tenants', tenant.id, { name: tenant.name, status: tenant.status, default_locale: command.defaultLocale, country_code: command.countryCode, arabic_dialect: command.arabicDialect, reporting_currency: command.reportingCurrency, time_zone: command.timeZone, updatedAt: tenant.updatedAt }, expectedVersion, () => getTenant(tenant.id));
        },
    };
}
