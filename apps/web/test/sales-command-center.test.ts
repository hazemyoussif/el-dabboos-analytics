import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {semanticCatalog,syntheticCapabilities,tenantProfiles} from '@el-dabboos/domain';
import {SalesCommandCenter,DemoIdentityProvider,DefaultAuthorizationPolicy} from '@el-dabboos/application';
test('bilingual report renders section order, independent periods, unknown freshness, comparison coverage and operational measures',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom'});
 try{
  const {SalesCommandSections}=await server.ssrLoadModule('/src/reports/SalesCommandCenterPage.tsx');
  const service=new SalesCommandCenter({repository:{async execute(query){const metric=semanticCatalog[query.metric];return {metric:query.metric,groupBy:query.groupBy??null,rows:[],metadata:{sourceId:'synthetic',executedAt:'2026-04-03T12:00:00Z',metricType:metric.type,semantics:metric.semantics.kind,...(metric.semantics.kind==='snapshot'?{snapshotAsOf:'2026-03-31'}:{})}};}},policy:new DefaultAuthorizationPolicy(),published:async context=>syntheticCapabilities(context),clock:()=>new Date('2026-04-03T12:00:00Z')});
  for(const locale of ['en','ar'] as const){
   const actor=new DemoIdentityProvider().resolve('demo-iq-admin','demo-iq',locale),profile=tenantProfiles['demo-iq']!;
   const result=await service.execute({dateRange:{from:'2026-03-02',to:'2026-03-20'},filters:[{dimension:'salesperson',values:['synthetic-rep']}]},actor,profile);
   const html=renderToStaticMarkup(createElement(SalesCommandSections,{result,catalog:semanticCatalog,locale,session:{userId:actor.principal.userId,tenantId:profile.id,locale},profile,options:{}}));
   const sections=['today','month','follow-up','trends','customers'].map(id=>html.indexOf(`id="sales-section-${id}"`));
   assert.deepEqual([...sections].sort((left,right)=>left-right),sections);assert.ok(sections.every(index=>index>=0));
   for(const phrase of locale==='en'?['Unknown','Comparison unavailable','Same-day cash','Requested period','Balance cutoff precedes the requested day']:['غير معروف','المقارنة غير متاحة','اليوم نفسه','الفترة المطلوبة','تاريخ قطع الرصيد أقدم'])assert.ok(html.includes(phrase),phrase);
   assert.ok(!html.includes('next sync'));assert.ok(!html.includes('type="submit"'));assert.ok(!html.includes('Save dashboard'));
  }
 }finally{await server.close();}
});
