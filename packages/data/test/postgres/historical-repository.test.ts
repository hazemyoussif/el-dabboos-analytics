import {historicalMember as member} from './historical-fixtures.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { HistoricalAnalyticsRepository } from '../../src/postgres/historical-repository.ts';
import {PostgresHistoricalPublication} from '../../src/postgres/historical-publication.ts';
import {promoteLocalBoundedRelease} from '../../src/postgres/local-bounded-promotion.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import { tenantTransaction } from '../../src/postgres/session.ts';
import { database,enabled } from './support.ts';
import { mapping,deploy } from './fixtures.ts';

test('hosted historical activation requires exact complete receipts, reruns, and coexists with operational serving',{skip:!enabled},async()=>{
  const db=await database();
  try {
    await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
    const before=(await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows;
    const cursor=(await db.admin.query('SELECT * FROM mart.analytics_source_cursors')).rows;
    const publication=new PostgresHistoricalPublication(db.migrator);
    const members=[];
    for(const month of ['2025-12','2026-01'])for(const kind of ['events','aging'] as const){
      const datasetId=await member(db,month,kind,kind==='events'?'150.000000':'900.000000',{publicationOnly:true,finance:kind==='aging',customer:kind==='events'});
      members.push({datasetId,from:`${month}-01`,to:`${month}-31`,kind,fingerprint:''});
    }
    const manifest={tenantId:'a',reference:'synthetic-history',anchorDatasetId:'release',from:'2025-12-01',to:'2026-01-31',approvalReference:'SYNTHETIC ONLY',members};
    await assert.rejects(publication.activate(manifest),/Exact immutable monthly promotion/);
    for(const entry of members)entry.fingerprint=(await promoteLocalBoundedRelease(db.migrator,{tenantId:'a',datasetId:entry.datasetId,reference:'SYNTHETIC ONLY'})).fingerprint;
    await assert.rejects(publication.activate({...manifest,anchorDatasetId:'stale-release'}),/current serving binding/);
    await assert.rejects(publication.activate({...manifest,members:[members[0]!]}),/complete event and snapshot/);
    await assert.rejects(publication.activate({...manifest,members:members.map(entry=>({...entry,fingerprint:'0'.repeat(64)}))}),/Exact immutable monthly promotion/);
    assert.equal((await db.admin.query('SELECT * FROM mart.historical_release_members')).rowCount,0);
    assert.deepEqual(await publication.activate(manifest),{reference:'synthetic-history',alreadyBound:false});
    assert.deepEqual(await publication.activate(manifest),{reference:'synthetic-history',alreadyBound:true});
    assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows,before);
    assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_source_cursors')).rows,cursor);
    assert.equal((await db.admin.query('SELECT dataset_id FROM mart.serving_bindings')).rows[0].dataset_id,'release');
    const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:'a',locale:'en' as const};
    const capabilities=await repository.getPublishedCapabilities(context);
    assert.equal(capabilities.releases.some(release=>release.datasetId==='synthetic-history'),false);
    assert.equal((await repository.execute({metric:'revenue',dateRange:{from:'2025-12-01',to:'2025-12-31'}},context)).rows[0]?.value,null);
    assert.equal((await repository.execute({metric:'revenue',dateRange:{from:'2026-01-01',to:'2026-01-31'}},context)).rows[0]?.value,0);
    await assert.rejects(repository.listDimensionOptions('customer',context),/Uncertified/);
    await assert.rejects(repository.execute({metric:'revenue',dateRange:{from:'2025-12-01',to:'2025-12-31'}},{...context,enforcedFilters:[{dimension:'salesperson',values:['unapproved']}]}),/Uncertified/);
  } finally {await db.close();}
});

test('historical collection: exact PostgreSQL sums, monthly MoM, preserved anchor, gaps and immutable tenant serving',{skip:!enabled},async()=>{
  const db=await database();
  try {
    await deploy(db.migrator,mapping());
    const first=await member(db,'2026-01','events','100.000000');
    await member(db,'2026-01','aging','900.000000');
    const bind=()=>tenantTransaction(db.migrator,'a',client=>client.query(`INSERT INTO mart.historical_serving_bindings(tenant_id,reference,anchor_dataset_id,period_from,period_to,approval_reference) VALUES('a','synthetic-history','release','2026-01-01','2026-03-31','SYNTHETIC ONLY')`));
    await assert.rejects(bind(),/complete event and snapshot/);
    await tenantTransaction(db.runtime,'a',async client=>assert.equal((await client.query('SELECT 1 FROM mart.canonical_facts WHERE dataset_id=$1',[first])).rowCount,0));
    for (const [month,value] of [['2026-02','200.000000'],['2026-03','0.000000']]) {await member(db,month!,'events',value!);await member(db,month!,'aging','800.000000');}
    await bind();
    assert.throws(()=>new HistoricalAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'},historicalMaxGroups:5001}),/historical group bound/);
    assert.throws(()=>new HistoricalAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'},historicalDiscoveryTimeoutMs:120001}),/historical discovery deadline/);
    const repository=new HistoricalAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:'a',locale:'en' as const},dateRange={from:'2026-01-01',to:'2026-03-31'};
    const total=await repository.execute({metric:'revenue',dateRange},context);
    assert.deepEqual(total.rows,[{key:null,value:300}]);
    assert.equal(total.metadata.dataThrough,'2026-03-31');
    assert.deepEqual((await repository.execute({metric:'revenue',groupBy:'branch',dateRange},context)).rows,[{key:'cairo',value:300}]);
    const trend=await repository.execute({metric:'revenue',groupBy:'month',dateRange,analysis:{comparison:'month_over_month'}},context);
    assert.equal(trend.metadata.dataThrough,'2026-03-31');
    assert.deepEqual(trend.rows.map(row=>[row.value,row.comparisonValue,row.absoluteChange,row.percentageChange]),[[100,null,null,null],[200,100,100,100],[0,200,-200,-100]]);
    const average=await repository.execute({metric:'revenue',groupBy:'month',dateRange,analysis:{movingAverage:{window:3}}},context);
    assert.deepEqual(average.rows.map(row=>row.value),[100,150,100]);
    assert.equal((await repository.execute({metric:'net_aged_receivable',dateRange},context)).rows[0]!.value,800);
    assert.deepEqual((await repository.execute({metric:'net_aged_receivable',groupBy:'month',dateRange},context)).rows.map(row=>row.value),[900,800,800]);
    await assert.rejects(repository.execute({metric:'revenue',groupBy:'month',dateRange,analysis:{comparison:'year_over_year'}},context),/Uncertified/);
    const anchor=await repository.execute({metric:'revenue',dateRange:{from:'2026-01-01',to:'2026-01-31'}},context);
    assert.equal(anchor.rows[0]!.value,0);
    await assert.rejects(tenantTransaction(db.migrator,'a',client=>client.query('DELETE FROM mart.historical_release_members')),/immutable|Immutable/);
    await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query('INSERT INTO mart.historical_release_members VALUES($1,$2,$3,$4,$5,$6)',['a','evil',first,'2026-01-01','2026-01-31','events'])),/permission/);
    await tenantTransaction(db.runtime,'b',async client=>assert.equal((await client.query('SELECT * FROM mart.historical_serving_bindings')).rowCount,0));
  } finally {await db.close();}
});

 test('historical 1/6/12 month ratios use exact summed bases; snapshot cutoff and coverage are governed',{skip:!enabled},async(testContext)=>{
 const db=await database();
 try {
  await deploy(db.migrator,mapping());
  const months=['2024-10','2024-11','2024-12','2025-01','2025-02','2025-03','2025-04','2025-05','2025-06','2025-07','2025-08','2025-09'];
  for(const [index,month] of months.entries()) {
   await member(db,month,'events',index===0?'100.000000':'900.000000',index===0?'1.000000':'3.000000');
   await member(db,month,'aging',`${1000+index}.000000`);
  }
  await tenantTransaction(db.migrator,'a',client=>client.query(`INSERT INTO mart.historical_serving_bindings(tenant_id,reference,anchor_dataset_id,period_from,period_to,approval_reference) VALUES('a','synthetic-history','release','2024-10-01','2025-09-30','SYNTHETIC ONLY')`));
  const repository=new HistoricalAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:'a',locale:'en' as const};
  for(const [to,numerator,denominator] of [['2024-10-31',100,1],['2025-03-31',4600,16],['2025-09-30',10000,34]] as const) {
   const range={from:'2024-10-01',to};
   const started=performance.now();
   const result=await repository.execute({metric:'average_confirmed_order_value',dateRange:range},context);
   const firstRequestMs=performance.now()-started;
   const warmStarted=performance.now();
   await repository.execute({metric:'average_confirmed_order_value',dateRange:range},context);
   testContext.diagnostic(JSON.stringify({syntheticBenchmark:'ratio',range,firstRequestMs:Math.round(firstRequestMs),warmRequestMs:Math.round(performance.now()-warmStarted)}));
   assert.equal(result.rows[0]?.value,numerator/denominator);
   assert.equal((await repository.execute({metric:'order_revenue',dateRange:range},context)).rows[0]?.value,numerator);
  }
  const snapshot=await repository.execute({metric:'net_aged_receivable',dateRange:{from:'2024-10-01',to:'2025-06-15'}},context);
  assert.equal(snapshot.rows[0]?.value,1007);assert.equal(snapshot.metadata.snapshotAsOf,'2025-05-31');
  await assert.rejects(repository.execute({metric:'order_revenue',dateRange:{from:'2024-09-01',to:'2025-09-30'}},context),/Uncertified/);
  const grouped=await repository.execute({metric:'average_confirmed_order_value',groupBy:'salesperson',dateRange:{from:'2024-10-01',to:'2025-09-30'}},context);
  assert.deepEqual(grouped.rows,[{key:'cairo',value:10000/34}]);
 }finally{await db.close();}
});
