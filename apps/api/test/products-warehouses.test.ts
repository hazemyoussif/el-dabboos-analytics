import assert from 'node:assert/strict';
import test from 'node:test';
import {MockAnalyticsRepository} from '@el-dabboos/data';
import {buildApi} from '../src/app.ts';

test('independent product report authenticates, validates scopes and preserves read-only lifecycle',async()=>{
 const repository=new MockAnalyticsRepository([]),app=await buildApi({analyticsRepository:repository,dimensionValues:repository,clock:()=>new Date('2026-04-03T12:00:00Z')});
 const url='/api/reports/products-warehouses',headers={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq','x-locale':'en'};
 try{
  assert.equal((await app.inject({method:'POST',url,payload:{}})).statusCode,401);
  assert.equal((await app.inject({method:'POST',url,headers:{...headers,'x-tenant-id':'other'},payload:{}})).statusCode,403);
  for(const payload of [{tenantId:'other'},{revision:'override'},{warehouse:[]},{salesFilters:[{dimension:'brand',values:['a']}]},{productFilters:[{dimension:'customer',values:['a']}]},{dateRange:{from:'invalid',to:'invalid'}}])assert.equal((await app.inject({method:'POST',url,headers,payload})).statusCode,400);
  const response=await app.inject({method:'POST',url,headers,payload:{dateRange:{from:'2026-03-01',to:'2026-03-31'},warehouse:'warehouse-a',salesFilters:[{dimension:'customer',values:['customer-a']}]}});
  assert.equal(response.statusCode,200,response.body);
  const body=response.json();assert.equal(body.metadata.refresh,'report_only');assert.equal(body.metadata.stockRequestedAsOf,'2026-04-03');assert.equal(body.readings.length,6);
  assert.ok(body.readings.every((entry:{dashboard:{schemaVersion:number}})=>entry.dashboard.schemaVersion===2));
  assert.ok(!Object.hasOwn(body,'record'));assert.ok(!Object.hasOwn(body,'savedDashboard'));
  assert.equal((await app.inject({method:'GET',url,headers})).statusCode,404);
 }finally{await app.close();}
});
