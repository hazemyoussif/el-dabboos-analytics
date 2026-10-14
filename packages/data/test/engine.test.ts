import assert from 'node:assert/strict';
import test from 'node:test';
import { executeFacts } from '../src/engine.ts';
import { shiftRange, previousTimeKey } from '../src/calendar.ts';
import type { AnalyticsFact } from '../src/facts.ts';

const context = { tenantId: 't', locale: 'en' } as const;
const execution = { sourceId: 'test', executedAt: '2026-09-30T12:00:00.000Z' };
const fact = (measureId: AnalyticsFact['measureId'], date: string, value: number, branch = 'a', entityId?: string): AnalyticsFact => ({
  tenantId: 't', measureId, date, value, ...(entityId ? { entityId } : {}), dimensions: { branch },
});
const run = (facts: AnalyticsFact[], query: Parameters<typeof executeFacts>[1]) => executeFacts(facts, query, context, execution);

test('additive aggregation supports sum, count, average, min and max', () => {
  const facts = [fact('revenue', '2026-01-15', 100), fact('revenue', '2026-02-15', 200), fact('revenue', '2026-02-16', 50, 'b')];
  const dateRange = { from: '2026-01-01', to: '2026-02-28' };
  const kinds = ['sum', 'count', 'average', 'min', 'max'] as const;
  assert.deepEqual(kinds.map(aggregation => run(facts, { metric: 'revenue', aggregation, dateRange }).rows[0]?.value),
    [350, 3, 350 / 3, 50, 200]);
  assert.deepEqual(run(facts, { metric: 'revenue', groupBy: 'branch', dateRange }).rows.map(r => r.value), [300, 50]);
});
test('ratio and duration metrics aggregate components before division', () => {
  const facts = [
    fact('revenue', '2026-01-15', 100), fact('revenue', '2026-02-15', 200),
    fact('order_count', '2026-01-15', 1), fact('order_count', '2026-02-15', 4),
    fact('gross_profit', '2026-01-15', 30), fact('gross_profit', '2026-02-15', 50),
    fact('net_revenue', '2026-01-15', 80), fact('net_revenue', '2026-02-15', 200),
    fact('opportunity_count', '2026-01-15', 4), fact('opportunity_count', '2026-02-15', 6),
    fact('won_opportunity_count', '2026-01-15', 2), fact('won_opportunity_count', '2026-02-15', 1),
    fact('closed_opportunity_count', '2026-01-15', 3), fact('closed_opportunity_count', '2026-02-15', 5),
    fact('operating_hours', '2026-01-15', 100), fact('operating_hours', '2026-02-15', 200),
    fact('failure_count', '2026-01-15', 2), fact('failure_count', '2026-02-15', 1),
    fact('repair_hours', '2026-01-15', 10), fact('repair_hours', '2026-02-15', 20),
    fact('completed_repair_count', '2026-01-15', 2), fact('completed_repair_count', '2026-02-15', 2),
  ];
  const dateRange = { from: '2026-01-01', to: '2026-02-28' };
  assert.equal(run(facts, { metric: 'average_order_value', dateRange }).rows[0]?.value, 60);
  assert.equal(run(facts, { metric: 'gross_margin', dateRange }).rows[0]?.value, 80 / 280 * 100);
  assert.equal(run(facts, { metric: 'win_rate', dateRange }).rows[0]?.value, 37.5);
  assert.equal(run(facts, { metric: 'mtbf', dateRange }).rows[0]?.value, 100);
  assert.equal(run(facts, { metric: 'mttr', dateRange }).rows[0]?.value, 7.5);
  assert.equal(run([fact('revenue', '2026-01-15', 100)], { metric: 'average_order_value', dateRange }).rows[0]?.value, null);
});
test('snapshots select the latest value per entity as of each period', () => {
  const facts = [
    fact('stock_on_hand', '2026-01-05', 10, 'a', 'a-product'),
    fact('stock_on_hand', '2026-02-05', 20, 'a', 'a-product'),
    fact('stock_on_hand', '2026-01-04', 30, 'b', 'b-product'),
  ];
  assert.equal(run(facts, { metric: 'stock_on_hand', dateRange: { from: '2026-02-01', to: '2026-02-28' } }).rows[0]?.value, 50);
  assert.deepEqual(run(facts, { metric: 'stock_on_hand', dateRange: { from: '2026-01-01', to: '2026-02-28' }, groupBy: 'month' }).rows,
    [{ key: '2026-01', value: 40 }, { key: '2026-02', value: 50 }]);
  assert.deepEqual(run(facts, { metric: 'stock_on_hand', dateRange: { from: '2026-02-01', to: '2026-02-28' }, groupBy: 'branch' }).rows,
    [{ key: 'a', value: 20 }, { key: 'b', value: 30 }]);
});
test('categorical snapshot grouping preserves latest assignment, zero, policy and prior-cutoff comparisons',()=>{
 const facts=[fact('stock_on_hand','2026-01-05',10,'a','moved'),fact('stock_on_hand','2026-02-05',0,'b','moved'),fact('stock_on_hand','2026-03-05',999,'a','moved')];
 const query={metric:'stock_on_hand' as const,groupBy:'branch' as const,dateRange:{from:'2026-02-01',to:'2026-02-28'},analysis:{comparison:'month_over_month' as const}};
 const result=run(facts,query);
 assert.deepEqual(result.rows,[{key:'b',value:0,comparisonValue:null,absoluteChange:null,percentageChange:null}]);
 assert.deepEqual(executeFacts(facts,query,{...context,enforcedFilters:[{dimension:'branch',values:['a']}]},execution).rows,[]);
 assert.throws(()=>run([...facts,facts[1]!],query),/Duplicate snapshot/);
});
test('categorical snapshot ratios independently select latest operands and preserve zero denominators',()=>{
 const customerFact=(measure:AnalyticsFact['measureId'],date:string,value:number,customer:string,entity:string)=>({...fact(measure,date,value,'a',entity),dimensions:{customer}});
 const facts=[customerFact('net_aged_receivable','2026-01-05',100,'a','balance'),customerFact('net_aged_receivable','2026-02-05',50,'b','balance'),customerFact('net_aged_receivable','2026-02-05',0,'c','zero'),customerFact('total_overdue_receivable','2026-01-05',30,'a','overdue'),customerFact('total_overdue_receivable','2026-02-05',0,'b','overdue')];
 const query={metric:'overdue_receivable_percentage' as const,groupBy:'customer' as const,dateRange:{from:'2026-02-01',to:'2026-02-28'}};
 assert.deepEqual(run(facts,query).rows,[{key:'b',value:0},{key:'c',value:null}]);
 assert.deepEqual(executeFacts(facts,query,{...context,enforcedFilters:[{dimension:'customer',values:['a']}]},execution).rows,[]);
});
test('high-cardinality snapshots rank 144,000 historical facts without rescanning all entities for every customer',()=>{
 const facts:AnalyticsFact[]=[];
 for(let customer=0;customer<12000;customer++)for(let component=0;component<6;component++){
  const entity=`component-${customer}-${component}`,dimensions={customer:`customer-${customer}`};
  facts.push({...fact('receivables_due_for_collection','2026-01-31',0,'a',entity),dimensions});
  facts.push({...fact('receivables_due_for_collection','2026-09-30',customer+1,'a',entity),dimensions});
 }
 const began=performance.now();
 const result=run(facts,{metric:'receivables_due_for_collection',groupBy:'customer',dateRange:{from:'2026-09-01',to:'2026-09-30'},analysis:{topN:{limit:100,direction:'top'}}});
 assert.equal(result.rows.length,100);assert.equal(result.rows[0]?.value,72000);
 assert.ok(performance.now()-began<10000,'the bounded real-sized snapshot workload must finish in ten seconds');
});
test('monthly YoY aligns each month with the same month one year earlier', () => {
  const facts = [fact('revenue', '2025-01-15', 100), fact('revenue', '2025-02-15', 200), fact('revenue', '2025-03-15', 999),
    fact('revenue', '2026-01-15', 150), fact('revenue', '2026-02-15', 300)];
  const result = run(facts, { metric: 'revenue', dateRange: { from: '2026-01-01', to: '2026-02-28' }, groupBy: 'month', analysis: { comparison: 'year_over_year' } });
  assert.deepEqual(result.rows.map(r => [r.key, r.value, r.comparisonValue, r.percentageChange]),
    [['2026-01', 150, 100, 50], ['2026-02', 300, 200, 50]]);
  const combined = run(facts, { metric: 'revenue', dateRange: { from: '2026-01-01', to: '2026-02-28' }, groupBy: 'month', analysis: { comparison: 'year_over_year', movingAverage: { window: 2 } } });
  assert.deepEqual(combined.rows.map(r => [r.value, r.comparisonValue, r.percentageChange]), [[150, 100, 50], [225, 150, 50]]);
});
test('monthly MoM aligns with the preceding month, including outside the selected range', () => {
  const facts = [fact('revenue', '2025-12-15', 50), fact('revenue', '2026-01-15', 100), fact('revenue', '2026-02-15', 300)];
  const result = run(facts, { metric: 'revenue', dateRange: { from: '2026-01-01', to: '2026-02-28' }, groupBy: 'month', analysis: { comparison: 'month_over_month' } });
  assert.deepEqual(result.rows.map(r => [r.key, r.comparisonValue, r.percentageChange]), [['2026-01', 50, 100], ['2026-02', 100, 200]]);
});
test('quarterly YoY and previous-quarter alignment use calendar buckets', () => {
  const facts = [fact('revenue', '2025-01-15', 100), fact('revenue', '2025-04-15', 200),
    fact('revenue', '2026-01-15', 150), fact('revenue', '2026-04-15', 600)];
  const dateRange = { from: '2026-01-01', to: '2026-06-30' };
  assert.deepEqual(run(facts, { metric: 'revenue', dateRange, groupBy: 'quarter', analysis: { comparison: 'year_over_year' } }).rows.map(r => [r.key, r.comparisonValue]),
    [['2026-Q1', 100], ['2026-Q2', 200]]);
  assert.deepEqual(run(facts, { metric: 'revenue', dateRange, groupBy: 'quarter', analysis: { comparison: 'previous_period' } }).rows.map(r => [r.key, r.comparisonValue]),
    [['2026-Q1', 0], ['2026-Q2', 150]]);
});
test('sales growth derives from revenue comparison, never a stored growth fact', () => {
  const facts = [fact('revenue', '2025-02-15', 80), fact('revenue', '2026-02-15', 100)];
  const result = run(facts, { metric: 'sales_growth', dateRange: { from: '2026-02-01', to: '2026-02-28' }, analysis: { comparison: 'year_over_year' } });
  assert.deepEqual(result.rows[0], { key: null, value: 25 });
  assert.equal(result.metadata.unit, '%');
});
test('calendar shifts clamp leap days and retain full month ends', () => {
  assert.deepEqual(shiftRange({ from: '2024-03-01', to: '2024-03-31' }, 'month_over_month'), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(shiftRange({ from: '2024-02-01', to: '2024-02-29' }, 'year_over_year'), { from: '2023-02-01', to: '2023-02-28' });
  assert.deepEqual(shiftRange({ from: '2026-01-31', to: '2026-01-31' }, 'month_over_month'), { from: '2025-12-31', to: '2025-12-31' });
  assert.equal(previousTimeKey('2024-02-29', 'date', 'year_over_year'), '2023-02-28');
});
test('ranking, top N, and running total are deterministic', () => {
  const facts = [fact('revenue', '2026-01-15', 100, 'a'), fact('revenue', '2026-02-15', 200, 'b')];
  assert.deepEqual(run(facts, { metric: 'revenue', groupBy: 'branch', analysis: { ranking: true, topN: { direction: 'top', limit: 1 } } }).rows,
    [{ key: 'b', value: 200, rank: 1 }]);
  assert.deepEqual(run(facts, { metric: 'revenue', groupBy: 'month', analysis: { runningTotal: true } }).rows.map(r => r.value), [100, 300]);
});
test('snapshot time series carries a prior entity balance through a month without updates', () => {
  const facts = [fact('stock_on_hand', '2026-01-05', 10, 'a', 'a-product'), fact('stock_on_hand', '2026-02-05', 20, 'a', 'a-product')];
  const result = run(facts, { metric: 'stock_on_hand', dateRange: { from: '2026-01-01', to: '2026-03-31' }, groupBy: 'month' });
  assert.deepEqual(result.rows.map(r => [r.key, r.value]), [['2026-01', 10], ['2026-02', 20], ['2026-03', 20]]);
});
test('snapshot series without a date range includes every observed period', () => {
  const facts = [fact('stock_on_hand', '2026-01-05', 10, 'a', 'item'), fact('stock_on_hand', '2026-02-05', 20, 'a', 'item')];
  assert.deepEqual(run(facts, { metric: 'stock_on_hand', groupBy: 'month' }).rows.map(r => [r.key, r.value]),
    [['2026-01', 10], ['2026-02', 20]]);
  assert.equal(run(facts, { metric: 'stock_on_hand', dateRange: { from: '2025-01-01', to: '2025-12-31' } }).rows[0]?.value, null);
});
test('actual MoM and YoY queries honor leap-day and month-end baseline ranges', () => {
  const facts = [fact('revenue', '2023-02-28', 5), fact('revenue', '2024-02-29', 10), fact('revenue', '2024-03-31', 20)];
  assert.equal(run(facts, { metric: 'revenue', dateRange: { from: '2024-03-01', to: '2024-03-31' }, analysis: { comparison: 'month_over_month' } }).rows[0]?.comparisonValue, 10);
  assert.equal(run(facts, { metric: 'revenue', dateRange: { from: '2024-02-29', to: '2024-02-29' }, analysis: { comparison: 'year_over_year' } }).rows[0]?.comparisonValue, 5);
});

test('customers served counts stable customers once per authorized period/group; repeated orders and unknown outlets do not inflate it',() => {
  const rows = [
    { ...fact('order_count','2026-09-01',1),dimensions: { customer: 'outlet-1',salesperson: 'rep-1' } },
    { ...fact('order_count','2026-09-02',1),dimensions: { customer: 'outlet-1',salesperson: 'rep-1' } },
    { ...fact('order_count','2026-09-03',1),dimensions: { customer: 'outlet-2',salesperson: 'rep-2' } },
    { ...fact('order_count','2026-09-04',1),dimensions: { customer: 'unassigned',salesperson: 'rep-1' } },
  ];
  assert.equal(run(rows,{ metric: 'customers_served' }).rows[0]!.value,2);
  assert.deepEqual(run(rows,{ metric: 'customers_served',groupBy: 'salesperson' }).rows,[{ key: 'rep-1',value: 1 },{ key: 'rep-2',value: 1 }]);
  assert.throws(() => run(rows,{ metric: 'customers_served',groupBy: 'month',analysis: { runningTotal: true } }),/additive/);
});
