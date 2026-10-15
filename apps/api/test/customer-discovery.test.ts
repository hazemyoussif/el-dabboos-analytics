import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApi} from '../src/app.ts';
import {MockAnalyticsRepository} from '@el-dabboos/data';
import {AnalyticsQueryTimeoutError,tenantProfiles} from '@el-dabboos/domain';
import type {AnalyticsContext,DimensionDiscoveryRequest} from '@el-dabboos/domain';
test('customer discovery validates bounded input and resolves an authorized session before invoking the port',async()=>{
 const repository=new MockAnalyticsRepository([]),calls:Array<{context:AnalyticsContext;request:DimensionDiscoveryRequest}>=[];
 const app=await buildApi({analyticsRepository:repository,dimensionValues:{listDimensionValues:async()=>[],searchDimensionOptions:async(_dimension,context,request)=>{calls.push({context,request});return {values:[{id:'internal-identity',label:'Governed customer'}],selected:[{id:'selected-identity',label:'Selected customer'}],nextCursor:'opaque'};}}});
 try {
  const headers={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq','x-locale':'ar'};
  assert.equal((await app.inject({method:'POST',url:'/api/dimensions/customer/search',payload:{limit:101},headers})).statusCode,400);
  assert.equal((await app.inject({method:'POST',url:'/api/dimensions/customer/search',payload:{limit:50}})).statusCode,401);assert.equal(calls.length,0);
  const response=await app.inject({method:'POST',url:'/api/dimensions/customer/search',headers,payload:{search:'Al',limit:50,selectedIds:['selected-identity']}});
  assert.equal(response.statusCode,200);assert.equal(response.json().selected[0].label,'Selected customer');assert.equal(response.json().nextCursor,'opaque');assert.equal(calls[0]!.context.tenantId,'demo-iq');assert.equal(calls[0]!.context.locale,'ar');
 }finally{await app.close();}
});

test('governed dimension search shares identity-label mapping, localization and safe fallback across dimensions',async()=>{
 const repository=new MockAnalyticsRepository([]),calls:string[]=[];
 const app=await buildApi({analyticsRepository:repository,dimensionValues:{listDimensionValues:async()=>[],searchDimensionOptions:async(dimension)=>{calls.push(dimension);return {values:[{id:'source:2045',label:dimension==='business_line'?'General':'Actual name'},{id:'source:2046',label:'source:2046'}],selected:[{id:dimension==='branch'?'baghdad':'source:9999',label:dimension==='business_line'?'No Sugar':'Selected name'}]};}}});
 try {
  for(const locale of ['en','ar'])for(const dimension of ['customer','salesperson','business_line','branch','region']){
   const response=await app.inject({method:'POST',url:`/api/dimensions/${dimension}/search`,headers:{'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq','x-locale':locale},payload:{limit:1,selectedIds:['source:9999']}});
   assert.equal(response.statusCode,200);const page=response.json();assert.equal(page.values[0].id,'source:2045');assert.equal(page.values[1].label,'—');assert.equal(page.selected[0].id,dimension==='branch'?'baghdad':'source:9999');
   assert.equal(page.values[0].label,dimension==='business_line'?(locale==='ar'?'عام':'General'):'Actual name');
   assert.equal(page.selected[0].label,dimension==='business_line'?(locale==='ar'?'بدون سكر':'No Sugar'):dimension==='branch'?tenantProfiles['demo-iq'].branchLabels.baghdad?.[locale as 'en'|'ar']:'Selected name');
  }
  assert.equal(calls.length,10);
  assert.equal((await app.inject({method:'POST',url:'/api/dimensions/date/search',headers:{'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq'},payload:{}})).statusCode,400);
 }finally{await app.close();}
});


test('shared discovery carries explicit report periods for every categorical dimension and rejects malformed ranges',async()=>{
 const calls:DimensionDiscoveryRequest[]=[];
 const app=await buildApi({analyticsRepository:new MockAnalyticsRepository([]),dimensionValues:{listDimensionValues:async()=>[],searchDimensionOptions:async(_dimension,_context,request)=>{calls.push(request);return {values:[],selected:[]};}}});
 try{
  const headers={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq'};
  const dateRange={from:'2026-08-01',to:'2026-09-30'};
  for(const dimension of ['customer','salesperson','business_line','region']){
   const response=await app.inject({method:'POST',url:`/api/dimensions/${dimension}/search`,headers,payload:{metric:'revenue',dateRange}});
   assert.equal(response.statusCode,200);assert.deepEqual(calls.at(-1)?.dateRange,dateRange);
  }
  assert.equal((await app.inject({method:'POST',url:'/api/dimensions/customer/search',headers,payload:{dateRange:{from:'bad',to:'2026-09-30'}}})).statusCode,400);
  assert.equal(calls.length,4);
 }finally{await app.close();}
});


test('discovery timeouts have a safe stable HTTP category and never expose database cancellation details',async()=>{
 const app=await buildApi({analyticsRepository:new MockAnalyticsRepository([]),dimensionValues:{listDimensionValues:async()=>[],searchDimensionOptions:async()=>{throw new AnalyticsQueryTimeoutError();}}});
 try{
  const response=await app.inject({method:'POST',url:'/api/dimensions/customer/search',headers:{'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq'},payload:{}});
  assert.equal(response.statusCode,503);assert.deepEqual(response.json(),{error:{code:'QUERY_TIMEOUT',message:'Analytics query timed out'}});
 }finally{await app.close();}
});
