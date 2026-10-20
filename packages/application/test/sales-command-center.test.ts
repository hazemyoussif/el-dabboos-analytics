import assert from 'node:assert/strict';
import test from 'node:test';
import {setImmediate} from 'node:timers/promises';
import {AnalyticsPublicationChangedError,semanticCatalog,syntheticCapabilities,tenantProfiles} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,AnalyticsRepository,AnalyticsResult,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {SalesCommandCenter,validateSalesCommandInput,salesCommandWidgets,DefaultAuthorizationPolicy,DemoIdentityProvider} from '../src/index.ts';

const identity=new DemoIdentityProvider(),actor=identity.resolve('demo-iq-admin','demo-iq','en'),profile=tenantProfiles['demo-iq']!;
const clock=()=>new Date('2026-03-31T21:30:00Z'); // April 1 in Baghdad.
const published=async(context:AnalyticsContext)=>syntheticCapabilities(context);
function result(query:AnalyticsQuery,revision?:string):AnalyticsResult {
 const metric=semanticCatalog[query.metric];
 return {metric:query.metric,groupBy:query.groupBy??null,rows:[{key:query.groupBy?'synthetic-customer':null,value:query.metric==='command_invoice_count'?null:12}],metadata:{sourceId:'synthetic',executedAt:clock().toISOString(),metricType:metric.type,semantics:metric.semantics.kind,...(revision?{servingRevision:revision}:{}),coverage:{status:'complete',from:query.dateRange!.from,through:query.dateRange!.to}}};
}
function report(repository:AnalyticsRepository,capabilities=published){return new SalesCommandCenter({repository,policy:new DefaultAuthorizationPolicy(),published:capabilities,clock,options:{maxConcurrency:2}});}
test('one tenant clock resolves independent periods, preserving nulls and section order',async()=>{
 let clocks=0;
 const service=new SalesCommandCenter({repository:{execute:async query=>result(query)},policy:new DefaultAuthorizationPolicy(),published,clock:()=>{clocks++;return clock();}});
 const selected={from:'2026-02-03',to:'2026-02-19'},output=await service.execute({dateRange:selected},actor,profile);
 assert.equal(clocks,1);assert.equal(output.metadata.today,'2026-04-01');assert.equal(output.metadata.refresh,'report_only');
 assert.deepEqual(output.sections.map(section=>section.id),['today','month','follow-up','trends','customers']);
 const entries=output.sections.flatMap(section=>section.widgets);
 assert.deepEqual(entries.find(entry=>entry.definition.id==='today-invoices')!.period,{from:'2026-04-01',to:'2026-04-01'});
 assert.deepEqual(entries.find(entry=>entry.definition.id==='month-invoices')!.period,{from:'2026-04-01',to:'2026-04-01'});
 assert.deepEqual(entries.find(entry=>entry.definition.id==='range-orders')!.period,selected);
 assert.deepEqual(entries.find(entry=>entry.definition.id==='top-customers')!.period,selected);
 const count=entries.find(entry=>entry.definition.id==='today-invoice-count')!.execution!.widgetResults['today-invoice-count']!.seriesResults.command_invoice_count!;
 assert.equal(count.status,'success');if(count.status==='success')assert.equal(count.result.rows[0]!.value,null);
 assert.equal(entries.filter(entry=>entry.disposition==='definition_needed').length,salesCommandWidgets.filter(entry=>!entry.widget).length);
});
test('all sections share deduplication, one bounded scheduler and one pinned execution scope',async()=>{
 let scopes=0,verified=0,active=0,peak=0;
 const queries:AnalyticsQuery[]=[];
 const repository:AnalyticsRepository={execute:async()=>{throw new Error('No root reads');},async createExecutionScope(){scopes++;return {servingRevision:'synthetic-revision',async execute(query){queries.push(query);active++;peak=Math.max(peak,active);await setImmediate();active--;return result(query,'synthetic-revision');},async verifyExecution(){verified++;assert.equal(active,0);}};}};
 const output=await report(repository).execute({},actor,profile);
 assert.equal(scopes,1);assert.equal(verified,1);assert.equal(peak,2);
 assert.equal(queries.filter(query=>query.metric==='command_invoice_total'&&!query.groupBy&&query.dateRange?.from==='2026-04-01').length,1,'today and MTD share their April 1 read');
 assert.equal(output.metadata.servingRevision,'synthetic-revision');
});
test('publication conflict retries the entire report after all first-attempt reads settle',async()=>{
 let scopes=0,active=0;
 const repository:AnalyticsRepository={execute:async()=>{throw new Error('No root reads');},async createExecutionScope(){assert.equal(active,0);const revision=String(++scopes);return {servingRevision:revision,async execute(query){active++;await setImmediate();active--;if(revision==='1'&&query.metric==='command_invoice_total')throw new AnalyticsPublicationChangedError();return result(query,revision);}};}};
 const output=await report(repository).execute({},actor,profile);
 assert.equal(scopes,2);assert.equal(output.metadata.servingRevision,'2');
 for(const entry of output.sections.flatMap(section=>section.widgets))for(const widget of Object.values(entry.execution?.widgetResults??{}))for(const series of Object.values(widget.seriesResults))if(series.status==='success')assert.equal(series.result.metadata.servingRevision,'2');
});
test('new receipt attribution supports shared salesperson filters and enforced policy filters survive',async()=>{
 const calls:Array<{query:AnalyticsQuery;context:AnalyticsContext}>=[];
 const output=await report({async execute(query,context){calls.push({query,context});return result(query);}}).execute({filters:[{dimension:'salesperson',values:['rep-a']},{dimension:'customer',values:['customer-a']}]},actor,profile);
 const cash=output.sections[0]!.widgets.find(entry=>entry.definition.id==='today-cash')!;
 assert.deepEqual(cash.unsupportedFilters,[]);assert.deepEqual(cash.appliedFilters,[{dimension:'salesperson',values:['rep-a']},{dimension:'customer',values:['customer-a']}]);
 const invoice=calls.find(call=>call.query.metric==='command_invoice_total')!;
 assert.ok(invoice.query.filters?.some(filter=>filter.dimension==='salesperson'));
 const restricted={...actor,authorization:{...actor.authorization,enforcedFilters:[{dimension:'salesperson' as const,values:['rep-policy']}]}};
 calls.length=0;
 const restrictedOutput=await report({async execute(query,context){calls.push({query,context});return result(query);}}).execute({},restricted,profile);
 assert.ok(calls.some(call=>call.query.metric==='command_cash_received'));
 assert.ok(calls.every(call=>call.context.enforcedFilters?.[0]?.values[0]==='rep-policy'));
 assert.equal(restrictedOutput.sections[0]!.widgets.find(entry=>entry.definition.id==='today-cash')!.issues.length,0);
});
test('exact publication cases and metric-domain permissions are checked before any reads',async()=>{
 const calls:AnalyticsQuery[]=[];
 const capabilities=async(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities>=>({tenantId:context.tenantId,mode:'certified',releases:[{datasetId:'synthetic',sourceId:'synthetic',mappingId:'synthetic',mappingVersion:'1',certificationReference:'SYNTHETIC',period:{from:'2026-04-01',to:'2026-04-30'},capabilities:[{metric:'command_order_value',summary:true,dimensions:['customer'],analyses:['topN']}]}]});
 const output=await report({async execute(query){calls.push(query);return result(query);}},capabilities).execute({dateRange:{from:'2026-03-01',to:'2026-03-31'}},actor,profile);
 assert.equal(calls.length,0);assert.ok(output.sections.flatMap(section=>section.widgets).some(entry=>entry.issues.some(issue=>issue.startsWith('period:'))));
 const salesActor=identity.resolve('demo-iq-sales-analyst','demo-iq','en');
 await report({async execute(query){assert.notEqual(query.metric,'command_cash_received');return result(query);}}).execute({},salesActor,profile);
});
test('partial coverage and failures remain unproven and snapshots retain their actual cutoff',async()=>{
 const output=await report({async execute(query){if(query.metric==='command_invoice_refunds')throw new Error('private source details');const response=result(query);response.metadata.coverage!.status='partial';if(query.metric==='command_customer_balance')response.metadata.snapshotAsOf='2026-02-28';return response;}}).execute({},actor,profile);
 const entries=output.sections.flatMap(section=>section.widgets);
 assert.ok(entries.filter(entry=>entry.execution).every(entry=>entry.disposition==='implemented_unproven'));
 assert.ok(!JSON.stringify(output).includes('private source details'));
 const debt=entries.find(entry=>entry.definition.id==='overdue-customers')!.execution!.widgetResults['overdue-customers']!.seriesResults.command_customer_balance!;
 assert.equal(debt.status,'success');if(debt.status==='success')assert.equal(debt.result.metadata.snapshotAsOf,'2026-02-28');
});
test('strict inputs cannot inject source/revision/tenant/metric controls or malformed dates and filters',async()=>{
 for(const input of [null,[],{tenantId:'other'},{servingRevision:'other'},{metric:'revenue'},{dateRange:{from:'2026-02-30',to:'2026-03-01'}},{filters:[{dimension:'branch',values:['a']}]},{filters:[{dimension:'customer',values:[]}]}])assert.throws(()=>validateSalesCommandInput(input));
 await assert.rejects(report({execute:async query=>result(query)}).execute({},actor,tenantProfiles['demo-eg']!),/another workspace/);
});
