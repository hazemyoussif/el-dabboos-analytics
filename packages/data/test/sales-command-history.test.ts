import assert from 'node:assert/strict';
import test from 'node:test';
import type {MetricId,PublishedAnalyticsRelease} from '@el-dabboos/domain';
import {businessEventWindows} from '../src/business/history.ts';

function release(month:string,metrics:MetricId[],version='command-version'):PublishedAnalyticsRelease {
 return {sourceId:'synthetic',datasetId:month,mappingId:'synthetic',mappingVersion:version,certificationReference:'SYNTHETIC',period:{from:month+'-01',to:month==='2026-09'?'2026-09-30':month+'-20'},capabilities:metrics.map(metric=>({metric,summary:true,dimensions:['customer','salesperson','date','week'],analyses:['topN']}))};
}
test('current-only residual capability cannot block compatible order history and snapshots never stitch',()=>{
 const windows=businessEventWindows([release('2026-09',['command_order_value']),release('2026-10',['command_order_value','command_invoice_residual','command_customer_balance'])]);
 assert.equal(windows.length,1);assert.deepEqual(windows[0]!.period,{from:'2026-09-01',to:'2026-10-20'});
 assert.deepEqual(windows[0]!.capabilities.map(capability=>capability.metric),['command_order_value']);
});
test('command history requires adjacent coverage, the same source and the same recipe version',()=>{
 assert.equal(businessEventWindows([release('2026-09',['command_order_value']),release('2026-11',['command_order_value'])]).length,0);
 assert.equal(businessEventWindows([release('2026-09',['command_order_value']),{...release('2026-10',['command_order_value']),sourceId:'another-source'}]).length,0);
 assert.equal(businessEventWindows([release('2026-09',['command_order_value']),release('2026-10',['command_order_value'],'changed-recipe')]).length,0);
});

test('obsolete command recipe versions cannot publish new metrics while unchanged Business metrics remain eligible',async()=>{
 const {reviewPublication}=await import('../src/review/publication.ts');
 const {businessDefinitionVersion}=await import('../src/business/definitions.ts');
 const {businessMapping}=await import('../src/business/definitions.ts');
 const {withSalesCommandMapping}=await import('../src/business/sales-command-mapping.ts');
 const publication=release('2026-09',['command_order_value','period_net_sales'],'obsolete-command-version');
 const mapping=withSalesCommandMapping(businessMapping({tenantId:'synthetic',sourceId:'synthetic',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:'SYNTHETIC',current:false}),false);
 const observations=[...new Set(mapping.measures.map(rule=>rule.sourceObject))].map(object=>({object,day:'2026-09-30',cutoff:'2026-09-30T09:00:00Z'}));
 const client={async query(){return {rows:[{revision_id:'synthetic-revision',capabilities:{tenantId:'synthetic',mode:'certified',releases:[publication]},definition_version:businessDefinitionVersion(),mapping_id:'business-purpose-v1-sales-command',mapping_version:'obsolete-command-version',mapping,observations}]};}};
 const result=await reviewPublication(client as unknown as import('pg').PoolClient,{tenantId:'synthetic',locale:'en'},'business');
 assert.deepEqual(result.releases[0]!.capabilities.map(capability=>capability.metric),['period_net_sales']);
});

test('actual observation coverage preserves gaps, accepted empty periods and the effective earlier snapshot cutoff',async()=>{
 const {salesCommandCoverage}=await import('../src/business/sales-command-coverage.ts');
 const cutoff='2026-10-20T00:00:00.000Z',range={from:'2026-09-01',to:'2026-10-20'};
 const complete=[{from:'2026-09-01',to:'2026-09-30',cutoff},{from:'2026-10-01',to:'2026-10-20',cutoff}];
 assert.equal(salesCommandCoverage({metric:'command_order_value'},range,complete).coverage?.status,'complete','a proved empty cohort still has accepted observation coverage');
 assert.equal(salesCommandCoverage({metric:'command_order_value'},range,complete.slice(1)).coverage?.status,'partial');
 const snapshot=salesCommandCoverage({metric:'command_customer_balance'},range,[{from:'2026-08-01',to:'2026-08-31',cutoff}]);
 assert.equal(snapshot.snapshotAsOf,'2026-08-31');assert.equal(snapshot.coverage?.through,'2026-08-31');
 assert.equal(salesCommandCoverage({metric:'command_customer_balance'},range,[]).availability?.reason,'no_snapshot');
});
