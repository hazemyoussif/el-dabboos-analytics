import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultTenantSourceSettings } from '@el-dabboos/domain';
import { TenantSourceConnections } from '../src/source-settings/connections.ts';
import { createTenantSourceAdministration } from '../src/source-settings/runtime.ts';
const connection = { tenantId: 'tenant-a', sourceId: 'source-a', connectionRef: 'connection-a', companyIds: ['1'], host: '127.0.0.1', port: 5432, database: 'synthetic', user: 'source_reader', passwordEnv: 'SYNTHETIC_SOURCE_PASSWORD' };
const settings = () => ({ ...defaultTenantSourceSettings(), sourceId: connection.sourceId, connectionRef: connection.connectionRef });
test('server connection registry enforces exact tenant/source/company scope and never exposes credentials', () => {
  const registry = new TenantSourceConnections({ TENANT_SOURCE_CONNECTIONS: JSON.stringify([connection]), SYNTHETIC_SOURCE_PASSWORD: 'synthetic-private-password' });
  assert.deepEqual(registry.options('tenant-b'), []);
  assert.deepEqual(registry.options('tenant-a'), [{ connectionRef: 'connection-a', sourceId: 'source-a', companyIds: ['1'] }]);
  assert.ok(!JSON.stringify(registry.options('tenant-a')).includes('password'));
  assert.throws(() => registry.resolve('tenant-b', settings()));
  assert.throws(() => registry.resolve('tenant-a', { ...settings(), sourceId: 'source-b' }));
  assert.throws(() => registry.resolve('tenant-a', { ...settings(), companyIds: ['2'] }));
  assert.equal(registry.resolve('tenant-a', settings()).connection.password, 'synthetic-private-password');
});
test('registry rejects credentials in metadata, duplicates and malformed destinations; missing secrets fail closed', () => {
  for (const value of [[{ ...connection, password: 'unprotected' }], [{ ...connection, port: 0 }], [connection, connection], [{ ...connection, passwordEnv: 'bad value' }]]) assert.throws(() => new TenantSourceConnections({ TENANT_SOURCE_CONNECTIONS: JSON.stringify(value) }));
  assert.throws(() => new TenantSourceConnections({ TENANT_SOURCE_CONNECTIONS: JSON.stringify([connection]) }).resolve('tenant-a', settings()));
});
test('unregistered source probes return bounded diagnostics without network access or secret messages', async () => {
  const runtime = createTenantSourceAdministration({});
  assert.deepEqual(await runtime.inspect('tenant-a', settings()), { compatible: false, issues: [{ code: 'connection_unavailable' }] });
});
