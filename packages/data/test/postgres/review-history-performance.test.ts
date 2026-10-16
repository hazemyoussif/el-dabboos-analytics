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

async function groupingPlan(client:PoolClient,context:AnalyticsContext,range:DateRange,expectedGroups:number){
 let statement:{text:string;params:unknown[]}|undefined;
 const capture={query:async(text:string,params:unknown[])=>{
  if(text.startsWith('WITH original AS MATERIALIZED')){statement={text,params};return {rows:[]};}
  return client.query(text,params);
 }} as unknown as PoolClient;
 await groupedReviewRows(capture,{query:{metric:'period_net_sales',groupBy:'salesperson',dateRange:range},context,range,family:'business',revision:'synthetic',maxGroups:4000});
 assert.ok(statement);
 const plan=(await client.query('EXPLAIN (ANALYZE,BUFFERS,TIMING OFF,FORMAT JSON) '+statement.text,statement.params)).rows[0]['QUERY PLAN'][0];
 const pending=[plan.Plan];
 while(pending.length){const node=pending.pop()!;if(node['Node Type']==='CTE Scan')assert.ok(node['Actual Rows']<=expectedGroups,'materialized scans must contain reduced groups, not the source-history operands');pending.push(...(node.Plans??[]));}
 return {executionMs:plan['Execution Time'],sharedBlocks:plan.Plan['Shared Hit Blocks']+plan.Plan['Shared Read Blocks'],tempWrittenBlocks:plan.Plan['Temp Written Blocks']};
}

test('multi-month history reduces exact typed operands without transferring fact history',{skip:!enabled,timeout:120000},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  for(const month of ['2026-07','2026-08','2026-09']){
   const source=fixture(month),original:ProductionFact[]=[];
   for await(const page of source.facts)original.push(...page);
   const base=original.find(fact=>fact.measureId==='period_net_sales')!;
   const count=20000,repeated=Array.from({length:count},(_,index)=>({...base,businessDate:month+(index%2?'-20':'-15'),value:'0.000001',currency:{...base.currency!,transactionValue:'0.000001'},sourceRecordId:`${month}:${index}`,dimensions:{...base.dimensions,customer:`fixture:customer:${index}`,salesperson:`fixture:rep:${index%31}`,state:`fixture:state:${index%7}`}}));
   const groups=new Map<string,{dimensions:ProductionFact['dimensions'];count:number}>();
   for(const fact of repeated){const key=JSON.stringify(fact.dimensions),prior=groups.get(key);groups.set(key,{dimensions:fact.dimensions,count:(prior?.count??0)+1});}
   const others=original.filter(fact=>fact!==base),controls=others.flatMap(fact=>[{measure:fact.measureId,dimensions:fact.dimensions,value:fact.value,count:'1'},{measure:fact.measureId,dimensions:null,value:fact.value,count:'1'}]);
   await exposeReviewMonth(db.ingestor,{...source,facts:pages([...others,...repeated]),controls:async()=>[...controls,
    ...[...groups.values()].map(group=>({measure:base.measureId,dimensions:group.dimensions,value:(group.count/1000000).toFixed(6),count:String(group.count)})),{measure:base.measureId,dimensions:null,value:'0.020000',count:String(count)}]},'business');
  }
  await db.admin.query('VACUUM (ANALYZE) mart.review_facts');
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:'a',locale:'en' as const};
  const query:AnalyticsQuery={metric:'period_net_sales',dateRange:{from:'2026-07-01',to:'2026-09-30'}};
  const started=performance.now(),results=[];
  for(const groupBy of [undefined,'month','year','salesperson','state'] as const)results.push(await repository.execute({...query,...(groupBy?{groupBy}:{})},context));
  assert.deepEqual(results[0]!.rows.map(row=>row.value),[0.06]);assert.deepEqual(results[1]!.rows.map(row=>row.value),[0.02,0.02,0.02]);
  assert.equal(results[2]!.rows[0]?.value,0.06);
  for(const [result,size] of [[results[3]!,31],[results[4]!,7]] as const){
   assert.equal(result.rows.length,size);
   for(const row of result.rows){const index=Number(row.key!.split(':').at(-1)),count=Math.floor(20000/size)+(index<20000%size?1:0);assert.equal(row.value,count*3/1000000);}
  }
  assert.ok(results.every(result=>result.rows.length<=31));
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
   output.categorical=await groupingPlan(client,context,query.dateRange!,31);
   return output;
  },true);
  console.info('review-history-benchmark',JSON.stringify({syntheticFacts:60000,executionMs,maxOutputRows:31,plans}));
 }finally{await db.close();}
});
