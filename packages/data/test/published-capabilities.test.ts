import assert from 'node:assert/strict';
import test from 'node:test';
import { publishedQueryIssues } from '@el-dabboos/domain';
import { projectPublishedRelease } from '../src/postgres/published-capabilities.ts';
import type { PublishedReconciliationCoverage } from '../src/postgres/published-capabilities.ts';
import { mapping } from './postgres/fixtures.ts';
const context = { tenantId: 'a',locale: 'en' as const };
const coverage = (grouping: PublishedReconciliationCoverage['grouping']): PublishedReconciliationCoverage => ({ measure_id: 'order_count',grouping,period_from: '2026-09-01',period_to: '2026-09-30',exact: true,case_count: '40' });
test('different physical recipes publish the same semantics without leaking into requirements; new versions preserve old provenance',() => {
  const first = mapping(); first.capabilities = [{ metric: 'order_count',dimensions: ['branch','customer'] }];
  first.measures[1]!.sourceObject='sale_order'; first.measures[1]!.amountBasis='amount_total';
  const second = structuredClone(first); second.sourceId='custom-rest'; second.datasetId='release-v2'; second.mappingVersion='2';
  second.measures[1]!.sourceObject='/finalized-orders'; second.measures[1]!.amountBasis='netAmount';
  const frozen = JSON.stringify(first);
  const v1 = projectPublishedRelease(first,[coverage(null),coverage('branch')],context);
  const v2 = projectPublishedRelease(second,[coverage(null),coverage('branch')],context);
  assert.deepEqual(v1.releases[0]!.capabilities,v2.releases[0]!.capabilities);
  assert.equal(JSON.stringify(first),frozen);
  const composed = { ...v1,releases: [...v1.releases,...v2.releases] };
  assert.deepEqual(composed.releases.map(release=>release.mappingVersion),['1','2']);
  assert.equal(composed.releases[0]!.datasetId,'release');
  for (const field of ['sale_order','amount_total','netAmount','/finalized-orders']) assert.ok(!JSON.stringify(composed).includes(field));
  assert.ok(publishedQueryIssues({ metric: 'revenue',dateRange: v1.releases[0]!.period! },composed).length);
});
test('only exact approval-linked pairs are projected; independent dimensions, ratios, analyses and periods remain blocked',() => {
  const published = projectPublishedRelease(mapping(),[coverage(null),coverage('branch')],context);
  const dateRange = published.releases[0]!.period!;
  assert.deepEqual(publishedQueryIssues({ metric: 'order_count',groupBy: 'branch',dateRange },published),[]);
  for (const query of [{ metric: 'order_count' as const,groupBy: 'month' as const,dateRange },{ metric: 'order_count' as const,dateRange,analysis: { ranking: true as const } },{ metric: 'order_count' as const,aggregation: 'average' as const,dateRange },{ metric: 'average_order_value' as const,dateRange },{ metric: 'order_count' as const,dateRange: { from: '2026-08-01',to: '2026-09-30' } }]) assert.ok(publishedQueryIssues(query,published).length);
  assert.equal(projectPublishedRelease(mapping(),[{ ...coverage(null),exact: false }],context).releases[0]!.capabilities.length,0);
  assert.equal(projectPublishedRelease(mapping(),[coverage(null),coverage('branch')],{ ...context,enforcedFilters: [{ dimension: 'customer',values: ['one'] }] }).releases[0]!.capabilities.length,0);
});

test('derived output approval is separate and every pair requires exact compatible base coverage',()=>{
 const release=mapping();release.measures[0]!.measureId='order_revenue';release.capabilities=[{metric:'average_confirmed_order_value',dimensions:['salesperson','customer','month']}];
 const inputs=[{...coverage(null),measure_id:'order_revenue' as const},coverage(null),{...coverage('salesperson'),measure_id:'order_revenue' as const},coverage('salesperson')];
 const certificate={metric:'average_confirmed_order_value' as const,grouping:null,period_from:'2026-09-01',period_to:'2026-09-30',reference:'SYNTHETIC-OUTPUT'};
 assert.equal(projectPublishedRelease(release,inputs,context).releases[0]!.capabilities.length,0);
 const approved=projectPublishedRelease(release,inputs,context,[certificate,{...certificate,grouping:'salesperson'}]);
 assert.deepEqual(approved.releases[0]!.capabilities[0]!.dimensions,['salesperson']);
 assert.ok(publishedQueryIssues({metric:'average_confirmed_order_value',groupBy:'customer',dateRange:approved.releases[0]!.period!},approved).length);
 const missingBase=inputs.filter(row=>!(row.grouping==='salesperson' && row.measure_id==='order_count'));
 assert.deepEqual(projectPublishedRelease(release,missingBase,context,[certificate,{...certificate,grouping:'salesperson'}]).releases[0]!.capabilities[0]!.dimensions,[]);
});
