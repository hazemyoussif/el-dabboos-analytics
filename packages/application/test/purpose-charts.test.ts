import assert from 'node:assert/strict';
import test from 'node:test';
import {dashboardTemplates,DashboardExecutor,instantiateDashboardTemplate} from '../src/index.ts';
import {semanticCatalog,tenantProfiles,validateDashboardSpec} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsRepository} from '@el-dabboos/domain';
import type {SeriesExecution} from '../src/executor.ts';
import {alignAnalyticsSeries} from '../src/analytics-alignment.ts';

test('purpose charts retain exact detail queries, coherent units and all raw tables',async()=>{
 const template=dashboardTemplates.find(template=>template.id==='confirmed-order-margin')!;
 const dashboard=instantiateDashboardTemplate(template,tenantProfiles['demo-iq'],new Date('2026-10-15'),'en');
 let calls=0;const repository:AnalyticsRepository={execute:async(query:AnalyticsQuery)=>{calls++;return {metric:query.metric,groupBy:query.groupBy??null,rows:[{key:query.groupBy?'synthetic':null,value:10}],metadata:{sourceId:'synthetic',executedAt:'2026-10-15',metricType:semanticCatalog[query.metric].type,semantics:semanticCatalog[query.metric].semantics.kind}};}};
 const output=await new DashboardExecutor(repository).execute(dashboard,{tenantId:'demo-iq',locale:'en'},{timeZone:'Asia/Baghdad'});
 assert.equal(output.metadata.failedSeries,0);assert.equal(calls,6,'chart copies reuse the six original normalized queries');
 assert.equal(template.widgets.filter(widget=>widget.type==='table').length,2);
 for(const template of dashboardTemplates)for(const locale of ['en','ar'] as const)assert.doesNotThrow(()=>validateDashboardSpec(instantiateDashboardTemplate(template,tenantProfiles['demo-iq'],new Date('2026-10-15'),locale)));
 const pareto=dashboardTemplates.find(template=>template.id==='customer-positive-sales-pareto')!;
 assert.ok(pareto.widgets.some(widget=>widget.type==='line'&&widget.series[0]?.analysis?.pareto));
 assert.ok(pareto.widgets.some(widget=>widget.id==='raw-sales'&&widget.type==='table'));
});

test('large-series alignment uses linear key access while preserving first duplicate, nulls and selection order',()=>{
 let reads=0;const series=['first','second','third'].map(id=>({id,metric:'revenue' as const}));
 const results:Record<string,SeriesExecution>=Object.fromEntries(series.map(series=>[series.id,{status:'success' as const,result:{metric:'revenue' as const,groupBy:'customer' as const,rows:Array.from({length:5000},(_,index)=>({get key(){reads++;return 'customer-'+index;},value:index})),metadata:{sourceId:'synthetic',executedAt:'2026-10-15',metricType:'currency' as const,semantics:'additive' as const}}}]));
 const aligned=alignAnalyticsSeries({dimension:'customer',series},results);
 assert.equal(aligned.length,5000);assert.equal(aligned.at(-1)?.series.third?.value,4999);assert.ok(reads<150000,'index each key; never scan every result for each output row');
 const first=results.first!;if(first.status!=='success')throw new Error('Synthetic success required');
 first.result.rows=[{key:'duplicate',value:1},{key:'duplicate',value:2},{key:null,value:3}];
 const duplicate=alignAnalyticsSeries({dimension:'customer',series:[series[0]!,{id:'missing',metric:'revenue'}]},results);
 assert.equal(duplicate[0]?.series.first?.value,1);assert.equal(duplicate[1]?.key,null);
});
