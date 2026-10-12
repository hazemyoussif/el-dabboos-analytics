import {persistOperationalFact} from '../../src/operational/facts.ts';
import {fact} from './fixtures.ts';
import {AnalyticsOperations} from '../../../application/src/analytics-operations.ts';
import {PostgresOperationalStore} from '../../src/operational/store.ts';
import type {OperationalSnapshot} from '../../src/operational/contracts.ts';
import {requiredMeasures} from '@el-dabboos/domain';
import type {ProductionFact} from '@el-dabboos/domain';
import {randomUUID} from 'node:crypto';
import {TrustedDrillThroughRepository} from '../../src/operational/drill-through.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {historicalMember} from './historical-fixtures.ts';
import {bootstrapOperationalServing,readBaseline} from '../../src/operational/baseline.ts';
import {importCertifiedHistoricalMonth} from '../../src/operational/historical-import.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';

async function fixture(){
 const db=await database();
 await historicalMember(db,'2026-01','events','10.000000',{publicationOnly:true,orders:'2.000000'});
 await bootstrapOperationalServing(db.migrator,'a');
 const dataset=await historicalMember(db,'2025-09','events','20.000000',{publicationOnly:true,orders:'2.000000'});
 const scope={tenantId:'a',month:'2025-09',datasets:[dataset] as const,approvalReference:`synthetic-cert-${dataset}`};
 return {db,scope};
}
test('bounded certified month import advances only unified serving, preserves cursor, and resumes from immutable database checkpoint',{skip:!enabled},async()=>{
 const {db,scope}=await fixture();
 try {
  const cursor=(await db.admin.query('SELECT * FROM mart.analytics_source_cursors')).rows;
  const imported=await importCertifiedHistoricalMonth(db.migrator,scope);assert.equal(imported.alreadyImported,false);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_source_cursors')).rows,cursor);
  const resumed=await importCertifiedHistoricalMonth(db.migrator,scope);assert.equal(resumed.alreadyImported,true);assert.equal(resumed.revisionId,imported.revisionId);
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const query={metric:'order_revenue' as const,dateRange:{from:'2025-09-01',to:'2025-09-30'}},context={tenantId:'a',locale:'en' as const};
  const summary=await repository.execute(query,context);assert.equal(summary.rows[0]?.value,20);
  const drill=new TrustedDrillThroughRepository(db.runtime,context=>repository.getPublishedCapabilities(context));
  const detail=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release:summary.metadata.release!.datasetId},context);assert.equal(detail.value,'20.000000');
  const scoped=await repository.execute({...query,filters:[{dimension:'salesperson',values:['other']}]},context);assert.equal(scoped.rows[0]?.value,0);
  assert.equal((await repository.execute({metric:'order_revenue',dateRange:{from:'2026-01-01',to:'2026-01-31'}},{tenantId:'a',locale:'en'})).rows[0]?.value,10);
  const baseline=await tenantTransaction(db.ingestor,'a',client=>readBaseline(client,'a'),true);assert.equal(baseline.from,'2025-09-01');assert.deepEqual(baseline.coveredMonths,['2025-09','2026-01']);
  const hidden=await tenantTransaction(db.runtime,'b',client=>client.query('SELECT * FROM mart.analytics_historical_imports'),true);assert.equal(hidden.rowCount,0);
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query('INSERT INTO mart.analytics_historical_imports SELECT * FROM mart.analytics_historical_imports')),/permission denied/);
 }finally{await db.close();}
});
test('wrong approval, broader range, runtime authority and conflicting heads never advance history or cursor',{skip:!enabled},async()=>{
 const {db,scope}=await fixture();
 try {
  const before=(await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows;
  for(const invalid of [{...scope,approvalReference:'not-approved'},{...scope,month:'2025-08'}])await assert.rejects(importCertifiedHistoricalMonth(db.migrator,invalid));
  await assert.rejects(importCertifiedHistoricalMonth(db.runtime,scope),/Publication requires/);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows,before);
  assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.analytics_historical_imports')).rows[0].count,0);
  // Simulate interruption after copying a page: the transaction must roll back heads and publication.
  await db.admin.query("CREATE FUNCTION mart.test_interrupt_import() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic interruption'; END $$");
  await db.admin.query('CREATE TRIGGER test_interrupt_import BEFORE INSERT ON mart.analytics_historical_imports FOR EACH ROW EXECUTE FUNCTION mart.test_interrupt_import()');
  await assert.rejects(importCertifiedHistoricalMonth(db.migrator,scope),/synthetic interruption/);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows,before);
  assert.equal((await db.admin.query("SELECT count(*)::int count FROM mart.analytics_fact_heads WHERE business_month='2025-09'")).rows[0].count,0);
  await db.admin.query('DROP TRIGGER test_interrupt_import ON mart.analytics_historical_imports');
  assert.equal((await importCertifiedHistoricalMonth(db.migrator,scope)).alreadyImported,false);
 }finally{await db.close();}
});

test('paired event and ten-measure aging month publishes exact summary snapshots without granting customer Finance',{skip:!enabled},async()=>{
 const db=await database();
 try {
  await historicalMember(db,'2026-01','events','10.000000',{publicationOnly:true,orders:'2.000000'});
  await historicalMember(db,'2026-01','aging','10.000000',{publicationOnly:true,finance:true});
  await bootstrapOperationalServing(db.migrator,'a');
  const events=await historicalMember(db,'2025-09','events','20.000000',{publicationOnly:true,orders:'2.000000',approvalReference:'SYNTHETIC-HISTORY:2025-09:events'});
  const aging=await historicalMember(db,'2025-09','aging','20.000000',{publicationOnly:true,finance:true,approvalReference:'SYNTHETIC-HISTORY:2025-09:aging'});
  const imported=await importCertifiedHistoricalMonth(db.migrator,{tenantId:'a',month:'2025-09',datasets:[events,aging],approvalReference:'SYNTHETIC-HISTORY'});assert.equal(imported.alreadyImported,false);
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const query={metric:'net_aged_receivable' as const,dateRange:{from:'2025-09-01',to:'2025-09-30'}},context={tenantId:'a',locale:'en' as const};
  assert.equal((await repository.execute(query,context)).rows[0]?.value,20);
  assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.trusted_finance_snapshots')).rows[0].count,0);
  await assert.rejects(repository.execute({...query,groupBy:'customer'},context),/Uncertified/);
 }finally{await db.close();}
});

test('incremental corrections remain enabled for explicitly imported older months and reconcile before replacing their partition',{skip:!enabled},async()=>{
 const {db,scope}=await fixture();
 try {
  await importCertifiedHistoricalMonth(db.migrator,scope);
  const baseline=await tenantTransaction(db.ingestor,'a',client=>readBaseline(client,'a'),true);
  const prior=(await db.admin.query("SELECT payload FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id) WHERE head.business_month='2025-09'")).rows.map(row=>row.payload as ProductionFact);
  const sourceFacts=prior.map(fact=>fact.measureId==='order_revenue'?{...fact,value:'30.000000',currency:{...fact.currency!,transactionValue:'30.000000'},sourceRevision:'2',sourceVersion:'corrected'} as ProductionFact:fact);
  const changed=sourceFacts.filter(fact=>fact.measureId==='order_revenue');
  const source:OperationalSnapshot={cutoff:'2026-10-12T13:00:00.000Z',revision:'SYNTHETIC-OLDER-CORRECTION',mappingVersion:baseline.mappingVersion,definitionVersion:baseline.definitionVersion,
   close:async()=>{},async *records(){yield {object:'fixture',facts:changed,rows:changed.length};},async *recordsMonth(){yield* [];},async *snapshots(){yield* [];},async *presence(){yield* [];},present:async(_object,ids)=>ids,
   controls:async(_baseline,partitions)=>partitions.flatMap(partition=>requiredMeasures(partition.metric).map(measure=>{
    const facts=sourceFacts.filter(fact=>fact.measureId===measure&&(!partition.dimension||fact.dimensions[partition.dimension]===partition.identity));
    const total=facts.reduce((sum,fact)=>sum+BigInt(fact.value.replace('.','')),0n);
    return {partition,measure,value:`${total/1000000n}.${String(total%1000000n).padStart(6,'0')}`,count:String(facts.length)};
   }))};
  const runId=randomUUID();
  const run=await new AnalyticsOperations({store:new PostgresOperationalStore(db.ingestor,runId),source:{open:async()=>source},runId:()=>runId,clock:()=>new Date(),impact:{through:baseline.to,movingAverageWindows:[],runningTotals:false,yearOverYear:false,contribution:false,snapshotDependencies:()=>[]}}).run({tenantId:'a',kind:'sync',actorId:'synthetic-operator',trigger:'operator'});
  assert.equal(run.status,'passed');assert.equal(run.mismatchCount,0);
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  assert.equal((await repository.execute({metric:'order_revenue',dateRange:{from:'2025-09-01',to:'2025-09-30'}},{tenantId:'a',locale:'en'})).rows[0]?.value,30);
  assert.equal((await db.admin.query("SELECT count(*)::int count FROM mart.analytics_historical_imports WHERE month='2025-09-01'")).rows[0].count,1);
 }finally{await db.close();}
});

test('equal totals and dimension tuples cannot publish an uncertified conflicting identity revision',{skip:!enabled},async()=>{
 const {db,scope}=await fixture();
 try {
  const baseline=await tenantTransaction(db.ingestor,'a',client=>readBaseline(client,'a'),true);
  const mapping=baseline.mappings.find(mapping=>mapping.measures.some(rule=>rule.measureId==='order_revenue'))!;
  await tenantTransaction(db.ingestor,'a',client=>persistOperationalFact(client,baseline,fact(scope.datasets[0],{datasetId:mapping.datasetId,mappingId:mapping.mappingId,measureId:'order_revenue',businessDate:'2025-09-30',value:'20.000000',dimensions:{salesperson:'cairo'},sourceRevision:'0',sourceVersion:'uncertified-old-revision'})));
  const trusted=(await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows;
  await assert.rejects(importCertifiedHistoricalMonth(db.migrator,scope),/Certified historical identity/);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows,trusted);
  assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.analytics_historical_imports')).rows[0].count,0);
 }finally{await db.close();}
});

test('exact existing head content is accepted independently of JSON property order and revision hash encoding',{skip:!enabled},async()=>{
 const {db,scope}=await fixture();
 try {
  const baseline=await tenantTransaction(db.ingestor,'a',client=>readBaseline(client,'a'),true);
  const mapping=baseline.mappings.find(mapping=>mapping.measures.some(rule=>rule.measureId==='order_revenue'))!;
  await tenantTransaction(db.ingestor,'a',client=>persistOperationalFact(client,baseline,fact(scope.datasets[0],{datasetId:mapping.datasetId,mappingId:mapping.mappingId,measureId:'order_revenue',batchId:scope.datasets[0],businessDate:'2025-09-30',value:'20.000000',dimensions:{salesperson:'cairo'}})));
  assert.equal((await importCertifiedHistoricalMonth(db.migrator,scope)).alreadyImported,false);
 }finally{await db.close();}
});

test('bounded month import still rejects drift in an untouched trusted month',{skip:!enabled},async()=>{
 const {db,scope}=await fixture();
 try {
  const before=(await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows;
  const prior=(await db.admin.query("SELECT payload FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id) WHERE head.measure_id='order_revenue' AND head.business_month='2026-01' LIMIT 1")).rows[0].payload as ProductionFact;
  const baseline=await tenantTransaction(db.ingestor,'a',client=>readBaseline(client,'a'),true);
  await tenantTransaction(db.ingestor,'a',client=>persistOperationalFact(client,baseline,{...prior,value:'11.000000',sourceRevision:'2',sourceVersion:'untrusted-drift',currency:{...prior.currency!,transactionValue:'11.000000'}}));
  await assert.rejects(importCertifiedHistoricalMonth(db.migrator,scope),/canonical heads to match/);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows,before);
  assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.analytics_historical_imports')).rows[0].count,0);
 }finally{await db.close();}
});
