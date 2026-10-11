import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { tenantProfiles } from '@el-dabboos/domain';
import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { managementControlReview } from '@el-dabboos/application';
import { formatDimensionLabel,formatKey } from '../src/i18n.ts';
const published:PublishedAnalyticsCapabilities={tenantId:'demo-iq',mode:'certified',releases:[{datasetId:'approved',sourceId:'any',mappingId:'m',mappingVersion:'1',certificationReference:'signed',period:{from:'2026-09-01',to:'2026-09-30'},capabilities:[{metric:'order_count',summary:true,dimensions:['business_line'],analyses:[]}]}]};
test('management status surfaces localize pending Finance and published capabilities without executing controls',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom'});
 try {
  const {ManagementInfo,dashboardReportStatus,workspaceDataMode}=await server.ssrLoadModule('/src/reports/ManagementReports.tsx');
  assert.equal(workspaceDataMode({...published,releases:[]}), 'unavailable');
  for(const locale of ['en','ar'] as const) {
   const props={locale,profile:tenantProfiles['demo-iq'],published,metadata:null,review:managementControlReview('el-dabboos-iq'),reviewLoading:false,reviewError:false,onRetry(){}};
   const finance=renderToStaticMarkup(createElement(ManagementInfo,{...props,page:'finance-control'}));
   assert.ok(finance.includes(locale==='en'?'Awaiting publication':'بانتظار النشر'));
   const agingPublished={...published,releases:[{...published.releases[0],capabilities:[{metric:'net_aged_receivable',summary:true,dimensions:['customer'],analyses:[]}]}]};
   const certifiedFinance=renderToStaticMarkup(createElement(ManagementInfo,{...props,published:agingPublished,page:'finance-control'}));
   assert.ok(certifiedFinance.includes(locale==='en'?'Certified':'معتمد'));
   assert.ok(!certifiedFinance.includes(locale==='en'?'Awaiting publication':'بانتظار النشر'));
   assert.ok(!finance.includes('1,359,461'));assert.ok(!finance.includes('report-status">Certified'));
   const unavailable=renderToStaticMarkup(createElement(ManagementInfo,{...props,page:'customer-unavailable'}));
   assert.ok(unavailable.includes(locale==='en'?'Not available for this dataset':'غير متاح لهذه البيانات'));
   const status=renderToStaticMarkup(createElement(ManagementInfo,{...props,page:'data-status'}));
   assert.ok(status.includes(locale==='en'?'Certified reporting period':'فترة التقارير المعتمدة'));assert.ok(status.includes('IQD'));
   const base={schemaVersion:2,id:'one',title:{en:'One',ar:'واحد'},locale,layout:{columns:1},filters:{dateRange:published.releases[0].period},widgets:[{id:'one',type:'kpi',series:[{id:'count',metric:'order_count'}]}]};
   assert.equal(dashboardReportStatus(published,base),'certified');
   assert.equal(dashboardReportStatus(published,{...base,widgets:[{id:'one',type:'kpi',series:[{id:'balance',metric:'outstanding_amount'}]}]}),'unavailable');
  }
 } finally {await server.close();}
});
test('official Business Line display and Unassigned semantics preserve stable identity',()=>{
 assert.equal(formatDimensionLabel('general','business_line','en'),'General');
 assert.equal(formatDimensionLabel('no sugar','business_line','ar'),'بدون سكر');
 assert.equal(formatKey('unassigned','salesperson','en',tenantProfiles['demo-iq']),'Unassigned');
 assert.equal(formatDimensionLabel('Unchanged source name','salesperson','ar'),'Unchanged source name');
});


test('management navigation disables incompatible templates instead of retaining the previous report',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom'});
 try {
  const {ManagementNavigation}=await server.ssrLoadModule('/src/reports/ManagementReports.tsx');
  const templates=[
   {id:'executive-sales-invoicing',name:{en:'Executive',ar:'تنفيذي'},description:{en:'',ar:''},domain:'executive',tags:['management'],datePreset:'previous_month',layout:{columns:1},widgets:[],availability:'available'},
   {id:'business-line-performance',name:{en:'Business Line',ar:'خط الأعمال'},description:{en:'',ar:''},domain:'sales',tags:['management'],datePreset:'previous_month',layout:{columns:1},widgets:[],availability:'incompatible'},
  ];
  const html=renderToStaticMarkup(createElement(ManagementNavigation,{templates,locale:'en',onSelect(){throw new Error('render only');},published,allowed:true}));
  assert.match(html,/Business Line/);
  assert.match(html,/disabled/);
 } finally {await server.close();}
});
