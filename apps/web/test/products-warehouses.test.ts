import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {semanticCatalog,syntheticCapabilities,tenantProfiles} from '@el-dabboos/domain';
import {DefaultAuthorizationPolicy,DemoIdentityProvider,ProductsWarehousesReport} from '@el-dabboos/application';

test('independent report exposes native navigation and bilingual honest stock/coverage states',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom'});
 try{
  const {ProductsWarehousesSections,ProductsWarehousesPage}=await server.ssrLoadModule('/src/reports/ProductsWarehousesPage.tsx');
  const {ManagementNavigation,managementTitle}=await server.ssrLoadModule('/src/reports/ManagementReports.tsx');
  const {isManagementRoute}=await server.ssrLoadModule('/src/workspace-route.ts');
  const service=new ProductsWarehousesReport({repository:{async execute(query){const metric=semanticCatalog[query.metric];return {metric:query.metric,groupBy:query.groupBy??null,rows:[],metadata:{sourceId:'synthetic',executedAt:'2026-04-03T12:00:00Z',metricType:metric.type,semantics:metric.semantics.kind,...(metric.semantics.kind==='snapshot'?{snapshotAsOf:'2026-03-31'}:{})}};}},policy:new DefaultAuthorizationPolicy(),published:async context=>syntheticCapabilities(context),clock:()=>new Date('2026-04-03T12:00:00Z')});
  for(const locale of ['en','ar'] as const){
   const actor=new DemoIdentityProvider().resolve('demo-iq-admin','demo-iq',locale),profile=tenantProfiles['demo-iq']!,session={userId:actor.principal.userId,tenantId:profile.id,locale};
   const props={session,profile,catalog:{},options:{}};
   const output=await service.execute({},actor,profile);
   const html=renderToStaticMarkup(createElement(ProductsWarehousesSections,{...props,result:output}));
   assert.ok(html.indexOf('id="products-inventory"')<html.indexOf('id="products-sales"'));
   for(const phrase of locale==='en'?['Unknown','On-hand is not free stock','Stock is older']:['غير معروف','المخزون الفعلي ليس المتاح للبيع','لقطة المخزون أقدم'])assert.ok(html.includes(phrase),phrase);
   const page=renderToStaticMarkup(createElement(ProductsWarehousesPage,props));
   assert.ok(page.includes(locale==='en'?'coverage — awaiting publication':'تغطية منتجات العملاء — بانتظار النشر'));
   assert.ok(!page.includes('Save dashboard'));assert.ok(!page.includes('value="unsold"'));
   const navigation=renderToStaticMarkup(createElement(ManagementNavigation,{templates:[],locale,published:syntheticCapabilities({tenantId:profile.id,locale}),activeId:'products-warehouses',onSelect:()=>{}}));
   assert.match(navigation,/href="\/reports\/products-warehouses"/);assert.match(navigation,/aria-current="page"/);
   assert.equal(managementTitle('products-warehouses',locale,'fallback'),locale==='en'?'Products & Warehouses':'المنتجات والمخازن');
  }
  assert.equal(isManagementRoute({kind:'report',id:'products-warehouses'},false),true);
 }finally{await server.close();}
});
