import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {reviewMapping} from '../../src/review/definitions.ts';
import {mapReviewRow} from '../../src/review/mapper.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import type {ReviewControl} from '../../src/review/source.ts';
import type {FactMeasureId,ProductionFact} from '@el-dabboos/domain';
const values:Partial<Record<FactMeasureId,string>>={customer_cash_collected:'150.000000',cash_applied_to_invoices:'100.000000',unallocated_customer_receipts:'50.000000',collection_amount_days:'2000.000000',collection_applied_amount:'100.000000',order_margin:'40.000000',order_untaxed_value:'200.000000',net_invoiced_revenue:'120.000000',invoiced_revenue:'125.000000',refund_value:'5.000000',receivables_due_for_collection:'30.000000'};
function fixture(legacy?:'1'|'2'){
 let specification=reviewMapping({tenantId:'a',sourceId:'fixture',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:'review-synthetic'});
 if(legacy)specification={...specification,mappingId:`collections-product-margin-v${legacy}`,mappingVersion:legacy,measures:specification.measures.map(rule=>({...rule,amountBasis:legacy==='1'?'Exact company-currency source operands; ratios derived from matching totals':rule.amountBasis,recognitionRule:rule.sourceObject==='account_payment'?'payment date; allocations at extraction cutoff':rule.recognitionRule}))};
 const source={cutoff:'2026-10-13T09:00:00.000Z',revision:'SYNTHETIC REVIEW ONLY',companyIds:['1']};
 const facts=specification.measures.map(rule=>mapReviewRow({source_record_id:'10',source_object:rule.sourceObject,component_id:'whole',business_date:rule.measureId==='receivables_due_for_collection'?'2026-09-30':'2026-09-15',company_id:'1',currency:'IQD',measure_id:rule.measureId,value:values[rule.measureId]!,invalid:false,customer:'20',salesperson:'30',business_line:'40',product:'50',product_category:'60'},specification,source));
 const controls:ReviewControl[]=facts.flatMap(fact=>[{measure:fact.measureId,dimensions:fact.dimensions,value:fact.value,count:'1'},{measure:fact.measureId,dimensions:null,value:fact.value,count:'1'}]);
 return {tenantId:'a',month:'2026-09',mapping:specification,...source,facts:pages(facts),controls:async()=>controls,assertAlive:async()=>{}};
}
async function* pages(facts:ProductionFact[]){for(let offset=0;offset<facts.length;offset+=1000)yield facts.slice(offset,offset+1000);}
async function setup(){const db=await database();await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');return db;}
for(const legacyVersion of ['1','2'] as const)test(`v${legacyVersion} pending Finance review exposes eight metrics and product breakdowns through one trusted manifest; runtime stays read-only`, {skip:!enabled},async()=>{
 const db=await setup();
 try{
  const before=(await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id;
  const result=await exposeReviewMonth(db.ingestor,fixture(legacyVersion));assert.equal(result.financeReview,'pending');
  await assert.rejects(exposeReviewMonth(db.ingestor,fixture()),/Newer review source cutoff/);
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:'a',locale:'en' as const};
  const published=await repository.getPublishedCapabilities(context);assert.equal(published.releases.filter(release=>release.financeReview==='pending').length,1);
  assert.equal(published.releases.find(release=>release.financeReview==='pending')?.mappingVersion,legacyVersion,'existing v1/v2 publications remain executable after the v3 source policy');
  for(const [metric,expected] of [['customer_cash_collected',150],['cash_applied_to_invoices',100],['unallocated_customer_receipts',50],['customer_collection_ratio',125],['weighted_collection_days',20],['receivables_due_for_collection',30],['order_margin',40],['order_margin_percentage',20]] as const){
   const output=await repository.execute({metric,dateRange:{from:'2026-09-01',to:'2026-09-30'}},context);assert.equal(output.rows[0]?.value,expected);assert.equal(output.metadata.release?.financeReview,'pending');
  }
  assert.equal((await repository.execute({metric:'net_invoiced_revenue',groupBy:'customer',dateRange:{from:'2026-09-01',to:'2026-09-30'}},context)).rows[0]?.value,120);
  const product=await repository.execute({metric:'net_invoiced_revenue',groupBy:'product',dateRange:{from:'2026-09-01',to:'2026-09-30'}},context);assert.deepEqual(product.rows,[{key:'fixture:50',value:120}]);
  assert.deepEqual(await repository.listDimensionOptions('product',context),[{id:'fixture:50'}]);
  assert.deepEqual((await repository.searchDimensionOptions('customer',context,{metric:'customer_cash_collected',asOf:'2026-09-30',selectedIds:['fixture:20']})).selected,[{id:'fixture:20'}]);
  assert.deepEqual((await repository.searchDimensionOptions('product',context,{metric:'net_invoiced_revenue',asOf:'2026-09-30'})).values,[{id:'fixture:50'}]);
  await assert.rejects(repository.execute({metric:'customer_cash_collected',groupBy:'salesperson',dateRange:{from:'2026-09-01',to:'2026-09-30'}},context));
  await assert.rejects(repository.execute({metric:'customer_cash_collected',dateRange:{from:'2026-08-01',to:'2026-09-30'}},context));
  const scoped={...context,enforcedFilters:[{dimension:'customer' as const,values:['fixture:other']}]};
  assert.equal((await repository.execute({metric:'customer_cash_collected',dateRange:{from:'2026-09-01',to:'2026-09-30'}},scoped)).rows[0]?.value,0);
  await tenantTransaction(db.runtime,'other',async client=>assert.equal((await client.query('SELECT count(*) FROM mart.review_facts')).rows[0].count,'0'),true);
  await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query("INSERT INTO mart.review_controls VALUES('a','bad','order_margin','summary',NULL,1,1)"),false),/permission denied/);
  assert.equal((await db.admin.query("SELECT count(*) FROM mart.analytics_serving_members WHERE tenant_id='a' AND revision_id=$1 AND family='facts'",[before])).rows[0].count,(await db.admin.query("SELECT count(*) FROM mart.analytics_serving_members WHERE tenant_id='a' AND revision_id=$1 AND family='facts'",[result.revisionId])).rows[0].count);
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query("INSERT INTO mart.review_controls VALUES('a',$1,'order_margin','extra','{}',0,0)",[result.partitionId])),/immutable/);
 }finally{await db.close();}
});
test('mismatched, incomplete and interrupted extractions roll back facts, controls and the trusted pointer', {skip:!enabled},async()=>{
 const db=await setup();
 try{
  const before=(await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id;
  const candidate=fixture(),controls=await candidate.controls();
  await assert.rejects(exposeReviewMonth(db.ingestor,{...fixture(),controls:async()=>controls.map(control=>control.measure==='customer_cash_collected'?{...control,value:'151.000000'}:control)}),/do not match/);
  await assert.rejects(exposeReviewMonth(db.ingestor,{...fixture(),controls:async()=>controls.map(control=>control.measure==='customer_cash_collected'&&control.dimensions!==null?{...control,value:'151.000000'}:control)}),/do not match/);
  await assert.rejects(exposeReviewMonth(db.ingestor,{...fixture(),controls:async()=>controls.map(control=>control.measure==='customer_cash_collected'&&control.dimensions!==null?{...control,count:'2'}:control)}),/do not match/);
  await assert.rejects(exposeReviewMonth(db.ingestor,{...fixture(),controls:async()=>controls.filter(control=>control.measure!=='cash_applied_to_invoices')}),/do not match/);
  await assert.rejects(exposeReviewMonth(db.ingestor,{...fixture(),assertAlive:async()=>{throw new Error('Source lease lost');}}),/lease lost/);
  assert.equal((await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id,before);
  assert.equal((await db.admin.query('SELECT count(*) FROM mart.review_facts')).rows[0].count,'0');
 }finally{await db.close();}
});

test('many distinct source-control tuples reconcile within bounded execution without weakening exact groups',{skip:!enabled,timeout:45000},async()=>{
 const db=await setup();
 try{
  const source=fixture(),original:ProductionFact[]=[];
  for await(const page of source.facts)original.push(...page);
  const customers=5000,facts:ProductionFact[]=[];
  for(let index=0;index<customers;index++)for(const fact of original)facts.push({...fact,sourceRecordId:`synthetic-${index}`,dimensions:{...fact.dimensions,customer:`fixture:${index}`},...(fact.entityId?{entityId:`fixture:${index}`}:{})});
  const tuples=facts.map(fact=>({measure:fact.measureId,dimensions:fact.dimensions,value:fact.value,count:'1'}));
  const summaries=original.map(fact=>({measure:fact.measureId,dimensions:null,value:(BigInt(fact.value.replace('.',''))*BigInt(customers)/1000000n).toString()+'.000000',count:String(customers)}));
  const result=await exposeReviewMonth(db.ingestor,{...source,facts:pages(facts),controls:async()=>[...tuples,...summaries]});
  assert.equal(result.facts,customers*original.length);assert.equal(result.controls,facts.length+original.length);
  const output=await new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}).execute({metric:'customer_cash_collected',dateRange:{from:'2026-09-01',to:'2026-09-30'}},{tenantId:'a',locale:'en'});
  assert.equal(output.rows[0]?.value,750000);
 }finally{await db.close();}
});
