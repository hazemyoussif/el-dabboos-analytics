import assert from 'node:assert/strict';
import test from 'node:test';
import {setImmediate} from 'node:timers/promises';
import {AnalyticsPublicationChangedError,semanticCatalog,syntheticCapabilities,tenantProfiles} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,AnalyticsRepository,AnalyticsResult,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {DefaultAuthorizationPolicy,DemoIdentityProvider,ProductsWarehousesReport,validateProductsWarehousesInput} from '../src/index.ts';

const identity=new DemoIdentityProvider(),actor=identity.resolve('demo-iq-admin','demo-iq','en'),profile=tenantProfiles['demo-iq']!;
const clock=()=>new Date('2026-03-31T21:30:00Z');
function result(query:AnalyticsQuery,revision?:string):AnalyticsResult {
 const metric=semanticCatalog[query.metric];
 return {metric:query.metric,groupBy:query.groupBy??null,rows:[{key:'synthetic-product',value:query.metric==='internal_stock_quantity'?-2:null}],metadata:{sourceId:'synthetic',executedAt:clock().toISOString(),metricType:metric.type,semantics:metric.semantics.kind,...(revision?{servingRevision:revision}:{}),...(metric.semantics.kind==='snapshot'?{snapshotAsOf:'2026-03-30'}:{}),coverage:{status:'complete',from:query.dateRange!.from,through:query.dateRange!.to}}};
}
const published=async(context:AnalyticsContext)=>syntheticCapabilities(context);
function report(repository:AnalyticsRepository,capabilities=published){return new ProductsWarehousesReport({repository,policy:new DefaultAuthorizationPolicy(),published:capabilities,clock,options:{maxConcurrency:2}});}
test('product report separates snapshot, sales periods and filter scopes without dropping policy',async()=>{
 const calls:Array<{query:AnalyticsQuery;context:AnalyticsContext}>=[];
 const restricted={...actor,authorization:{...actor.authorization,enforcedFilters:[{dimension:'product' as const,values:['policy-product']}]}};
 const selected={from:'2026-02-03',to:'2026-02-19'};
 const output=await report({async execute(query,context){calls.push({query,context});return result(query);}}).execute({dateRange:selected,productFilters:[{dimension:'brand',values:['brand-a']}],salesFilters:[{dimension:'customer',values:['customer-a']},{dimension:'salesperson',values:['invoice-owner']}],warehouse:'warehouse-a'},restricted,profile);
 assert.equal(output.metadata.stockRequestedAsOf,'2026-04-01');assert.equal(output.metadata.refresh,'report_only');
 assert.equal(calls.length,6);
 for(const {query,context} of calls){
  assert.deepEqual(context.enforcedFilters,restricted.authorization.enforcedFilters);
  assert.equal(query.groupBy,'product');assert.ok(query.filters?.some(filter=>filter.dimension==='brand'));
  if(semanticCatalog[query.metric].semantics.kind==='snapshot'){
   assert.deepEqual(query.dateRange,{from:'2026-04-01',to:'2026-04-01'});
   assert.deepEqual(query.filters?.map(filter=>filter.dimension),['brand','warehouse']);
  }else{assert.deepEqual(query.dateRange,selected);assert.deepEqual(query.filters?.map(filter=>filter.dimension),['brand','customer','salesperson']);}
 }
 const stock=output.readings[0]!.execution!.widgetResults.internal_stock_quantity!.seriesResults.internal_stock_quantity!;
 assert.equal(stock.status,'success');if(stock.status==='success'){assert.equal(stock.result.rows[0]!.value,-2);assert.equal(stock.result.metadata.snapshotAsOf,'2026-03-30');}
 assert.ok(output.readings.every(entry=>entry.complete));
});
test('month-to-date default uses the tenant clock and never hardcodes a year',async()=>{
 const output=await report({execute:async query=>result(query)}).execute({},actor,profile);
 assert.deepEqual(output.metadata.selectedRange,{from:'2026-04-01',to:'2026-04-01'});
});
test('unpublished combinations and unsupported enforced dimensions cannot trigger reads',async()=>{
 let reads=0;
 const capabilities=async(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities>=>({tenantId:context.tenantId,mode:'certified',releases:[{datasetId:'fixture',sourceId:'synthetic',mappingId:'fixture',mappingVersion:'1',certificationReference:'SYNTHETIC ONLY',period:{from:'2026-04-01',to:'2026-04-30'},capabilities:[{metric:'internal_stock_quantity',summary:false,dimensions:['product'],analyses:[]}]}]});
 const service=report({async execute(query){reads++;return result(query);}},capabilities);
 const output=await service.execute({warehouse:'unsupported'},actor,profile);
 assert.equal(reads,0);assert.ok(output.readings.every(entry=>entry.issues.length&&!entry.execution));
 const restricted={...actor,authorization:{...actor.authorization,enforcedFilters:[{dimension:'customer' as const,values:['only-this-customer']}]}};
 const policyOutput=await service.execute({},restricted,profile);
 assert.equal(reads,0);assert.ok(policyOutput.readings.every(entry=>!entry.execution));
});
test('incomplete and missing certified coverage stay unproven, source errors remain safe',async()=>{
 const capabilities=async(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities>=>({...syntheticCapabilities(context),mode:'certified'});
 const output=await report({async execute(query){if(query.metric==='period_net_sales')throw new Error('private driver details');const response=result(query);delete response.metadata.coverage;return response;}},capabilities).execute({},actor,profile);
 assert.ok(output.readings.every(entry=>!entry.complete));assert.ok(!JSON.stringify(output).includes('private driver details'));
 const partial=await report({async execute(query){const response=result(query);response.metadata.coverage!.status='partial';return response;}}).execute({},actor,profile);
 assert.ok(partial.readings.every(entry=>!entry.complete));
});
test('all readings share a revision and retry a changed publication after reads settle',async()=>{
 let scopes=0,active=0,peak=0,verified=0;
 const repository:AnalyticsRepository={execute:async()=>{throw new Error('No root reads');},async createExecutionScope(){assert.equal(active,0);const revision=String(++scopes);return {servingRevision:revision,async execute(query){active++;peak=Math.max(peak,active);await setImmediate();active--;if(revision==='1'&&query.metric==='internal_stock_quantity')throw new AnalyticsPublicationChangedError();return result(query,revision);},async verifyExecution(){verified++;assert.equal(active,0);}};}};
 const output=await report(repository).execute({},actor,profile);
 assert.equal(scopes,2);assert.equal(output.metadata.servingRevision,'2');assert.ok(verified>=1);assert.equal(peak,2);
 for(const entry of output.readings)for(const series of Object.values(entry.execution!.widgetResults[entry.widget.id]!.seriesResults))if(series.status==='success')assert.equal(series.result.metadata.servingRevision,'2');
});
test('strict input and tenant/publication ownership reject overrides before analytics',async()=>{
 for(const input of [null,[],{tenantId:'other'},{revision:'other'},{filters:[]},{warehouse:''},{dateRange:{from:'2026-02-30',to:'2026-03-01'}},{productFilters:[{dimension:'customer',values:['a']}]},{salesFilters:[{dimension:'warehouse',values:['a']}]},{productFilters:[{dimension:'product',values:[]}]},{salesFilters:[{dimension:'customer',values:['a']},{dimension:'customer',values:['b']}]}])assert.throws(()=>validateProductsWarehousesInput(input));
 const repository:AnalyticsRepository={execute:async()=>{throw new Error('Must not read');}};
 await assert.rejects(report(repository).execute({},actor,tenantProfiles['demo-eg']!),/another workspace/);
 await assert.rejects(report(repository,async context=>({...syntheticCapabilities(context),tenantId:'other'})).execute({},actor,profile),/another workspace/);
});
test('metric-domain denial excludes inventory without weakening access',async()=>{
 const salesActor=identity.resolve('demo-iq-sales-analyst','demo-iq','en');
 const output=await report({async execute(query){assert.equal(semanticCatalog[query.metric].semantics.kind,'additive');return result(query);}}).execute({},salesActor,profile);
 assert.ok(output.readings.filter(entry=>entry.section==='inventory').every(entry=>!entry.execution));
 assert.ok(output.readings.filter(entry=>entry.section==='sales').every(entry=>entry.execution));
});
