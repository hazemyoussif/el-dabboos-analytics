import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import type {AnalyticsQuery,AnalyticsRepository,AnalyticsResult,DashboardSpec,DashboardWidget} from '@el-dabboos/domain';
import {DashboardExecutor} from '../src/executor.ts';

const context={tenantId:'synthetic',locale:'en' as const};
const dashboard=(widgets:DashboardWidget[]):DashboardSpec=>({schemaVersion:2,id:'scheduling',locale:'en',title:{en:'Scheduling',ar:'جدولة'},filters:{dateRange:{from:'2026-09-01',to:'2026-09-30'}},layout:{columns:12},widgets});
function result(query:AnalyticsQuery,keys=['a']):AnalyticsResult{
 return {metric:query.metric,groupBy:query.groupBy??null,rows:keys.map(key=>({key,value:12})),metadata:{sourceId:'synthetic',executedAt:'2026-10-16T00:00:00Z',metricType:'currency',semantics:'additive',servingRevision:'r1'}};
}

test('independent anchor peers overlap within the request bound and retain identity, revision and failures',{timeout:2000},async()=>{
 let releasePeers!:()=>void;
 const peersReady=new Promise<void>(resolve=>{releasePeers=resolve;});
 let anchorFinished=false,active=0,peak=0,peerStarts=0;
 const repository:AnalyticsRepository={supportsResultWindows:true,async execute(query,scope,read){
  assert.deepEqual(scope,context);active++;peak=Math.max(peak,active);
  try{
   if(query.analysis?.topN){await setImmediate();anchorFinished=true;return result(query);}
   assert.equal(anchorFinished,true);assert.deepEqual(read?.outputKeys,['a']);assert.equal(read?.revision,'r1');
   if(++peerStarts===2)releasePeers();await peersReady;
   if(query.metric==='refund_value')throw new Error('Synthetic failure');
   return result(query);
  }finally{active--;}
 }};
 const widget:DashboardWidget={id:'arbitrary-anchor',type:'table',dimension:'customer',series:[
  {id:'anchor',metric:'invoiced_revenue',analysis:{topN:{direction:'top',limit:1}}},
  {id:'net',metric:'net_invoiced_revenue'},{id:'refund',metric:'refund_value'},{id:'orders',metric:'order_count'},
 ]};
 const output=await new DashboardExecutor(repository,undefined,{maxConcurrency:2}).execute(dashboard([widget]),context);
 assert.equal(peak,2);assert.equal(active,0);assert.equal(peerStarts,3);
 const entry=output.widgetResults[widget.id]!;
 assert.equal(entry.status,'partial');assert.equal(output.metadata.succeededSeries,3);assert.equal(output.metadata.failedSeries,1);
 assert.deepEqual(Object.keys(entry.seriesResults),['anchor','net','refund','orders']);
 assert.equal(entry.seriesResults.refund?.status,'error');assert.deepEqual(entry.alignedRows.map(row=>row.key),['a']);
});

test('window discovery and hydration share one global bound and deduplicate across widgets',async()=>{
 let active=0,peak=0;
 const modes:string[]=[];
 const repository:AnalyticsRepository={supportsResultWindows:true,async execute(query,_scope,read){
  active++;peak=Math.max(peak,active);modes.push(read?.outputKeys?'hydrate':'window');
  try{
   await setImmediate();
   const keys=query.metric==='invoiced_revenue'?['a','c']:['b','c'];
   const selected=read?.outputKeys?keys.filter(key=>read.outputKeys!.includes(key)):keys;
   const output=result(query,selected);
   if(read?.window)output.metadata.window={scope:'same-scope',total:keys.length};
   return output;
  }finally{active--;}
 }};
 const widget:DashboardWidget={id:'one',type:'table',dimension:'customer',series:[{id:'sales',metric:'invoiced_revenue'},{id:'refunds',metric:'refund_value'}]};
 const output=await new DashboardExecutor(repository,undefined,{maxConcurrency:2}).execute(dashboard([widget,{...widget,id:'two'}]),context,{timeZone:'Asia/Baghdad',windows:{one:{limit:2},two:{limit:2}}});
 assert.equal(peak,2);assert.equal(active,0);assert.deepEqual(modes.sort(),['hydrate','hydrate','window','window']);
 for(const entry of Object.values(output.widgetResults)){
  assert.equal(entry.status,'success');assert.deepEqual(entry.alignedRows.map(row=>row.key),['a','b']);
  assert.equal(entry.alignedRows[0]?.series.refunds,null);assert.equal(entry.alignedRows[1]?.series.sales,null);
 }
 assert.notEqual(output.widgetResults.one?.seriesResults.sales,output.widgetResults.two?.seriesResults.sales);
});
