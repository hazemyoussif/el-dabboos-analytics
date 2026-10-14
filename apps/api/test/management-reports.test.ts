import assert from 'node:assert/strict';
import test from 'node:test';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import { buildApi } from '../src/app.ts';
const headers={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq','x-locale':'en'};
const period={from:'2026-01-01',to:'2026-09-30'};
const measures=['order_revenue','order_count','net_invoiced_revenue','invoiced_revenue','refund_value','invoice_count','refund_count'] as const;
test('published management default executes exact metrics while customer and Finance controls stay isolated',async()=>{
 const repository=new MockAnalyticsRepository(measures.map((measureId,index)=>({tenantId:'demo-iq',measureId,date:'2026-09-15',value:index+1,dimensions:{business_line:'official',salesperson:'rep'}})));
 const metrics=[...measures,'average_confirmed_order_value','average_invoice_value'] as const;
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,clock:()=>new Date('2026-09-30T12:00:00Z'),publishedCapabilities:{async getPublishedCapabilities(context){return {tenantId:context.tenantId,mode:'certified',releases:[{datasetId:'approved',sourceId:'any',mappingId:'m',mappingVersion:'1',certificationReference:'signed',period,capabilities:metrics.map(metric=>({metric,summary:true,dimensions:['business_line','salesperson'],analyses:[]}))}]};}}});
 try {
  const templates=(await app.inject({url:'/api/dashboard-templates',headers})).json();assert.equal(templates.defaultTemplateId,'executive-sales-invoicing');
  for(const id of ['executive-sales-invoicing','business-line-performance','salesperson-performance','invoice-refund-operations']) {
   const result=await app.inject({url:`/api/dashboard-templates/${id}/instantiate`,headers});assert.equal(result.statusCode,200);assert.equal(result.json().execution.metadata.failedSeries,0);
   assert.deepEqual(result.json().dashboard.filters,{datePreset:'current_year'});
  }
  assert.equal((await app.inject({url:'/api/dashboard-templates/customer-performance/instantiate',headers})).statusCode,409);
  assert.equal((await app.inject({url:'/api/management-control-review',headers})).json().review,null);
  assert.equal((await app.inject({url:'/api/management-control-review'})).statusCode,401);
  assert.equal((await app.inject({url:'/api/management-control-review',headers:{...headers,'x-tenant-id':'unrelated'}})).statusCode,403);
 } finally {await app.close();}
});

test('the twelve local dashboard templates are available and open through HTTP with staging per-metric releases in EN/AR',async()=>{
 const {dashboardTemplates}=await import('@el-dabboos/application');
 const {requiredMeasures,semanticCatalog}=await import('@el-dabboos/domain');
 const templates=dashboardTemplates.filter(template=>template.periodStrategy==='certified'&&!template.tags.includes('source-business'));
 assert.equal(templates.length,12);
 const metrics=[...new Set(templates.flatMap(template=>template.widgets.flatMap(widget=>widget.series.map(series=>series.metric))))];
 const measures=[...new Set(metrics.flatMap(metric=>requiredMeasures(metric)))];
 const range={from:'2026-01-01',to:'2026-10-12'};
 const repository=new MockAnalyticsRepository(['2026-08-31','2026-09-30'].flatMap(date=>measures.map(measureId=>({tenantId:'demo-iq',measureId,date,value:10,entityId:'customer:1',dimensions:{customer:'customer:1',business_line:'line:1',salesperson:'rep:1'}}))));
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,clock:()=>new Date('2026-10-12T12:00:00Z'),publishedCapabilities:{async getPublishedCapabilities(context){return {tenantId:context.tenantId,mode:'certified',releases:metrics.map(metric=>({datasetId:`trusted-${metric}`,sourceId:'synthetic-only',mappingId:'shared-definition',mappingVersion:'1',certificationReference:'synthetic-only',period:range,capabilities:[{metric,summary:true,dimensions:semanticCatalog[metric].dimensions.filter(dimension=>['month','customer','business_line','salesperson'].includes(dimension)),analyses:[]}]}))};}}});
 try {
  for(const locale of ['en','ar']){
   const requestHeaders={...headers,'x-locale':locale};
   const response=await app.inject({url:'/api/dashboard-templates',headers:requestHeaders});
   assert.equal(response.statusCode,200);
   const available=response.json().templates.filter((template:{availability:string})=>template.availability==='available');
   assert.deepEqual(available.map((template:{id:string})=>template.id).sort(),templates.map(template=>template.id).sort());
   for(const template of templates){
    const opened=await app.inject({url:`/api/dashboard-templates/${template.id}/instantiate`,headers:requestHeaders});
    assert.equal(opened.statusCode,200,`${template.id}/${locale}: ${opened.body}`);
    assert.deepEqual(opened.json().dashboard.filters,{datePreset:'current_year'},template.id);
    assert.deepEqual(opened.json().execution.metadata.effectiveFilters.dateRange,range,template.id);
    assert.equal(opened.json().execution.metadata.failedSeries,0,template.id);
   }
  }
 }finally{await app.close();}
});
