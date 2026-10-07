import test from 'node:test';
import assert from 'node:assert/strict';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import { buildApi } from '../src/app.ts';

test('operational status validates membership before tenant-scoped stored reads; never executes analytics or source jobs',async()=>{
 const repository=new MockAnalyticsRepository([]),tenants:string[]=[];
 repository.execute=async()=>{throw new Error('ordinary status must never calculate reports');};
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,planner:null,operationalStatus:{status:async tenantId=>{
  tenants.push(tenantId);return {tenantId,freshnessTargetSeconds:600,cursor:null,latest:[],lastSuccessfulSync:null,trustedCertificationRelease:null,historicalCoverage:null};
 }}});
 try {
  assert.equal((await app.inject({url:'/api/analytics/status'})).statusCode,401);
  assert.equal((await app.inject({url:'/api/analytics/status',headers:{'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-eg'}})).statusCode,403);
  assert.deepEqual(tenants,[]);
  const result=await app.inject({url:'/api/analytics/status',headers:{'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq'}});
  assert.equal(result.statusCode,200);assert.equal(result.json().tenantId,'demo-iq');assert.deepEqual(tenants,['demo-iq']);
 }finally{await app.close();}
});
test('unconfigured operational adapter is explicit and has no synthetic fallback',async()=>{
 const repository=new MockAnalyticsRepository([]),app=await buildApi({analyticsRepository:repository,dimensionValues:repository,planner:null});
 try {assert.equal((await app.inject({url:'/api/analytics/status',headers:{'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq'}})).statusCode,503);}finally{await app.close();}
});
