import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import type { AnalyticsRepository } from '@el-dabbous/domain';
import { factMeasureIds } from '@el-dabbous/domain';
import { MockAnalyticsRepository } from '../src/mock.ts';
import { SqliteAnalyticsRepository, createSqliteSchema, insertFacts } from '../src/sqlite.ts';
import { generateSeedFacts } from '../src/seed.ts';
import type { AnalyticsFact } from '../src/facts.ts';

const facts: AnalyticsFact[] = [
  { tenantId: 'a', measureId: 'revenue', date: '2025-02-15', value: 125, dimensions: { branch: 'cairo' } },
  { tenantId: 'a', measureId: 'revenue', date: '2026-01-15', value: 100, dimensions: { branch: 'cairo', customer: 'one' } },
  { tenantId: 'a', measureId: 'revenue', date: '2026-02-15', value: 200, dimensions: { branch: 'cairo', customer: 'one' } },
  { tenantId: 'a', measureId: 'revenue', date: '2026-02-16', value: 50, dimensions: { branch: 'giza', customer: 'two' } },
  { tenantId: 'a', measureId: 'order_count', date: '2026-01-15', value: 1, dimensions: { branch: 'cairo' } },
  { tenantId: 'a', measureId: 'order_count', date: '2026-02-15', value: 4, dimensions: { branch: 'cairo' } },
  { tenantId: 'a', measureId: 'order_count', date: '2026-02-16', value: 1, dimensions: { branch: 'giza' } },
  { tenantId: 'a', measureId: 'stock_on_hand', date: '2026-01-15', value: 10, entityId: 'cairo-stock', dimensions: { branch: 'cairo' } },
  { tenantId: 'a', measureId: 'stock_on_hand', date: '2026-02-15', value: 20, entityId: 'cairo-stock', dimensions: { branch: 'cairo' } },
  { tenantId: 'b', measureId: 'revenue', date: '2026-02-15', value: 9999, dimensions: { branch: 'cairo' } },
  { tenantId: 'b', measureId: 'order_count', date: '2026-02-15', value: 1, dimensions: { branch: 'cairo' } },
  { tenantId: 'b', measureId: 'stock_on_hand', date: '2026-02-15', value: 9999, entityId: 'cairo-stock', dimensions: { branch: 'cairo' } },
];
const context = { tenantId: 'a', locale: 'en' } as const;
const options = { clock: () => new Date('2026-09-30T12:00:00.000Z'), sourceAsOf: '2026-09-30T08:00:00.000Z' };
function contract(name: string, create: () => AnalyticsRepository) {
  test(`${name}: tenant isolation, source metadata, ratios and snapshots`, async () => {
    const repo = create();
    const dateRange = { from: '2026-01-01', to: '2026-02-28' };
    const revenue = await repo.execute({ metric: 'revenue', dateRange }, context);
    assert.deepEqual(revenue.rows, [{ key: null, value: 350 }]);
    assert.deepEqual(revenue.metadata, { sourceId: name, executedAt: '2026-09-30T12:00:00.000Z',
      sourceAsOf: '2026-09-30T08:00:00.000Z', metricType: 'currency', semantics: 'additive' });
    assert.deepEqual((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'branch' }, context)).rows,
      [{ key: 'cairo', value: 300 }, { key: 'giza', value: 50 }]);
    assert.deepEqual((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'branch', analysis: { topN: { direction: 'top', limit: 1 } } }, context)).rows,
      [{ key: 'cairo', value: 300 }]);
    assert.equal((await repo.execute({ metric: 'average_order_value', dateRange }, context)).rows[0]?.value, 350 / 6);
    assert.equal((await repo.execute({ metric: 'stock_on_hand', dateRange }, context)).rows[0]?.value, 20);
    assert.equal((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'branch', filters: [{ dimension: 'customer', values: ['two'] }] }, context)).rows[0]?.value, 50);
    assert.equal((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'month', analysis: { runningTotal: true } }, context)).rows[1]?.value, 350);
    assert.equal((await repo.execute({ metric: 'revenue', dateRange, analysis: { comparison: 'year_over_year' } }, context)).rows[0]?.comparisonValue, 125);
    await assert.rejects(repo.execute({ metric: 'revenue' }, { tenantId: '', locale: 'en' }));
  });
}
contract('mock', () => new MockAnalyticsRepository(facts, options));
contract('sqlite', () => {
  const db = new DatabaseSync(':memory:');
  createSqliteSchema(db); insertFacts(db, facts);
  return new SqliteAnalyticsRepository(db, options);
});
test('SQLite rejects derived facts and duplicate entity snapshots', () => {
  const db = new DatabaseSync(':memory:');
  createSqliteSchema(db);
  assert.throws(() => insertFacts(db, [{ tenantId: 'a', measureId: 'gross_margin', date: '2026-01-01', value: 20, dimensions: {} } as unknown as AnalyticsFact]));
  assert.throws(() => insertFacts(db, [facts[7]!, facts[7]!]));
  assert.equal(Number(db.prepare('SELECT count(*) AS total FROM analytics_facts').get()?.total), 0);
  db.close();
});
test('seed is deterministic and contains only canonical source measures', () => {
  const first = generateSeedFacts();
  assert.deepEqual(first, generateSeedFacts());
  assert.equal(first.length, factMeasureIds.length * 24 * 6);
  assert.ok(first.every(f => factMeasureIds.includes(f.measureId)));
  const cairo = first.filter(f => f.measureId === 'revenue' && f.dimensions.branch === 'cairo');
  assert.ok(cairo.at(-1)!.value > cairo[0]!.value);
});
