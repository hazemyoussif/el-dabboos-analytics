import test from 'node:test';
import assert from 'node:assert/strict';
import { mapReceivableSnapshots } from '../src/receivable-aging.ts';
import { executeFacts } from '../src/engine.ts';
import { validateQuery } from '@el-dabboos/domain';
test('signed aging preserves cutoff/maturity fallback, zero complements, credit bridge and exact derived buckets', () => {
 const snapshots = mapReceivableSnapshots([
  {componentId:'one',customerId:'customer',accountingDate:'2026-09-01',maturityDate:'2026-09-30',residual:'100.000000'},
  {componentId:'two',customerId:'customer',accountingDate:'2026-08-31',maturityDate:null,residual:'60.000000'},
  {componentId:'three',customerId:'customer',accountingDate:'2026-07-01',maturityDate:'2026-08-30',residual:'-10.000000'},
 ],'2026-09-30');
 assert.deepEqual(snapshots[0]?.values, {net_aged_receivable:'150.000000',aged_at_date:'100.000000',aged_1_30:'60.000000',aged_31_60:'-10.000000',aged_61_90:'0.000000',aged_91_120:'0.000000',aged_over_120:'0.000000',total_overdue_receivable:'50.000000',gross_open_receivable_components:'160.000000',credit_balances:'-10.000000'});
 assert.throws(() => mapReceivableSnapshots([{componentId:'bad',customerId:'customer',accountingDate:'2026-10-01',maturityDate:null,residual:'10.000000'}],'2026-09-30'));
});
test('snapshot overdue percentage uses latest entity operands, signed denominator, null zero and refuses snapshot summing', () => {
 const context = {tenantId:'demo-iq',locale:'en' as const};
 const facts = [
  {tenantId:'demo-iq',entityId:'one',measureId:'net_aged_receivable' as const,date:'2026-09-29',value:900,dimensions:{customer:'one'}},
  {tenantId:'demo-iq',entityId:'one',measureId:'net_aged_receivable' as const,date:'2026-09-30',value:100,dimensions:{customer:'one'}},
  {tenantId:'demo-iq',entityId:'one',measureId:'total_overdue_receivable' as const,date:'2026-09-30',value:40,dimensions:{customer:'one'}},
 ];
 const query = {metric:'overdue_receivable_percentage' as const,dateRange:{from:'2026-09-01',to:'2026-09-30'}};
 assert.equal(executeFacts(facts,query,context,{sourceId:'mock',executedAt:'2026-10-07T00:00:00.000Z'}).rows[0]?.value,40);
 assert.equal(executeFacts([],query,context,{sourceId:'mock',executedAt:'2026-10-07T00:00:00.000Z'}).rows[0]?.value,null);
 assert.throws(() => validateQuery({...query,groupBy:'month',analysis:{runningTotal:true}},context));
});
