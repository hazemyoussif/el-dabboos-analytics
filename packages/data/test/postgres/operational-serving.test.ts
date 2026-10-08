import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AnalyticsCursor,AnalyticsPartition,ProductionFact } from '@el-dabboos/domain';
import { requiredMeasures } from '@el-dabboos/domain';
import { AnalyticsOperations } from '../../../application/src/analytics-operations.ts';
import { database,enabled } from './support.ts';
import { deploy,mapping,fact,clock } from './fixtures.ts';
import { tenantTransaction } from '../../src/postgres/session.ts';
import { bootstrapOperationalServing,readBaseline } from '../../src/operational/baseline.ts';
import { PostgresOperationalStore } from '../../src/operational/store.ts';
import { TrustedAnalyticsRepository } from '../../src/operational/repository.ts';
import type { OperationalSnapshot,OperationalBaseline,ExactControl } from '../../src/operational/contracts.ts';

class FixtureSnapshot implements OperationalSnapshot {
 cutoff='2026-10-07T12:00:00.000Z';revision='synthetic-operational-freeze';mappingVersion='1';definitionVersion='';
 missing=new Set<string>();retired:readonly {object:string;id:string;version:string;revision:string;updatedAt:string}[]=[];
 rows:ProductionFact[]=[];failControls=false;interrupt=false;
 close(){return Promise.resolve();}
 async *records(_baseline:OperationalBaseline,_cursor:AnalyticsCursor|null){void _baseline;void _cursor;yield {object:'fixture',facts:this.rows,rows:this.rows.length,retired:this.retired};if(this.interrupt)throw new Error('Synthetic process interruption');}
 async *recordsMonth(){yield* [];}
 async *snapshots(){yield* [];}
 async *presence(object:string,pages:AsyncIterable<readonly string[]>){for await(const ids of pages)yield {ids,present:await this.present(object,ids)};}
 present(_object:string,ids:readonly string[]){void _object;return Promise.resolve(ids.filter(id=>!this.missing.has(id)));}
 controls(_baseline:OperationalBaseline,partitions:readonly AnalyticsPartition[]):Promise<ExactControl[]>{void _baseline;return Promise.resolve(fixtureControls(this.rows,partitions,this.failControls));}
}
function fixtureControls(facts:ProductionFact[],partitions:readonly AnalyticsPartition[],fail:boolean):ExactControl[] {
 const seen=new Set<string>();
 return partitions.flatMap(partition=>requiredMeasures(partition.metric).flatMap(measure=>{
  const key=JSON.stringify([partition.month,partition.dimension,partition.identity,measure]);if(seen.has(key))return [];seen.add(key);
  const selected=facts.filter(fact=>fact.status==='active'&&fact.measureId===measure&&fact.businessDate.slice(0,7)===partition.month&&(!partition.dimension||fact.dimensions[partition.dimension]===partition.identity));
  const value=selected.reduce((total,fact)=>total+BigInt(fact.value.replace('.','')),0n)+(fail?1000000n:0n);
  return [{partition,measure,value:`${value/1000000n}.${String(value%1000000n).padStart(6,'0')}`,count:String(selected.length)}];
 }));
}
async function setup(object='fixture',ratio=false,customer=false) {
 const db=await database();const specification=mapping();if(customer){specification.measures=specification.measures.map(rule=>({...rule,dimensionMappings:{customer:'synthetic customer'}}));specification.capabilities=specification.capabilities.map(capability=>({...capability,dimensions:['customer','date','month','quarter','year']}));}if(ratio){specification.measures=specification.measures.slice(0,2).map((rule,index)=>({...rule,measureId:index===0?'order_revenue':'order_count',dimensionMappings:{salesperson:'synthetic owner'}}));specification.capabilities=['order_revenue','order_count','average_confirmed_order_value'].map(metric=>({metric:metric as typeof specification.capabilities[number]['metric'],dimensions:['salesperson','month']}));}await deploy(db.migrator,{...specification,measures:specification.measures.map(rule=>({...rule,sourceObject:object}))});
 if(ratio){const {PostgresDerivedMetricCertification}=await import('../../src/postgres/derived-certification.ts');await new PostgresDerivedMetricCertification(db.migrator).record({tenantId:'a',datasetId:'release',mappingVersion:'1',reference:'SYNTHETIC-OPERATIONAL-RATIO',metric:'average_confirmed_order_value',grouping:null,from:'2026-01-01',to:'2026-01-31',caseIds:['fixture-certification-order_revenue','fixture-certification-order_count'],approvalReference:'SYNTHETIC-APPROVER',approvedAt:clock().toISOString(),businessSemantics:'Synthetic exact full-period ratio',technicalReference:'synthetic-controls'});}
 await bootstrapOperationalServing(db.migrator,'a');
 const baseline=await tenantTransaction(db.ingestor,'a',client=>readBaseline(client,'a'),true),source=new FixtureSnapshot();source.definitionVersion=baseline.definitionVersion;
 const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
 async function run(kind:'sync'|'sweep'|'daily'='sync'){const started=performance.now(),runId=randomUUID();const result=await new AnalyticsOperations({store:new PostgresOperationalStore(db.ingestor,runId),source:{open:async()=>source},runId:()=>runId,clock:()=>new Date(),impact:{through:'2026-12-31',movingAverageWindows:[],runningTotals:false,yearOverYear:false,contribution:false,snapshotDependencies:()=>[]}}).run({tenantId:'a',actorId:'synthetic-operator',trigger:'manual',kind});const details=(await db.admin.query('SELECT details FROM mart.analytics_run_details WHERE run_id=$1',[runId])).rows[0].details;process.stdout.write(`synthetic-operational-benchmark ${JSON.stringify({kind,status:result.status,recordsChanged:result.recordsChanged,partitionsAffected:result.partitionsAffected,caseCount:result.caseCount,operationMs:performance.now()-started,...details.durations})}\n`);return result;}
 return {db,source,repository,run};
}
function januaryFact(patch:Partial<ProductionFact>={}){return fact('old-row',{businessDate:'2026-01-15',sourceVersion:'oct-update',sourceRevision:'2',sourceAsOf:'2026-10-07T12:00:00.000Z',frozenRevision:'synthetic-operational-freeze',...patch});}
async function januaryValue(repository:TrustedAnalyticsRepository){return (await repository.execute({metric:'revenue',dateRange:{from:'2026-01-01',to:'2026-01-31'}},{tenantId:'a',locale:'en'})).rows[0]?.value;}

test('concrete operational transaction promotes January correction discovered in October; ratio bases and rerun remain stable',{skip:!enabled},async()=>{
 const f=await setup();try {
  f.source.rows=[januaryFact()];const run=await f.run();assert.equal(run.status,'passed');assert.equal(await januaryValue(f.repository),100);
  const details=(await f.db.admin.query('SELECT details FROM mart.analytics_run_details WHERE run_id=$1',[run.runId])).rows[0].details;
  assert.deepEqual(details.refreshedMonths,['2026-01']);assert.ok(details.partitions.every((partition:AnalyticsPartition)=>partition.month==='2026-01'));
  const before=(await f.db.admin.query('SELECT count(*) count FROM mart.analytics_fact_revisions')).rows[0].count;
  const rerun=await f.run();assert.equal(rerun.status,'unchanged');assert.equal(rerun.servingRelease,run.servingRelease);
  assert.equal((await f.db.admin.query('SELECT count(*) count FROM mart.analytics_fact_revisions')).rows[0].count,before);
  assert.equal((await f.db.admin.query('SELECT count(*) count FROM mart.release_certifications')).rows[0].count,'1');
  assert.equal((await f.repository.getPublishedCapabilities({tenantId:'a',locale:'en'})).mode,'certified');
  const hidden=await tenantTransaction(f.db.runtime,'b',client=>client.query('SELECT * FROM mart.analytics_aggregate_bases'),true);assert.equal(hidden.rowCount,0);
 }finally{await f.db.close();}
});
test('failed reconciliation stores exact failed evidence and preserves prior pointer, canonical heads and cursor',{skip:!enabled},async()=>{
 const f=await setup();try {
  f.source.rows=[januaryFact()];const pass=await f.run();
  const cursor=(await f.db.admin.query('SELECT cutoff FROM mart.analytics_source_cursors')).rows[0].cutoff.toISOString();
  f.source.cutoff='2026-10-07T12:05:00.000Z';f.source.rows=[januaryFact({value:'200.000000',currency:{mode:'native',transactionCurrency:'IQD',transactionValue:'200.000000',reportingCurrency:'IQD',policyReference:'test-native'},sourceVersion:'changed',sourceRevision:'3'})];f.source.failControls=true;
  const failed=await f.run();assert.equal(failed.status,'failed');assert.equal(failed.servingRelease,pass.servingRelease);assert.equal(await januaryValue(f.repository),100);
  assert.equal((await f.db.admin.query('SELECT cutoff FROM mart.analytics_source_cursors')).rows[0].cutoff.toISOString(),cursor);
  assert.ok((await f.db.admin.query('SELECT count(*)::int count FROM mart.analytics_exact_cases WHERE expected_value<>actual_value')).rows[0].count>0);
 }finally{await f.db.close();}
});
test('process interruption rolls back candidate; retry is safe and records failure separately',{skip:!enabled},async()=>{
 const f=await setup();try {
  f.source.rows=[januaryFact()];f.source.interrupt=true;await assert.rejects(f.run(),/interruption/);assert.equal(await januaryValue(f.repository),0);
  assert.equal((await f.db.admin.query('SELECT count(*) count FROM mart.analytics_fact_revisions')).rows[0].count,'0');
  assert.equal((await f.db.admin.query('SELECT count(*) count FROM mart.analytics_operation_failures')).rows[0].count,'1');
  f.source.interrupt=false;assert.equal((await f.run()).status,'passed');assert.equal(await januaryValue(f.repository),100);
 }finally{await f.db.close();}
});

test('query plan evidence measures current-head month reconciliation before indexing',{skip:!enabled},async()=>{
 const f=await setup();try {
  const payload=januaryFact();
  await tenantTransaction(f.db.ingestor,'a',async client=>{
   await client.query(`INSERT INTO mart.analytics_fact_revisions SELECT 'a',id::text,'plan-fixture',jsonb_set(jsonb_set($1::jsonb,'{businessDate}',to_jsonb(CASE WHEN id<=100 THEN '2026-01-15' ELSE '2026-02-15' END::text)),'{sourceRecordId}',to_jsonb(id::text)) FROM generate_series(1,5000) id`,[JSON.stringify(payload)]);
   await client.query("INSERT INTO mart.analytics_fact_heads(tenant_id,fact_key,revision_id) SELECT tenant_id,fact_key,revision_id FROM mart.analytics_fact_revisions WHERE tenant_id='a'");
   await client.query('ANALYZE mart.analytics_fact_revisions');await client.query('ANALYZE mart.analytics_fact_heads');
   const plan=(await client.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT sum((payload->>'value')::numeric) FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id) WHERE head.tenant_id=$1 AND head.status='active' AND head.business_month=$2 AND head.measure_id=$3`,['a','2026-01','revenue'])).rows[0]['QUERY PLAN'][0];
   process.stdout.write(`operational-plan ${JSON.stringify(plan)}\n`);
  });
 }finally{await f.db.close();}
});

for(const [label,relation] of [['mart write','analytics_fact_revisions'],['aggregate refresh','analytics_aggregate_bases']] as const) {
 test(`${label} failure rolls back canonical revisions, trusted pointer and cursor`,{skip:!enabled},async()=>{
  const f=await setup();try {
   const previous=(await f.db.admin.query('SELECT revision_id FROM mart.analytics_trusted_serving')).rows[0].revision_id;
   const cursor=(await f.db.admin.query('SELECT cutoff FROM mart.analytics_source_cursors')).rows[0].cutoff.toISOString();
   await f.db.migrator.query("CREATE FUNCTION mart.inject_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic injected failure'; END $$");
   await f.db.migrator.query(`CREATE TRIGGER inject_failure BEFORE INSERT ON mart.${relation} FOR EACH ROW EXECUTE FUNCTION mart.inject_failure()`);
   f.source.rows=[januaryFact()];await assert.rejects(f.run(),/injected failure/);
   assert.equal((await f.db.admin.query('SELECT revision_id FROM mart.analytics_trusted_serving')).rows[0].revision_id,previous);
   assert.equal((await f.db.admin.query('SELECT cutoff FROM mart.analytics_source_cursors')).rows[0].cutoff.toISOString(),cursor);
   assert.equal((await f.db.admin.query('SELECT count(*) count FROM mart.analytics_fact_revisions')).rows[0].count,'0');
   await f.db.migrator.query(`DROP TRIGGER inject_failure ON mart.${relation}`);assert.equal((await f.run()).status,'passed');
  }finally{await f.db.close();}
 });
}
test('business-date and dimension move reconciles old and new groups and refreshes only the two months',{skip:!enabled},async()=>{
 const f=await setup();try {
  f.source.rows=[januaryFact()];await f.run();
  f.source.rows=[januaryFact({businessDate:'2026-02-01',dimensions:{branch:'baghdad'},sourceVersion:'moved',sourceRevision:'3'})];const run=await f.run();assert.equal(run.status,'passed');
  const details=(await f.db.admin.query('SELECT details FROM mart.analytics_run_details WHERE run_id=$1',[run.runId])).rows[0].details;
  assert.deepEqual(details.refreshedMonths,['2026-01','2026-02']);
  assert.ok(details.partitions.some((partition:AnalyticsPartition)=>partition.identity==='cairo'&&partition.month==='2026-01'));
  assert.ok(details.partitions.some((partition:AnalyticsPartition)=>partition.identity==='baghdad'&&partition.month==='2026-02'));
  assert.equal(await januaryValue(f.repository),0);
  assert.equal((await f.db.admin.query('SELECT count(*) count FROM mart.analytics_fact_revisions')).rows[0].count,'2');
 }finally{await f.db.close();}
});

test('snapshot revisions use the last eligible cutoff and never sum January and February balances',{skip:!enabled},async()=>{
 const f=await setup();try {
  f.source.rows=[januaryFact({measureId:'outstanding_amount',entityId:'customer-1',kind:'snapshot'}),januaryFact({measureId:'outstanding_amount',entityId:'customer-1',kind:'snapshot',businessDate:'2026-02-28',value:'60.000000',currency:{mode:'native',transactionCurrency:'IQD',transactionValue:'60.000000',reportingCurrency:'IQD',policyReference:'test-native'}})];
  assert.equal((await f.run()).status,'passed');
  const result=await f.repository.execute({metric:'outstanding_amount',dateRange:{from:'2026-01-31',to:'2026-02-28'}},{tenantId:'a',locale:'en'});
  assert.equal(result.rows[0]?.value,60);assert.equal(result.metadata.snapshotAsOf,'2026-02-28');
  for(const [end,value,asOf] of [['2026-02-17',100,'2026-01-15'],['2026-10-08',60,'2026-02-28']] as const){
   const selected=await f.repository.execute({metric:'outstanding_amount',dateRange:{from:'2026-01-01',to:end}},{tenantId:'a',locale:'en'});
   assert.equal(selected.rows[0]?.value,value);assert.equal(selected.metadata.snapshotAsOf,asOf);
  }
  const absent=await f.repository.execute({metric:'outstanding_amount',dateRange:{from:'2026-01-01',to:'2026-01-14'}},{tenantId:'a',locale:'ar'});
  assert.equal(absent.rows[0]?.value,null);assert.deepEqual(absent.metadata.availability,{state:'DATA_NOT_READY',reason:'no_snapshot'});
 }finally{await f.db.close();}
});

test('covered zero events differ from unavailable future partitions and valid large cent totals',{skip:!enabled},async()=>{
 const f=await setup();try {
  const value='17828645788.140000';f.source.rows=[januaryFact({value,currency:{mode:'native',transactionCurrency:'IQD',transactionValue:value,reportingCurrency:'IQD',policyReference:'test-native'}})];
  assert.equal((await f.run()).status,'passed');
  const query=(from:string,to:string)=>f.repository.execute({metric:'revenue',dateRange:{from,to}},{tenantId:'a',locale:'en'});
  const zero=await query('2026-01-01','2026-01-02');assert.equal(zero.rows[0]?.value,0);assert.equal(zero.metadata.coverage?.status,'complete');
  const unavailable=await query('2026-02-01','2026-02-28');assert.equal(unavailable.rows[0]?.value,null);assert.equal(unavailable.metadata.availability?.state,'DATA_NOT_READY');
  const partial=await query('2026-01-01','2026-10-08');assert.equal(partial.rows[0]?.value,17828645788.14);assert.equal(partial.metadata.availability?.state,'PARTIAL_COVERAGE');
 }finally{await f.db.close();}
});

test('zero ratio denominator stays nullable in trusted serving',{skip:!enabled},async()=>{
 const f=await setup('fixture',true);try {
  f.source.rows=[januaryFact({measureId:'order_revenue',dimensions:{salesperson:'fixture-owner'}}),januaryFact({measureId:'order_count',value:'0.000000',dimensions:{salesperson:'fixture-owner'}})];
  assert.equal((await f.run()).status,'passed');
  const result=await f.repository.execute({metric:'average_confirmed_order_value',dateRange:{from:'2026-01-01',to:'2026-01-31'}},{tenantId:'a',locale:'en'});
  assert.equal(result.rows[0]?.value,null);assert.equal(result.metadata.availability,undefined);
 }finally{await f.db.close();}
});

test('presence sweep tombstones a missing source identity, preserves immutable revision and does not advance write cursor',{skip:!enabled},async()=>{
 const f=await setup('sale_order');try {
  f.source.rows=[januaryFact({sourceObject:'sale_order'}),januaryFact({sourceObject:'sale_order',measureId:'order_count',value:'1.000000'})];await f.run();
  const cursor=(await f.db.admin.query('SELECT cutoff FROM mart.analytics_source_cursors')).rows[0].cutoff.toISOString();
  f.source.rows=[];f.source.missing.add('old-row');const sweep=await f.run('sweep');assert.equal(sweep.status,'passed');assert.equal(sweep.recordsChanged,1);assert.equal(await januaryValue(f.repository),0);
  assert.equal((await f.db.admin.query('SELECT count(*) count FROM mart.analytics_fact_revisions')).rows[0].count,'4');
  assert.equal((await f.db.admin.query('SELECT cutoff FROM mart.analytics_source_cursors')).rows[0].cutoff.toISOString(),cursor);
  assert.equal((await f.run('sweep')).status,'unchanged');
 }finally{await f.db.close();}
});
test('ineligible date-less source identity retires its existing January footprint without inventing a business date',{skip:!enabled},async()=>{
 const f=await setup();try {
  f.source.rows=[januaryFact()];await f.run();f.source.rows=[];
  f.source.retired=[{object:'fixture',id:'old-row',version:'retired',revision:'3',updatedAt:f.source.cutoff}];
  assert.equal((await f.run()).status,'passed');assert.equal(await januaryValue(f.repository),0);
  assert.equal((await f.run()).status,'unchanged');
 }finally{await f.db.close();}
});


test('trusted multi-month ratio weights complete additive bases instead of averaging monthly averages',{skip:!enabled},async()=>{
 const f=await setup('fixture',true);try {
  f.source.rows=[januaryFact(),januaryFact({measureId:'order_count',value:'1.000000'}),januaryFact({businessDate:'2026-02-15',value:'900.000000',currency:{mode:'native',transactionCurrency:'IQD',transactionValue:'900.000000',reportingCurrency:'IQD',policyReference:'test-native'}}),januaryFact({measureId:'order_count',businessDate:'2026-02-15',value:'3.000000'})];
  // Event identity is stable across date moves; two source rows represent two months.
  f.source.rows=f.source.rows.map((row,index)=>({...row,measureId:row.measureId==='revenue'?'order_revenue':row.measureId,dimensions:{salesperson:'fixture-owner'},sourceRecordId:index<2?'january':'february'}));
  assert.equal((await f.run()).status,'passed');
  const result=await f.repository.execute({metric:'average_confirmed_order_value',dateRange:{from:'2026-01-01',to:'2026-02-28'}},{tenantId:'a',locale:'en'});assert.equal(result.rows[0]?.value,250);
 }finally{await f.db.close();}
});
test('failed daily reconciliation persists failure evidence without a discovery savepoint or cursor advance',{skip:!enabled},async()=>{
 const f=await setup();try {
  const before=(await f.db.admin.query('SELECT revision_id FROM mart.analytics_trusted_serving')).rows[0].revision_id;
  f.source.failControls=true;const run=await f.run('daily');assert.equal(run.status,'failed');assert.equal(run.servingRelease,before);assert.ok(run.caseCount>0);assert.equal(await januaryValue(f.repository),0);
 }finally{await f.db.close();}
});
test('source closure failure occurs before mart commit and preserves the trusted release',{skip:!enabled},async()=>{
 const f=await setup();try {
  f.source.rows=[januaryFact()];f.source.close=()=>Promise.reject(new Error('Synthetic owner lease lost'));
  await assert.rejects(f.run(),/lease lost/);assert.equal(await januaryValue(f.repository),0);assert.equal((await f.db.admin.query('SELECT count(*) count FROM mart.analytics_fact_revisions')).rows[0].count,'0');
 }finally{await f.db.close();}
});
test('stored baseline business dates do not shift with the operator host timezone',{skip:!enabled},async()=>{
 const f=await setup(),previous=process.env.TZ;try {
  process.env.TZ='Africa/Cairo';const baseline=await tenantTransaction(f.db.ingestor,'a',client=>readBaseline(client,'a'),true);assert.equal(baseline.from,'2026-01-01');assert.equal(baseline.to,'2026-01-31');
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;await f.db.close();}
});

test('cached-proof-only anchor refuses missing proof instead of recomputing or returning an uncertified zero',{skip:!enabled},async()=>{
 const f=await setup();try {
  await tenantTransaction(f.db.migrator,'a',client=>client.query("SELECT mart.refresh_proof_results('a','release')"));
  const {PostgresAnalyticsRepository}=await import('../../src/postgres/repository.ts');const anchor=new PostgresAnalyticsRepository(f.db.runtime,{reportingCurrencies:{a:'IQD'},storedProofsOnly:true});
  const query={metric:'revenue' as const,dateRange:{from:'2026-01-01',to:'2026-01-31'}},context={tenantId:'a',locale:'en' as const};assert.equal((await anchor.execute(query,context)).rows[0]?.value,0);
  await tenantTransaction(f.db.migrator,'a',client=>client.query("DELETE FROM mart.technical_proof_results"));await assert.rejects(anchor.execute(query,context),/Uncertified|approved serving binding/);
  assert.equal((await f.db.admin.query('SELECT count(*) count FROM mart.technical_proof_results')).rows[0].count,'0');assert.equal(await januaryValue(f.repository),0);
 }finally{await f.db.close();}
});

test('trusted event coverage uses approved business timezone at a UTC midnight boundary',{skip:!enabled},async()=>{
 const f=await setup();try {
  f.source.cutoff='2026-10-07T22:00:00.000Z';f.source.rows=[januaryFact({businessDate:'2026-10-08',sourceAsOf:f.source.cutoff})];assert.equal((await f.run()).status,'passed');
  const result=await f.repository.execute({metric:'revenue',dateRange:{from:'2026-10-08',to:'2026-10-08'}},{tenantId:'a',locale:'en'});assert.equal(result.rows[0]?.value,100);
 }finally{await f.db.close();}
});

test('serving SQL limits categorical keys and label metadata to the selected business range',{skip:!enabled},async()=>{
 const f=await setup('fixture',false,true);try {
  f.source.rows=[januaryFact({sourceRecordId:'january',dimensions:{customer:'january-customer'},displayLabels:{customer:'SYNTHETIC January'}}),januaryFact({sourceRecordId:'february',businessDate:'2026-02-15',dimensions:{customer:'february-customer'},displayLabels:{customer:'SYNTHETIC February'}})];assert.equal((await f.run()).status,'passed');
  const {servingRows}=await import('../../src/operational/serving-query.ts'),{servingLabels}=await import('../../src/operational/serving-labels.ts');
  const query={metric:'revenue' as const,groupBy:'customer' as const,dateRange:{from:'2026-01-01',to:'2026-01-31'}},context={tenantId:'a',locale:'en' as const};
  await tenantTransaction(f.db.runtime,'a',async client=>{
   const result=await servingRows(client,query,context,{from:'2026-01-01',to:'2026-10-08'},4000);assert.deepEqual(result.rows,[{key:'january-customer',value:100}]);
   assert.deepEqual(await servingLabels(client,'customer',context,query,result.rows.map(row=>row.key)),{'january-customer':'SYNTHETIC January'});
  },true);
 }finally{await f.db.close();}
});

test('stored trusted outputs refuse a changed trusted reporting currency',{skip:!enabled},async()=>{
 const f=await setup();try {
  f.source.rows=[januaryFact()];await f.run();const changed=new TrustedAnalyticsRepository(f.db.runtime,{reportingCurrencies:{},reportingCurrency:async()=> 'USD'});
  await assert.rejects(changed.execute({metric:'revenue',dateRange:{from:'2026-01-01',to:'2026-01-31'}},{tenantId:'a',locale:'en'}),/currency mismatch/);assert.equal(await januaryValue(f.repository),100);
 }finally{await f.db.close();}
});
test('stored published capabilities exclude metrics lacking the enforced policy dimension proof',{skip:!enabled},async()=>{
 const f=await setup();try {
  const caps=await f.repository.getPublishedCapabilities({tenantId:'a',locale:'en',enforcedFilters:[{dimension:'branch',values:['cairo']}]});assert.ok(caps.releases.every(release=>release.capabilities.length===0));
 }finally{await f.db.close();}
});
test('jobs refuse a prior executable metric-definition baseline without rewriting it',{skip:!enabled},async()=>{
 const db=await database();try {
  const specification=mapping();await deploy(db.migrator,specification);const {PostgresAnalyticsRepository}=await import('../../src/postgres/repository.ts');const caps=await new PostgresAnalyticsRepository(db.migrator,{reportingCurrencies:{a:'IQD'}}).getPublishedCapabilities({tenantId:'a',locale:'en'});
  await tenantTransaction(db.migrator,'a',client=>client.query('INSERT INTO mart.analytics_baselines VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',['a','fixture','IQD',['release'],'prior-definition','1',JSON.stringify([specification]),JSON.stringify(caps),'2026-01-01','2026-01-31']));
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>readBaseline(client,'a'),true),/metric-definition migration/);
  assert.equal((await db.admin.query('SELECT definition_version FROM mart.analytics_baselines')).rows[0].definition_version,'prior-definition');
 }finally{await db.close();}
});
