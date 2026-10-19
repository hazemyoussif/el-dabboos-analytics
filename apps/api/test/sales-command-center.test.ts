import assert from 'node:assert/strict';
import test from 'node:test';
import {MockAnalyticsRepository} from '@el-dabboos/data';
import {buildApi} from '../src/app.ts';
const repository=new MockAnalyticsRepository([]);
const headers={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq','x-locale':'en'};
test('Sales Command Center is authenticated, strict, tenant-owned and read-only',async()=>{
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository,clock:()=>new Date('2026-04-01T12:00:00Z')});
 try{
  const url='/api/reports/sales-command-center';
  assert.equal((await app.inject({method:'POST',url,payload:{}})).statusCode,401);
  assert.equal((await app.inject({method:'POST',url,headers:{...headers,'x-tenant-id':'other'},payload:{}})).statusCode,403);
  for(const payload of [{revision:'override'},{tenantId:'demo-eg'},{dateRange:{from:'bad',to:'bad'}},{filters:[{dimension:'branch',values:['baghdad']}]}])assert.equal((await app.inject({method:'POST',url,headers,payload})).statusCode,400);
  const response=await app.inject({method:'POST',url,headers,payload:{dateRange:{from:'2026-03-01',to:'2026-03-31'}}});
  assert.equal(response.statusCode,200,response.body);
  const body=response.json();assert.equal(body.metadata.mode,'synthetic');assert.equal(body.metadata.today,'2026-04-01');assert.equal(body.metadata.refresh,'report_only');assert.equal(body.sections.length,5);
  assert.equal(body.sections[0].widgets[0].period.from,'2026-04-01');
  assert.ok(!Object.hasOwn(body,'record'));assert.ok(!Object.hasOwn(body,'savedDashboard'));
 }finally{await app.close();}
});
