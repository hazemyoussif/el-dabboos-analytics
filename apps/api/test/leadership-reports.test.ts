import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import type {AnalyticsFact} from '@el-dabboos/data';
import type {PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {MockAnalyticsRepository,SqliteDashboardRepository,createDashboardPersistenceSchema} from '@el-dabboos/data';
import {requiredMeasures,semanticCatalog} from '@el-dabboos/domain';
import {leadershipTemplates} from '../../../packages/application/src/leadership-templates.ts';
import {buildApi} from '../src/app.ts';
const period={from:'2026-09-01',to:'2026-09-30'};
const base={sourceId:'synthetic-only',mappingId:'fixture',mappingVersion:'1',certificationReference:'SYNTHETIC ONLY'};
const metrics=[...new Set(leadershipTemplates.flatMap(template=>template.widgets.flatMap(widget=>widget.series.map(series=>series.metric))))];
function capabilities(tenantId:string):PublishedAnalyticsCapabilities {
 return {tenantId,mode:'certified',releases:[{...base,datasetId:'business',financeReview:'pending',period,capabilities:metrics.map(metric=>({metric,summary:true,dimensions:semanticCatalog[metric].dimensions,analyses:['topN']}))}]};
}
function facts(tenantId:string):AnalyticsFact[] {
 const measures=[...new Set(metrics.flatMap(requiredMeasures))];
 return measures.flatMap(measureId=>{
  const snapshot=Object.values(semanticCatalog).some(metric=>metric.semantics.kind==='snapshot'&&metric.semantics.measure===measureId);
  return (snapshot?['2026-08-31','2026-09-30']:['2026-09-15']).map(date=>({tenantId,measureId,date,value:date.endsWith('08-31')?999:30,...(snapshot?{entityId:`customer:${measureId}`} :{}),dimensions:{customer:'fixture-customer',customer_segment:'fixture-segment',brand:'fixture-brand'}}));
 });
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
   assert.equal(reset.statusCode,200,reset.body);assert.equal(reset.json().widgetResults.period_cash_collections.seriesResults.period_cash_collections.result.rows[0].value,30);
   assert.equal(output.execution.widgetResults.review_customer_balance.seriesResults.review_customer_balance.result.rows[0].value,30,'latest snapshot, not August plus September');
   assert.equal(output.execution.widgetResults.period_cash_collections.seriesResults.period_cash_collections.result.rows[0].value,30,'tenant-isolated cash');
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
