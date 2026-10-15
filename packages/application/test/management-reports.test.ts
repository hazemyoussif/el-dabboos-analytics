import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantProfiles } from '@el-dabboos/domain';
import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { managementTemplates,selectDefaultTemplate,instantiateDashboardTemplate,templateCompatibility,managementControlReview,assertPublishedDashboard,dashboardTemplates } from '../src/index.ts';
import { historicalTemplates } from '../src/historical-templates.ts';
import { supportedTemplatePeriod } from '../src/management-templates.ts';
const period={from:'2026-09-01',to:'2026-09-30'};
const metrics=['net_invoiced_revenue','invoiced_revenue','refund_value','order_revenue','order_count','average_confirmed_order_value','invoice_count','refund_count','average_invoice_value'] as const;
const published:PublishedAnalyticsCapabilities={tenantId:'demo-iq',mode:'certified',releases:[{datasetId:'approved',sourceId:'any-source',mappingId:'approved-definition',mappingVersion:'1',certificationReference:'approved',period,capabilities:metrics.map(metric=>({metric,summary:true,dimensions:['business_line','salesperson'],analyses:[]}))}]};
test('management reports require exact pairs, covered periods and no inferred time or ranking analyses',()=>{
 for(const template of managementTemplates) {
  assert.equal(templateCompatibility(template,published).status,['customer-performance','receivables-aging'].includes(template.id)?'unsupported':'supported');
  const dashboard=instantiateDashboardTemplate(template,tenantProfiles['demo-iq'],new Date('2026-11-01'),'ar');
  if(!['customer-performance','receivables-aging'].includes(template.id))assert.deepEqual(dashboard.filters,{datePreset:'current_year'});
  assert.ok(dashboard.widgets.every(widget=>widget.series.every(series=>!series.analysis)));
 }
 const unpaired={...published,releases:published.releases.map(release=>({...release,capabilities:release.capabilities.map(capability=>({...capability,dimensions:[]}))}))};
 assert.equal(templateCompatibility(managementTemplates[1]!,unpaired).status,'unsupported');
});
test('automatic default selects only a supported report and preserves generic synthetic defaults',()=>{
 const inventory=[{id:'sales-performance',availability:'incompatible'},{id:'executive-sales-invoicing',availability:'available'}];
 assert.equal(selectDefaultTemplate(inventory,'certified'),'executive-sales-invoicing');
 assert.equal(selectDefaultTemplate([{id:'sales-performance',availability:'available'},...inventory.slice(1)],'synthetic'),'sales-performance');
 assert.equal(selectDefaultTemplate([{id:'sales-performance',availability:'incompatible'}],'certified'),undefined);
});
test('Finance control metadata stays tenant-scoped, non-executable and pending certification',()=>{
 const review=managementControlReview('el-dabboos-iq');assert.equal(review?.certified,false);assert.equal(review?.identityVerified,true);
 assert.equal(managementControlReview('demo-iq'),null);assert.equal(managementControlReview('other'),null);
 assert.ok(!published.releases.some(release=>release.capabilities.some(capability=>capability.metric==='outstanding_amount')));
});

test('invoice operations needs exact posted-document count, value and approved average pairs',()=>{
 const template=managementTemplates.find(item=>item.id==='invoice-refund-operations')!;
 assert.equal(template.widgets.length,7);
 assert.deepEqual(template.widgets.at(-1)?.series.map(item=>item.metric),['invoice_count','refund_count','average_invoice_value','invoiced_revenue','refund_value','net_invoiced_revenue']);
 const absentAverage={...published,releases:published.releases.map(release=>({...release,capabilities:release.capabilities.filter(capability=>capability.metric!=='average_invoice_value')}))};
 assert.equal(templateCompatibility(template,absentAverage).status,'partially_supported');
 const absentPair={...published,releases:published.releases.map(release=>({...release,capabilities:release.capabilities.map(capability=>capability.metric==='refund_count'?{...capability,dimensions:[]}:capability)}))};
 assert.notEqual(templateCompatibility(template,absentPair).status,'supported');
});


test('every locally available dashboard binds staging metric releases to a shared executable period',()=>{
 const period={from:'2024-06-01',to:'2026-09-30'};
 const finance=['net_aged_receivable','aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120','total_overdue_receivable','overdue_receivable_percentage','gross_open_receivable_components','credit_balances'] as const;
 const staging:PublishedAnalyticsCapabilities={...published,releases:[
  ...metrics.map(metric=>({...published.releases[0]!,datasetId:`trusted-${metric}`,period,selectionSemantics:'event_intersection' as const,capabilities:[{metric,summary:true,dimensions:['month','business_line','salesperson','customer'] as const,analyses:[]}]})),
  {...published.releases[0]!,datasetId:'trusted-finance',period:{from:'2024-06-30',to:'2026-09-30'},selectionSemantics:'latest_snapshot',capabilities:finance.map(metric=>({metric,summary:true,dimensions:['month','customer'],analyses:[]}))},
 ]};
 const templates=dashboardTemplates.filter(template=>template.periodStrategy==='certified'&&!template.tags.includes('source-business'));
 assert.equal(templates.length,12);
 for(const template of templates)for(const locale of ['en','ar'] as const){
  assert.equal(templateCompatibility(template,staging).status,'supported',template.id);
  const dashboard=instantiateDashboardTemplate(template,tenantProfiles['demo-iq'],new Date('2026-10-12'),locale);
  assert.deepEqual(dashboard.filters,{datePreset:'current_year'},template.id);
  assert.doesNotThrow(()=>assertPublishedDashboard(dashboard,staging,'Asia/Baghdad',new Date('2026-10-12')),template.id);
 }
});

test('split report metrics use intersecting coverage and cannot invent a shared period across disjoint releases',()=>{
 const template=historicalTemplates.find(template=>template.id==='sales-invoicing-trend')!;
 const release=published.releases[0]!;
 const split:PublishedAnalyticsCapabilities={...published,releases:[
  {...release,period:{from:'2024-06-01',to:'2026-06-30'},selectionSemantics:'event_intersection',capabilities:release.capabilities.filter(capability=>capability.metric==='order_revenue')},
  {...release,period:{from:'2025-01-01',to:'2026-09-30'},selectionSemantics:'event_intersection',capabilities:release.capabilities.filter(capability=>capability.metric==='net_invoiced_revenue')},
 ]};
 // Monthly grouping remains explicitly required rather than inferred from a date range.
 split.releases=split.releases.map(release=>({...release,capabilities:release.capabilities.map(capability=>({...capability,dimensions:['month']}))}));
 assert.deepEqual(supportedTemplatePeriod(template,split),{from:'2025-01-01',to:'2026-06-30'});
 const disjoint={...split,releases:split.releases.map((release,index)=>({...release,period:index?{from:'2026-07-01',to:'2026-09-30'}:release.period!}))};
 assert.equal(supportedTemplatePeriod(template,disjoint),undefined);
 assert.equal(templateCompatibility(template,disjoint).status,'unsupported');
});


test('sales templates ignore unrelated balance windows when resolving their complete shared dates',()=>{
 const template=managementTemplates[0]!;
 const combined={...published,releases:[{...published.releases[0]!,period:{from:'2025-10-31',to:'2026-09-30'},capabilities:[{metric:'net_aged_receivable' as const,summary:true,dimensions:['month' as const],analyses:[]}]},...metrics.map(metric=>({...published.releases[0]!,period:{from:'2025-10-01',to:metric==='average_confirmed_order_value'?'2026-09-30':'2026-10-12'},capabilities:published.releases[0]!.capabilities.filter(capability=>capability.metric===metric)}))]};
 assert.deepEqual(supportedTemplatePeriod(template,combined),{from:'2025-10-01',to:'2026-09-30'});
});
