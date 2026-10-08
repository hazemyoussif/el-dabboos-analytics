import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { semanticCatalog,tenantProfiles } from '@el-dabboos/domain';
import type { DashboardWidget,DrillPage } from '@el-dabboos/domain';
import type { DashboardExecutionResult,WidgetExecution } from '@el-dabboos/application';
import { drillRequestFor } from '../src/drill-context.ts';
const widget:DashboardWidget={id:'drill',type:'bar',dimension:'business_line',series:[{id:'net',metric:'net_invoiced_revenue'}]};
const entry:WidgetExecution={
 status:'success',alignedRows:[{key:'internal:general',series:{net:{value:10}}}],
 seriesResults:{net:{status:'success',result:{
  metric:'net_invoiced_revenue',groupBy:'business_line',rows:[{key:'internal:general',value:10}],
  metadata:{sourceAsOf:'2026-10-08T00:00:00.000Z',sourceId:'postgres',executedAt:'2026-10-08T00:00:00.000Z',dimensionLabels:{'internal:general':'General'},release:{datasetId:'release-a',sourceId:'fixture',mappingId:'mapping',mappingVersion:'1',certificationReference:'TEST ONLY'}}
 }}}
};
const execution:DashboardExecutionResult={dashboard:{schemaVersion:2,id:'test',title:{en:'Test',ar:'اختبار'},locale:'en',widgets:[widget],filters:{},layout:{columns:12,rowHeight:72,gap:16}},widgetResults:{drill:entry},metadata:{executedAt:'2026-10-08T00:00:00.000Z',succeeded:1,failed:0,succeededSeries:1,failedSeries:0,effectiveFilters:{dateRange:{from:'2026-09-05',to:'2026-09-20'},dimensions:[{dimension:'salesperson',values:['internal:rep']}]}}};
test('chart/table context preserves viewer dates, all report filters and clicked dimension without mutating parent',()=>{
 const before=structuredClone(execution),request=drillRequestFor(execution,widget,entry,'net','internal:general');
 assert.deepEqual(request?.clicked,{dimension:'business_line',values:['internal:general']});assert.deepEqual(request?.query.filters,execution.metadata.effectiveFilters?.dimensions);assert.deepEqual(request?.query.dateRange,{from:'2026-09-05',to:'2026-09-20'});assert.equal(request?.release,'release-a');assert.deepEqual(execution,before);
 for(const dimension of ['customer','salesperson','business_line'] as const)assert.equal(drillRequestFor(execution,{...widget,dimension},entry,'net','internal:general')?.clicked?.dimension,dimension);
 assert.deepEqual(drillRequestFor(execution,{...widget,dimension:'month'},{...entry,seriesResults:{net:{status:'success',result:{...(entry.seriesResults.net as {status:'success';result:import('@el-dabboos/domain').AnalyticsResult}).result,rows:[{key:'2026-09',value:10}]}}}},'net','2026-09')?.query.dateRange,{from:'2026-09-05',to:'2026-09-20'});
 assert.equal(drillRequestFor(execution,{...widget,dimension:'city'},entry,'net','internal:general'),null);
 assert.equal(drillRequestFor(execution,{...widget,series:[{id:'net',metric:'net_invoiced_revenue',analysis:{percentageContribution:true}}]},entry,'net','key'),null);
});
test('drill actions and detail fields render EN/AR without normal identity labels',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom'});
 try {
  const {WidgetCard}=await server.ssrLoadModule('/src/Renderer.tsx'),{DetailTable}=await server.ssrLoadModule('/src/DrillDetails.tsx');
  const page:DrillPage={release:'release-a',grain:'customer_snapshot',rows:[{date:'2026-09-30',customer:'Governed Customer',salesperson:null,businessLine:null,documentType:null,status:null,measure:'net_aged_receivable',amount:'-25.000000',currency:'IQD'}],hasMore:false,bases:{net_aged_receivable:'-25.000000'},value:'-25.000000',snapshotAsOf:'2026-09-30'};
  for(const locale of ['en','ar'] as const){
   const html=renderToStaticMarkup(createElement(WidgetCard,{widget,entry,locale,catalog:semanticCatalog,profile:tenantProfiles['demo-iq'],onDrill:()=>{},canDrill:()=>true}));assert.ok(html.includes(locale==='ar'?'عرض التفاصيل':'View details'));assert.ok(!html.includes('internal:general'));
   const detail=renderToStaticMarkup(createElement(DetailTable,{page,locale,profile:tenantProfiles['demo-iq']}));assert.ok(detail.includes(locale==='ar'?'العميل':'Customer'));assert.ok(detail.includes('Governed Customer'));assert.ok(!detail.includes('release-a'));
   assert.ok(renderToStaticMarkup(createElement(DetailTable,{page:{...page,rows:[]},locale,profile:tenantProfiles['demo-iq']})).includes(locale==='ar'?'لا توجد سجلات':'No matching records'));
  }
 }finally{await server.close();}
});
test('shared catalog information, reserved KPI actions and chart mark admission keep business data primary',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom'});
 try {
  const {GlobalMetricCatalog}=await server.ssrLoadModule('/src/metrics/GlobalMetricCatalog.tsx');
  const {WidgetCard}=await server.ssrLoadModule('/src/Renderer.tsx');
  const {DrillBarMark,DrillPointMark}=await server.ssrLoadModule('/src/rendering/DrillMarks.tsx');
  const {chartTheme}=await server.ssrLoadModule('/src/rendering/chart-theme.ts');
  for(const locale of ['en','ar'] as const){
   const html=renderToStaticMarkup(createElement(GlobalMetricCatalog,{registry:[{id:'net_invoiced_revenue',availability:'available',domain:'sales',labels:{en:'Stale label',ar:'قديم'}}],catalog:semanticCatalog,locale}));
   assert.ok(html.includes(semanticCatalog.net_invoiced_revenue.labels[locale]));assert.ok(!html.includes('net_invoiced_revenue'));
   assert.ok(html.includes('class="metric-info-button"'));assert.ok(html.includes('aria-haspopup="dialog"'));assert.ok(!html.includes('Stale label'));
   const kpi=renderToStaticMarkup(createElement(WidgetCard,{widget:{...widget,type:'kpi',dimension:undefined},entry,locale,catalog:semanticCatalog,profile:tenantProfiles['demo-iq'],onDrill:()=>{},canDrill:()=>true}));
   assert.ok(kpi.includes('class="kpi-reading"'));assert.ok(kpi.includes('<footer class="kpi-actions">'));assert.ok(kpi.indexOf('kpi-actions')>kpi.indexOf('kpi-content'));
   const props={widget,entry,catalog:semanticCatalog,locale,profile:tenantProfiles['demo-iq'],labels:[semanticCatalog.net_invoiced_revenue.labels[locale]],theme:chartTheme('light'),formatSeries:()=> '10 IQD',keyLabel:()=> 'General',onDrill:()=>{},canDrill:()=>true};
   for(const Component of [DrillBarMark,DrillPointMark]){
    const mark=renderToStaticMarkup(createElement(Component,{props,seriesId:'net',color:'#008080',mark:{x:0,y:0,width:100,height:20,cx:10,cy:10,payload:{_row:0}}}));
    assert.ok(mark.includes('role="button" tabindex="0"'));assert.ok(mark.includes('General'));assert.ok(!mark.includes('internal:general'));
    const denied=renderToStaticMarkup(createElement(Component,{props:{...props,canDrill:()=>false},seriesId:'net',color:'#008080',mark:{index:0,cx:10,cy:10}}));assert.ok(!denied.includes('role="button"'));
   }
  }
 }finally{await server.close();}
});
