import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {semanticCatalog,tenantProfiles} from '@el-dabboos/domain';
import type {AnalyticsResult,DashboardWidget} from '@el-dabboos/domain';
import type {WidgetExecution} from '@el-dabboos/application';
test('nullable KPI, unavailable coverage and diagnostic failures render governed EN/AR copy',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom'});
 try {
  const {WidgetCard}=await server.ssrLoadModule('/src/Renderer.tsx');
  const widget:DashboardWidget={id:'nullable',type:'kpi',series:[{id:'value',metric:'average_invoice_value'}]};
  const result:AnalyticsResult={metric:'average_invoice_value',groupBy:null,rows:[{key:null,value:null}],metadata:{sourceId:'synthetic',executedAt:'2026-10-08T00:21:08.728Z',metricType:'currency',semantics:'ratio'}};
  const entry:WidgetExecution={status:'success',seriesResults:{value:{status:'success',result}},alignedRows:[{key:null,series:{value:{value:null}}}]};
  for(const locale of ['en','ar'] as const){
   const render=(selected:WidgetExecution)=>renderToStaticMarkup(createElement(WidgetCard,{widget,entry:selected,catalog:semanticCatalog,locale,profile:tenantProfiles['demo-iq']}));
   assert.ok(render(entry).includes('—'));
   const unavailable=structuredClone(entry);if(unavailable.seriesResults.value!.status==='success')unavailable.seriesResults.value!.result.metadata.availability={state:'DATA_NOT_READY',reason:'no_snapshot'};
   assert.ok(render(unavailable).includes(locale==='en'?'Trusted data is not available':'لا تتوفر بيانات موثوقة'));
   const partial=structuredClone(entry);if(partial.seriesResults.value!.status==='success')Object.assign(partial.seriesResults.value!.result.metadata,{availability:{state:'PARTIAL_COVERAGE',reason:'outside_coverage'},coverage:{status:'partial',from:'2025-10-01',through:'2026-10-08',cutoff:'2026-10-08T00:21:08.728Z'}});
   assert.ok(render(partial).includes(locale==='en'?'data available through':'البيانات متاحة حتى'));
   const failed:WidgetExecution={status:'error',alignedRows:[],seriesResults:{value:{status:'error',error:{code:'SERIES_EXECUTION_FAILED',message:'Unsafe SQL numeric output'}}}};
   assert.ok(!/Unsafe SQL|NaN|Infinity/.test(render(failed)));
   const limited=structuredClone(failed);if(limited.seriesResults.value!.status==='error')limited.seriesResults.value!.error={code:'RESULT_LIMIT_EXCEEDED',message:'internal bound'};assert.ok(render(limited).includes(locale==='en'?'Choose customers':'اختر عملاء'));
   const {MetricDefinitionBody}=await server.ssrLoadModule('/src/metrics/MetricDefinition.tsx');
   const proof={...result.metadata,reconciliation:{status:'exact' as const,reference:'synthetic-history',definitionReference:'standing-definition'}};
   const definition=renderToStaticMarkup(createElement(MetricDefinitionBody,{metric:semanticCatalog.net_aged_receivable,locale,metadata:proof}));assert.ok(definition.includes(locale==='en'?'Exactly reconciled snapshot':'رصيد مطابق بدقة'));assert.ok(definition.includes('standing-definition'));
  }
 }finally{await server.close();}
});
