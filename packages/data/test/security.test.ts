import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { MockAnalyticsRepository, SqliteAnalyticsRepository, createSqliteSchema, insertFacts } from '../src/index.ts';
import type { AnalyticsFact } from '../src/facts.ts';
const facts: AnalyticsFact[] = [
  { tenantId: 'demo-iq', measureId: 'revenue', date: '2026-01-01', value: 10, dimensions: { branch: 'baghdad', region: 'central', customer: 'allowed-customer' } },
  { tenantId: 'demo-iq', measureId: 'revenue', date: '2026-01-02', value: 90, dimensions: { branch: 'basra', region: 'south', customer: 'restricted-customer' } },
  { tenantId: 'demo-eg', measureId: 'revenue', date: '2026-01-03', value: 500, dimensions: { branch: 'cairo', region: 'north', customer: 'other-tenant-customer' } },
];
for (const name of ['mock', 'sqlite'] as const) test(`${name} intersects requested and policy filters, including discovery`, async () => {
  const db = new DatabaseSync(':memory:'); createSqliteSchema(db); insertFacts(db, facts);
  const repository = name === 'mock' ? new MockAnalyticsRepository(facts) : new SqliteAnalyticsRepository(db);
  try {
    const context = { tenantId: 'demo-iq', locale: 'en' as const, enforcedFilters: [{ dimension: 'branch' as const, values: ['baghdad'] }] };
    assert.equal((await repository.execute({ metric: 'revenue' }, context)).rows[0]?.value, 10);
    assert.equal((await repository.execute({ metric: 'revenue', filters: [{ dimension: 'branch', values: ['baghdad', 'basra'] }] }, context)).rows[0]?.value, 10);
    assert.equal((await repository.execute({ metric: 'revenue', filters: [{ dimension: 'branch', values: ['basra'] }] }, context)).rows[0]?.value, 0);
    assert.deepEqual((await repository.execute({ metric: 'revenue', groupBy: 'branch' }, context)).rows.map(row => row.key), ['baghdad']);
    assert.deepEqual(await repository.listDimensionValues('branch', context), ['baghdad']);
    assert.deepEqual(await repository.listDimensionValues('region', context), ['central']);
    assert.deepEqual(await repository.listDimensionValues('customer', context), ['allowed-customer']);
    await assert.rejects(repository.listDimensionValues('date', context), /Unsupported/);
    assert.deepEqual(await repository.listDimensionValues('branch', { tenantId: 'demo-eg', locale: 'en' }), ['cairo']);
  } finally { db.close(); }
});
