import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import type { AnalyticsRepository } from '@el-dabbous/domain';
import { MockAnalyticsRepository } from '../src/mock.ts';
import { SqliteAnalyticsRepository, createSqliteSchema, insertFacts } from '../src/sqlite.ts';
import { generateSeedFacts } from '../src/seed.ts';
import type { AnalyticsFact } from '../src/facts.ts';

const facts: AnalyticsFact[] = [
  { tenantId: 'a', metricId: 'revenue', date: '2026-01-15', value: 100, dimensions: { branch: 'cairo', customer: 'one' } },
  { tenantId: 'a', metricId: 'revenue', date: '2026-02-15', value: 200, dimensions: { branch: 'cairo', customer: 'one' } },
  { tenantId: 'a', metricId: 'revenue', date: '2026-02-16', value: 50, dimensions: { branch: 'giza', customer: 'two' } },
  { tenantId: 'a', metricId: 'revenue', date: '2025-02-15', value: 125, dimensions: { branch: 'cairo', customer: 'one' } },
  { tenantId: 'b', metricId: 'revenue', date: '2026-02-15', value: 9999, dimensions: { branch: 'cairo' } },
];
const context = { tenantId: 'a', locale: 'en' } as const;
function contract(name: string, create: () => AnalyticsRepository) {
  test(`${name}: tenant isolation, date filter, grouping and operations`, async () => {
    const repo = create();
    const dateRange = { from: '2026-01-01', to: '2026-02-28' };
    assert.deepEqual((await repo.execute({ metric: 'revenue', dateRange }, context)).rows, [{ key: null, value: 350 }]);
    assert.deepEqual((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'branch' }, context)).rows,
      [{ key: 'cairo', value: 300 }, { key: 'giza', value: 50 }]);
    assert.deepEqual((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'branch', operation: { kind: 'top_n', n: 1 } }, context)).rows,
      [{ key: 'cairo', value: 300 }]);
    assert.equal((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'branch', filters: [{ dimension: 'customer', values: ['two'] }] }, context)).rows[0]?.value, 50);
    assert.equal((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'month', operation: { kind: 'running_total' } }, context)).rows[1]?.value, 350);
    await assert.rejects(repo.execute({ metric: 'revenue' }, { tenantId: '', locale: 'en' }));
  });
}
contract('mock', () => new MockAnalyticsRepository(facts));
contract('sqlite', () => {
  const db = new DatabaseSync(':memory:');
  createSqliteSchema(db); insertFacts(db, facts);
  return new SqliteAnalyticsRepository(db);
});
test('seed is deterministic and contains all catalog metrics with a growing branch', () => {
  const first = generateSeedFacts();
  assert.deepEqual(first, generateSeedFacts());
  assert.equal(first.length, 24 * 24 * 6);
  const cairo = first.filter(f => f.metricId === 'revenue' && f.dimensions.branch === 'cairo');
  assert.ok(cairo.at(-1)!.value > cairo[0]!.value);
});
