import assert from 'node:assert/strict';
import test from 'node:test';
import { executeFacts } from '../src/engine.ts';
import type { AnalyticsFact } from '../src/facts.ts';

const context = { tenantId: 't', locale: 'en' } as const;
const facts: AnalyticsFact[] = [
  { tenantId: 't', metricId: 'revenue', date: '2025-02-15', value: 50, dimensions: { branch: 'a' } },
  { tenantId: 't', metricId: 'revenue', date: '2026-01-15', value: 100, dimensions: { branch: 'a' } },
  { tenantId: 't', metricId: 'revenue', date: '2026-02-15', value: 200, dimensions: { branch: 'a' } },
  { tenantId: 't', metricId: 'revenue', date: '2026-02-16', value: 50, dimensions: { branch: 'b' } },
];
test('sum, count, average, min and max are deterministic', () => {
  const dateRange = { from: '2026-01-01', to: '2026-02-28' };
  const values = ['sum', 'count', 'average', 'min', 'max'] as const;
  assert.deepEqual(values.map(aggregation => executeFacts(facts, { metric: 'revenue', aggregation, dateRange }, context).rows[0]?.value),
    [350, 3, 350 / 3, 50, 200]);
});
test('percentage contribution, moving average, ranking and YoY comparison', () => {
  const dateRange = { from: '2026-01-01', to: '2026-02-28' };
  const contribution = executeFacts(facts, { metric: 'revenue', dateRange, groupBy: 'branch', operation: { kind: 'percentage_contribution' } }, context);
  assert.equal(Math.round(contribution.rows[0]!.value), 86);
  const moving = executeFacts(facts, { metric: 'revenue', dateRange, groupBy: 'month', operation: { kind: 'moving_average', window: 2 } }, context);
  assert.deepEqual(moving.rows.map(r => r.value), [100, 175]);
  const ranking = executeFacts(facts, { metric: 'revenue', dateRange, groupBy: 'branch', operation: { kind: 'ranking' } }, context);
  assert.deepEqual(ranking.rows.map(r => r.rank), [1, 2]);
  const yoy = executeFacts(facts, { metric: 'revenue', dateRange, operation: { kind: 'year_over_year' } }, context);
  assert.deepEqual(yoy.rows[0], { key: null, value: 350, comparisonValue: 50, absoluteChange: 300, percentageChange: 600 });
});
