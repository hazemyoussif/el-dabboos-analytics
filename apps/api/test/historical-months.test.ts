import assert from 'node:assert/strict';
import test from 'node:test';
import { historicalMonths, verifyHistoricalCheckpoint, reconciliationLedger } from '../src/historical-months.ts';
import type { ReconciliationCase } from '@el-dabboos/domain';
test('historical wave contains twelve contiguous complete months, preserving September', () => {
  const months = historicalMonths(); assert.equal(months.length,12);
  assert.deepEqual(months[0],{month:'2025-10',from:'2025-10-01',to:'2025-10-31'});
  assert.deepEqual(months[4],{month:'2026-02',from:'2026-02-01',to:'2026-02-28'});
  assert.deepEqual(months[11],{month:'2026-09',from:'2026-09-01',to:'2026-09-30'});
  for (let index=1;index<months.length;index++) assert.equal(Date.parse(months[index]!.from)-Date.parse(months[index-1]!.to),86400000);
});
test('September accepts changed live values when frozen source and mart evidence still match', () => {
  const period = {month:'2026-09',from:'2026-09-01',to:'2026-09-30'};
  const control = {
    caseId:'live-september',
    measureId:'net_invoiced_revenue',
    grouping:null,
    from:period.from,
    to:period.to,
    frozenRevision:'snapshot-new',
    expectedValue:'1500000000.000000',
    actualValue:'1500000000.000000',
    expectedCount:'1',
    actualCount:'1'
  } as ReconciliationCase;
  const prior = {month:period.month,cases:[control],snapshot:{frozenRevision:'snapshot-new'}};
  assert.doesNotThrow(() => verifyHistoricalCheckpoint(period,prior,[{specification:control,status:'passed',group_completeness:true}]));
  assert.throws(() => verifyHistoricalCheckpoint(period,{...prior,cases:[{...control,actualValue:'1499999999.000000'}]},[{specification:control,status:'passed',group_completeness:true}]),/evidence conflict/);
});
test('ledger counts individual discrepancies instead of netting differences', () => {
  const cases = [{measureId:'order_revenue',grouping:'customer',expectedValue:'1.000000',actualValue:'2.000000',expectedCount:'1',actualCount:'1'}, {measureId:'order_revenue',grouping:'customer',expectedValue:'2.000000',actualValue:'1.000000',expectedCount:'1',actualCount:'1'}] as ReconciliationCase[];
  assert.deepEqual(reconciliationLedger(cases),[{metric:'order_revenue',dimension:'customer',groupCount:2,exactCases:0,deltaCases:2}]);
});
test('historical extraction refuses partial windows, outside coverage and protected anchor datasets before connections', async () => {
  const { extractHistoricalEvents } = await import('../src/historical-events.ts');
  const manifest = {mapping:{tenantId:'el-dabboos-iq',sourceId:'el-dabboos-odoo18-pg',datasetId:'el-dabboos-finance-202609-v6',mappingId:'synthetic',mappingVersion:'1',businessOwner:'SYNTHETIC ONLY',reportingCurrency:'IQD',timeZone:'Asia/Baghdad'},extractionId:'synthetic'};
  await assert.rejects(extractHistoricalEvents(manifest,{month:'2026-09',from:'2026-09-02',to:'2026-09-30'},{}),/historical month/);
  await assert.rejects(extractHistoricalEvents(manifest,{month:'2026-09',from:'2026-09-01',to:'2026-09-30'},{}),/New historical event release/);
  await assert.rejects(extractHistoricalEvents(manifest,{month:'2024-09',from:'2024-09-01',to:'2024-09-29'},{}),/complete months/);
});
test('signed grouped totals must equal separate source and mart summaries without netting away a discrepancy', async () => {
  const { verifyGroupedSums } = await import('../src/historical-months.ts');
  const control = {measureId:'net_invoiced_revenue',expectedCount:'1',actualCount:'1'};
  const cases = [{...control,grouping:null,expectedValue:'7.000000',actualValue:'7.000000',expectedCount:'2',actualCount:'2'}, {...control,grouping:'customer',expectedValue:'10.000000',actualValue:'10.000000'}, {...control,grouping:'customer',expectedValue:'-3.000000',actualValue:'-3.000000'}] as ReconciliationCase[];
  assert.doesNotThrow(()=>verifyGroupedSums(cases));
  assert.throws(()=>verifyGroupedSums(cases.map((item,index)=>index===2?{...item,actualValue:'-2.000000'}:item)),/group sum/);
});
test('resume verifies immutable evidence rather than trusting a successful file label', async () => {
  const { verifyHistoricalCheckpoint } = await import('../src/historical-months.ts');
  const period = historicalMonths()[0]!;
  const control = {caseId:'synthetic',from:period.from,to:period.to,frozenRevision:'synthetic-snapshot',expectedValue:'1.000000',actualValue:'1.000000',expectedCount:'1',actualCount:'1'} as ReconciliationCase;
  const prior = {month:period.month,cases:[control],snapshot:{frozenRevision:'synthetic-snapshot'}};
  const rows = [{specification:control,status:'passed',group_completeness:true}];
  assert.doesNotThrow(()=>verifyHistoricalCheckpoint(period,prior,rows));
  assert.throws(()=>verifyHistoricalCheckpoint(period,{...prior,cases:[{...control,actualValue:'2.000000'}]},rows),/evidence conflict/);
  assert.throws(()=>verifyHistoricalCheckpoint(period,prior,[{...rows[0]!,group_completeness:false}]),/evidence conflict/);
  assert.throws(()=>verifyHistoricalCheckpoint(period,{...prior,snapshot:{frozenRevision:'different'}},rows),/evidence conflict/);
});
test('month planning is reusable input logic, including leap February and the next 24-month range',()=>{
  assert.deepEqual(historicalMonths('2024-02-01','2024-02-29'),[{month:'2024-02',from:'2024-02-01',to:'2024-02-29'}]);
  assert.equal(historicalMonths('2024-10-01','2026-09-30').length,24);
  assert.throws(()=>historicalMonths('2025-10-02','2026-09-30'),/boundaries/);
  assert.throws(()=>historicalMonths('2025-10-01','2026-09-29'),/complete months/);
});
