import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { compileMembershipScopes } from '@el-dabboos/domain';
import { MockAnalyticsRepository, SqliteAnalyticsRepository, createSqliteSchema, insertFacts } from '../src/index.ts';
import type { AnalyticsFact } from '../src/facts.ts';
const facts: AnalyticsFact[] = [
  ...[
    ['baghdad', 'synthetic-agent-17', 10], ['baghdad', 'synthetic-agent-21', 20],
    ['baghdad', 'unassigned', 40], ['basra', 'synthetic-agent-17', 90],
  ].map(([branch, salesperson, value]) => ({ tenantId: 'workspace-iq-1', measureId: 'revenue' as const, date: '2026-01-01', value: Number(value), dimensions: { branch: String(branch), salesperson: String(salesperson) } })),
  { tenantId: 'workspace-other', measureId: 'revenue', date: '2026-01-01', value: 500, dimensions: { branch: 'baghdad', salesperson: 'synthetic-agent-17' } },
  { tenantId: 'workspace-iq-1', measureId: 'outstanding_amount', entityId: 'moved', date: '2026-01-01', value: 100, dimensions: { branch: 'baghdad', salesperson: 'synthetic-agent-17' } },
  { tenantId: 'workspace-iq-1', measureId: 'outstanding_amount', entityId: 'moved', date: '2026-01-02', value: 80, dimensions: { branch: 'basra', salesperson: 'synthetic-agent-17' } },
];
for (const mode of ['mock', 'sqlite'] as const) test(`${mode}: compiled Agent Manager scope blocks Basra/unassigned agents and preserves snapshot selection`, async () => {
  const db = new DatabaseSync(':memory:'); createSqliteSchema(db); insertFacts(db, facts);
  try {
    const repository = mode === 'mock' ? new MockAnalyticsRepository(facts) : new SqliteAnalyticsRepository(db);
    const context = { tenantId: 'workspace-iq-1', locale: 'en' as const, enforcedFilters: compileMembershipScopes([
      { dimension: 'branch', values: ['baghdad'] }, { dimension: 'salesperson', values: ['synthetic-agent-17', 'synthetic-agent-21'] },
    ]) };
    assert.equal((await repository.execute({ metric: 'revenue' }, context)).rows[0]?.value, 30);
    for (const filter of [{ dimension: 'branch' as const, values: ['basra'] }, { dimension: 'salesperson' as const, values: ['unassigned'] }])
      assert.equal((await repository.execute({ metric: 'revenue', filters: [filter] }, context)).rows[0]?.value, 0);
    assert.deepEqual(await repository.listDimensionValues('salesperson', context), ['synthetic-agent-17', 'synthetic-agent-21']);
    // No previous Baghdad snapshot may reappear after its latest assignment moved to Basra.
    assert.equal((await repository.execute({ metric: 'outstanding_amount' }, context)).rows[0]?.value, null);
    const changed = { ...context, enforcedFilters: compileMembershipScopes([{ dimension: 'salesperson', values: ['missing-source-id'] }]) };
    assert.equal((await repository.execute({ metric: 'revenue' }, changed)).rows[0]?.value, 0);
    assert.equal((await repository.execute({ metric: 'revenue' }, { ...context, enforcedFilters: compileMembershipScopes([{ dimension: 'branch', values: ['baghdad'] }, { dimension: 'salesperson', values: ['synthetic-agent-17'] }]) })).rows[0]?.value, 10);
  } finally { db.close(); }
});
