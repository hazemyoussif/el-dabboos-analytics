import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import type {AnalyticsFact} from '@el-dabboos/data';
import type {MetricId,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {MockAnalyticsRepository,SqliteDashboardRepository,createDashboardPersistenceSchema} from '@el-dabboos/data';
import {buildApi} from '../src/app.ts';
const finance=['net_aged_receivable','total_overdue_receivable','credit_balances','aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120'] as const;
const cash=['customer_cash_collected','cash_applied_to_invoices','unallocated_customer_receipts','collection_amount_days','collection_applied_amount','receivables_due_for_collection'] as const;
const reviewMetrics:MetricId[]=['customer_cash_collected','weighted_collection_days','receivables_due_for_collection','unallocated_customer_receipts'];
const period={from:'2026-09-01',to:'2026-09-30'};
const base={sourceId:'synthetic-only',mappingId:'fixture',mappingVersion:'1',certificationReference:'SYNTHETIC ONLY'};
function capabilities(tenantId:string):PublishedAnalyticsCapabilities {
 return {tenantId,mode:'certified',releases:[
  {...base,datasetId:'finance',selectionSemantics:'latest_snapshot',period:{from:'2024-06-30',to:'2026-09-30'},capabilities:finance.map(metric=>({metric,summary:true,dimensions:['customer','month'],analyses:[]}))},
  {...base,datasetId:'sales',selectionSemantics:'event_intersection',period:{from:'2024-06-01',to:'2026-10-14'},capabilities:(['net_invoiced_revenue','refund_value'] as const).map(metric=>({metric,summary:true,dimensions:['business_line','customer','month'],analyses:[]}))},
  {...base,datasetId:'review',financeReview:'pending',period,capabilities:reviewMetrics.map(metric=>({metric,summary:true,dimensions:['customer','month'],analyses:['topN']}))},
 ]};
}
function facts(tenantId:string):AnalyticsFact[] {
 return [
  ...finance.flatMap(measureId=>['2026-08-31','2026-09-30'].map(date=>({tenantId,measureId,date,value:date.endsWith('08-31')?999:30,entityId:`customer:${measureId}`,dimensions:{customer:'fixture-customer'}}))),
  ...cash.map(measureId=>({tenantId,measureId,date:measureId==='receivables_due_for_collection'?'2026-09-30':'2026-09-15',value:measureId==='collection_amount_days'?300:30,...(measureId==='receivables_due_for_collection'?{entityId:'due-customer'}:{}),dimensions:{customer:'fixture-customer'}})),
  ...(['net_invoiced_revenue','refund_value'] as const).map(measureId=>({tenantId,measureId,date:'2026-09-15',value:30,dimensions:{customer:'fixture-customer',business_line:'fixture-line'}})),
 ];
}
test('leadership HTTP reports open the published month after calendar rollover, preserve snapshots and remain unsaved in EN/AR',async()=>{
 const db=new DatabaseSync(':memory:');createDashboardPersistenceSchema(db);
 const repository=new MockAnalyticsRepository([...facts('demo-iq'),...facts('demo-eg')]);
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,dashboardRepository:new SqliteDashboardRepository(db),clock:()=>new Date('2027-03-15T12:00:00Z'),publishedCapabilities:{async getPublishedCapabilities(context){return capabilities(context.tenantId);}}});
 try{
  for(const locale of ['en','ar'])for(const id of ['customer-debt-aging','executive-monthly-overview']){
   const headers={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq','x-locale':locale};
   const response=await app.inject({url:`/api/dashboard-templates/${id}/instantiate`,headers});
   assert.equal(response.statusCode,200,response.body);
   const output=response.json();assert.deepEqual(output.dashboard.filters,{dateRange:period});
   assert.equal(output.dashboard.locale,locale);assert.equal(output.execution.metadata.failedSeries,0);
   const filtered=await app.inject({method:'POST',url:'/api/dashboards/execute',headers,payload:{dashboard:output.dashboard,overrides:{dimensions:[{dimension:'customer',values:['absent-synthetic-customer']}]}}});
   assert.equal(filtered.statusCode,200,filtered.body);assert.equal(filtered.json().metadata.failedSeries,0);
   const reset=await app.inject({method:'POST',url:'/api/dashboards/execute',headers,payload:{dashboard:output.dashboard}});
   assert.equal(reset.statusCode,200,reset.body);assert.equal(reset.json().widgetResults.customer_cash_collected.seriesResults.customer_cash_collected.result.rows[0].value,30);
   assert.equal(output.execution.widgetResults.net_aged_receivable.seriesResults.net_aged_receivable.result.rows[0].value,30,'latest snapshot, not August plus September');
   assert.equal(output.execution.widgetResults.customer_cash_collected.seriesResults.customer_cash_collected.result.rows[0].value,30,'tenant-isolated cash');
  }
  const saved=await app.inject({url:'/api/saved-dashboards',headers:{'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq'}});
  assert.equal(saved.statusCode,200);assert.ok(!saved.body.includes('customer-debt-aging'));assert.ok(!saved.body.includes('executive-monthly-overview'));
 }finally{await app.close();db.close();}
});
test('leadership HTTP reports reject missing customer scope and disjoint monthly coverage',async()=>{
 const repository=new MockAnalyticsRepository(facts('demo-iq'));
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,publishedCapabilities:{async getPublishedCapabilities(context){const published=capabilities(context.tenantId);return {...published,releases:published.releases.map(release=>({...release,period:{from:'2026-10-01',to:'2026-10-14'},capabilities:release.capabilities.map(capability=>({...capability,dimensions:[]}))}))};}}});
 try{for(const id of ['customer-debt-aging','executive-monthly-overview'])assert.equal((await app.inject({url:`/api/dashboard-templates/${id}/instantiate`,headers:{'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq'}})).statusCode,409);}finally{await app.close();}
});
