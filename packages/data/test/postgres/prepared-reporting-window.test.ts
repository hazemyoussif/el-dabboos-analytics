import type {MetricId} from '@el-dabboos/domain';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,enabled} from './support.ts';
import {deploy,mapping,fact} from './fixtures.ts';
import {snapshotSource} from './snapshot-fixture.ts';
import {bootstrapOperationalServing,readBaseline} from '../../src/operational/baseline.ts';
import {persistOperationalFacts} from '../../src/operational/facts.ts';
import {refreshOperationalMonths} from '../../src/operational/aggregates.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {requiredPreparedChunks} from '../../src/prepared/preparation.ts';
import {registerPreparedReportingWindow,preparePublishedRevision,activatePreparedRevision} from '../../src/prepared/operator.ts';
import {readPreparedSelection} from '../../src/prepared/selection.ts';
import {PreparedAnalyticsRepository} from '../../src/prepared/repository.ts';
import {receivableMeasures} from '../../src/receivable-aging.ts';
import {publishFinanceSnapshot} from '../../src/operational/finance-publication.ts';

const window={from:'2025-01-01',to:'2026-12-31'},bounds={maxCellsPerChunk:50000,maxChunks:100},context={tenantId:'a',locale:'en' as const};
async function revision(pool:Parameters<typeof tenantTransaction>[0]){return tenantTransaction(pool,'a',async client=>(await client.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id as string,true);}
async function setup(finance=false){
 const db=await database(),spec=mapping();
 if(finance){
  spec.measures=[...spec.measures,...receivableMeasures.map(measureId=>({...spec.measures[0]!,measureId,dimensionMappings:{customer:'Synthetic customer'}}))];
  spec.capabilities=[...spec.capabilities,...[...receivableMeasures,'overdue_receivable_percentage' as const].map(metric=>({metric,dimensions:['customer' as const,'month' as const]}))];
 }
 await deploy(db.migrator,spec);await bootstrapOperationalServing(db.migrator,'a');return db;
}
for(const family of ['review','business'] as const)test(`${family} reporting window retains a December opening anchor while excluding 2024 reporting and comparisons`,{skip:!enabled},async()=>{
 const db=await setup();try{
  const metric:MetricId=family==='review'?'receivables_due_for_collection':'review_customer_balance';
  await exposeReviewMonth(db.ingestor,await snapshotSource('2024-12',family,[{measure:metric,entity:'old',customer:'a',value:'125.000000'}]),family);
  await exposeReviewMonth(db.ingestor,await snapshotSource('2025-01',family,[{measure:metric,entity:'new',customer:'b',value:'7.000000'}],'2026-11-03T09:00:00.000Z'),family);
  const scope={tenantId:'a',database:'unused-in-tenant-query',revisionId:await revision(db.ingestor),bounds};
  scope.database=(await db.ingestor.query('SELECT current_database() database')).rows[0].database;
  await registerPreparedReportingWindow(db.ingestor,scope,window);
  assert.deepEqual(await registerPreparedReportingWindow(db.ingestor,scope,window),window);
  await assert.rejects(registerPreparedReportingWindow(db.ingestor,scope,{from:'2024-01-01',to:window.to}),/immutable/);
  const chunks=await tenantTransaction(db.ingestor,'a',client=>requiredPreparedChunks(client,scope,bounds),true);
  assert.ok(chunks.some(chunk=>chunk.family===family&&chunk.kind==='snapshot'&&chunk.period==='2024-12-31'));
  assert.ok(chunks.filter(chunk=>chunk.period<'2025-01-01').every(chunk=>chunk.kind==='snapshot'));
  await preparePublishedRevision(db.ingestor,scope);await activatePreparedRevision(db.migrator,scope);
  const repo=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const early={metric,dateRange:{from:'2025-01-01',to:'2025-01-10'}};
  assert.deepEqual((await repo.execute(early,context)).rows,[{key:null,value:125}]);
  assert.equal((await repo.execute(early,context)).metadata.snapshotAsOf,'2024-12-31');
  assert.deepEqual((await repo.execute({...early,groupBy:'customer'}, {...context,enforcedFilters:[{dimension:'customer',values:['fixture:a']}]})).rows,[{key:'fixture:a',value:125}]);
  await assert.rejects(repo.execute({metric,dateRange:{from:'2024-12-01',to:'2024-12-31'}},context),/outside prepared reporting coverage/);
  assert.ok((await repo.searchDimensionOptions('customer',context,{metric,dateRange:early.dateRange,limit:10})).values.some(option=>option.id==='fixture:a'));
  await assert.rejects(repo.searchDimensionOptions('customer',context,{metric,dateRange:{from:'2024-12-01',to:'2024-12-31'},limit:10}),/outside prepared reporting coverage|Uncertified discovery dimension/i);
  const comparisonQuery={metric,groupBy:'month' as const,dateRange:{from:'2025-01-01',to:'2025-01-31'},analysis:{comparison:'month_over_month' as const}};
  const compared=await tenantTransaction(db.runtime,'a',client=>readPreparedSelection(client,{query:comparisonQuery,context,range:comparisonQuery.dateRange,family,maxGroups:100,timeBuckets:'observed'}),true);
  await assert.rejects(repo.execute(comparisonQuery,context),/Uncertified prepared query/,'source comparison capability remains unchanged');
  assert.equal(compared.rows[0]?.value,7);assert.equal(compared.rows[0]?.comparisonValue,null);
  const capabilities=await repo.getPublishedCapabilities(context);assert.ok(capabilities.releases.every(release=>!release.period||release.period.from>='2025-01-01'&&release.period.to<='2026-12-31'));
  await exposeReviewMonth(db.ingestor,await snapshotSource('2025-02',family,[],'2026-11-04T09:00:00.000Z',{emptyMeasures:[metric]}),family);
  assert.deepEqual((await repo.execute(early,context)).rows,[{key:null,value:125}]);
  assert.deepEqual((await repo.execute({metric,dateRange:{from:'2025-02-01',to:'2025-02-28'}},context)).rows,[{key:null,value:0}]);
  assert.ok((await repo.execute({metric,groupBy:'month'},context)).rows.every(row=>row.key!>='2025-01'));
  assert.equal((await tenantTransaction(db.runtime,'b',client=>client.query('SELECT * FROM mart.prepared_reporting_windows'),true)).rowCount,0);
 }finally{await db.close();}
});
test('Facts scoped preparation retains delta entities observed only in 2024 and prevents older reporting after later publication',{skip:!enabled},async()=>{
 const db=await setup();try{
  await tenantTransaction(db.migrator,'a',async client=>{
   const baseline=await readBaseline(client,'a'),parent=await revision(db.runtime),next=randomUUID();
   await persistOperationalFacts(client,baseline,[fact('carry',{measureId:'outstanding_amount',businessDate:'2024-12-31',value:'30.000000',dimensions:{branch:'a'}}),fact('new',{measureId:'outstanding_amount',businessDate:'2025-01-31',value:'10.000000',dimensions:{branch:'b'}}),fact('new-year',{measureId:'outstanding_amount',businessDate:'2026-01-31',value:'20.000000',dimensions:{branch:'b'}})]);
   await refreshOperationalMonths(client,{tenantId:'a',revisionId:next,parent,runId:null,cutoff:'2026-10-02T10:00:00.000Z',purpose:'adoption'},['2024-12','2025-01','2026-01']);
   await client.query("UPDATE mart.analytics_trusted_serving SET revision_id=$1 WHERE tenant_id='a'",[next]);
  });
  const scope={tenantId:'a',database:(await db.ingestor.query('SELECT current_database() database')).rows[0].database,revisionId:await revision(db.runtime),bounds};
  await registerPreparedReportingWindow(db.ingestor,scope,window);await preparePublishedRevision(db.ingestor,scope);
  const repo=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  assert.deepEqual((await repo.execute({metric:'outstanding_amount',dateRange:{from:'2025-01-01',to:'2025-01-10'}},context)).rows,[{key:null,value:30}]);
  assert.deepEqual((await repo.execute({metric:'outstanding_amount',dateRange:{from:'2025-01-01',to:'2025-01-31'}},context)).rows,[{key:null,value:40}]);
  await assert.rejects(repo.execute({metric:'outstanding_amount',dateRange:{from:'2024-12-01',to:'2024-12-31'}},context),/outside prepared reporting coverage/);
  const yearlyQuery={metric:'outstanding_amount' as const,groupBy:'month' as const,dateRange:{from:'2026-01-01',to:'2026-01-31'},analysis:{comparison:'year_over_year' as const}};
  const yearly=await tenantTransaction(db.runtime,'a',client=>readPreparedSelection(client,{query:yearlyQuery,context,range:yearlyQuery.dateRange,family:'facts',maxGroups:100,timeBuckets:'complete'}),true);
  assert.equal(yearly.rows[0]?.value,60);assert.equal(yearly.rows[0]?.comparisonValue,40);
 }finally{await db.close();}
});
test('Finance scope preserves prior accepted evidence as an in-window opening balance without exposing its report period',{skip:!enabled},async()=>{
 const db=await setup(true);try{
  const values=Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?'100.000000':'0.000000']));
  const evidence={tenantId:'a',currency:'IQD',date:'2024-12-31',sourceCutoff:'2026-10-01T10:00:00.000Z',sourceRevision:'synthetic-finance',totals:values,customers:[{id:'fixture:a',actual:values,expected:{...values}}]};
  await publishFinanceSnapshot(db.ingestor,evidence);await publishFinanceSnapshot(db.ingestor,{...evidence,date:'2025-01-31'});
  const scope={tenantId:'a',database:(await db.ingestor.query('SELECT current_database() database')).rows[0].database,revisionId:await revision(db.runtime),bounds};
  await registerPreparedReportingWindow(db.ingestor,scope,window);await preparePublishedRevision(db.ingestor,scope);
  const repo=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  assert.deepEqual((await repo.execute({metric:'net_aged_receivable',dateRange:{from:'2025-01-01',to:'2025-01-10'}},context)).rows,[{key:null,value:100}]);
  assert.deepEqual((await repo.execute({metric:'net_aged_receivable',groupBy:'month',dateRange:{from:'2025-01-01',to:'2025-01-31'}},context)).rows.map(row=>row.key),['2025-01']);
  await assert.rejects(repo.execute({metric:'net_aged_receivable',dateRange:{from:'2024-12-01',to:'2024-12-31'}},context),/outside prepared reporting coverage/);
 }finally{await db.close();}
});
test('reporting window registration enforces tenant/revision, full-month bounds, operator permission and pre-seal lifecycle in the database',{skip:!enabled},async()=>{
 const db=await setup();try{
  const revisionId=await revision(db.runtime),params=['a',revisionId,window.from,window.to];
  await assert.rejects(tenantTransaction(db.ingestor,'b',client=>client.query('INSERT INTO mart.prepared_reporting_windows VALUES($1,$2,$3,$4)',params)),/tenant|row-level/i);
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query('INSERT INTO mart.prepared_reporting_windows VALUES($1,$2,$3,$4)',['a','synthetic-wrong',window.from,window.to])),/publication changed/);
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query('INSERT INTO mart.prepared_reporting_windows VALUES($1,$2,$3,$4)',['a',revisionId,'2025-01-02',window.to])),/check constraint/);
  await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query('INSERT INTO mart.prepared_reporting_windows VALUES($1,$2,$3,$4)',params)),/permission denied/);
  const scope={tenantId:'a',database:(await db.ingestor.query('SELECT current_database() database')).rows[0].database,revisionId,bounds};
  await preparePublishedRevision(db.ingestor,scope);
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query('INSERT INTO mart.prepared_reporting_windows VALUES($1,$2,$3,$4)',params)),/must precede/);
 }finally{await db.close();}
});

test('reporting window cannot register against a repeatable-read view made stale by publication',{skip:!enabled},async()=>{
 const db=await setup();let client;try{
  client=await db.ingestor.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  await client.query("SELECT set_config('mart.tenant_id','a',true)");
  const previous=(await client.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id;
  await exposeReviewMonth(db.ingestor,await snapshotSource('2025-01','business',[{measure:'review_customer_balance',entity:'one',customer:'a',value:'10.000000'}]),'business');
  await assert.rejects(client.query('INSERT INTO mart.prepared_reporting_windows VALUES($1,$2,$3,$4)',['a',previous,window.from,window.to]),/read committed isolation/);
  await client.query('ROLLBACK');
 }finally{if(client)client.release(true);await db.close();}
});


test('reporting window registration retains current unsealed checkpoints and rejects stale lifecycle reads',{skip:!enabled},async()=>{
 const db=await setup();let stale;try{
  const source=await exposeReviewMonth(db.ingestor,await snapshotSource('2025-01','business',[{measure:'review_customer_balance',entity:'one',customer:'a',value:'10.000000'}]),'business');
  const scope={tenantId:'a',database:(await db.ingestor.query('SELECT current_database() database')).rows[0].database,revisionId:source.revisionId,bounds};
  await tenantTransaction(db.ingestor,'a',async client=>{const {prepareChunk}=await import('../../src/prepared/preparation.ts');await prepareChunk(client,scope,{family:'business',kind:'event',period:'2025-01-01',through:'2025-01-31'},bounds);},false,120000);
  await registerPreparedReportingWindow(db.ingestor,scope,window);
  assert.equal((await tenantTransaction(db.ingestor,'a',client=>client.query('SELECT count(*)::int count FROM mart.prepared_bindings'),true)).rows[0].count,1);
  await preparePublishedRevision(db.ingestor,scope);
  assert.ok((await tenantTransaction(db.ingestor,'a',client=>client.query('SELECT count(*)::int count FROM mart.prepared_revision_seals'),true)).rows[0].count>0);
  stale=await db.ingestor.connect();await stale.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await stale.query("SELECT set_config('mart.tenant_id','a',true)");
  await assert.rejects(stale.query('INSERT INTO mart.prepared_reporting_windows VALUES($1,$2,$3,$4)',['a',scope.revisionId,window.from,window.to]),/read committed isolation/);await stale.query('ROLLBACK');
 }finally{if(stale)stale.release(true);await db.close();}
});

test('an opening-only Finance release remains authoritative inside the reporting window',{skip:!enabled},async()=>{
 const db=await setup(true);try{
  const values=Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?'100.000000':'0.000000']));
  await publishFinanceSnapshot(db.ingestor,{tenantId:'a',currency:'IQD',date:'2024-12-31',sourceCutoff:'2026-10-01T10:00:00.000Z',sourceRevision:'synthetic-finance-opening',totals:values,customers:[{id:'fixture:a',actual:values,expected:{...values}}]});
  const scope={tenantId:'a',database:(await db.ingestor.query('SELECT current_database() database')).rows[0].database,revisionId:await revision(db.runtime),bounds};
  await registerPreparedReportingWindow(db.ingestor,scope,window);await preparePublishedRevision(db.ingestor,scope);
  const repo=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const query={metric:'net_aged_receivable' as const,dateRange:{from:'2025-01-01',to:'2025-01-10'}};
  const result=await repo.execute(query,context);assert.deepEqual(result.rows,[{key:null,value:100}]);assert.equal(result.metadata.snapshotAsOf,'2024-12-31');
  assert.ok((await repo.getPublishedCapabilities(context)).releases.some(release=>release.mappingId==='trusted-receivables'&&release.period?.from==='2025-01-01'));
  assert.deepEqual((await repo.execute({metric:'net_aged_receivable'},context)).rows,[{key:null,value:100}]);
 }finally{await db.close();}
});


test('registration rejects a repeatable-read view made stale by preparation sealing the same revision',{skip:!enabled},async()=>{
 const db=await setup();let stale;try{
  const scope={tenantId:'a',database:(await db.ingestor.query('SELECT current_database() database')).rows[0].database,revisionId:await revision(db.runtime),bounds};
  stale=await db.ingestor.connect();await stale.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await stale.query("SELECT set_config('mart.tenant_id','a',true)");
  assert.equal((await stale.query('SELECT count(*)::int count FROM mart.prepared_revision_seals')).rows[0].count,0);
  await preparePublishedRevision(db.ingestor,scope);
  await assert.rejects(stale.query('INSERT INTO mart.prepared_reporting_windows VALUES($1,$2,$3,$4)',['a',scope.revisionId,window.from,window.to]),/read committed isolation/);await stale.query('ROLLBACK');
 }finally{if(stale)stale.release(true);await db.close();}
});
