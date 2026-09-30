import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import type { AnalyticsRepository, DimensionValueRepository } from '@el-dabbous/domain';
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
function contract(name: string, create: () => AnalyticsRepository & DimensionValueRepository) {
  test(`${name}: tenant isolation, source metadata, ratios and snapshots`, async () => {
    const repo = create();
    const dateRange = { from: '2026-01-01', to: '2026-02-28' };
    const revenue = await repo.execute({ metric: 'revenue', dateRange }, context);
    assert.deepEqual(revenue.rows, [{ key: null, value: 350 }]);
    assert.deepEqual(revenue.metadata, { sourceId: name, executedAt: '2026-09-30T12:00:00.000Z',
      dataThrough: '2026-02-16', sourceAsOf: '2026-09-30T08:00:00.000Z', metricType: 'currency', semantics: 'additive' });
    assert.deepEqual((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'branch' }, context)).rows,
      [{ key: 'cairo', value: 300 }, { key: 'giza', value: 50 }]);
    assert.deepEqual((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'branch', analysis: { topN: { direction: 'top', limit: 1 } } }, context)).rows,
      [{ key: 'cairo', value: 300 }]);
    const aov = await repo.execute({ metric: 'average_order_value', dateRange }, context);
    assert.equal(aov.rows[0]?.value, 350 / 6);
    assert.equal(aov.metadata.dataThrough, '2026-02-16');
    const stock = await repo.execute({ metric: 'stock_on_hand', dateRange }, context);
    assert.equal(stock.rows[0]?.value, 20);
    assert.equal(stock.metadata.dataThrough, '2026-02-15');
    assert.equal((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'branch', filters: [{ dimension: 'customer', values: ['two'] }] }, context)).rows[0]?.value, 50);
    assert.equal((await repo.execute({ metric: 'revenue', dateRange, groupBy: 'month', analysis: { runningTotal: true } }, context)).rows[1]?.value, 350);
    assert.equal((await repo.execute({ metric: 'revenue', dateRange, analysis: { comparison: 'year_over_year' } }, context)).rows[0]?.comparisonValue, 125);
    assert.deepEqual(await repo.listDimensionValues('branch', context), ['cairo', 'giza']);
    assert.deepEqual(await repo.listDimensionValues('branch', { tenantId: 'b', locale: 'en' }), ['cairo']);
    await assert.rejects(repo.listDimensionValues('branch', { tenantId: '', locale: 'en' }));
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
  assert.ok(first.length > 100_000);
  assert.ok(first.every(f => factMeasureIds.includes(f.measureId)));
  assert.equal(first[0]?.tenantId, 'demo-iq');
  assert.equal(new Set(first.filter(f => f.measureId === 'revenue').map(f => f.dimensions.branch)).size, 6);
});
test('SQLite data coverage is tenant and metric scoped and does not fabricate source freshness', async () => {
  const db = new DatabaseSync(':memory:');
  createSqliteSchema(db);
  insertFacts(db, [
    { tenantId: 'demo-iq', measureId: 'revenue', date: '2026-08-15', value: 10, dimensions: { branch: 'baghdad' } },
    { tenantId: 'demo-eg', measureId: 'revenue', date: '2026-09-20', value: 20, dimensions: { branch: 'cairo' } },
    { tenantId: 'demo-iq', measureId: 'order_count', date: '2026-09-25', value: 1, dimensions: { branch: 'baghdad' } },
  ]);
  const repo = new SqliteAnalyticsRepository(db);
  const iq = await repo.execute({ metric: 'revenue' }, { tenantId: 'demo-iq', locale: 'ar' });
  const eg = await repo.execute({ metric: 'revenue' }, { tenantId: 'demo-eg', locale: 'ar' });
  assert.equal(iq.metadata.dataThrough, '2026-08-15');
  assert.equal(eg.metadata.dataThrough, '2026-09-20');
  assert.equal(iq.metadata.sourceAsOf, undefined);
  assert.equal(eg.metadata.sourceAsOf, undefined);
  assert.equal(iq.rows[0]?.value, 10);
  assert.equal(eg.rows[0]?.value, 20);
  db.close();
});
test('mock coverage is metric scoped and source freshness is absent unless configured', async () => {
  const repo = new MockAnalyticsRepository(facts);
  const revenue = await repo.execute({ metric: 'revenue', dateRange: { from: '2026-01-01', to: '2026-01-31' } }, context);
  assert.equal(revenue.metadata.dataThrough, '2026-02-16');
  assert.equal(revenue.metadata.sourceAsOf, undefined);
  const stock = await repo.execute({ metric: 'stock_on_hand' }, context);
  assert.equal(stock.metadata.dataThrough, '2026-02-15');
  assert.equal(stock.metadata.sourceAsOf, undefined);
  const missing = await repo.execute({ metric: 'revenue' }, { tenantId: 'missing', locale: 'en' });
  assert.equal(missing.metadata.dataThrough, undefined);
});
