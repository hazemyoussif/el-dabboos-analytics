import assert from 'node:assert/strict';
import test from 'node:test';
import { executeOdooOrmProbe } from '../src/odoo-orm.ts';
import { executeOdooOrmSync } from '../src/odoo-orm-sync.ts';

test('ORM operator refuses ingestion, publication and malformed commands before any connection', async () => {
  const fetcher: typeof fetch = async () => { assert.fail('must not connect'); };
  for (const command of ['ingest', 'approve', 'publish', 'activate', 'sync']) {
    await assert.rejects(executeOdooOrmProbe([command], {}, fetcher), /Expected/);
  }
  await assert.rejects(executeOdooOrmProbe(['check', '--company', '2'], {}, fetcher), /Unexpected/);
  await assert.rejects(executeOdooOrmProbe(['compare', '--from', '2026-09-01'], {}, fetcher), /Usage/);
});

test('API import requires explicit acceptance, exact source/tenant and scoped synchronization', async () => {
  await assert.rejects(executeOdooOrmSync(['--tenant','a'],{}), /Usage/);
  await assert.rejects(executeOdooOrmSync(['--tenant','a','--accept-observed'],{ODOO_ORM_TENANT_ID:'b'}), /scope/);
});
