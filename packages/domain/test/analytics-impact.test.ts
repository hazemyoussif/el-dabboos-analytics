import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAnalyticsImpact } from '../src/analytics-impact.ts';
import type { ProductionFact } from '../src/production-data.ts';
const policy = { through: '2026-09-30', movingAverageWindows: [3], runningTotals: true, yearOverYear: true, contribution: true, snapshotDependencies:()=>[] };
function fact(patch: Partial<ProductionFact> = {}): ProductionFact {
  return { tenantId:'a', datasetId:'release', sourceId:'source', sourceObject:'account_move', sourceRecordId:'1', componentId:'whole', measureId:'net_invoiced_revenue', kind:'event', businessDate:'2026-01-15', value:'100.000000', dimensions:{salesperson:'A',customer:'X',business_line:'one'}, sourceVersion:'v1', sourceRevision:'1', mappingId:'map', mappingVersion:'1', batchId:'batch', sourceAsOf:'2026-10-08T00:00:00Z', frozenRevision:'freeze', status:'active', ...patch };
}
test('October discovery invalidates January old/new groups, dependent periods, and no October base', () => {
  const partitions=resolveAnalyticsImpact([{previous:fact(),next:fact({value:'120.000000',dimensions:{salesperson:'B',customer:'Y',business_line:'one'},sourceRevision:'2'})}],policy);
  const base=partitions.filter(partition=>partition.dependency==='base');
  assert.deepEqual([...new Set(base.map(partition=>partition.month))],['2026-01']);
  assert.deepEqual(base.filter(partition=>partition.dimension==='salesperson').map(partition=>partition.identity).sort(),['A','B']);
  assert.deepEqual(base.filter(partition=>partition.dimension==='customer').map(partition=>partition.identity).sort(),['X','Y']);
  assert.deepEqual(partitions.filter(partition=>partition.dependency==='moving_average' && partition.dimension===null).map(partition=>partition.month),['2026-01','2026-02','2026-03']);
  assert.equal(partitions.filter(partition=>partition.dependency==='running_total' && partition.dimension===null).length,9);
  assert.equal(partitions.find(partition=>partition.dependency==='year_over_year')?.month,'2027-01');
});
test('business date moves invalidate both months; deletes retain old active footprint', () => {
  const moved=resolveAnalyticsImpact([{previous:fact(),next:fact({businessDate:'2026-02-10'})}],policy);
  assert.deepEqual([...new Set(moved.filter(partition=>partition.dependency==='base').map(partition=>partition.month))],['2026-01','2026-02']);
  const deleted=resolveAnalyticsImpact([{previous:fact(),next:fact({status:'tombstone'})}],policy);
  assert.ok(deleted.some(partition=>partition.month==='2026-01' && partition.dependency==='base'));
});
test('snapshot dependencies continue through proven settlement cutoff', () => {
  const partitions=resolveAnalyticsImpact([{previous:fact(),next:fact()}],{...policy,snapshotDependencies:()=>[{metric:'net_aged_receivable',from:'2026-01-31',through:'2026-04-30'}]});
  assert.deepEqual(partitions.filter(partition=>partition.dependency==='snapshot').map(partition=>partition.month),['2026-01','2026-02','2026-03','2026-04']);
});
test('ratio dependents are discovered from the semantic catalog; tenant identity cannot move', () => {
  const order=fact({measureId:'order_revenue'});
  assert.ok(resolveAnalyticsImpact([{next:order}],policy).some(partition=>partition.metric==='average_confirmed_order_value'));
  assert.throws(()=>resolveAnalyticsImpact([{previous:order,next:{...order,tenantId:'b'}}],policy),/identity conflict/);
});
