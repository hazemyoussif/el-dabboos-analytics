import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticCatalog,businessMetricIds,requiredMeasures} from '@el-dabboos/domain';
import {MockAnalyticsRepository} from '@el-dabboos/data';
import type {PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {buildApi} from '../src/app.ts';
const headers={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq'};
function published():PublishedAnalyticsCapabilities{return {tenantId:'demo-iq',mode:'certified',releases:[{datasetId:'SYNTHETIC HISTORY ONLY',sourceId:'fixture',mappingId:'fixture',mappingVersion:'1',certificationReference:'SYNTHETIC ONLY',financeReview:'pending',period:{from:'2025-01-01',to:'2026-09-30'},capabilities:businessMetricIds.map(metric=>({metric,summary:true,dimensions:semanticCatalog[metric].dimensions,analyses:['topN','pareto']}))}]};}
test('ABC class C filter changes the actual executed customer cohort and historical template binds stored coverage after rollover',async()=>{
 const measures=[...new Set(businessMetricIds.flatMap(requiredMeasures))];
 const facts=measures.flatMap(measureId=>['A','C'].map((classification,index)=>({tenantId:'demo-iq',measureId,date:'2026-09-30',value:measureId.endsWith('_date')?20701:measureId==='observed_customer_count'?1:(index+1)*100,entityId:classification,dimensions:{customer:classification,customer_class:classification,customer_segment:'fixture-segment',state:'fixture-state',salesperson:'fixture-rep',brand:'fixture-brand',product:'fixture-product',product_category:'fixture-category',uom:'fixture-piece',warehouse:'fixture-warehouse',supplier:'fixture-supplier',journal:'fixture-cash'}})));
 const repository=new MockAnalyticsRepository(facts),app=await buildApi({analyticsRepository:repository,dimensionValues:repository,clock:()=>new Date('2027-02-01T00:00:00Z'),publishedCapabilities:{async getPublishedCapabilities(){return published();}}});
 try{
  const opened=await app.inject({url:'/api/dashboard-templates/customer-abc-detail/instantiate',headers});assert.equal(opened.statusCode,200,opened.body);
  const filtered=await app.inject({method:'POST',url:'/api/dashboards/execute',headers,payload:{dashboard:opened.json().dashboard,overrides:{dimensions:[{dimension:'customer_class',values:['C']}]}}});assert.equal(filtered.statusCode,200,filtered.body);
  const widgets=filtered.json().widgetResults;assert.equal(widgets.observed_customer_count.seriesResults.observed_customer_count.result.rows[0].value,1);assert.deepEqual(widgets['class-customers'].alignedRows.map((row:{key:string})=>row.key),['C']);
  const history=await app.inject({url:'/api/dashboard-templates/source-sales-collections-history/instantiate',headers});assert.equal(history.statusCode,200,history.body);assert.deepEqual(history.json().dashboard.filters.dateRange,{from:'2025-01-01',to:'2026-09-30'});
 }finally{await app.close();}
});
