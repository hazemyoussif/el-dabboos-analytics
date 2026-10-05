import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTenantConfiguration } from '../src/access-control.ts';
import type { ManagedTenant } from '../src/access-control.ts';
const tenant: ManagedTenant = { id: 'opaque-pilot',customerId: 'customer',name: 'Synthetic',status: 'provisioning',version: 1,createdAt: '2026-10-01T00:00:00.000Z',updatedAt: '2026-10-01T00:00:00.000Z',configuration: { countryCode: 'IQ',defaultLocale: 'en',arabicDialect: 'iq',reportingCurrency: 'IQD',timeZone: 'Asia/Baghdad' } };
test('trusted tenant preferences permit explicit pilot recipes and reject arbitrary semantic remapping',() => {
  validateTenantConfiguration(tenant);
  validateTenantConfiguration({ ...tenant,configuration: { ...tenant.configuration,preferredMetrics: { revenue: 'net_invoiced_revenue',average_order_value: 'average_confirmed_order_value' } } });
  assert.throws(() => validateTenantConfiguration({ ...tenant,configuration: { ...tenant.configuration,preferredMetrics: { revenue: 'refund_value' } } }),/INVALID_METRIC_PREFERENCE/);
  assert.throws(() => validateTenantConfiguration({ ...tenant,configuration: { ...tenant.configuration,preferredMetrics: { order_count: 'invoice_count' } } }),/INVALID_METRIC_PREFERENCE/);
});
