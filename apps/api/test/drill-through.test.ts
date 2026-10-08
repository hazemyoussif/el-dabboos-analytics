import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApi } from '../src/app.ts';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import type { AnalyticsContext,DrillRequest } from '@el-dabboos/domain';
test('drill API enforces membership, metric permission, strict semantic shape and scoped context on every page',async()=>{
 const analytics=new MockAnalyticsRepository([]),calls:Array<{request:DrillRequest;context:AnalyticsContext}>=[];
 const app=await buildApi({analyticsRepository:analytics,dimensionValues:analytics,drillThroughRepository:{drill:async(request,context)=>{calls.push({request,context});return {rows:[],hasMore:false,release:request.release,grain:'canonical_measure_fact',bases:{order_revenue:'0.000000'},value:'0.000000'};}}});
 try {
  const headers={'x-demo-user-id':'demo-iq-baghdad-manager','x-tenant-id':'demo-iq','x-locale':'ar'},payload={query:{metric:'order_revenue',dateRange:{from:'2026-09-01',to:'2026-09-30'},filters:[{dimension:'salesperson',values:['rep']}]},release:'trusted',sourceAsOf:'2026-10-08T00:00:00.000Z',clicked:{dimension:'business_line',values:['line']},limit:50};
  const send=(body:Record<string,unknown>=payload,selected=headers)=>app.inject({method:'POST',url:'/api/analytics/drill-through',headers:selected,payload:body});
  assert.equal((await send(payload,{'x-demo-user-id':'demo-eg-analyst','x-tenant-id':'demo-iq','x-locale':'en'})).statusCode,403);
  for(const change of [{sql:'select *'},{whereClause:'true'},{tableName:'facts'},{columnName:'amount'},{tenantId:'demo-eg'},{limit:101},{query:{metric:'order_revenue'}},{sort:{field:'amount desc;drop',direction:'asc'}},{clicked:{dimension:'business_line',values:['line'],sql:'true'}}])assert.equal((await send({...payload,...change})).statusCode,400);
  assert.equal(calls.length,0);
  assert.equal((await send()).statusCode,200);assert.equal(calls[0]!.context.tenantId,'demo-iq');assert.equal(calls[0]!.context.locale,'ar');assert.deepEqual(calls[0]!.context.enforcedFilters,[{dimension:'branch',values:['baghdad']}]);assert.deepEqual(calls[0]!.request.clicked,payload.clicked);
  assert.equal((await send({query:{metric:'net_aged_receivable'},release:'trusted',sourceAsOf:'2026-10-08T00:00:00.000Z'},{...headers,'x-demo-user-id':'demo-iq-sales-analyst'})).statusCode,403);assert.equal(calls.length,1);
 }finally{await app.close();}
});
