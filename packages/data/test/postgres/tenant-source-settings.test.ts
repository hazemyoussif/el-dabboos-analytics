import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultTenantSourceSettings } from '@el-dabboos/domain';
import { createAdministration } from '../../../application/src/index.ts';
import { migrateMetadata, seedDemoAdministration, importSqliteControl, PostgresAdministrationStore } from '@el-dabboos/data';
import { controlDatabase } from './control-support.ts';
import { enabled } from './support.ts';

test('PostgreSQL source drafts preserve tenant isolation, persistence, CAS, audit rollback and migration ownership', { skip: !enabled }, async () => {
  const database = await controlDatabase(), directory = await mkdtemp(join(tmpdir(), 'tenant-source-test-'));
  const source = new DatabaseSync(join(directory, 'control.db'));
  migrateMetadata(source, { reconcile: seedDemoAdministration }); source.close();
  try {
    await importSqliteControl(join(directory, 'control.db'), database.migrator);
    const store = new PostgresAdministrationStore(database.app), service = createAdministration(store);
    const actor = { identityId: 'synthetic:demo-iq-admin', tenantId: 'demo-iq', locale: 'en' as const };
    const settings = { ...defaultTenantSourceSettings(), sourceId: 'synthetic-source', connectionRef: 'synthetic-connection' };
    const first = await service.saveTenantSourceSettings(actor, { settings, expectedVersion: null });
    assert.equal(first.version, 1);
    const reopened = new PostgresAdministrationStore(database.app);
    assert.deepEqual((await reopened.read(transaction => transaction.sourceSettings!.get('demo-iq')))?.settings, settings);
    assert.equal(await reopened.read(transaction => transaction.sourceSettings!.get('demo-eg')), null);
    const racing = await Promise.allSettled([service.saveTenantSourceSettings(actor, { settings: { ...settings, companyIds: ['2'] }, expectedVersion: 1 }), service.saveTenantSourceSettings(actor, { settings: { ...settings, companyIds: ['3'] }, expectedVersion: 1 })]);
    assert.equal(racing.filter(result => result.status === 'fulfilled').length, 1);
    await database.migrator.query("CREATE FUNCTION control.reject_source_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='source.settings_drafted' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_source_test_audit BEFORE INSERT ON control.admin_audit_events FOR EACH ROW EXECUTE FUNCTION control.reject_source_test_audit()");
    await assert.rejects(service.saveTenantSourceSettings(actor, { settings, expectedVersion: 2 }));
    assert.equal((await reopened.read(transaction => transaction.sourceSettings!.get('demo-iq')))?.version, 2);
    await assert.rejects(database.app.query('ALTER TABLE control.tenant_source_settings ADD COLUMN unsafe TEXT'));
    await assert.rejects(database.app.query('DELETE FROM control.tenant_source_settings'));
  } finally { await database.close(); await rm(directory, { recursive: true, force: true }); }
});
