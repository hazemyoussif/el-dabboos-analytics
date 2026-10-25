import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultTenantSourceSettings, validateTenantSourceSettings } from '../src/tenant-source-settings.ts';

export const sourceSettings = () => ({ ...defaultTenantSourceSettings(), sourceId: 'synthetic-source', connectionRef: 'synthetic-connection' });
test('source drafts accept bounded physical bindings and reject credentials, activation, SQL and unsupported adapters', () => {
  const settings = sourceSettings();
  validateTenantSourceSettings(settings);
  for (const extra of [{ password: 'must-not-be-stored' }, { active: true }, { sql: 'SELECT 1' }]) assert.throws(() => validateTenantSourceSettings({ ...settings, ...extra }));
  for (const change of [{ adapter: 'odoo-json2' }, { expectedMajor: 19 }, { companyIds: [] }, { companyIds: ['1', '1'] }, { companyIds: ['2147483648'] }, { connectionRef: 'postgres://secret@host/db' }]) assert.throws(() => validateTenantSourceSettings({ ...settings, ...change }));
  for (const field of ['x; DROP TABLE users', 'schema.table', 'pg_authid', 'field name', 'UPPER', 'x'.repeat(64)]) assert.throws(() => validateTenantSourceSettings({ ...settings, mapping: { ...settings.mapping, orders: { ...settings.mapping.orders, date: field } } }));
  assert.throws(() => validateTenantSourceSettings({ ...settings, parameters: { ...settings.parameters, batchSize: 1001 } }));
  assert.throws(() => validateTenantSourceSettings({ ...settings, mapping: { ...settings.mapping, orders: { ...settings.mapping.orders, expression: 'sum(value)' } } }));
});
test('source validators reject getters and symbols without invoking user code; defaults are independent', () => {
  let invoked = false;
  const input = { ...sourceSettings() };
  Object.defineProperty(input, 'sourceId', { enumerable: true, get() { invoked = true; return 'synthetic'; } });
  assert.throws(() => validateTenantSourceSettings(input)); assert.equal(invoked, false);
  assert.throws(() => validateTenantSourceSettings({ ...sourceSettings(), [Symbol('secret')]: true }));
  const first = defaultTenantSourceSettings(); first.mapping.orders.date = 'changed';
  assert.equal(defaultTenantSourceSettings().mapping.orders.date, 'date_order');
});
