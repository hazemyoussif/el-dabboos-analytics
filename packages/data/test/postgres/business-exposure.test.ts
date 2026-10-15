import {fixture,pages} from './business-fixture.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {AnalyticsResultLimitError} from '@el-dabboos/domain';
import type {PoolClient} from 'pg';
import {reviewEventRows} from '../../src/review/event-rows.ts';
import type {ProductionFact} from '@el-dabboos/domain';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import type {ReviewControl} from '../../src/review/source.ts';
test('business exposure preserves every original family, controls all tuples and serves exact money, dates and consecutive events',{skip:!enabled},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const before=(await db.admin.query("SELECT member.month,member.family,member.partition_id FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) WHERE trusted.tenant_id='a' ORDER BY family,month")).rows;
  await exposeReviewMonth(db.ingestor,fixture('2026-08'), 'business');
  const september=await exposeReviewMonth(db.ingestor,fixture(), 'business');
  assert.equal(september.financeReview,'pending');
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:'a',locale:'en' as const},dateRange={from:'2026-09-01',to:'2026-09-30'};
  assert.equal((await repository.execute({metric:'period_collection_percentage',dateRange},context)).rows[0]?.value,125);
  assert.equal((await repository.execute({metric:'customer_balance_sales_percentage',dateRange},context)).rows[0]?.value,25);
  assert.equal((await repository.execute({metric:'customer_last_invoice_date',dateRange,groupBy:'customer'},context)).rows[0]?.value,Date.parse('2026-09-05T00:00:00Z')/86400000);
  const history={from:'2026-08-01',to:'2026-09-30'};
  assert.equal((await repository.execute({metric:'period_net_sales',dateRange:history},context)).rows[0]?.value,240);
  assert.equal((await repository.execute({metric:'period_collection_percentage',dateRange:history},context)).rows[0]?.value,125);
  assert.deepEqual((await repository.execute({metric:'period_net_sales',dateRange:history,groupBy:'month'},context)).rows.map(row=>row.value),[120,120]);
  await assert.rejects(repository.execute({metric:'period_net_sales',dateRange:{from:'2026-07-01',to:'2026-09-30'}},context),/Unexposed/);
  await assert.rejects(repository.execute({metric:'review_customer_balance',dateRange:history},context),/Unexposed/);
  const scoped={...context,enforcedFilters:[{dimension:'customer' as const,values:['fixture:other']}]};
  assert.equal((await repository.execute({metric:'period_net_sales',dateRange:history},scoped)).rows[0]?.value,0);
  const after=(await db.admin.query("SELECT member.month,member.family,member.partition_id FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) WHERE trusted.tenant_id='a' AND member.family<>'business' ORDER BY family,month")).rows;
  assert.deepEqual(after,before);
  const source=fixture('2026-10',true),controls=await source.controls();
  await assert.rejects(exposeReviewMonth(db.ingestor,{...source,controls:async()=>controls.map(control=>control.measure==='period_net_sales'?{...control,value:'999.000000'}:control)},'business'),/do not match/);
  assert.equal((await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id,september.revisionId);
  await exposeReviewMonth(db.ingestor,fixture('2026-10',true),'business');
  await assert.rejects(repository.execute({metric:'internal_stock_quantity',dateRange:{from:'2026-10-01',to:'2026-10-31'}},context),/Quantity/);
  assert.equal((await repository.execute({metric:'internal_stock_quantity',dateRange:{from:'2026-10-01',to:'2026-10-31'},groupBy:'product'},context)).rows[0]?.value,13);
  await assert.rejects(repository.execute({metric:'internal_stock_quantity',dateRange,groupBy:'product'},context),/Unexposed/);
 }finally{await db.close();}
});

test('business customer dates cover more than the legacy group bound while explicit technical bounds still fail closed', {skip:!enabled}, async()=>{
 const db=await database();
 try {
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const source=fixture(), original:ProductionFact[]=[];
  for await(const page of source.facts)original.push(...page);
  const date=original.find(fact=>fact.measureId==='customer_last_invoice_date')!;
  const dates=Array.from({length:5001},(_,index)=>({...date,sourceRecordId:String(index),entityId:`SYNTHETIC customer ${index}`,dimensions:{...date.dimensions,customer:`fixture:customer:${index}`}}));
  const facts=[...original.filter(fact=>fact.measureId!==date.measureId),...dates];
  const controls:ReviewControl[]=[...original.filter(fact=>fact.measureId!==date.measureId).flatMap(fact=>[{measure:fact.measureId,dimensions:fact.dimensions,value:fact.value,count:'1'},{measure:fact.measureId,dimensions:null,value:fact.value,count:'1'}]),...dates.map(fact=>({measure:fact.measureId,dimensions:fact.dimensions,value:fact.value,count:'1'})),{measure:date.measureId,dimensions:null,value:`${Number(date.value)*dates.length}.000000`,count:String(dates.length)}];
  async function* factPages(){for(let offset=0;offset<facts.length;offset+=1000)yield facts.slice(offset,offset+1000);}
  await exposeReviewMonth(db.ingestor,{...source,facts:factPages(),controls:async()=>controls},'business');
  const query={metric:'customer_last_invoice_date' as const,groupBy:'customer' as const,dateRange:{from:'2026-09-01',to:'2026-09-30'}},context={tenantId:'a',locale:'en' as const};
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  assert.equal((await repository.execute(query,context)).rows.length,5001);
  const bounded=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'},maxGroups:100});
  await assert.rejects(bounded.execute(query,context),AnalyticsResultLimitError);
 }finally{await db.close();}
});


test('unchanged immutable review and business members copy without rechecking all historical facts, while new members still require exact controls',{skip:!enabled},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  await exposeReviewMonth(db.ingestor,fixture('2026-08',false,'review'),'review');
  const prior=await exposeReviewMonth(db.ingestor,fixture(),'business');
  const before=(await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows;
  // A false result is a deterministic tripwire for any full historical recheck.
  // It also proves that first-time membership still fails closed.
  await db.admin.query(`CREATE OR REPLACE FUNCTION mart.review_partition_exact(selected_tenant text,selected_partition text) RETURNS boolean LANGUAGE sql STABLE AS 'SELECT false';
   CREATE OR REPLACE FUNCTION mart.business_partition_exact(selected_tenant text,selected_partition text) RETURNS boolean LANGUAGE sql STABLE AS 'SELECT false'`);
  await tenantTransaction(db.ingestor,'a',async client=>{
   await client.query("INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose) VALUES('a','SYNTHETIC-COPY',$1,now(),ARRAY['2026-10-01'::date],'business')",[prior.revisionId]);
   const copied=await client.query("INSERT INTO mart.analytics_serving_members SELECT tenant_id,'SYNTHETIC-COPY',month,partition_id,family FROM mart.analytics_serving_members WHERE tenant_id='a' AND revision_id=$1",[prior.revisionId]);
   assert.ok(copied.rowCount!>=3);
  });
  assert.deepEqual((await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows,before,'candidate membership does not promote serving');
  await tenantTransaction(db.ingestor,'a',async client=>{
   await client.query("INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose) SELECT 'a','SYNTHETIC-HISTORY-'||ordinal,$1,now(),ARRAY['2026-10-01'::date],'business' FROM generate_series(1,2048) ordinal",[prior.revisionId]);
   await client.query("INSERT INTO mart.analytics_serving_members SELECT member.tenant_id,'SYNTHETIC-HISTORY-'||ordinal,member.month,member.partition_id,member.family FROM mart.analytics_serving_members member CROSS JOIN generate_series(1,2048) ordinal WHERE member.tenant_id='a' AND member.revision_id=$1",[prior.revisionId]);
  });
  await db.admin.query('ANALYZE mart.analytics_serving_members');
  const access=(await tenantTransaction(db.ingestor,'a',client=>client.query("EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id='a' AND partition_id='SYNTHETIC-UNPUBLISHED'"),true)).rows;
  assert.match(JSON.stringify(access),/Index Cond[^}]*partition_id/,'unpublished fact/control guards seek partition identity instead of scanning revision history');
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query("INSERT INTO mart.analytics_serving_members(tenant_id,revision_id,month,partition_id,family) VALUES('a','SYNTHETIC-COPY','2026-10-01',$1,'business')",[prior.partitionId])),/Partition identity mismatch|Incomplete or mismatched business extraction/);

  for(const family of ['review','business']){
   await tenantTransaction(db.ingestor,'a',client=>client.query("INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,family) VALUES('a',$1,'2026-10-01',$2)",[`SYNTHETIC-INVALID-${family}`,family]));
   await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query("INSERT INTO mart.analytics_serving_members(tenant_id,revision_id,month,partition_id,family) VALUES('a','SYNTHETIC-COPY','2026-10-01',$1,$2)",[`SYNTHETIC-INVALID-${family}`,family])),/Incomplete or mismatched/);
  }
  for(const table of ['review_facts','review_controls']){
   const columns=table==='review_facts'?'tenant_id,partition_id,fact_key,payload':null;
   await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query(`INSERT INTO mart.${table} ${columns?'('+columns+')':''} SELECT ${columns??'*'} FROM mart.${table} WHERE tenant_id='a' AND partition_id=$1 LIMIT 1`,[prior.partitionId])),/Exposed review contents are immutable/);
  }
  await assert.rejects(db.admin.query("DELETE FROM mart.analytics_serving_members WHERE tenant_id='a' AND revision_id=$1",[prior.revisionId]),/immutable/i);
 }finally{await db.close();}
});


test('shared event reads and discovery select only trusted measures, months and policy scope across retained history',{skip:!enabled},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  for(const month of ['2026-07','2026-08','2026-09']){
   const source=fixture(month),original:ProductionFact[]=[];
   for await(const page of source.facts)original.push(...page);
   const base=original.find(fact=>fact.measureId==='period_net_sales')!;
   const repeated=Array.from({length:20000},(_,index)=>({...base,value:'0.000001',currency:{...base.currency!,transactionValue:'0.000001'},sourceRecordId:String(index),dimensions:{...base.dimensions,customer:`${month}:customer:${index%2}`},displayLabels:{customer:`${month} customer ${index%2}`}}));
   const others=original.filter(fact=>fact.measureId!==base.measureId);
   const controls:ReviewControl[]=[...others.flatMap(fact=>[{measure:fact.measureId,dimensions:fact.dimensions,value:fact.value,count:'1'},{measure:fact.measureId,dimensions:null,value:fact.value,count:'1'}]),
    ...[0,1].map(index=>({measure:base.measureId,dimensions:{...base.dimensions,customer:`${month}:customer:${index}`},value:'0.010000',count:'10000'})),{measure:base.measureId,dimensions:null,value:'0.020000',count:'20000'}];
   await exposeReviewMonth(db.ingestor,{...source,facts:pages([...others,...repeated]),controls:async()=>controls},'business');
  }
  await db.admin.query('ANALYZE mart.review_facts');
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:'a',locale:'en' as const};
  const dateRange={from:'2026-09-01',to:'2026-09-30'};
  const result=await repository.execute({metric:'period_net_sales',dateRange},context);
  assert.equal(result.rows[0]?.value,0.02);
  assert.deepEqual((await repository.execute({metric:'period_net_sales',dateRange:{from:'2026-07-01',to:'2026-09-30'},groupBy:'month'},context)).rows.map(row=>row.value),[0.02,0.02,0.02]);
  const request={metric:'period_net_sales' as const,dateRange,limit:1,selectedIds:['2026-09:customer:1']};
  const first=await repository.searchDimensionOptions('customer',context,request);
  assert.equal(first.values.length,1);assert.equal(first.selected[0]?.id,'2026-09:customer:1');assert.ok(first.nextCursor);
  const second=await repository.searchDimensionOptions('customer',context,{...request,cursor:first.nextCursor});
  assert.equal(second.values[0]?.id,'2026-09:customer:1');assert.equal(second.nextCursor,undefined);
  for(const changed of [{...request,dateRange:{from:'2026-08-01',to:'2026-08-31'}},{...request,metric:'period_invoice_sales' as const}])await assert.rejects(repository.searchDimensionOptions('customer',context,{...changed,cursor:first.nextCursor}),/Invalid review continuation/);
  const scoped={...context,enforcedFilters:[{dimension:'customer' as const,values:['2026-09:customer:1']}]};
  assert.deepEqual((await repository.searchDimensionOptions('customer',scoped,request)).values.map(value=>value.id),['2026-09:customer:1']);
  assert.equal((await repository.execute({metric:'period_net_sales',dateRange},scoped)).rows[0]?.value,0.01);
  await assert.rejects(repository.searchDimensionOptions('customer',scoped,{...request,cursor:first.nextCursor}),/Invalid review continuation/);
  const august=await repository.searchDimensionOptions('customer',context,{...request,dateRange:{from:'2026-08-01',to:'2026-08-31'}});
  assert.ok(august.values.every(value=>value.id.startsWith('2026-08:')));assert.deepEqual(august.selected,[]);
  for(const dimension of ['salesperson','brand','customer_segment'] as const){
   const page=await repository.searchDimensionOptions(dimension,context,{metric:'period_net_sales',dateRange,limit:1});
   assert.equal(page.values[0]?.id,`fixture:${dimension}`);
  }
  await assert.rejects(repository.searchDimensionOptions('business_line',context,request),/Uncertified discovery/);
  const plans:unknown[]=[];
  await tenantTransaction(db.runtime,'a',async client=>{
   const observed={query:async(sql:string,params:unknown[])=>{
    const plan=await client.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+sql,params);plans.push(plan.rows[0]['QUERY PLAN']);return client.query(sql,params);
   }} as unknown as PoolClient;
   const {rows}=await reviewEventRows(observed,{query:{metric:'period_net_sales'},context,range:dateRange,family:'business'});
   assert.equal(rows.length,1);assert.equal(rows[0]?.payload.value,'0.020000');
  },true);
  const planText=JSON.stringify(plans);
  assert.match(planText,/review_facts_typed_access/);
  console.info('shared-read-plan',JSON.stringify({syntheticFacts:60000,index:'review_facts_typed_access',selectedMonthlyCandidates:20024}));
  const indexes=await db.admin.query("SELECT indexdef FROM pg_indexes WHERE schemaname='mart' AND indexname='review_facts_typed_access'");
  assert.match(indexes.rows[0].indexdef,/tenant_id, partition_id/);assert.match(indexes.rows[0].indexdef,/measure_id/);assert.match(indexes.rows[0].indexdef,/business_day/);
 }finally{await db.close();}
});
