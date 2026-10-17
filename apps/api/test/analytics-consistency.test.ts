import test from 'node:test';
import assert from 'node:assert/strict';
import {AnalyticsPublicationChangedError} from '@el-dabboos/domain';
import type {AnalyticsRepository,DashboardSpec} from '@el-dabboos/domain';
import {MockAnalyticsRepository} from '@el-dabboos/data';
import {buildApi} from '../src/app.ts';

test('publication churn returns a safe 503 after one retry and unauthorized requests never open a scope',async()=>{
 const facts=new MockAnalyticsRepository([]);let scopes=0;
 const repository:AnalyticsRepository={execute:facts.execute.bind(facts),async createExecutionScope(){scopes++;return {execute:facts.execute.bind(facts),async verifyExecution(){throw new AnalyticsPublicationChangedError();}};}};
 const app=await buildApi({analyticsRepository:repository,dimensionValues:facts});
 const dashboard:DashboardSpec={schemaVersion:2,id:'consistency',locale:'en',filters:{},title:{en:'Consistency',ar:'اتساق'},layout:{columns:12},widgets:[{id:'sales',type:'kpi',series:[{id:'sales',metric:'revenue'}]}]};
 try{
  const denied=await app.inject({method:'POST',url:'/api/dashboards/execute',payload:{dashboard}});
  assert.equal(denied.statusCode,401);assert.equal(scopes,0);
  const response=await app.inject({method:'POST',url:'/api/dashboards/execute',headers:{'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq'},payload:{dashboard}});
  assert.equal(response.statusCode,503);assert.equal(scopes,2);
  assert.deepEqual(response.json(),{error:{code:'ANALYTICS_REVISION_CHANGED',message:'Data changed while this report loaded. Please refresh.'}});
 }finally{await app.close();}
});
