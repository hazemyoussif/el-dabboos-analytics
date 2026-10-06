import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantProfiles } from '@el-dabboos/domain';
import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { managementTemplates,selectDefaultTemplate,instantiateDashboardTemplate,templateCompatibility,managementControlReview } from '../src/index.ts';
const period={from:'2026-09-01',to:'2026-09-30'};
const metrics=['net_invoiced_revenue','invoiced_revenue','refund_value','order_revenue','order_count','average_confirmed_order_value'] as const;
const published:PublishedAnalyticsCapabilities={tenantId:'demo-iq',mode:'certified',releases:[{datasetId:'approved',sourceId:'any-source',mappingId:'approved-definition',mappingVersion:'1',certificationReference:'approved',period,capabilities:metrics.map(metric=>({metric,summary:true,dimensions:['business_line','salesperson'],analyses:[]}))}]};
test('management reports require exact pairs, covered periods and no inferred time or ranking analyses',()=>{
 for(const template of managementTemplates) {
  assert.equal(templateCompatibility(template,published).status,template.id==='customer-performance'?'unsupported':'supported');
  const dashboard=instantiateDashboardTemplate(template,tenantProfiles['demo-iq'],new Date('2026-11-01'),'ar',published);
  if(template.id!=='customer-performance')assert.deepEqual(dashboard.filters.dateRange,period);
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
 const review=managementControlReview('el-dabboos-iq');assert.equal(review?.certified,false);assert.equal(review?.identityVerified,false);
 assert.equal(managementControlReview('demo-iq'),null);assert.equal(managementControlReview('other'),null);
 assert.ok(!published.releases.some(release=>release.capabilities.some(capability=>capability.metric==='outstanding_amount')));
});
