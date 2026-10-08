import test from 'node:test';
import assert from 'node:assert/strict';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import type { AnalyticsJobRequest,AnalyticsJobRun } from '@el-dabboos/domain';
import { buildApi } from '../src/app.ts';
const headers={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq'};
const completed=(request:AnalyticsJobRequest,status:AnalyticsJobRun['status']):AnalyticsJobRun=>({...request,runId:'manual-run',startedAt:'2026-10-08T00:00:00Z',completedAt:'2026-10-08T00:01:00Z',sourceCutoff:'2026-10-08T00:00:00Z',sourceRevision:'bounded',mappingVersion:'1',definitionVersion:'1',status,recordsChanged:status==='unchanged'?0:12,partitionsAffected:2,caseCount:3,mismatchCount:status==='failed'?1:0,evidenceHash:'stored-proof',servingRelease:'trusted'});
test('manual commands use authenticated actor/tenant and only the existing named lifecycle dependency',async()=>{
 const repository=new MockAnalyticsRepository([]),requests:AnalyticsJobRequest[]=[];
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,planner:null,operationalCommands:{run:async request=>{requests.push(request);return {run:completed(request,'passed'),canonicalRevisions:513,servingUpdated:true};}}});
 try {
  for(const kind of ['sync','affected','daily']) {
   const response=await app.inject({url:'/api/analytics/operations',method:'POST',headers,payload:{kind}});
   assert.equal(response.statusCode,200);assert.equal(response.json().canonicalRevisions,513);
  }
  assert.deepEqual(requests.map(request=>[request.actorId,request.tenantId,request.trigger,request.kind]),['sync','affected','daily'].map(kind=>['demo-iq-admin','demo-iq','manual',kind]));
  for(const payload of [{kind:'deep'},{kind:'sync',actorId:'forged'},{kind:'sweep'},{}])assert.equal((await app.inject({url:'/api/analytics/operations',method:'POST',headers,payload})).statusCode,400);
  assert.equal(requests.length,3);
 }finally{await app.close();}
});
test('membership and tenant administration permission denied before any source operation',async()=>{
 const repository=new MockAnalyticsRepository([]);let calls=0;
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,operationalCommands:{run:async request=>{calls++;return {run:completed(request,'passed'),canonicalRevisions:0,servingUpdated:false};}}});
 try {
  for(const identity of [{},{'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-eg'},{'x-demo-user-id':'demo-eg-analyst','x-tenant-id':'demo-eg'}]) {
   const response=await app.inject({url:'/api/analytics/operations',method:'POST',headers:identity,payload:{kind:'sync'}});
   assert.ok([401,403].includes(response.statusCode));
  }
  assert.equal(calls,0);
 }finally{await app.close();}
});
for(const status of ['unchanged','failed'] as const)test(`manual ${status} result preserves lifecycle evidence`,async()=>{
 const repository=new MockAnalyticsRepository([]),app=await buildApi({analyticsRepository:repository,dimensionValues:repository,operationalCommands:{run:async request=>({run:completed(request,status),canonicalRevisions:0,servingUpdated:false})}});
 try {const response=await app.inject({url:'/api/analytics/operations',method:'POST',headers,payload:{kind:'sync'}});assert.equal(response.statusCode,200);assert.equal(response.json().servingUpdated,false);assert.equal(response.json().run.servingRelease,'trusted');}finally{await app.close();}
});
test('operational errors are sanitized; no internal error text reaches the browser',async()=>{
 const repository=new MockAnalyticsRepository([]),app=await buildApi({analyticsRepository:repository,dimensionValues:repository,operationalCommands:{run:async()=>{throw new Error('Unsafe SQL numeric output candidate_revision');}}});
 try {const response=await app.inject({url:'/api/analytics/operations',method:'POST',headers,payload:{kind:'daily'}});assert.equal(response.statusCode,503);assert.ok(!response.body.includes('candidate_revision'));assert.ok(response.body.includes('Previously trusted'));}finally{await app.close();}
});
test('manual authorization audit uses the existing safe sink',async()=>{
 const {InMemoryAuditSink}=await import('@el-dabboos/application');
 const audit=new InMemoryAuditSink(),repository=new MockAnalyticsRepository([]);
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,auditSink:audit,operationalCommands:{run:async request=>({run:completed(request,'passed'),canonicalRevisions:1,servingUpdated:true})}});
 try {
  await app.inject({url:'/api/analytics/operations',method:'POST',headers,payload:{kind:'sync'}});
  await app.inject({url:'/api/analytics/operations',method:'POST',headers:{'x-demo-user-id':'demo-eg-analyst','x-tenant-id':'demo-eg'},payload:{kind:'sync'}});
  assert.deepEqual(audit.events.map(event=>[event.action,event.result]),[['analytics.operation','allowed'],['analytics.operation','denied']]);
 }finally{await app.close();}
});
test('manual runtime configuration is explicit and fails closed',async()=>{
 const {manualAnalyticsCommands}=await import('../src/analytics-operations-runtime.ts');
 assert.equal(manualAnalyticsCommands('postgres',{}),undefined);
 assert.equal(manualAnalyticsCommands('postgres',{ANALYTICS_MANUAL_OPERATIONS:'disabled'}),undefined);
 assert.throws(()=>manualAnalyticsCommands('mock',{ANALYTICS_MANUAL_OPERATIONS:'enabled'}));
 assert.throws(()=>manualAnalyticsCommands('postgres',{ANALYTICS_MANUAL_OPERATIONS:'unexpected'}));
 assert.throws(()=>manualAnalyticsCommands('postgres',{ANALYTICS_MANUAL_OPERATIONS:'enabled'}));
 const runtime=manualAnalyticsCommands('postgres',{ANALYTICS_MANUAL_OPERATIONS:'enabled',MART_INGESTOR_URL:'postgres://synthetic-only'});assert.ok(runtime);await runtime.close();
});

test('source unavailability governs operator actions while status/serving readiness remain available and recover automatically',async()=>{
 const repository=new MockAnalyticsRepository([]);let available=false,calls=0;
 const status={tenantId:'demo-iq',freshnessTargetSeconds:600,cursor:null,latest:[],lastSuccessfulSync:null,trustedCertificationRelease:'trusted',historicalCoverage:null};
 const source=()=>({relayAvailable:true,sourceAvailable:available,checkedAt:'2026-10-08T08:00:00Z',lastSuccessfulConnection:'2026-10-08T07:00:00Z'});
 const {DatabaseSync}=await import('node:sqlite');const {SqliteDashboardRepository,createDashboardPersistenceSchema}=await import('@el-dabboos/data');const db=new DatabaseSync(':memory:');createDashboardPersistenceSchema(db);
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,dashboardRepository:new SqliteDashboardRepository(db),readiness:{persistence:async()=>true,analytics:async()=>true},operationalStatus:{status:async()=>status},operationalCommands:{availability:source,run:async request=>{calls++;return {run:completed(request,'unchanged'),canonicalRevisions:0,servingUpdated:false};}}});
 try {
  const response=await app.inject({url:'/api/analytics/status',headers});assert.equal(response.statusCode,200);assert.equal(response.json().commandsConfigured,true);assert.equal(response.json().commandsAvailable,false);assert.deepEqual(response.json().sourceAvailability,source());
  assert.equal((await app.inject({url:'/health/ready'})).statusCode,200);
  for(const kind of ['sync','affected','daily']){const denied=await app.inject({url:'/api/analytics/operations',method:'POST',headers,payload:{kind}});assert.equal(denied.statusCode,503);assert.equal(denied.json().error.code,'ANALYTICS_SOURCE_UNAVAILABLE');}assert.equal(calls,0);
  const ordinary=await app.inject({url:'/api/analytics/operations',method:'POST',headers:{'x-demo-user-id':'demo-eg-analyst','x-tenant-id':'demo-eg'},payload:{kind:'sync'}});assert.equal(ordinary.statusCode,403);
  available=true;assert.equal((await app.inject({url:'/api/analytics/status',headers})).json().commandsAvailable,true);
  assert.equal((await app.inject({url:'/api/analytics/operations',method:'POST',headers,payload:{kind:'sync'}})).statusCode,200);assert.equal(calls,1);
 }finally{await app.close();db.close();}
});
