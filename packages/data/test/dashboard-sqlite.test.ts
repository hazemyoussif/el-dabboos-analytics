import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import type { DashboardRecord, DashboardSpec } from '@el-dabbous/domain';
import { createDashboardPersistenceSchema, SqliteDashboardRepository } from '../src/dashboard-sqlite.ts';

const spec: DashboardSpec = { schemaVersion: 2, id: 'portable-spec', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: {}, layout: { columns: 1 }, widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
const record = (id: string, tenantId: string, ownerUserId: string, scope: DashboardRecord['scope'] = 'private'): DashboardRecord =>
  ({ id, tenantId, ownerUserId, scope, spec, version: 1, createdBy: ownerUserId, updatedBy: ownerUserId,
    createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' });
test('SQLite saved dashboards isolate tenants and private owners while allowing tenant scope', async () => {
  const db = new DatabaseSync(':memory:'); createDashboardPersistenceSchema(db);
  const repository = new SqliteDashboardRepository(db);
  try {
    await repository.create(record('private-iq', 'demo-iq', 'alice'));
    await repository.create(record('shared-iq', 'demo-iq', 'alice', 'tenant'));
    await repository.create(record('private-eg', 'demo-eg', 'alice'));
    assert.deepEqual((await repository.listAccessible('demo-iq', 'alice')).map(item => item.id), ['private-iq', 'shared-iq']);
    assert.deepEqual((await repository.listAccessible('demo-iq', 'bob')).map(item => item.id), ['shared-iq']);
    assert.deepEqual((await repository.listAccessible('demo-eg', 'alice')).map(item => item.id), ['private-eg']);
    assert.equal(await repository.getAccessible('private-iq', 'demo-iq', 'bob'), null);
    assert.equal(await repository.getAccessible('private-iq', 'demo-eg', 'alice'), null);
    assert.equal((await repository.getAccessible('shared-iq', 'demo-iq', 'bob'))?.id, 'shared-iq');
  } finally { db.close(); }
});
test('SQLite update uses expected version and never overwrites on stale or cross-user writes', async () => {
  const db = new DatabaseSync(':memory:'); createDashboardPersistenceSchema(db);
  const repository = new SqliteDashboardRepository(db);
  try {
    await repository.create(record('r1', 'demo-iq', 'alice'));
    const edited = structuredClone(spec); edited.title.en = 'Updated';
    const input = { id: 'r1', tenantId: 'demo-iq', ownerUserId: 'alice', expectedVersion: 1, spec: edited,
      updatedBy: 'alice', updatedAt: '2026-10-02T00:00:00Z' };
    const saved = await repository.updateOwned(input);
    assert.ok(saved && saved !== 'conflict');
    assert.equal(saved.version, 2);
    assert.equal(saved.spec.title.en, 'Updated');
    assert.equal(await repository.updateOwned(input), 'conflict');
    assert.equal(await repository.updateOwned({ ...input, ownerUserId: 'bob' }), null);
    assert.equal(await repository.updateOwned({ ...input, tenantId: 'demo-eg' }), null);
    assert.equal((await repository.getAccessible('r1', 'demo-iq', 'alice'))?.version, 2);
  } finally { db.close(); }
});
