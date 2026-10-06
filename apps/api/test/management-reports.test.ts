import assert from 'node:assert/strict';
import test from 'node:test';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import { buildApi } from '../src/app.ts';
const headers={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq','x-locale':'en'};
const period={from:'2026-09-01',to:'2026-09-30'};
const measures=['order_revenue','order_count','net_invoiced_revenue','invoiced_revenue','refund_value','invoice_count','refund_count'] as const;
test('published management default executes exact metrics while customer and Finance controls stay isolated',async()=>{
 const repository=new MockAnalyticsRepository(measures.map((measureId,index)=>({tenantId:'demo-iq',measureId,date:'2026-09-15',value:index+1,dimensions:{business_line:'official',salesperson:'rep'}})));
 const metrics=[...measures,'average_confirmed_order_value','average_invoice_value'] as const;
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,publishedCapabilities:{async getPublishedCapabilities(context){return {tenantId:context.tenantId,mode:'certified',releases:[{datasetId:'approved',sourceId:'any',mappingId:'m',mappingVersion:'1',certificationReference:'signed',period,capabilities:metrics.map(metric=>({metric,summary:true,dimensions:['business_line','salesperson'],analyses:[]}))}]};}}});
 try {
  const templates=(await app.inject({url:'/api/dashboard-templates',headers})).json();assert.equal(templates.defaultTemplateId,'executive-sales-invoicing');
  for(const id of ['executive-sales-invoicing','business-line-performance','salesperson-performance','invoice-refund-operations']) {
   const result=await app.inject({url:`/api/dashboard-templates/${id}/instantiate`,headers});assert.equal(result.statusCode,200);assert.equal(result.json().execution.metadata.failedSeries,0);
   assert.deepEqual(result.json().dashboard.filters.dateRange,period);
  }
  assert.equal((await app.inject({url:'/api/dashboard-templates/customer-performance/instantiate',headers})).statusCode,409);
  assert.equal((await app.inject({url:'/api/management-control-review',headers})).json().review,null);
  assert.equal((await app.inject({url:'/api/management-control-review'})).statusCode,401);
  assert.equal((await app.inject({url:'/api/management-control-review',headers:{...headers,'x-tenant-id':'unrelated'}})).statusCode,403);
 } finally {await app.close();}
});
