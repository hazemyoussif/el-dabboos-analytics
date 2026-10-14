import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { semanticCatalog } from '@el-dabboos/domain';
import { metricDefinitionText, openDefinitionDialog } from '../src/metrics/definition-copy.ts';
test('definition dialog contains canonical EN/AR formula, lifecycle and accessible controls; shared info exposes tooltip and tap action', async () => {
 const server = await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom'});
 try {
  const {MetricInfo,MetricDefinitionDialog} = await server.ssrLoadModule('/src/metrics/MetricDefinition.tsx');
  for (const locale of ['en','ar'] as const) {
   const props = {metric:semanticCatalog.net_invoiced_revenue,locale,currency:'IQD',metadata:{release:{datasetId:'release',sourceId:'source',mappingId:'mapping',mappingVersion:'1',certificationReference:'certificate'}}};
   const dialog = renderToStaticMarkup(createElement(MetricDefinitionDialog,{...props,trigger:null,onClose:()=>{}}));
   assert.match(dialog,/<dialog/u);assert.match(dialog,/aria-modal="true"/u);assert.match(dialog,/aria-labelledby=/u);
   assert.ok(dialog.includes(props.metric.labels[locale]));assert.ok(dialog.includes(props.metric.help.formula[locale]));assert.ok(dialog.includes(locale==='ar'?'معتمد':'Certified'));assert.ok(dialog.includes('certificate'));
   assert.ok(dialog.includes(locale==='ar'?'نسخ التعريف':'Copy definition'));
   const info = renderToStaticMarkup(createElement(MetricInfo,props));
   assert.match(info,/aria-haspopup="dialog"/u);assert.match(info,/role="tooltip"/u);
   assert.ok(metricDefinitionText(props.metric,locale,'Certified').includes(props.metric.help.formula[locale]));
  }
 } finally {await server.close();}
});
test('opening uses native focus containment and cleanup closes/restores trigger focus', () => {
 const events:string[]=[];
 const dialog={showModal:()=>events.push('showModal'),querySelector:()=>({focus:()=>events.push('close-focus')}),close:()=>events.push('close')};
 const cleanup=openDefinitionDialog(dialog as unknown as HTMLDialogElement,{focus:()=>events.push('trigger-focus')} as HTMLElement);
 cleanup();assert.deepEqual(events,['showModal','close-focus','close','trigger-focus']);
});

test('exposed collection metrics show pending Finance review and days in EN/AR without claiming business certification',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom'});
 try{
  const {MetricDefinitionDialog}=await server.ssrLoadModule('/src/metrics/MetricDefinition.tsx');
  for(const locale of ['en','ar'] as const){
   const dialog=renderToStaticMarkup(createElement(MetricDefinitionDialog,{metric:semanticCatalog.weighted_collection_days,locale,metadata:{release:{datasetId:'review',sourceId:'source',mappingId:'wave',mappingVersion:'1',certificationReference:'technical-exact:review',financeReview:'pending'}},trigger:null,onClose:()=>{}}));
   assert.ok(dialog.includes(locale==='en'?'Finance review pending':'بانتظار مراجعة المالية'));
   assert.ok(!dialog.includes('report-status">Certified'));
   assert.ok(dialog.includes(semanticCatalog.weighted_collection_days.help.formula[locale]));
  }
 }finally{await server.close();}
});
