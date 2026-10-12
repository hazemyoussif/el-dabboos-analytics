import test from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import type {PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {odooComparisonCandidate} from '../src/odoo/mapping.ts';
import {dailyEventCapabilities} from '../src/operational/daily-capabilities.ts';
const mapping=odooComparisonCandidate({tenantId:'a',sourceId:'synthetic',datasetId:'synthetic',mappingId:'native-fields',mappingVersion:'1',businessOwner:'synthetic-only',reportingCurrency:'IQD',timeZone:'Asia/Baghdad'});
const published:PublishedAnalyticsCapabilities={tenantId:'a',mode:'certified',releases:[{datasetId:'trusted',sourceId:'synthetic',mappingId:'native-fields',mappingVersion:'1',certificationReference:'synthetic-only',period:{from:'2025-10-01',to:'2026-09-30'},capabilities:[
 {metric:'order_revenue',summary:true,dimensions:['salesperson','business_line'],analyses:[]},
 {metric:'average_confirmed_order_value',summary:true,dimensions:['salesperson','business_line','month'],analyses:[]},
 {metric:'net_aged_receivable',summary:true,dimensions:['month'],analyses:[]},
]}]};
function client(proved:boolean,specification=[mapping]){return {query:async()=>({rows:[{proved,specification}]})} as unknown as PoolClient;}
test('legacy staging dimensions expose source-defined customer and calendar grouping from complete tuple proofs',async()=>{
 const output=await dailyEventCapabilities(client(true),'a',published);
 for(const metric of ['order_revenue','average_confirmed_order_value']){
  const capability=output.releases[0]!.capabilities.find(capability=>capability.metric===metric)!;
  assert.ok(capability.dimensions.includes('customer'));assert.ok(capability.dimensions.includes('month'));assert.ok(capability.dimensions.includes('date'));
  assert.ok(!capability.dimensions.includes('branch'));assert.deepEqual(capability.analyses,[]);
 }
 assert.deepEqual(output.releases[0]!.capabilities[2],published.releases[0]!.capabilities[2]);
 assert.deepEqual(published.releases[0]!.capabilities[0]!.dimensions,['salesperson','business_line']);
});
test('absent or incompatible joint tuple proof does not expand legacy report dimensions',async()=>{
 assert.equal(await dailyEventCapabilities(client(false),'a',published),published);
});
test('a ratio cannot expose customer grouping when one mapped operand lacks the customer field',async()=>{
 const specification={...mapping,measures:mapping.measures.map(rule=>rule.measureId==='order_count'?{...rule,dimensionMappings:{salesperson:'native user',business_line:'native line'}}:rule)};
 const output=await dailyEventCapabilities(client(true,[specification]),'a',published);
 assert.ok(output.releases[0]!.capabilities[0]!.dimensions.includes('customer'));
 assert.ok(!output.releases[0]!.capabilities[1]!.dimensions.includes('customer'));
});
