import assert from 'node:assert/strict';
import test from 'node:test';
import { generateSeedFacts } from '../src/seed.ts';

const facts = generateSeedFacts();
const by = (measure: string, predicate: (f: (typeof facts)[number]) => boolean) => facts.filter(f => f.measureId === measure && predicate(f));
const sum = (items: typeof facts) => items.reduce((total, f) => total + f.value, 0);
test('management fixture has useful entity breadth and stable snapshot identities', () => {
  assert.ok(new Set(by('revenue', () => true).map(f => f.dimensions.customer)).size >= 300);
  assert.equal(new Set(by('stock_on_hand', () => true).map(f => f.dimensions.product)).size, 160);
  assert.equal(new Set(by('stock_on_hand', () => true).map(f => f.dimensions.warehouse)).size, 5);
  assert.equal(new Set(by('failure_count', () => true).map(f => f.dimensions.equipment)).size, 150);
  assert.equal(new Set(by('revenue', () => true).map(f => f.dimensions.salesperson)).size, 12);
  assert.ok(by('outstanding_amount', () => true).every(f => f.entityId === `receivable:${f.dimensions.customer}`));
  assert.ok(by('stock_on_hand', () => true).every(f => f.entityId === `inventory:${f.dimensions.product}:${f.dimensions.warehouse}`));
});
test('fixture contains intentional sales, overdue, stock, and maintenance patterns', () => {
  const early = (f: (typeof facts)[number]) => f.date < '2025-04-01';
  const late = (f: (typeof facts)[number]) => f.date >= '2026-04-01';
  assert.ok(sum(by('revenue', f => f.dimensions.branch === 'cairo' && late(f))) > sum(by('revenue', f => f.dimensions.branch === 'cairo' && early(f))));
  assert.ok(sum(by('revenue', f => f.dimensions.branch === 'giza' && late(f))) < sum(by('revenue', f => f.dimensions.branch === 'giza' && early(f))));
  assert.ok(sum(by('overdue_amount', f => f.dimensions.customer === 'customer_001' && late(f))) > sum(by('overdue_amount', f => f.dimensions.customer === 'customer_001' && early(f))));
  assert.ok(sum(by('stock_on_hand', f => f.dimensions.product === 'product_001' && late(f))) < sum(by('stock_on_hand', f => f.dimensions.product === 'product_001' && early(f))));
  assert.ok(sum(by('failure_count', f => f.dimensions.equipment_category === 'compressor' && late(f))) > sum(by('failure_count', f => f.dimensions.equipment_category === 'compressor' && early(f))));
  const fast = by('repair_hours', f => f.dimensions.technician === 'technician_1');
  const slow = by('repair_hours', f => f.dimensions.technician === 'technician_8');
  assert.ok(sum(fast) / fast.length < sum(slow) / slow.length);
});

test('generator is deterministic for a fixed seed and differs for another seed', () => {
  const again = generateSeedFacts();
  assert.deepEqual(again, facts);
  const changed = generateSeedFacts('demo', 20261004);
  assert.notEqual(changed[0]?.value, facts[0]?.value);
});
