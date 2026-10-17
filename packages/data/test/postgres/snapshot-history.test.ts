import test from 'node:test';
import assert from 'node:assert/strict';
import type {AnalyticsQuery,FactMeasureId} from '@el-dabboos/domain';
import type {PoolClient} from 'pg';
import {AnalyticsResultWindowError,AnalyticsPublicationChangedError} from '@el-dabboos/domain';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {snapshotSource} from './snapshot-fixture.ts';
import type {SnapshotInput} from './snapshot-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import {groupedReviewRows} from '../../src/review/grouped-query.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

const context={tenantId:'a',locale:'en' as const},range={from:'2026-09-01',to:'2026-09-30'};
function inputs(measure:FactMeasureId,month:'august'|'september',denominator=false):SnapshotInput[]{
 const values: Array<[string,string,number]>=month==='august'?[['move','a',100],['zero','a',50],['carry','a',30]]:[['move','b',10],['zero','a',0],['new','a',7],['extra','b',2],['no-sales','z',5]];
 return values.map(([entity,customer,amount])=>({measure,entity,customer,value:`${denominator?(entity==='no-sales'?0:amount*2):amount}.000000`}));
}
for(const family of ['review','business'] as const)test(`${family} snapshot history preserves latest attribution, zero, absent entities, superseded partitions and scoped windows`,{skip:!enabled},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const measure=family==='review'?'receivables_due_for_collection':'review_customer_balance';
  const august=inputs(measure,'august'),september=inputs(measure,'september');
  if(family==='business'){august.push(...inputs('customer_period_sales','august',true));september.push(...inputs('customer_period_sales','september',true));}
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-08',family,august),family);
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09',family,september.map(input=>({...input,value:'999.000000'}))),family);
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09',family,september,'2026-11-03T09:00:00.000Z'),family);
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const query:AnalyticsQuery={metric:measure,groupBy:'customer',dateRange:range};
  const result=await repository.execute(query,context);
  assert.deepEqual(result.rows,[{key:'fixture:a',value:37},{key:'fixture:b',value:12},{key:'fixture:z',value:5}]);
  assert.equal(result.metadata.snapshotAsOf,'2026-09-30');assert.equal(result.metadata.dimensionLabels?.['fixture:a'],'Synthetic a');
  assert.equal((await repository.execute(query,{...context,enforcedFilters:[{dimension:'customer',values:['fixture:a']}]})).rows[0]?.value,37);
  assert.deepEqual((await repository.execute({...query,analysis:{topN:{limit:2,direction:'top'}}},context)).rows.map(row=>row.value),[37,12]);
  await assert.rejects(repository.execute({...query,analysis:{percentageContribution:true}},context),/Percentage contribution requires grouped additive metric/);
  if(family==='business'){
   const ratio=await repository.execute({...query,metric:'customer_balance_sales_percentage'},context);
   assert.deepEqual(ratio.rows.map(row=>row.value),[50,50,null]);
  }
  const first=await repository.execute(query,context,{window:{limit:1}});assert.equal(first.rows[0]?.key,'fixture:a');
  const second=await repository.execute(query,context,{window:{limit:1,cursor:first.metadata.window!.nextCursor!}});assert.equal(second.rows[0]?.key,'fixture:b');
  const pinned=await repository.createExecutionScope(context);
  assert.equal((await pinned.execute(query,context)).metadata.servingRevision,pinned.servingRevision);
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-10',family,[{measure,entity:'move',customer:'b',value:'1000.000000'}],'2026-11-04T09:00:00.000Z'),family);
  for(const stale of [query,{metric:query.metric,dateRange:range},{metric:'revenue' as const,dateRange:range}])await assert.rejects(pinned.execute(stale,context),AnalyticsPublicationChangedError);
  await assert.rejects(pinned.verifyExecution!(),AnalyticsPublicationChangedError);
  assert.deepEqual((await repository.execute(query,context)).rows,result.rows);
  await assert.rejects(repository.execute(query,context,{window:{limit:1,cursor:first.metadata.window!.nextCursor!}}),AnalyticsResultWindowError);
  const invisible=await tenantTransaction(db.runtime,'other',client=>groupedReviewRows(client,{query,context,range,family,revision:'test',maxGroups:3000}),true);
  assert.deepEqual(invisible.rows,[]);
 }finally{await db.close();}
});
interface Plan {['Node Type']:string;['Index Name']?:string;['Heap Fetches']?:number;['Actual Rows']?:number;['Execution Time']?:number;Plans?:Plan[]}
function nodes(plan:Plan):Plan[]{return [plan,...(plan.Plans??[]).flatMap(nodes)];}

test('snapshot history reads identities from the covering index before fetching latest operands',{skip:!enabled,timeout:120000},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const records=10000;
  for(const month of ['2026-04','2026-05','2026-06','2026-07','2026-08','2026-09']){
   const values=Array.from({length:records},(_,index)=>({measure:'receivables_due_for_collection' as const,entity:String(index),customer:`customer:${index%50}`,value:'0.000001'}));
   await exposeReviewMonth(db.ingestor,await snapshotSource(month,'review',values));
  }
  await db.admin.query('VACUUM (ANALYZE) mart.review_facts');
  const measurement=await tenantTransaction(db.runtime,'a',async client=>{
   const statements:Array<{text:string;params:unknown[]|undefined}>=[];
   const observed={query:async(text:string,params?:unknown[])=>{statements.push({text,params});return client.query(text,params);}} as PoolClient;
   const query:AnalyticsQuery={metric:'receivables_due_for_collection',groupBy:'customer',dateRange:range,analysis:{topN:{limit:100,direction:'top'}}};
   const result=await groupedReviewRows(observed,{query,context,range,family:'review',revision:'fixture',maxGroups:3000});
   assert.equal(result.rows.length,50);assert.ok(result.rows.every(row=>row.value===0.0002));
   const statement=statements.at(-1)!;
   const explain=(await client.query('EXPLAIN (ANALYZE,BUFFERS,TIMING OFF,FORMAT JSON) '+statement.text,statement.params)).rows[0]['QUERY PLAN'][0];
   const covered=nodes(explain.Plan).filter(node=>node['Node Type']==='Index Only Scan'&&['review_facts_snapshot_identity','review_facts_typed_access'].includes(node['Index Name']??''));
   assert.ok(covered.length>0,'history selection must use the identity index without carrying historical payloads');
   assert.ok(covered.every(node=>node['Heap Fetches']===0),'visible history must not fetch source envelopes for old rows');
   return {syntheticSnapshots:records*6,executionMs:explain['Execution Time'],indexOnlyHeapFetches:covered.map(node=>node['Heap Fetches'])};
  },true);
  console.info('snapshot-history-benchmark',JSON.stringify(measurement));
 }finally{await db.close();}
});
