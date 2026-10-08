import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAnalystAnswer } from '../src/analyst-answer.ts';
import { synthesizeAnalystHighlights } from '../src/analyst-synthesis.ts';
import { tenantProfiles } from '@el-dabboos/domain';
import type { AnalystAnswer, AnalyticsQuery, AnalyticsResult, LLMProvider } from '@el-dabboos/domain';
import type { AnalyticsIntentResult, AnalyticsSeriesResult } from '../src/analytics-execution.ts';
const profile=tenantProfiles['demo-iq'],period={from:'2026-09-01',to:'2026-09-30'};
function panel(query:AnalyticsQuery,rows:AnalyticsResult['rows'],form:Exclude<AnalyticsSeriesResult,{status:'EXECUTION_FAILED'}>['form']='scalar'):Exclude<AnalyticsSeriesResult,{status:'EXECUTION_FAILED'}> {
 return {status:'SUPPORTED',query,result:{metric:query.metric,groupBy:query.groupBy??null,rows,metadata:{sourceId:'synthetic-fixture',executedAt:'2026-10-08T12:00:00.000Z',metricType:'currency',semantics:'additive',dimensionLabels:{'rep:a':'Ahmed Ali',general:'General',no_sugar:'No Sugar'}}},form};
}
function answer(series:AnalyticsSeriesResult[]):AnalystAnswer {
 const result:AnalyticsIntentResult={status:'SUPPORTED',intent:{context:{datePreset:'previous_month'},analyses:series.map(entry=>({series:[{metric:entry.query.metric}]}))},analyses:series.map(entry=>({series:[entry],alignedRows:[]})),timing:{capabilityMs:1,executionMs:2}};
 return renderAnalystAnswer(result,profile);
}
test('localized scalar, ranking and two-entity summaries use authoritative values, governed labels and frozen period',()=>{
 const scalar=answer([panel({metric:'order_revenue',dateRange:period},[{key:null,value:1447}])]);assert.equal(scalar.panels[0]!.summary.en,'Order revenue: 1,447 IQD.');assert.ok(scalar.panels[0]!.summary.ar.includes('١'));assert.deepEqual(scalar.intent!.context,{dateRange:period});
 const rank=answer([panel({metric:'order_revenue',groupBy:'salesperson',dateRange:period,analysis:{ranking:true}},[{key:'rep:a',value:182.4,rank:2}],'ranked_list')]);assert.ok(rank.panels[0]!.summary.en.includes('Ahmed Ali ranks 2'));assert.ok(!rank.panels[0]!.summary.en.includes('rep:a'));
 const grouped=answer([panel({metric:'order_revenue',groupBy:'business_line',dateRange:period},[{key:'general',value:100},{key:'no_sugar',value:75}],'grouped')]);assert.ok(grouped.panels[0]!.summary.en.includes('Difference: 25 IQD.'));
});
test('comparison, time series, snapshot, partial coverage and null evidence remain intact; snapshot date is never substituted',()=>{
 const comparison=panel({metric:'order_revenue',dateRange:period,analysis:{comparison:'previous_period'}},[{key:null,value:100,comparisonValue:80,absoluteChange:20,percentageChange:25}],'comparison');
 const time=panel({metric:'order_revenue',dateRange:period,groupBy:'month'},[{key:'2026-08',value:null},{key:'2026-09',value:100}],'time_series');time.status='PARTIAL_COVERAGE';time.result.metadata.coverage={status:'partial',from:'2026-09-01',through:'2026-09-30'};
 const snapshot=panel({metric:'net_aged_receivable',dateRange:{from:'2026-10-08',to:'2026-10-08'}},[{key:null,value:900}],'snapshot');snapshot.result.metadata.snapshotAsOf='2026-09-30';snapshot.result.metadata.semantics='snapshot';
 const output=answer([comparison,time,snapshot]);assert.equal(output.panels[0]!.result.rows[0]!.absoluteChange,20);assert.equal(output.panels[1]!.result.rows[0]!.value,null);assert.equal(output.panels[1]!.status,'PARTIAL_COVERAGE');assert.equal(output.panels[2]!.result.metadata.snapshotAsOf,'2026-09-30');assert.equal(output.panels[2]!.query.dateRange!.to,'2026-10-08');
});
test('bounded saved rows expose truncation while semantic intent and provenance survive; failed analysis stays explicit',()=>{
 const large=panel({metric:'order_revenue',groupBy:'customer',dateRange:period},Array.from({length:100},(_,index)=>({key:'customer:'+index,value:index})),'grouped');large.result.metadata.dimensionLabels=Object.fromEntries(large.result.rows.map(row=>[row.key!,'Customer']));
 const output=answer([large,{status:'EXECUTION_FAILED',query:{metric:'refund_value'},code:'EXECUTION_FAILED'}]);assert.equal(output.panels[0]!.result.rows.length,30);assert.equal(output.panels[0]!.omittedRows,70);assert.equal(Object.keys(output.panels[0]!.result.metadata.dimensionLabels!).length,30);assert.equal(output.failedAnalyses,1);
});
test('bounded optional synthesis selects existing evidence only and never owns values',async()=>{
 const output=answer(Array.from({length:3},()=>panel({metric:'order_revenue',dateRange:period},[{key:null,value:100}]))),provider=(result:unknown):LLMProvider=>({generateStructured:async request=>{assert.ok(!JSON.stringify(request).includes('password'));return {output:result,providerId:'fixture',attempts:1,latencyMs:1};}});
 assert.deepEqual(await synthesizeAnalystHighlights(provider({references:[2,0]}),output,'ar'),[2,0]);
 await assert.rejects(synthesizeAnalystHighlights(provider({references:[200],value:999999}),output,'en'));
 assert.equal(output.panels[0]!.result.rows[0]!.value,100);
});
