import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import type {ProductionFact,CustomerCoverageMetricId,SourceMapping} from '@el-dabboos/domain';
import type {Pool} from 'pg';
import {enabled} from './support.ts';
import {deltaFixture,observedFact,factControls} from './business-delta-fixture.ts';
import {withCustomerCoverageMapping,customerCoverageObject} from '../../src/business/customer-coverage-mapping.ts';
import {runCommandBackgroundUnit} from '../../src/business/initialization-worker.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {PreparedCustomerProductCoverage} from '../../src/prepared/coverage.ts';

test('prepared completion retains never purchased, returned and negative pairs per customer and year',{skip:!enabled},async()=>{
 const {db,source,initial,accepted}=await deltaFixture();
 try{
  const mapping=withCustomerCoverageMapping(source.mapping,{version:1,years:[2025,2026],excludedProductCategories:['88'],forecast:'positive'});
  const cutoff='2026-10-21T10:00:00.000Z',seed=initial.find(fact=>fact.measureId==='internal_stock_quantity')!;
  const facts:ProductionFact[]=[];
  const add=(measure:CustomerCoverageMetricId,id:string,value:string,dimensions:ProductionFact['dimensions'])=>{
   facts.push({...observedFact(seed,cutoff,'2026-10-21'),measureId:measure,sourceObject:customerCoverageObject,sourceRecordId:id,entityId:customerCoverageObject+':'+id,value,dimensions});
  };
  for(const product of ['one','two'])add('coverage_forecast_quantity','p:'+product,'5.000000',{product,product_category:'eligible',brand:'brand',uom:'each'});
  for(const customer of ['alpha','beta'])for(const year of ['2025','2026']){
   const dimensions={customer,coverage_year:`fixture:${year}`,customer_salesperson:'current-owner',customer_state:'current-state'};
   add('coverage_customer_population',`c:${year}:${customer}`,'1.000000',dimensions);
   add('coverage_excluded_product_count',`c:${year}:${customer}`,'0.000000',dimensions);
  }
  add('coverage_net_quantity','s:2026:alpha:one','3.000000',{customer:'alpha',coverage_year:'fixture:2026',customer_salesperson:'current-owner',customer_state:'current-state',product:'one',product_category:'eligible',brand:'brand',uom:'each'});
  add('coverage_net_quantity','s:2026:alpha:two','0.000000',{customer:'alpha',coverage_year:'fixture:2026',customer_salesperson:'current-owner',customer_state:'current-state',product:'two',product_category:'eligible',brand:'brand',uom:'each'});
  add('coverage_net_quantity','s:2026:beta:one','-2.000000',{customer:'beta',coverage_year:'fixture:2026',customer_salesperson:'current-owner',customer_state:'current-state',product:'one',product_category:'eligible',brand:'brand',uom:'each'});
  add('coverage_tag_membership','t:alpha:tag','1.000000',{customer:'alpha',customer_salesperson:'current-owner',customer_state:'current-state',customer_tag:'actual-tag'});
  const result=await publishCapturedCoverage(db.ingestor,{facts,mapping,accepted,cutoff});
  const rows=(await db.admin.query(`SELECT partition_key,entity_key,item_key,amount::text,recorded FROM mart.prepared_population_rows ORDER BY partition_key,entity_key,item_key`)).rows;
  assert.equal(rows.length,8);
  assert.deepEqual(rows.filter(row=>row.partition_key==='fixture:2026').map(row=>[row.entity_key,row.item_key,row.amount,row.recorded]),[
   ['alpha','one','3.000000',true],['alpha','two','0.000000',true],['beta','one','-2.000000',true],['beta','two','0.000000',false],
  ]);
  assert.ok(rows.filter(row=>row.partition_key==='fixture:2025').every(row=>row.amount==='0.000000'&&!row.recorded));
  assert.equal((await db.admin.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',['a'])).rows[0].revision_id,result.revisionId);
  assert.equal((await tenantTransaction(db.runtime,'a',client=>client.query('SELECT count(*)::int count FROM mart.prepared_population_rows'),true)).rows[0].count,8);
  assert.equal((await tenantTransaction(db.runtime,'b',client=>client.query('SELECT count(*)::int count FROM mart.prepared_population_rows'),true)).rows[0].count,0);
  const reader=new PreparedCustomerProductCoverage(db.runtime),context={tenantId:'a',locale:'en' as const};
  const all=await reader.readCoverage({year:2026},context);
  assert.deepEqual([all.total,all.sold,all.unsold],[4,1,3]);
  assert.deepEqual(all.rows.map(row=>[row.customer.id,row.product.id,row.netQuantity,row.status]),[
   ['alpha','one','3.000000','sold'],['alpha','two','0.000000','unsold'],['beta','one','-2.000000','unsold'],['beta','two','0.000000','unsold'],
  ]);
  const tagged=await reader.readCoverage({year:2026,filters:[{dimension:'customer_tag',values:['actual-tag']}]},context);
  assert.equal(tagged.total,2);assert.ok(tagged.rows.every(row=>row.customer.id==='alpha'));
  const restricted=await reader.readCoverage({year:2026}, {...context,enforcedFilters:[{dimension:'customer',values:['beta']}]});
  assert.equal(restricted.sold,0);assert.equal(restricted.unsold,2);
  const page=await reader.readCoverage({year:2026,limit:1},context);
  assert.ok(page.nextCursor);
  const second=await reader.readCoverage({year:2026,limit:1,cursor:page.nextCursor},context);
  assert.equal(second.rows[0]?.product.id,'two');
  await assert.rejects(reader.readCoverage({year:2025,cursor:page.nextCursor},context));
  await assert.rejects(reader.readCoverage({}, {...context,enforcedFilters:[{dimension:'branch',values:['restricted']}]}));
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query(`INSERT INTO mart.prepared_population_rows SELECT tenant_id,data_id,partition_key,chunk_no,entity_key,'tampered',0,false FROM mart.prepared_population_rows LIMIT 1`)),/immutable/);
  assert.deepEqual(factControls(facts).filter(control=>control.measure==='coverage_net_quantity'&&control.dimensions===null).map(control=>control.value),['1.000000']);
 }finally{await db.close();}
});
async function publishCapturedCoverage(pool:Pool,scope:{facts:ProductionFact[];mapping:SourceMapping;accepted:{revisionId:string;partitionId:string};cutoff:string}){
 const candidate=randomUUID(),revision='SYNTHETIC CAPTURE COVERAGE',facts=scope.facts.map(fact=>({...fact,frozenRevision:revision})),controls=factControls(facts);
 await tenantTransaction(pool,'a',async client=>{
  await client.query(`INSERT INTO mart.command_capture_candidates VALUES('a',$1,'2026-10-01',$2,$3,$4,$5,$6,$7)`,[candidate,customerCoverageObject,scope.accepted.revisionId,scope.accepted.partitionId,JSON.stringify(scope.mapping),scope.cutoff,revision]);
  await client.query('INSERT INTO mart.command_capture_facts VALUES($1,$2,0,$3)',['a',candidate,JSON.stringify(facts)]);
  await client.query('INSERT INTO mart.command_capture_controls VALUES($1,$2,0,$3)',['a',candidate,JSON.stringify(controls)]);
  await client.query('INSERT INTO mart.command_capture_seals VALUES($1,$2,1,1,$3,$4)',['a',candidate,facts.length,controls.length]);
 });
 const phases:string[]=[];
 for(let unit=0;unit<200;unit++){
  const result=await runCommandBackgroundUnit({mart:pool,tenantId:'a',actorId:'synthetic',trigger:'operator',openSource:async()=>{throw new Error('Frozen coverage preparation must remain offline');}});
  phases.push(result.phase);
  if(result.phase==='published')break;
  const trusted=await tenantTransaction(pool,'a',client=>client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',['a']),true);
  assert.equal(trusted.rows[0].revision_id,scope.accepted.revisionId,'incomplete population preserves the prior trusted revision');
 }
 assert.equal(phases.at(-1),'published');
 for(const phase of ['population_inputs','population_chunk','population_sealed','population_bound'])assert.ok(phases.includes(phase),phase);
 const result=await tenantTransaction(pool,'a',client=>client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',['a']),true);
 return {revisionId:String(result.rows[0].revision_id)};
}
