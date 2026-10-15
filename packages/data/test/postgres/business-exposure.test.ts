import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticCatalog,requiredMeasures,validateProductionFact,AnalyticsResultLimitError} from '@el-dabboos/domain';
import type {ProductionFact,FactMeasureId} from '@el-dabboos/domain';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {reviewMapping} from '../../src/review/definitions.ts';
import {businessMapping} from '../../src/business/definitions.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import type {ReviewControl} from '../../src/review/source.ts';
const values:Partial<Record<FactMeasureId,string>>={period_net_sales:'120.000000',period_invoice_sales:'125.000000',period_invoice_refunds:'5.000000',period_cash_collections:'150.000000',period_collection_sales:'120.000000',customer_period_sales:'120.000000',review_customer_balance:'30.000000',internal_stock_quantity:'13.000000'};
function fixture(month='2026-09',current=false,family:'review'|'business'='business'){
 const mapping=(family==='business'?businessMapping:reviewMapping)({tenantId:'a',sourceId:'fixture',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:`SYNTHETIC BUSINESS ${month}`,current});
 const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10),cutoff='2026-11-02T09:00:00.000Z';
 const facts:ProductionFact[]=mapping.measures.map(rule=>{
  const snapshot=Object.values(semanticCatalog).some(metric=>metric.semantics.kind==='snapshot'&&metric.semantics.measure===rule.measureId),monetary=Object.values(semanticCatalog).some(metric=>metric.type==='currency'&&metric.semantics.kind!=='ratio'&&requiredMeasures(metric.id).includes(rule.measureId));
  const dimensions=Object.fromEntries(Object.keys(rule.dimensionMappings).map(dimension=>[dimension,`fixture:${dimension}`]));
  const value=rule.measureId.endsWith('_date')?`${Date.parse(month+'-05T00:00:00Z')/86400000}.000000`:values[rule.measureId]??'1.000000';
  const fact:ProductionFact={tenantId:'a',datasetId:mapping.datasetId,measureId:rule.measureId,kind:snapshot?'snapshot':'event',businessDate:snapshot?end:month+'-15',value,dimensions,sourceId:'fixture',sourceObject:rule.sourceObject,sourceRecordId:'10',componentId:'whole',sourceVersion:cutoff,sourceRevision:'1',mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,batchId:mapping.datasetId,sourceAsOf:cutoff,frozenRevision:'SYNTHETIC ONLY',status:'active',...(snapshot?{entityId:`${rule.sourceObject}:10`}:{}),...(monetary?{currency:{mode:'native',transactionCurrency:'IQD',transactionValue:value,reportingCurrency:'IQD',policyReference:rule.currencyPolicy}}:{})};
  validateProductionFact(fact,mapping);return fact;
 });
 const controls:ReviewControl[]=facts.flatMap(fact=>[{measure:fact.measureId,dimensions:fact.dimensions,value:fact.value,count:'1'},{measure:fact.measureId,dimensions:null,value:fact.value,count:'1'}]);
 return {tenantId:'a',month,mapping,cutoff,revision:'SYNTHETIC ONLY',facts:pages(facts),controls:async()=>controls,assertAlive:async()=>{}};
}
async function* pages(facts:ProductionFact[]){yield facts;}
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
  for(const table of ['review_facts','review_controls'])await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query(`INSERT INTO mart.${table} SELECT * FROM mart.${table} WHERE tenant_id='a' AND partition_id=$1 LIMIT 1`,[prior.partitionId])),/Exposed review contents are immutable/);
  await assert.rejects(db.admin.query("DELETE FROM mart.analytics_serving_members WHERE tenant_id='a' AND revision_id=$1",[prior.revisionId]),/immutable/i);
 }finally{await db.close();}
});
