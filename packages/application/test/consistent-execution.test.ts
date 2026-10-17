import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {AnalyticsPublicationChangedError,AnalyticsResultWindowError} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsRepository,AnalyticsResult,DashboardSpec} from '@el-dabboos/domain';
import {DashboardExecutor} from '../src/executor.ts';

const context={tenantId:'demo-iq',locale:'en' as const};
const dashboard:DashboardSpec={schemaVersion:2,id:'consistent',locale:'en',title:{en:'Consistent',ar:'متسق'},filters:{datePreset:'today'},layout:{columns:12},widgets:[
 {id:'sales',type:'kpi',series:[{id:'sales',metric:'revenue'}]},
 {id:'profit',type:'kpi',series:[{id:'profit',metric:'gross_profit'}]},
]};
function result(query:AnalyticsQuery,revision:string):AnalyticsResult{
 return {metric:query.metric,groupBy:query.groupBy??null,rows:[{key:null,value:revision==='r1'?1:2}],metadata:{sourceId:'synthetic',executedAt:'2026-10-16',metricType:'currency',semantics:'additive',servingRevision:revision}};
}
test('publication during parallel reads discards the attempt, drains work and retries with a fixed business date',async()=>{
 let revision='r1',scopes=0,active=0,peak=0,clockCalls=0;
 const ranges:unknown[]=[];
 const repository:AnalyticsRepository={async createExecutionScope(){
  scopes++;const pinned=revision;
  return {servingRevision:pinned,async execute(query){
   active++;peak=Math.max(peak,active);ranges.push(query.dateRange);
   try{const selected=result(query,revision);revision='r2';await setImmediate();return selected;}finally{active--;}
  },async verifyExecution(){assert.equal(active,0);if(pinned!==revision)throw new AnalyticsPublicationChangedError();}};
 },execute:async()=>{throw new Error('Unscoped read');}};
 const output=await new DashboardExecutor(repository,()=>{clockCalls++;return new Date('2026-10-16T23:59:59Z');}).execute(dashboard,context,{timeZone:'UTC'});
 assert.equal(scopes,2);assert.equal(peak,2);assert.equal(clockCalls,1);assert.equal(ranges.length,4);
 assert.ok(ranges.every(range=>JSON.stringify(range)===JSON.stringify({from:'2026-10-16',to:'2026-10-16'})));
 assert.equal(output.metadata.servingRevision,'r2');assert.equal(output.metadata.succeededSeries,2);
 assert.ok(Object.values(output.widgetResults).every(widget=>Object.values(widget.seriesResults).every(series=>series.status==='success'&&series.result.rows[0]?.value===2&&series.result.metadata.servingRevision==='r2')));
});
test('a read-level publication conflict cannot hide inside partial series and never retries more than once',async()=>{
 let scopes=0,calls=0;
 const repository:AnalyticsRepository={async createExecutionScope(){scopes++;return {async execute(){calls++;throw new AnalyticsPublicationChangedError();},async verifyExecution(){}};},execute:async()=>{throw new Error('Unscoped read');}};
 await assert.rejects(new DashboardExecutor(repository).execute(dashboard,context,{timeZone:'UTC'}),AnalyticsPublicationChangedError);
 assert.equal(scopes,2);assert.equal(calls,4);
});
test('ordinary series and stale-page failures retain isolation without a publication retry',async()=>{
 let scopes=0;
 const repository:AnalyticsRepository={async createExecutionScope(){scopes++;return {async execute(query){if(query.metric==='revenue')throw new AnalyticsResultWindowError();return result(query,'r1');},async verifyExecution(){}};},execute:async()=>{throw new Error('Unscoped read');}};
 const output=await new DashboardExecutor(repository).execute(dashboard,context,{timeZone:'UTC'});
 assert.equal(scopes,1);assert.equal(output.metadata.succeededSeries,1);assert.equal(output.metadata.failedSeries,1);
 assert.equal(output.widgetResults.sales?.seriesResults.sales?.status,'error');
});
