import { migratePostgres } from '../../src/postgres/migrations.ts';
import { persistOperationalFact } from '../../src/operational/facts.ts';
import { TrustedDrillThroughRepository } from '../../src/operational/drill-through.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AnalyticsCursor,AnalyticsPartition,ProductionFact,DimensionId } from '@el-dabboos/domain';
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
async function setup(object='fixture',ratio=false,customer=false,dimensions?:DimensionId[],events=false,certifyRatioBeforeBootstrap=true) {
 const db=await database();const specification=mapping();if(events){const measures=['order_revenue','order_count','invoiced_revenue','refund_value','net_invoiced_revenue','invoice_count','refund_count'] as const;specification.measures=measures.map(measureId=>({...specification.measures[0]!,measureId,dimensionMappings:{customer:'synthetic customer',salesperson:'synthetic salesperson',business_line:'synthetic business line'}}));specification.capabilities=measures.map(metric=>({metric,dimensions:['customer','salesperson','business_line','date','month','year']}));}if(dimensions){specification.measures=specification.measures.filter(rule=>rule.measureId==='revenue').map(rule=>({...rule,dimensionMappings:Object.fromEntries(dimensions.map(dimension=>[dimension,'synthetic governed identity']))}));specification.capabilities=specification.capabilities.filter(capability=>capability.metric==='revenue').map(capability=>({...capability,dimensions:[...dimensions,'date','month','quarter','year']}));}if(customer){specification.measures=specification.measures.map(rule=>({...rule,dimensionMappings:{customer:'synthetic customer'}}));specification.capabilities=specification.capabilities.map(capability=>({...capability,dimensions:['customer','date','month','quarter','year']}));}if(ratio){specification.measures=specification.measures.slice(0,2).map((rule,index)=>({...rule,measureId:index===0?'order_revenue':'order_count',dimensionMappings:{salesperson:'synthetic owner'}}));specification.capabilities=['order_revenue','order_count','average_confirmed_order_value'].map(metric=>({metric:metric as typeof specification.capabilities[number]['metric'],dimensions:['salesperson','month']}));}await deploy(db.migrator,{...specification,measures:specification.measures.map(rule=>({...rule,sourceObject:object}))},dimensions?fact('old-row',{businessDate:'2026-01-15',value:'0.000000',dimensions:{customer:'source:2045',salesperson:'source:17',business_line:'source:4',branch:'branch:1',region:'region:1'}}):undefined,events?specification.measures.map(rule=>{const row=fact(`calibration-${rule.measureId}`,{measureId:rule.measureId,businessDate:'2026-01-15',value:'0.000000',dimensions:{customer:'private:customer',salesperson:'private:rep',business_line:'private:line'}});if(rule.measureId.endsWith('count'))delete row.currency;return row;}):undefined);
 if(ratio&&certifyRatioBeforeBootstrap){const {PostgresDerivedMetricCertification}=await import('../../src/postgres/derived-certification.ts');await new PostgresDerivedMetricCertification(db.migrator).record({tenantId:'a',datasetId:'release',mappingVersion:'1',reference:'SYNTHETIC-OPERATIONAL-RATIO',metric:'average_confirmed_order_value',grouping:null,from:'2026-01-01',to:'2026-01-31',caseIds:['fixture-certification-order_revenue','fixture-certification-order_count'],approvalReference:'SYNTHETIC-APPROVER',approvedAt:clock().toISOString(),businessSemantics:'Synthetic exact full-period ratio',technicalReference:'synthetic-controls'});}
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

test('derived certification added after operational bootstrap becomes visible without rewriting the immutable anchor snapshot',{skip:!enabled},async()=>{
 const f=await setup('fixture',true,false,undefined,false,false);try {
  const context={tenantId:'a',locale:'en' as const};
  assert.equal((await f.repository.getPublishedCapabilities(context)).releases.flatMap(release=>release.capabilities).some(capability=>capability.metric==='average_confirmed_order_value'),false);
  const {PostgresDerivedMetricCertification}=await import('../../src/postgres/derived-certification.ts');
  await new PostgresDerivedMetricCertification(f.db.migrator).record({tenantId:'a',datasetId:'release',mappingVersion:'1',reference:'SYNTHETIC-OPERATIONAL-RATIO-LATE',metric:'average_confirmed_order_value',grouping:null,from:'2026-01-01',to:'2026-01-31',caseIds:['fixture-certification-order_revenue','fixture-certification-order_count'],approvalReference:'SYNTHETIC-APPROVER',approvedAt:clock().toISOString(),businessSemantics:'Synthetic exact full-period ratio',technicalReference:'synthetic-controls'});
  await tenantTransaction(f.db.migrator,'a',client=>client.query("SELECT mart.refresh_proof_results('a','release')"));
  assert.equal((await f.repository.getPublishedCapabilities(context)).releases.flatMap(release=>release.capabilities).some(capability=>capability.metric==='average_confirmed_order_value'),true);
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

test('exact monthly, daily and hybrid event bases equal canonical over twelve months; trends and policy preserve scope',{skip:!enabled},async()=>{
 const fixture=await setup();try {
  fixture.source.cutoff='2027-01-07T12:00:00.000Z';
  fixture.source.rows=Array.from({length:12},(_,index)=>{
   const date=new Date(Date.UTC(2026,index,15)).toISOString().slice(0,10);
   return januaryFact({sourceRecordId:`annual-${index}`,businessDate:date});
  });
  assert.equal((await fixture.run()).status,'passed');
  const range={from:'2026-01-01',to:'2026-12-31'},context={tenantId:'a',locale:'en' as const};
  const selected=await fixture.repository.execute({metric:'revenue',dateRange:range},context);
  const {verifyEventRange}=await import('../../src/operational/aggregate-verification.ts');
  const exact=await verifyEventRange(fixture.db.migrator,'a',range);assert.equal(exact.mismatches,0);assert.equal(exact.unprovedPartitions,0);
  assert.equal(selected.rows[0]?.value,1200);assert.equal(selected.metadata.coverage?.status,'complete');
  await tenantTransaction(fixture.db.ingestor,'a',async client=>{
   const sums=(await client.query(`SELECT
    (SELECT sum(value) FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) JOIN mart.analytics_aggregate_bases base USING(tenant_id,partition_id) WHERE trusted.tenant_id=$1 AND measure_id='revenue')::text daily,
    (SELECT sum(value) FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) JOIN mart.analytics_monthly_bases base USING(tenant_id,partition_id) WHERE trusted.tenant_id=$1 AND measure_id='revenue')::text monthly,
    (SELECT sum((payload->>'value')::numeric) FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id) WHERE head.tenant_id=$1 AND head.status='active' AND head.measure_id='revenue')::text canonical`,['a'])).rows[0];
   assert.equal(sums.daily,sums.monthly);assert.equal(sums.daily,sums.canonical);
   const {servingRows}=await import('../../src/operational/serving-query.ts');
   const coverage={...range,months:fixture.source.rows.map(row=>row.businessDate.slice(0,7))};
   const annual=await servingRows(client,{metric:'revenue',dateRange:range},context,coverage,4000);assert.equal(annual.rows[0]?.value,1200);
   const scoped=await servingRows(client,{metric:'revenue',dateRange:range},{...context,enforcedFilters:[{dimension:'branch',values:['baghdad']}]},coverage,4000);assert.equal(scoped.rows[0]?.value,0);
   const hybrid=await servingRows(client,{metric:'revenue',dateRange:{from:'2026-04-17',to:'2026-07-12'}},context,coverage,4000);
   assert.equal(hybrid.rows[0]?.value,200);
   const daily=await servingRows(client,{metric:'revenue',groupBy:'date',dateRange:{from:'2026-05-01',to:'2026-05-31'}},context,coverage,4000);
   assert.equal(daily.rows.length,31);assert.equal(daily.rows.reduce((total,row)=>total+(row.value??0),0),100);
   const monthly=await servingRows(client,{metric:'revenue',groupBy:'month',dateRange:range,analysis:{runningTotal:true}},context,coverage,4000);
   assert.equal(monthly.rows.length,12);assert.equal(monthly.rows.at(-1)?.value,1200);
  });
  await assert.rejects(fixture.repository.execute({metric:'revenue',dateRange:range}, {...context,enforcedFilters:[{dimension:'branch',values:['baghdad']}]}),/Uncertified/);
  assert.equal((await tenantTransaction(fixture.db.runtime,'b',client=>client.query('SELECT * FROM mart.analytics_monthly_bases'),true)).rowCount,0);
  assert.equal((await tenantTransaction(fixture.db.runtime,'b',client=>client.query('SELECT * FROM mart.analytics_aggregate_proofs'),true)).rowCount,0);
 }finally{await fixture.db.close();}
});

test('old-day correction and business-date/dimension move replace both daily and monthly footprints and retain untouched day',{skip:!enabled},async()=>{
 const fixture=await setup();try {
  const untouched=januaryFact({sourceRecordId:'unchanged-day',businessDate:'2026-01-20'});
  fixture.source.rows=[januaryFact(),untouched];await fixture.run();
  const corrected=januaryFact({value:'200.000000',currency:{mode:'native',transactionCurrency:'IQD',transactionValue:'200.000000',reportingCurrency:'IQD',policyReference:'test-native'},sourceVersion:'October-correction',sourceRevision:'3'});
  fixture.source.rows=[corrected,untouched];assert.equal((await fixture.run()).status,'passed');assert.equal(await januaryValue(fixture.repository),300);
  const correctedDaily=(await tenantTransaction(fixture.db.runtime,'a',client=>client.query(`SELECT base.value::text value FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) JOIN mart.analytics_aggregate_bases base USING(tenant_id,partition_id) WHERE trusted.tenant_id='a' AND base.business_date='2026-01-15'`),true)).rows[0].value;
  assert.equal(correctedDaily,'200.000000');
  const proofCount=(await fixture.db.admin.query('SELECT count(*) FROM mart.analytics_aggregate_proofs')).rows[0].count;
  fixture.source.rows=[{...corrected,businessDate:'2026-02-03',dimensions:{branch:'baghdad'},sourceVersion:'move',sourceRevision:'4'},untouched];
  assert.equal((await fixture.run()).status,'passed');
  assert.equal(await januaryValue(fixture.repository),100);
  const bases=(await tenantTransaction(fixture.db.runtime,'a',client=>client.query(`SELECT base.business_date::text AS day,base.dimensions->>'branch' branch,base.value::text value FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) JOIN mart.analytics_aggregate_bases base USING(tenant_id,partition_id) WHERE trusted.tenant_id='a' ORDER BY day`),true)).rows;
  assert.deepEqual(bases,[{day:'2026-01-20',branch:'cairo',value:'100.000000'},{day:'2026-02-03',branch:'baghdad',value:'200.000000'}]);
  assert.equal(Number((await fixture.db.admin.query('SELECT count(*) FROM mart.analytics_aggregate_proofs')).rows[0].count),Number(proofCount)+2);
  await assert.rejects(tenantTransaction(fixture.db.ingestor,'a',client=>client.query(`INSERT INTO mart.analytics_monthly_bases SELECT tenant_id,partition_id,'order_count','{}',1,1,'2026-01-01' FROM mart.analytics_aggregate_proofs LIMIT 1`)),/frozen/);
 }finally{await fixture.db.close();}
});

test('monthly reconciliation failure preserves serving revision and cursor; resumable backfill proves existing partitions',{skip:!enabled},async()=>{
 const fixture=await setup();try {
  const {backfillEventRollups}=await import('../../src/operational/aggregate-rollups.ts');
  assert.ok((await backfillEventRollups(fixture.db.migrator,'a')).every(row=>row.status==='already-proved'));
  const previous=(await fixture.db.admin.query('SELECT revision_id FROM mart.analytics_trusted_serving')).rows[0].revision_id;
  const cutoff=(await fixture.db.admin.query('SELECT cutoff FROM mart.analytics_source_cursors')).rows[0].cutoff.toISOString();
  await fixture.db.migrator.query(`CREATE FUNCTION mart.corrupt_rollup() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.value=NEW.value+1; RETURN NEW; END $$`);
  await fixture.db.migrator.query(`CREATE TRIGGER corrupt_rollup BEFORE INSERT ON mart.analytics_monthly_bases FOR EACH ROW EXECUTE FUNCTION mart.corrupt_rollup()`);
  fixture.source.rows=[januaryFact()];await assert.rejects(fixture.run(),/Monthly aggregate differs/);
  assert.equal((await fixture.db.admin.query('SELECT revision_id FROM mart.analytics_trusted_serving')).rows[0].revision_id,previous);
  assert.equal((await fixture.db.admin.query('SELECT cutoff FROM mart.analytics_source_cursors')).rows[0].cutoff.toISOString(),cutoff);
  await fixture.db.migrator.query('DROP TRIGGER corrupt_rollup ON mart.analytics_monthly_bases');assert.equal((await fixture.run()).status,'passed');
 }finally{await fixture.db.close();}
});

test('runtime falls back to trusted daily for missing or incompatible monthly proof, never untrusted monthly values',{skip:!enabled},async()=>{
 const fixture=await setup();try {
  fixture.source.rows=[januaryFact()];await fixture.run();
  await fixture.db.admin.query('ALTER TABLE mart.analytics_aggregate_proofs DISABLE TRIGGER immutable_history');
  await fixture.db.admin.query("UPDATE mart.analytics_aggregate_proofs SET mapping_version='incompatible'");
  assert.equal(await januaryValue(fixture.repository),100);
  const {trustedRangePartitions}=await import('../../src/operational/range-plan.ts');
  assert.ok((await tenantTransaction(fixture.db.runtime,'a',client=>trustedRangePartitions(client,'a'),true)).every(partition=>!partition.monthly));
  await fixture.db.admin.query('DELETE FROM mart.analytics_aggregate_proofs');
  assert.equal(await januaryValue(fixture.repository),100);
  await fixture.db.admin.query('ALTER TABLE mart.analytics_aggregate_proofs ENABLE TRIGGER immutable_history');
 }finally{await fixture.db.close();}
});

test('event transformations use selected monthly periods, weighted bases and policy-scoped contribution',{skip:!enabled},async()=>{
 const fixture=await setup('fixture',true);try {
  fixture.source.cutoff='2027-01-07T12:00:00.000Z';
  fixture.source.rows=Array.from({length:12},(_,index)=>[
   januaryFact({sourceRecordId:`weighted-${index}`,measureId:'order_revenue',businessDate:`2026-${String(index+1).padStart(2,'0')}-15`,value:`${100*(index+1)}.000000`,dimensions:{salesperson:index%2?'owner-b':'owner-a'},currency:{mode:'native',transactionCurrency:'IQD',transactionValue:`${100*(index+1)}.000000`,reportingCurrency:'IQD',policyReference:'test-native'}}),
   januaryFact({sourceRecordId:`weighted-${index}`,measureId:'order_count',businessDate:`2026-${String(index+1).padStart(2,'0')}-15`,value:`${index+1}.000000`,dimensions:{salesperson:index%2?'owner-b':'owner-a'}})
  ]).flat();assert.equal((await fixture.run()).status,'passed');
  const {servingRows}=await import('../../src/operational/serving-query.ts');
  await tenantTransaction(fixture.db.runtime,'a',async client=>{
   const dateRange={from:'2026-01-01',to:'2026-12-31'},coverage={...dateRange,months:fixture.source.rows.map(row=>row.businessDate.slice(0,7))},context={tenantId:'a',locale:'en' as const};
   const ratio=await servingRows(client,{metric:'average_confirmed_order_value',dateRange},context,coverage,4000);assert.equal(ratio.rows[0]?.value,100);
   const moving=await servingRows(client,{metric:'order_revenue',groupBy:'month',dateRange,analysis:{movingAverage:{window:3}}},context,coverage,4000);assert.equal(moving.rows.at(-1)?.value,1100);
   const contribution=await servingRows(client,{metric:'order_revenue',groupBy:'salesperson',dateRange,analysis:{percentageContribution:true}}, {...context,enforcedFilters:[{dimension:'salesperson',values:['owner-a']}]},coverage,4000);assert.deepEqual(contribution.rows.map(row=>row.value),[100]);
   const ranked=await servingRows(client,{metric:'order_revenue',groupBy:'salesperson',dateRange,analysis:{ranking:true,topN:{direction:'top',limit:1}}},context,coverage,4000);assert.equal(ranked.rows[0]?.key,'owner-b');assert.equal(ranked.rows[0]?.value,4200);
  },true);
 }finally{await fixture.db.close();}
});

test('runtime cannot read unpublished monthly partitions or write serving tables; daily mismatch blocks promotion',{skip:!enabled},async()=>{
 const fixture=await setup();try {
  const partitionId=randomUUID();
  await tenantTransaction(fixture.db.ingestor,'a',async client=>{
   await client.query('INSERT INTO mart.analytics_partitions VALUES($1,$2,$3)',['a',partitionId,'2026-01-01']);
   await client.query("INSERT INTO mart.analytics_monthly_bases VALUES($1,$2,'revenue','{}',999,1,'2026-01-15')",['a',partitionId]);
  });
  assert.equal((await tenantTransaction(fixture.db.runtime,'a',client=>client.query('SELECT * FROM mart.analytics_monthly_bases WHERE partition_id=$1',[partitionId]),true)).rowCount,0);
  await assert.rejects(tenantTransaction(fixture.db.runtime,'a',client=>client.query("INSERT INTO mart.analytics_monthly_bases VALUES($1,$2,'revenue','{}',999,1,'2026-01-15')",['a',partitionId])),/permission denied/);
  await fixture.db.migrator.query(`CREATE FUNCTION mart.corrupt_daily() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.value=NEW.value+1; RETURN NEW; END $$`);
  await fixture.db.migrator.query(`CREATE TRIGGER corrupt_daily BEFORE INSERT ON mart.analytics_aggregate_bases FOR EACH ROW EXECUTE FUNCTION mart.corrupt_daily()`);
  fixture.source.rows=[januaryFact()];await assert.rejects(fixture.run(),/Daily aggregate differs/);assert.equal(await januaryValue(fixture.repository),0);
  await fixture.db.migrator.query('DROP TRIGGER corrupt_daily ON mart.analytics_aggregate_bases');assert.equal((await fixture.run()).status,'passed');
 }finally{await fixture.db.close();}
});


test('shared trusted dimension discovery retains governed labels, scoped identities and independent selected hydration',{skip:!enabled},async()=>{
 const dimensions:DimensionId[]=['customer','salesperson','business_line','branch','region'];
 const f=await setup('fixture',false,false,dimensions);try {
  f.source.rows=[januaryFact({dimensions:{customer:'source:2045',salesperson:'source:17',business_line:'source:4',branch:'branch:1',region:'region:1'},displayLabels:{customer:'شركة الاختبار',salesperson:'Ahmed Ali',businessLine:'General'}}),januaryFact({sourceRecordId:'second',dimensions:{customer:'source:9999',salesperson:'source:18',business_line:'source:5',branch:'branch:2',region:'region:2'},displayLabels:{customer:'Selected customer',salesperson:'Mohamed Hassan',businessLine:'No Sugar'}})];
  await f.run();
  for(const locale of ['en','ar'] as const){
   const context={tenantId:'a',locale};
   for(const [dimension,id,label] of [['customer','source:2045','شركة الاختبار'],['salesperson','source:17','Ahmed Ali'],['business_line','source:4','General']] as const){
    assert.ok((await f.repository.listDimensionOptions(dimension,context)).some(option=>option.id===id&&option.label===label));
   }
   const customer=await f.repository.searchDimensionOptions('customer',context,{limit:1,selectedIds:['source:9999']});
   assert.equal(customer.values.length,1);assert.equal(customer.selected[0]?.label,'Selected customer');assert.ok(customer.nextCursor);
   const searched=await f.repository.searchDimensionOptions('customer',context,{search:'شركة',limit:1});assert.equal(searched.values[0]?.id,'source:2045');
   const salesperson=await f.repository.searchDimensionOptions('salesperson',context,{search:'Ahmed',limit:1,selectedIds:['source:18']});assert.equal(salesperson.values[0]?.id,'source:17');assert.equal(salesperson.selected[0]?.label,'Mohamed Hassan');
   const business=await f.repository.searchDimensionOptions('business_line',context,{limit:1,selectedIds:['source:5']});assert.equal(business.selected[0]?.label,'No Sugar');
   const scoped=await f.repository.listDimensionOptions('salesperson',{...context,enforcedFilters:[{dimension:'branch',values:['branch:1']}]});assert.deepEqual(scoped,[{id:'source:17',label:'Ahmed Ali'}]);
  }
  const {trustedDimensionOptions}=await import('../../src/operational/dimension-options.ts');
  await assert.rejects(tenantTransaction(f.db.runtime,'a',client=>trustedDimensionOptions(client,{dimension:'salesperson',context:{tenantId:'a',locale:'en'},metric:'revenue',measures:['revenue'],maxGroups:1}),true),/discovery/i);
  assert.deepEqual(await tenantTransaction(f.db.runtime,'b',client=>trustedDimensionOptions(client,{dimension:'salesperson',context:{tenantId:'b',locale:'en'},metric:'revenue',measures:['revenue'],maxGroups:100}),true),[]);
  for(const dimension of ['branch','region'] as const)assert.equal((await f.repository.listDimensionOptions(dimension,{tenantId:'a',locale:'en'})).length,2);
 }finally{await f.db.close();}
});


test('mart-only event drill reconciles each family, dates, clicked scope, encrypted continuation and RLS',{skip:!enabled},async()=>{
 const fixture=await setup('fixture',false,false,undefined,true);
 try {
  const context={tenantId:'a',locale:'en' as const};
  const dimensions={customer:'private:customer',salesperson:'private:rep',business_line:'private:line'};
  const displayLabels={customer:'Customer Alpha',salesperson:'Ahmed',businessLine:'General'};
  const measures=['order_revenue','order_count','invoiced_revenue','refund_value','net_invoiced_revenue','invoice_count','refund_count'] as const;
  fixture.source.rows=measures.flatMap(measureId=>Array.from({length:5},(_,index)=>januaryFact({sourceRecordId:`record-${measureId}-${index}`,measureId,businessDate:`2026-09-${String(index+1).padStart(2,'0')}`,value:measureId.endsWith('count')?'1.000000':'10.000000',dimensions,displayLabels}))).map(row=>{if(row.measureId.endsWith('count'))delete row.currency;return row;});
  for(let month=2;month<9;month++)fixture.source.rows.push(januaryFact({sourceRecordId:`empty-month-${month}`,measureId:'net_invoiced_revenue',businessDate:`2026-${String(month).padStart(2,'0')}-15`,value:'0.000000',dimensions,displayLabels}));
  // Signed refund impact belongs to October; September invoice impact stays positive.
  fixture.source.rows.push(januaryFact({sourceRecordId:'october-credit',measureId:'net_invoiced_revenue',businessDate:'2026-10-02',value:'-7.000000',dimensions,displayLabels}));
  await fixture.run();
  const drill=new TrustedDrillThroughRepository(fixture.db.runtime,scope=>fixture.repository.getPublishedCapabilities(scope));
  for(const metric of measures){
   const query={metric,dateRange:{from:'2026-09-01',to:'2026-09-30'}};
   const summary=await fixture.repository.execute(query,context),release=summary.metadata.release!.datasetId;
   const started=performance.now();
   const first=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,limit:2,sort:{field:'amount',direction:'asc'}},context);
   const firstPageMs=performance.now()-started;
   assert.equal(Number(first.value),summary.rows[0]!.value);assert.equal(first.rows.length,2);assert.equal(first.rows[0]!.customer,'Customer Alpha');assert.ok(first.nextCursor);
   const second=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,limit:2,sort:{field:'amount',direction:'asc'},cursor:first.nextCursor},context);
   const third=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,limit:2,sort:{field:'amount',direction:'asc'},cursor:second.nextCursor!},context);
   assert.equal(third.hasMore,false);assert.equal([...first.rows,...second.rows,...third.rows].length,5);
   assert.equal([...first.rows,...second.rows,...third.rows].reduce((sum,row)=>sum+Number(row.amount),0),summary.rows[0]!.value);
   const scoped=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,clicked:{dimension:'business_line',values:['private:line']}},{...context,enforcedFilters:[{dimension:'salesperson',values:['private:rep']}]});assert.equal(scoped.value,first.value);
   const hidden=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release},{...context,enforcedFilters:[{dimension:'customer',values:['other']}]});assert.equal(hidden.rows.length,0);
   await assert.rejects(drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,cursor:first.nextCursor},{...context,enforcedFilters:[{dimension:'customer',values:['other']}]}),/DRILL_CONTEXT_INVALID/);
   await assert.rejects(drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release},{tenantId:'b',locale:'en'}));
   process.stdout.write(`drill-first-page ${JSON.stringify({metric,rows:5,ms:firstPageMs})}\n`);
  }
  const query={metric:'net_invoiced_revenue' as const,dateRange:{from:'2026-09-02',to:'2026-09-03'}};
  const summary=await fixture.repository.execute(query,context),release=summary.metadata.release!.datasetId;
  assert.equal((await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release},context)).value,'20.000000');
  const october={...query,dateRange:{from:'2026-10-01',to:'2026-10-07'}};
  assert.equal((await drill.drill({query:october,sourceAsOf:summary.metadata.sourceAsOf!,release},context)).value,'-7.000000');
  const searched=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,search:'no matching customer',sort:{field:'customer',direction:'asc'}},context);
  assert.equal(searched.rows.length,0);assert.equal(searched.hasMore,false);assert.equal(searched.value,'20.000000');
  const annual={...query,dateRange:{from:'2026-01-01',to:'2026-12-31'},filters:[{dimension:'salesperson' as const,values:['private:rep']}]};
  assert.equal((await drill.drill({query:annual,sourceAsOf:summary.metadata.sourceAsOf!,release,search:'Alpha'},context)).value,'43.000000');
  const raw=await tenantTransaction(fixture.db.runtime,'b',client=>client.query('SELECT * FROM mart.analytics_fact_revisions'),true);assert.equal(raw.rowCount,0);
  const first=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,limit:1},context);
  fixture.source.cutoff='2026-10-07T12:05:00.000Z';
  assert.equal((await fixture.run()).status,'unchanged');
  await assert.rejects(drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release},context),/DRILL_RELEASE_CHANGED/);
  const refreshed=await fixture.repository.execute(query,context);
  assert.equal((await drill.drill({query,sourceAsOf:refreshed.metadata.sourceAsOf!,release},context)).value,first.value);
  fixture.source.cutoff='2026-10-07T12:10:00.000Z';fixture.source.rows.push(januaryFact({sourceRecordId:'new',measureId:'net_invoiced_revenue',businessDate:'2026-09-01',dimensions,displayLabels}));assert.equal((await fixture.run()).status,'passed');
  await assert.rejects(drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,cursor:first.nextCursor!},context),/DRILL_RELEASE_CHANGED/);
 }finally{await fixture.db.close();}
});

test('ratio drill exposes exact numerator and denominator rather than averaged row ratios',{skip:!enabled},async()=>{
 const fixture=await setup('fixture',true);
 try {
  fixture.source.rows=[januaryFact({measureId:'order_revenue',value:'100.000000',dimensions:{salesperson:'rep'}}),januaryFact({sourceRecordId:'count',measureId:'order_count',value:'2.000000',dimensions:{salesperson:'rep'}})];delete fixture.source.rows[1]!.currency;
  await fixture.run();const context={tenantId:'a',locale:'en' as const};
  const query={metric:'average_confirmed_order_value' as const,dateRange:{from:'2026-01-01',to:'2026-01-31'}};
  const summary=await fixture.repository.execute(query,context);
  const drill=new TrustedDrillThroughRepository(fixture.db.runtime,scope=>fixture.repository.getPublishedCapabilities(scope));
  const page=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release:summary.metadata.release!.datasetId},context);
  assert.deepEqual(page.bases,{order_revenue:'100.000000',order_count:'2.000000'});assert.equal(Number(page.value),summary.rows[0]!.value);
 }finally{await fixture.db.close();}
});


test('representative synthetic invoice detail uses bounded first pages for September, annual salesperson and customer scope',{skip:!enabled},async()=>{
 const fixture=await setup('fixture',false,false,undefined,true);
 try {
  const dimensions={customer:'private:customer',salesperson:'private:rep',business_line:'private:line'},displayLabels={customer:'Customer Alpha',salesperson:'Ahmed',businessLine:'General'};
  fixture.source.rows=Array.from({length:2000},(_,index)=>januaryFact({sourceRecordId:`large-${index}`,measureId:'net_invoiced_revenue',businessDate:`2026-09-${String(index%28+1).padStart(2,'0')}`,value:'10.000000',dimensions,displayLabels}));
  for(let month=2;month<=10;month++)if(month!==9)fixture.source.rows.push(januaryFact({sourceRecordId:`empty-${month}`,measureId:'net_invoiced_revenue',businessDate:`2026-${String(month).padStart(2,'0')}-15`,value:'0.000000',dimensions,displayLabels}));
  assert.equal((await fixture.run()).status,'passed');
  const context={tenantId:'a',locale:'en' as const},drill=new TrustedDrillThroughRepository(fixture.db.runtime,scope=>fixture.repository.getPublishedCapabilities(scope));
  for(const [name,query] of [
   ['September invoice',{metric:'net_invoiced_revenue' as const,dateRange:{from:'2026-09-01',to:'2026-09-30'}}],
   ['Annual salesperson',{metric:'net_invoiced_revenue' as const,dateRange:{from:'2026-01-01',to:'2026-12-31'},filters:[{dimension:'salesperson' as const,values:['private:rep']}]}],
   ['Customer filtered',{metric:'net_invoiced_revenue' as const,dateRange:{from:'2026-09-01',to:'2026-09-30'},filters:[{dimension:'customer' as const,values:['private:customer']}]}]
  ] satisfies Array<[string,import('@el-dabboos/domain').AnalyticsQuery]>){
   const summary=await fixture.repository.execute(query,context),started=performance.now();
   const page=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release:summary.metadata.release!.datasetId,limit:50},context);
   const milliseconds=performance.now()-started;assert.equal(page.rows.length,50);assert.equal(page.hasMore,true);assert.equal(Number(page.value),summary.rows[0]!.value);
   process.stdout.write(`drill-benchmark ${JSON.stringify({name,records:2000,firstPageMs:milliseconds})}\n`);
  }
 }finally{await fixture.db.close();}
});


test('drill lineage migration backfills exact populated partitions and refuses incompatible current heads',{skip:!enabled},async()=>{
 const fixture=await setup('fixture',true);
 try {
  const dimensions={salesperson:'rep'};
  fixture.source.rows=[januaryFact({measureId:'order_revenue',dimensions}),januaryFact({sourceRecordId:'february',measureId:'order_revenue',businessDate:'2026-02-15',value:'50.000000',dimensions})];
  assert.equal((await fixture.run()).status,'passed');
  const context={tenantId:'a',locale:'en' as const},january={metric:'order_revenue' as const,dateRange:{from:'2026-01-01',to:'2026-01-31'}},february={...january,dateRange:{from:'2026-02-01',to:'2026-02-28'}};
  const summary=await fixture.repository.execute(january,context),release=summary.metadata.release!.datasetId;
  await tenantTransaction(fixture.db.ingestor,'a',async client=>{const baseline=await readBaseline(client,'a');await persistOperationalFact(client,baseline,januaryFact({measureId:'order_revenue',value:'200.000000',sourceVersion:'candidate-only',sourceRevision:'3',dimensions}));});
  // Recreate a populated pre-035 fixture, using only its isolated disposable database.
  await fixture.db.admin.query(`DROP TRIGGER drill_membership_lock ON mart.analytics_serving_members;
   DROP TABLE mart.analytics_drill_partitions CASCADE;DROP TABLE mart.analytics_partition_facts CASCADE;
   DROP FUNCTION IF EXISTS mart.freeze_drill_membership();DROP FUNCTION IF EXISTS mart.drill_partition_exact(text,text);
   ALTER TABLE mart.analytics_fact_revisions DROP COLUMN measure_id, DROP COLUMN business_date;
   DROP INDEX mart.analytics_serving_members_partition_lookup;
   DROP POLICY IF EXISTS trusted_only ON mart.analytics_fact_revisions;
   REVOKE SELECT ON mart.analytics_fact_revisions FROM dabboos_runtime;
   DELETE FROM mart_admin.mart_schema_migrations WHERE version>=35`);
  assert.deepEqual(await migratePostgres(fixture.db.migrator),[35,36,37,38,39]);
  const drill=new TrustedDrillThroughRepository(fixture.db.runtime,scope=>fixture.repository.getPublishedCapabilities(scope));
  await assert.rejects(drill.drill({query:january,release,sourceAsOf:summary.metadata.sourceAsOf!},context),/DRILL_NOT_READY/);
  const exact=await drill.drill({query:february,release,sourceAsOf:summary.metadata.sourceAsOf!},context);assert.equal(exact.value,'50.000000');
  const projections=await tenantTransaction(fixture.db.runtime,'a',client=>client.query("SELECT count(*)::int mismatches FROM mart.analytics_fact_revisions WHERE measure_id IS DISTINCT FROM payload->>'measureId' OR business_date IS DISTINCT FROM payload->>'businessDate'"),true);assert.equal(projections.rows[0].mismatches,0);
  assert.equal((await fixture.repository.execute(january,context)).rows[0]!.value,100);
  assert.equal((await tenantTransaction(fixture.db.runtime,'b',client=>client.query('SELECT * FROM mart.analytics_fact_revisions'),true)).rowCount,0);
  const force=(await fixture.db.admin.query("SELECT count(*)::int count FROM pg_class JOIN pg_namespace ON pg_namespace.oid=relnamespace WHERE nspname='mart' AND relkind='r' AND relname<>'measure_definitions' AND (NOT relrowsecurity OR NOT relforcerowsecurity)")).rows[0].count;assert.equal(force,0);
  await assert.rejects(tenantTransaction(fixture.db.ingestor,'a',client=>client.query(`INSERT INTO mart.analytics_partition_facts SELECT tenant_id,partition_id,'forbidden',revision_id FROM mart.analytics_partition_facts LIMIT 1`)),/membership is immutable/);
 }finally{await fixture.db.close();}
});

test('AI Analyst direct event grouping uses trusted serving and forced scoped RLS without source connectivity',{skip:!enabled},async()=>{
 const {AnalyticsIntentExecutor}=await import('../../../application/src/analytics-execution.ts');
 const {DefaultAuthorizationPolicy}=await import('../../../application/src/security.ts');
 const f=await setup('fixture',false,false,undefined,true);try {
  f.source.rows=[januaryFact({sourceRecordId:'rep-a',businessDate:'2026-02-15',measureId:'order_revenue',value:'100.000000',dimensions:{customer:'customer:a',salesperson:'rep:a',business_line:'general'}}),januaryFact({sourceRecordId:'rep-b',businessDate:'2026-02-15',measureId:'order_revenue',value:'999.000000',dimensions:{customer:'customer:b',salesperson:'rep:b',business_line:'general'}})];
  assert.equal((await f.run()).status,'passed');
  // Source is deliberately broken after promotion; answering must touch the runtime mart only.
  f.source.interrupt=true;
  const identity:import('@el-dabboos/domain').RequestContext={principal:{userId:'synthetic-manager',membershipId:'synthetic-membership'},tenant:{tenantId:'a'},locale:'ar',authorization:{permissions:['analytics:query'],metricDomains:['sales'],enforcedFilters:[{dimension:'salesperson',values:['rep:a']}]}};
  const executor=new AnalyticsIntentExecutor(f.repository,f.repository,new DefaultAuthorizationPolicy(),{timeZone:'Asia/Baghdad',clock});
  const output=await executor.execute({context:{dateRange:{from:'2026-02-01',to:'2026-02-28'}},analyses:[{dimension:'salesperson',series:[{metric:'order_revenue'}]}]},identity);
  assert.ok('analyses' in output,JSON.stringify(output));const entry=output.analyses[0]!.series[0]!;assert.notEqual(entry.status,'EXECUTION_FAILED');if(entry.status!=='EXECUTION_FAILED'){assert.deepEqual(entry.result.rows.map(row=>[row.key,row.value]),[['rep:a',100]]);assert.ok(entry.result.metadata.release);}
  const hidden=await tenantTransaction(f.db.runtime,'b',client=>client.query('SELECT * FROM mart.analytics_aggregate_bases'),true);assert.equal(hidden.rowCount,0);
 }finally{await f.db.close();}
});
