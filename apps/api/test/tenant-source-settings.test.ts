import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { AccessControlError, defaultTenantSourceSettings } from '@el-dabboos/domain';
import type { SourceCompatibilityResult, TenantSourceSettings } from '@el-dabboos/domain';
import { MockAnalyticsRepository, migrateMetadata, seedDemoAdministration, SqliteAdministrationStore } from '@el-dabboos/data';
import { createAdministration } from '@el-dabboos/application';
import { buildApi } from '../src/app.ts';
const path = '/api/tenants/demo-iq/admin/source-settings';
const headers = (user = 'demo-iq-admin', tenant = 'demo-iq') => ({ 'x-demo-user-id': user, 'x-tenant-id': tenant, 'x-locale': 'en' });
const actor = { identityId: 'synthetic:demo-iq-admin', tenantId: 'demo-iq', locale: 'en' as const };
const settings = () => ({ ...defaultTenantSourceSettings(), sourceId: 'synthetic-source', connectionRef: 'synthetic-connection' });
async function fixture(inspect: (tenantId: string, input: TenantSourceSettings) => Promise<SourceCompatibilityResult> = async () => ({ compatible: true, issues: [] })) {
  const db = new DatabaseSync(':memory:'); migrateMetadata(db, { reconcile: seedDemoAdministration });
  const store = new SqliteAdministrationStore(db), repository = new MockAnalyticsRepository([]);
  let calls = 0;
  const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository,
    tenantSourceAdministration: { connections: tenantId => tenantId === 'demo-iq' ? [{ connectionRef: 'synthetic-connection', sourceId: 'synthetic-source', companyIds: ['1'] }] : [], inspect: async (...args) => { calls++; return inspect(...args); } },
    administration: { unitOfWork: store, directory: store.directory, profiles: store.profiles, dataReady: async () => false, authenticate: async input => {
      const binding = await store.read(transaction => transaction.users.findIdentity('synthetic', String(input['x-demo-user-id'])));
      if (!binding) throw new AccessControlError('IDENTITY_REQUIRED'); return binding.id;
    } } });
  return { app, db, store, calls: () => calls, save: (input: object) => app.inject({ method: 'PUT', url: path, headers: headers(), payload: input }), async close() { await app.close(); db.close(); } };
}
test('source draft API rejects wrong-plane, scoped and cross-tenant identities before probing', async () => {
  const current = await fixture();
  try {
    for (const user of ['demo-iq-analyst', 'demo-agent-manager', 'demo-platform-admin']) {
      assert.equal((await current.app.inject({ url: path, headers: headers(user) })).statusCode, 403);
      assert.equal((await current.app.inject({ method: 'PUT', url: path, headers: headers(user), payload: { settings: settings(), expectedVersion: null } })).statusCode, 403);
      assert.equal((await current.app.inject({ method: 'POST', url: path + '/check', headers: headers(user), payload: { expectedVersion: 1 } })).statusCode, 403);
    }
    assert.equal((await current.app.inject({ url: '/api/tenants/demo-eg/admin/source-settings', headers: headers() })).statusCode, 403);
    current.db.exec("INSERT INTO membership_scopes VALUES ('iq-admin','demo-iq','branch','baghdad')");
    assert.equal((await current.app.inject({ url: path, headers: headers() })).statusCode, 403);
    assert.equal(current.calls(), 0);
  } finally { await current.close(); }
});
test('source drafts persist with CAS and atomic audit; save neither probes nor activates a source', async () => {
  const current = await fixture();
  try {
    const initial = (await current.app.inject({ url: path, headers: headers() })).json();
    assert.equal(initial.record, null); assert.equal(initial.mode, 'draft');
    const result = await current.save({ settings: settings(), expectedVersion: null });
    assert.equal(result.statusCode, 200, result.body); assert.equal(result.json().record.version, 1);
    assert.equal((await current.save({ settings: settings(), expectedVersion: null })).statusCode, 409);
    assert.equal((await current.save({ settings: { ...settings(), companyIds: ['2'] }, expectedVersion: 1 })).statusCode, 200);
    assert.equal((await current.save({ settings: settings(), expectedVersion: 1 })).statusCode, 409);
    assert.equal(await current.store.read(transaction => transaction.sourceSettings!.get('demo-eg')), null);
    const reopened = new SqliteAdministrationStore(current.db);
    assert.deepEqual((await reopened.read(transaction => transaction.sourceSettings!.get('demo-iq')))?.settings.companyIds, ['2']);
    assert.equal(current.db.prepare("SELECT count(*) count FROM admin_audit_events WHERE action='source.settings_drafted'").get()?.count, 2);
    assert.equal(current.calls(), 0);
    assert.equal((await current.app.inject({ method: 'POST', url: path + '/activate', headers: headers(), payload: {} })).statusCode, 404);
  } finally { await current.close(); }
});
test('source drafts reject credentials and unsafe mappings and roll back when the audit write fails', async () => {
  const current = await fixture();
  try {
    for (const input of [{ settings: { ...settings(), password: 'synthetic-secret' }, expectedVersion: null }, { settings: settings(), expectedVersion: null, active: true }, { settings: settings(), expectedVersion: 0 }]) assert.equal((await current.save(input)).statusCode, 400);
    await current.save({ settings: settings(), expectedVersion: null });
    current.db.exec("CREATE TRIGGER reject_source_audit BEFORE INSERT ON admin_audit_events WHEN NEW.action='source.settings_drafted' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
    await assert.rejects(createAdministration(current.store).saveTenantSourceSettings(actor, { settings: { ...settings(), companyIds: ['2'] }, expectedVersion: 1 }));
    assert.equal((await current.store.read(transaction => transaction.sourceSettings!.get('demo-iq')))?.version, 1);
  } finally { await current.close(); }
});
test('compatibility checks bind to a saved version and return diagnostic status without certifying or saving', async () => {
  const current = await fixture(async (tenantId, input) => {
    assert.equal(tenantId, 'demo-iq'); assert.equal(input.sourceId, 'synthetic-source');
    return { compatible: false, issues: [{ code: 'missing_field', field: 'business_line.id' }] };
  });
  try {
    await current.save({ settings: settings(), expectedVersion: null });
    const check = (version: number) => current.app.inject({ method: 'POST', url: path + '/check', headers: headers(), payload: { expectedVersion: version } });
    assert.equal((await check(2)).statusCode, 409); assert.equal(current.calls(), 0);
    const result = await check(1);
    assert.equal(result.statusCode, 200, result.body); assert.equal(result.json().testedVersion, 1);
    assert.equal(result.json().activation, 'not_activated'); assert.equal(result.json().compatible, false);
    assert.equal((await current.store.read(transaction => transaction.sourceSettings!.get('demo-iq')))?.version, 1);
  } finally { await current.close(); }
});
test('checks discard results when the draft or actor changes while network work is running', async () => {
  let change: 'draft' | 'actor' = 'draft';
  const current: Awaited<ReturnType<typeof fixture>> = await fixture(async () => {
    if (change === 'draft') await current.save({ settings: { ...settings(), companyIds: ['2'] }, expectedVersion: 1 });
    else current.db.exec("UPDATE memberships SET status='suspended' WHERE id='iq-admin'");
    return { compatible: true, issues: [] };
  });
  try {
    await current.save({ settings: settings(), expectedVersion: null });
    const first = await current.app.inject({ method: 'POST', url: path + '/check', headers: headers(), payload: { expectedVersion: 1 } });
    assert.equal(first.statusCode, 409); assert.ok(!first.body.includes('compatible'));
    change = 'actor';
    const second = await current.app.inject({ method: 'POST', url: path + '/check', headers: headers(), payload: { expectedVersion: 2 } });
    assert.equal(second.statusCode, 403); assert.ok(!second.body.includes('compatible'));
  } finally { await current.close(); }
});
