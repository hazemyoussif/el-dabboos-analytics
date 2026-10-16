import test from 'node:test';
import assert from 'node:assert/strict';
import type {ProductionFact,AnalyticsQuery,AnalyticsContext,DateRange} from '@el-dabboos/domain';
import type {PoolClient} from 'pg';
import {groupedReviewRows} from '../../src/review/grouped-query.ts';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture,pages} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

async function groupingPlan(client:PoolClient,context:AnalyticsContext,range:DateRange){
 let statement:{text:string;params:unknown[]}|undefined;
 const capture={query:async(text:string,params:unknown[])=>{statement={text,params};return {rows:[]};}} as unknown as PoolClient;
 await groupedReviewRows(capture,{query:{metric:'period_net_sales',groupBy:'salesperson',dateRange:range},context,range,family:'business',revision:'synthetic',maxGroups:4000});
 assert.ok(statement);
 const plan=(await client.query('EXPLAIN (ANALYZE,BUFFERS,TIMING OFF,FORMAT JSON) '+statement.text,statement.params)).rows[0]['QUERY PLAN'][0];
 assert.equal(plan.Plan['Temp Written Blocks'],0,'categorical consistency checks must not spill the wide fact population');
 return {executionMs:plan['Execution Time'],tempWrittenBlocks:plan.Plan['Temp Written Blocks']};
}

test('multi-month history reduces exact typed operands without transferring fact history',{skip:!enabled,timeout:120000},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  for(const month of ['2026-07','2026-08','2026-09']){
   const source=fixture(month),original:ProductionFact[]=[];
   for await(const page of source.facts)original.push(...page);
   const base=original.find(fact=>fact.measureId==='period_net_sales')!;
   const count=100000,repeated=Array.from({length:count},(_,index)=>({...base,businessDate:month+(index%2?'-20':'-15'),value:'0.000001',currency:{...base.currency!,transactionValue:'0.000001'},sourceRecordId:`${month}:${index}`,dimensions:{...base.dimensions,customer:`fixture:customer:${index%2}`}}));
   const others=original.filter(fact=>fact!==base),controls=others.flatMap(fact=>[{measure:fact.measureId,dimensions:fact.dimensions,value:fact.value,count:'1'},{measure:fact.measureId,dimensions:null,value:fact.value,count:'1'}]);
   await exposeReviewMonth(db.ingestor,{...source,facts:pages([...others,...repeated]),controls:async()=>[...controls,
    ...[0,1].map(index=>({measure:base.measureId,dimensions:{...base.dimensions,customer:`fixture:customer:${index}`},value:'0.050000',count:String(count/2)})),{measure:base.measureId,dimensions:null,value:'0.100000',count:String(count)}]},'business');
  }
  await db.admin.query('ANALYZE mart.review_facts');
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:'a',locale:'en' as const};
  const query:AnalyticsQuery={metric:'period_net_sales',dateRange:{from:'2026-07-01',to:'2026-09-30'}};
  const started=performance.now(),results=[];
  for(const groupBy of [undefined,'month','year','salesperson','state'] as const)results.push(await repository.execute({...query,...(groupBy?{groupBy}:{})},context));
  assert.deepEqual(results[0]!.rows.map(row=>row.value),[0.3]);assert.deepEqual(results[1]!.rows.map(row=>row.value),[0.1,0.1,0.1]);
  for(const result of results.slice(2))assert.equal(result.rows[0]?.value,0.3);
  assert.ok(results.every(result=>result.rows.length<=3));
  assert.ok(results.every(result=>result.metadata.dataThrough==='2026-09-20'));
  const executionMs=performance.now()-started;
  const plans=await tenantTransaction(db.runtime,'a',async client=>{
   const output:Record<string,unknown>={};
   for(const projected of [false,true]){
    const amount=projected?'fact.amount':"(fact.payload->>'value')::numeric",measure=projected?'fact.measure_id':"fact.payload->>'measureId'",date=projected?'fact.business_day':"fact.payload->>'businessDate'";
    const plan=(await client.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT sum(${amount}) FROM mart.review_facts fact JOIN mart.analytics_serving_members member USING(tenant_id,partition_id) JOIN mart.analytics_trusted_serving trusted USING(tenant_id,revision_id)
     WHERE trusted.tenant_id=$1 AND member.family='business' AND ${measure}=$2 AND ${date} BETWEEN $3::text AND $4::text`,['a','period_net_sales',query.dateRange!.from,query.dateRange!.to])).rows[0]['QUERY PLAN'][0];
    output[projected?'typed':'payload']={executionMs:plan['Execution Time'],sharedHitBlocks:plan.Plan['Shared Hit Blocks']};
   }
   output.categorical=await groupingPlan(client,context,query.dateRange!);
   return output;
  },true);
  console.info('review-history-benchmark',JSON.stringify({syntheticFacts:300000,executionMs,maxOutputRows:3,plans}));
 }finally{await db.close();}
});
