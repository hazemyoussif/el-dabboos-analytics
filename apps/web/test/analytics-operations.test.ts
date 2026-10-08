import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { tenantProfiles } from '@el-dabboos/domain';
import type { AnalyticsOperationalStatus } from '@el-dabboos/domain';
import { freshnessState,reconciliationWarning,lastSyncAttemptAt } from '../src/reports/operations-state.ts';
const status:AnalyticsOperationalStatus={tenantId:'demo-iq',freshnessTargetSeconds:600,freshnessAgeSeconds:600,trustedServingRevision:'trusted',cursor:null,latest:[],lastSuccessfulSync:null,trustedCertificationRelease:'approved',historicalCoverage:null,financeSnapshots:['2026-09-30']};
test('freshness target is inclusive and independent of certification or snapshot date',()=>{
 assert.equal(freshnessState(status),'fresh');assert.equal(freshnessState({...status,freshnessAgeSeconds:601}),'stale');assert.equal(freshnessState({...status,freshnessAgeSeconds:null}),'unknown');
 assert.equal(reconciliationWarning(status),false);assert.equal(reconciliationWarning({...status,pendingCandidateRun:'rejected'}),true);
});
test('operational surfaces localize independent states, permissions, failures and Finance as-of in RTL',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom'});
 try {
  const {OperationalStatusPage,ReportOperationalSurface}=await server.ssrLoadModule('/src/reports/AnalyticsOperations.tsx');
  for(const locale of ['en','ar'] as const) {
   const operations={status:{...status,freshnessAgeSeconds:601,commandsAvailable:true},error:false,loading:false,busy:null,result:null,failed:false,reload(){},act(){},eligible:true,canOperate:true};
   const props={operations,locale,profile:tenantProfiles['demo-iq']};
   const html=renderToStaticMarkup(createElement(OperationalStatusPage,props));
   assert.ok(html.includes(`dir="${locale==='ar'?'rtl':'ltr'}"`));assert.ok(html.includes(locale==='ar'?'البيانات بحاجة إلى تحديث':'Stale'));assert.ok(html.includes(locale==='ar'?'إصدار تعريف المؤشر':'Metric definition version'));assert.ok(html.includes(locale==='ar'?'مزامنة الآن':'Sync Now'));
   const denied=renderToStaticMarkup(createElement(OperationalStatusPage,{...props,operations:{...operations,canOperate:false}}));assert.ok(!denied.includes(locale==='ar'?'مزامنة الآن':'Sync Now'));assert.ok(denied.includes(locale==='ar'?'تحديث العرض':'Refresh View'));
   const failure=renderToStaticMarkup(createElement(OperationalStatusPage,{...props,operations:{...operations,status:{...operations.status,pendingCandidateRun:'failed'}}}));assert.ok(failure.includes(locale==='ar'?'يتم عرض آخر بيانات موثوقة':'previous trusted data'));
   const asOf=renderToStaticMarkup(createElement(ReportOperationalSurface,{...props,kind:'actions',dashboard:{},metadata:{snapshotAsOf:'2026-09-30'}}));assert.ok(asOf.includes(locale==='ar'?'الرصيد بتاريخ':'As of'));assert.ok(!asOf.includes('Oct 8'));
  }
 }finally{await server.close();}
});
test('Refresh View re-executes current trusted report and preserves report on failure or stale completion',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},appType:'custom'});
 try {
  const {refreshTrustedView}=await server.ssrLoadModule('/src/reports/refresh-trusted-view.ts');
  let current='previous-trusted',calls=0;
  const workspace={profile:{id:'demo-iq'},dashboard:{id:'report'},session:()=>({tenantId:'demo-iq'}),beginRequest:()=>1,isCurrent:()=>true,setExecution:(value:string)=>{current=value;}};
  const execute=async(session:unknown,dashboard:unknown,overrides:unknown)=>{calls++;assert.deepEqual(session,{tenantId:'demo-iq'});assert.deepEqual(dashboard,{id:'report'});assert.deepEqual(overrides,{dateRange:{from:'2026-09-01',to:'2026-09-30'}});return 'new-trusted';};
  const overrides={dateRange:{from:'2026-09-01',to:'2026-09-30'}};
  await refreshTrustedView(workspace,overrides,()=>false,execute);assert.equal(current,'previous-trusted');
  await assert.rejects(refreshTrustedView(workspace,overrides,()=>true,async()=>{throw new Error('Synthetic failure');}));assert.equal(current,'previous-trusted');
  await refreshTrustedView(workspace,overrides,()=>true,execute);assert.equal(current,'new-trusted');assert.equal(calls,2);
 }finally{await server.close();}
});

test('latest technical sync failure is reflected in last attempted sync without rewriting successful freshness',()=>{
 const failed={...status,latestFailure:{runId:'failed',kind:'sync',failedAt:'2026-10-08T10:00:00Z'}};
 assert.equal(lastSyncAttemptAt(failed),'2026-10-08T10:00:00Z');
 assert.equal(freshnessState(failed),'fresh');
});

test('unavailable source keeps Refresh View enabled and displays governed EN/AR connectivity evidence',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true},appType:'custom'});
 try {
  const {OperationalStatusPage}=await server.ssrLoadModule('/src/reports/AnalyticsOperations.tsx');
  for(const locale of ['en','ar'] as const){
   const operations={eligible:true,canOperate:true,canRefresh:true,busy:null,act:()=>{},reload:()=>{},status:{...status,commandsConfigured:true,commandsAvailable:false,sourceAvailability:{relayAvailable:true,sourceAvailable:false,checkedAt:'2026-10-08T08:00:00Z',lastSuccessfulConnection:'2026-10-08T07:00:00Z'}}};
   const html=renderToStaticMarkup(createElement(OperationalStatusPage,{locale,operations,profile:tenantProfiles['demo-iq']}));
   assert.ok(html.includes(locale==='ar'?'المصدر غير متاح مؤقتًا':'Source temporarily unavailable'));assert.ok(html.includes(locale==='ar'?'آخر اتصال ناجح':'Last successful connection'));assert.ok(!html.includes('postgres://'));
   assert.ok(html.includes(`<button>${locale==='ar'?'تحديث العرض':'Refresh View'}</button>`));assert.ok(html.includes(`<button disabled="">${locale==='ar'?'مزامنة الآن':'Sync Now'}</button>`));
  }
 }finally{await server.close();}
});
