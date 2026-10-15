import test from 'node:test';
import assert from 'node:assert/strict';
import {executeGroupedWidget} from '../src/grouped-widget-execution.ts';
import type {AnalyticsRepository,AnalyticsQuery,AnalyticsReadOptions,DashboardWidget} from '@el-dabboos/domain';
const context={tenantId:'a',locale:'en' as const},filters={dateRange:{from:'2026-01-01',to:'2026-10-15'}};
function repository(disjoint=false){
 const calls:Array<{query:AnalyticsQuery;read?:AnalyticsReadOptions}>=[];
 const adapter:AnalyticsRepository={supportsResultWindows:true,async execute(query,_context,read){
  calls.push({query,...(read?{read}:{})});
  let rows=Array.from({length:12},(_,i)=>({key:String(i+1).padStart(2,'0'),value:(i+1)*(query.metric==='refund_value'?2:10)})).filter((_,i)=>query.metric==='refund_value'?i%2===1:!disjoint||i%2===0);
  if(query.analysis?.topN)rows=rows.reverse().slice(0,query.analysis.topN.limit);
  const total=rows.length;if(read?.outputKeys)rows=rows.filter(row=>read.outputKeys!.includes(row.key));
  if(read?.window)rows=rows.filter(row=>!read.window!.cursor||row.key>read.window!.cursor.after).slice(0,read.window.limit);
  return {metric:query.metric,groupBy:query.groupBy??null,rows,metadata:{sourceId:'synthetic',executedAt:'2026-10-15T00:00:00Z',metricType:'currency',semantics:'additive',servingRevision:'r1',...(read?.window?{window:{total,scope:'scope',...(rows.length>0&&rows.at(-1)!.key<'12'?{nextCursor:{scope:'scope',after:rows.at(-1)!.key}}:{})}}:{})}};
 }};
 return {adapter,calls};
}
test('multi-series pages use a complete union and hydrate the same keys for every metric',async()=>{
 const {adapter,calls}=repository(true),widget:DashboardWidget={id:'arbitrary',type:'table',dimension:'customer',series:[{id:'sales',metric:'invoiced_revenue'},{id:'refunds',metric:'refund_value'}]};
 const first=await executeGroupedWidget(adapter,widget,context,filters,{limit:3});
 assert.equal(first.status,'success');assert.deepEqual(first.alignedRows.map(row=>row.key),['01','02','03']);assert.equal(first.alignedRows[0]?.series.refunds,null);
 const second=await executeGroupedWidget(adapter,widget,context,filters,{limit:3,cursor:first.window!.nextCursor!});
 assert.deepEqual(second.alignedRows.map(row=>row.key),['04','05','06']);assert.equal(second.alignedRows[0]?.series.refunds?.value,8);
 assert.ok(calls.some(call=>call.read?.outputKeys?.join(',')==='01,02,03'));
});
test('Top-N peers receive output identities after the anchor, without changing business filters',async()=>{
 const {adapter,calls}=repository(),widget:DashboardWidget={id:'any-top',type:'table',dimension:'customer',series:[{id:'top',metric:'invoiced_revenue',analysis:{topN:{direction:'top',limit:2}}},{id:'peer',metric:'refund_value'}]};
 const output=await executeGroupedWidget(adapter,widget,context,filters);
 assert.deepEqual(output.alignedRows.map(row=>row.key),['12','11']);assert.equal(output.alignedRows[0]?.series.peer?.value,24);
 assert.deepEqual(calls[1]?.read?.outputKeys,['12','11']);assert.equal(calls[1]?.query.filters,undefined);assert.equal(calls[1]?.read?.revision,'r1');
});
