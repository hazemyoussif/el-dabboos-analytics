import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApi} from '../src/app.ts';
import {MockAnalyticsRepository} from '@el-dabboos/data';
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
