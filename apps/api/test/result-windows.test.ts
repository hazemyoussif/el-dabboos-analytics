import test from 'node:test';
import assert from 'node:assert/strict';
import {MockAnalyticsRepository} from '@el-dabboos/data';
import type {AnalyticsQuery,AnalyticsContext,AnalyticsReadOptions,DashboardSpec} from '@el-dabboos/domain';
import {buildApi} from '../src/app.ts';
class WindowFixture extends MockAnalyticsRepository {
 readonly supportsResultWindows=true as const;
 calls:AnalyticsQuery[]=[];
 override async execute(query:AnalyticsQuery,context:AnalyticsContext,read?:AnalyticsReadOptions){
  this.calls.push(query);const result=await super.execute(query,context);
  const keys=read?.outputKeys,rows=keys?result.rows.filter(row=>keys.includes(row.key!)):result.rows;
  return {...result,rows,metadata:{...result.metadata,servingRevision:'synthetic',...(read?.window?{window:{total:rows.length,scope:'a'.repeat(64)}}:{})}};
 }
}
const dashboard:DashboardSpec={schemaVersion:2,id:'unrelated-name',locale:'en',title:{en:'Grouped data',ar:'بيانات مجمعة'},filters:{dateRange:{from:'2026-01-01',to:'2026-01-31'}},layout:{columns:2},widgets:[
 {id:'detail',type:'table',dimension:'branch',series:[{id:'value',metric:'revenue'}]},
 {id:'summary',type:'kpi',series:[{id:'value',metric:'revenue'}]},
]};
const headers={'x-demo-user-id':'demo-iq-admin','x-tenant-id':'demo-iq','x-locale':'en'};
test('result-window route authorizes the dashboard and executes only the selected widget',async()=>{
 const repository=new WindowFixture([{tenantId:'demo-iq',measureId:'revenue',date:'2026-01-15',value:10,dimensions:{branch:'baghdad'}}]);
 const app=await buildApi({analyticsRepository:repository,dimensionValues:repository});
 try{
  const request={method:'POST' as const,url:'/api/dashboards/widgets/detail/window',headers,payload:{dashboard,window:{limit:20}}};
  const response=await app.inject(request);assert.equal(response.statusCode,200,response.body);assert.equal(response.json().alignedRows[0].series.value.value,10);
  assert.ok(repository.calls.every(query=>query.groupBy==='branch'));assert.equal(dashboard.widgets.length,2);
  assert.equal((await app.inject({...request,headers:{}})).statusCode,401);
  assert.equal((await app.inject({...request,headers:{...headers,'x-tenant-id':'other'}})).statusCode,403);
  for(const window of [{limit:1001},{limit:0},{sql:'SELECT 1'},{cursor:{scope:'bad',after:'key'}},{cursor:{scope:'a'.repeat(64),after:'key',tenantId:'other'}}])assert.equal((await app.inject({...request,payload:{dashboard,window}})).statusCode,400);
  assert.equal((await app.inject({...request,url:'/api/dashboards/widgets/missing/window'})).statusCode,400);
 }finally{await app.close();}
});
