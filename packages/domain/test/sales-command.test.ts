import assert from 'node:assert/strict';
import test from 'node:test';
import {salesCommandContributionInsight,salesCommandCatalog,salesCommandComparisonPeriods,salesCommandComparisonValue,salesCommandSixWeeks,sourceStateLabel,validateQuery} from '../src/index.ts';

test('six consecutive Saturday weeks cross the year and end at the partial current week',()=>{
 assert.deepEqual(salesCommandSixWeeks('2026-01-01'),{from:'2025-11-22',to:'2026-01-01'});
 assert.deepEqual(salesCommandSixWeeks('2026-10-17'),{from:'2026-09-12',to:'2026-10-17'});
});
test('elapsed-month comparison clamps February and same-weekday operands remain four disjoint dates',()=>{
 assert.deepEqual(salesCommandComparisonPeriods('previous_month_elapsed','2024-03-31'),[{from:'2024-02-01',to:'2024-02-29'}]);
 assert.deepEqual(salesCommandComparisonPeriods('previous_month_elapsed','2026-03-10'),[{from:'2026-02-01',to:'2026-02-10'}]);
 assert.deepEqual(salesCommandComparisonPeriods('four_weekdays','2026-01-03'),['2025-12-27','2025-12-20','2025-12-13','2025-12-06'].map(date=>({from:date,to:date})));
});
test('comparison requires every operand and preserves zero-denominator nulls',()=>{
 assert.deepEqual(salesCommandComparisonValue(20,[10,20,30,20],'four_weekdays'),{baseline:20,absoluteChange:0,percentageChange:0});
 assert.deepEqual(salesCommandComparisonValue(20,[10,null,30,20],'four_weekdays'),{baseline:null,absoluteChange:null,percentageChange:null});
 assert.equal(salesCommandComparisonValue(20,[0],'previous_month_elapsed').percentageChange,null);
});
test('new metrics distinguish cash, document states, signed balances, full-period distinct customers and maximum overdue age',()=>{
 assert.equal(salesCommandCatalog.command_overdue_days.semantics.kind,'snapshot');
 assert.deepEqual(salesCommandCatalog.command_customers.semantics,{kind:'distinct_count',measure:'command_order_count',dimension:'customer'});
 validateQuery({metric:'command_cash_received',groupBy:'receipt_state',filters:[{dimension:'salesperson',values:['rep']}]},{tenantId:'test',locale:'en'});
 validateQuery({metric:'command_order_value',groupBy:'week'},{tenantId:'test',locale:'en'});
 assert.match(sourceStateLabel('unexpected').en,/unexpected/);
});

test('leading governorate excludes unassigned only from winner; top-ten shares use published full-population contributions',()=>{
 const metadata={sourceId:'synthetic',executedAt:'2026-10-20T00:00:00Z',metricType:'percentage' as const,semantics:'additive' as const,analysis:{percentageContribution:true as const}};
 const result={metric:'command_order_value' as const,groupBy:'state' as const,rows:[{key:'unassigned',value:60},{key:'known-a',value:25},{key:'known-b',value:15}],metadata};
 assert.deepEqual(salesCommandContributionInsight('leading_state',result),{key:'known-a',percentage:25});
 assert.equal(salesCommandContributionInsight('top_customer_share',{...result,rows:result.rows.slice(1)}).percentage,40);
 assert.equal(salesCommandContributionInsight('leading_state',{...result,metadata:{...metadata,coverage:{status:'partial',from:'2026-10-01',through:'2026-10-20'}}}).percentage,null);
});
