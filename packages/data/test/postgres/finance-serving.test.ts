import { TrustedDrillThroughRepository } from '../../src/operational/drill-through.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {mkdtemp,cp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {migrationDirectory,migratePostgres} from '../../src/postgres/migrations.ts';
import {deploy,mapping} from './fixtures.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {publishFinanceSnapshot} from '../../src/operational/finance-publication.ts';
import type {FinanceSnapshotEvidence} from '../../src/operational/finance-publication.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import {receivableMeasures} from '../../src/receivable-aging.ts';
function evidence(date:string,count=1):FinanceSnapshotEvidence {
 const values=Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?'100.000000':'0.000000']));
 return {tenantId:'a',date,currency:'IQD',sourceCutoff:'2026-10-08T00:21:08.728Z',sourceRevision:'synthetic-retained-snapshot',totals:Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?`${count*100}.000000`:'0.000000'])),customers:Array.from({length:count},(_,index)=>({id:`fixture:${String(index).padStart(5,'0')}`,label:`Customer ${index}`,actual:values,expected:{...values}}))};
}
async function fixture(summaryOnly=false){
 const db=await database(),specification=mapping();
 const rule=specification.measures[2]!;
 specification.measures=receivableMeasures.map(measureId=>({...rule,measureId,dimensionMappings:summaryOnly?{}:{customer:'Synthetic governed identity'}}));
 specification.capabilities=receivableMeasures.map(metric=>({metric,dimensions:summaryOnly?[]:['customer','month']}));
 await deploy(db.migrator,specification);
 await bootstrapOperationalServing(db.migrator,'a');
 return {db,repository:new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}})};
}
test('unified exact customer snapshots resolve historical, middle-date, latest and absent cutoffs without rewriting certificates',{skip:!enabled},async()=>{
 const {db,repository}=await fixture();try {
  const prior=(await db.admin.query('SELECT specification FROM mart.release_certifications')).rows;
  for(const date of ['2025-10-31','2026-01-31','2026-05-31','2026-06-30','2026-09-30'])await publishFinanceSnapshot(db.migrator,evidence(date));
  for(const [end,asOf] of [['2025-10-31','2025-10-31'],['2026-01-31','2026-01-31'],['2026-06-17','2026-05-31'],['2026-06-30','2026-06-30'],['2026-10-08','2026-09-30']]){
   const result=await repository.execute({metric:'net_aged_receivable',groupBy:'customer',dateRange:{from:'2025-10-01',to:end!}},{tenantId:'a',locale:'en'});
   assert.equal(result.rows[0]?.value,100);assert.equal(result.metadata.snapshotAsOf,asOf);assert.ok(result.metadata.release?.outputCertificationReference?.startsWith('Exact historical snapshot:'));
  }
  const missing=await repository.execute({metric:'net_aged_receivable',dateRange:{from:'2025-01-01',to:'2025-10-30'}},{tenantId:'a',locale:'ar'});assert.equal(missing.rows[0]?.value,null);assert.equal(missing.metadata.availability?.state,'DATA_NOT_READY');
  const trend=await repository.execute({metric:'net_aged_receivable',groupBy:'month',dateRange:{from:'2026-05-01',to:'2026-06-30'}},{tenantId:'a',locale:'en'});assert.deepEqual(trend.rows.map(row=>row.value),[100,100]);
  const drill=new TrustedDrillThroughRepository(db.runtime,scope=>repository.getPublishedCapabilities(scope));
  for(const row of trend.rows){const page=await drill.drill({query:{metric:'net_aged_receivable',dateRange:{from:row.key+'-01',to:row.key==='2026-05'?'2026-05-31':'2026-06-30'}},release:trend.metadata.drillReleases![row.key!]!,sourceAsOf:trend.metadata.sourceAsOf!},{tenantId:'a',locale:'en'});assert.equal(Number(page.value),row.value);assert.equal(page.snapshotAsOf?.slice(0,7),row.key);}
  assert.deepEqual((await db.admin.query('SELECT specification FROM mart.release_certifications')).rows,prior);
  const hidden=await tenantTransaction(db.runtime,'b',client=>client.query('SELECT * FROM mart.finance_snapshot_customers'),true);assert.equal(hidden.rowCount,0);
  const scoped=await repository.execute({metric:'net_aged_receivable',dateRange:{from:'2025-10-01',to:'2026-09-30'}},{tenantId:'a',locale:'en',enforcedFilters:[{dimension:'customer',values:['fixture:absent']}]});assert.equal(scoped.rows[0]?.value,0);
  await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query("UPDATE mart.finance_snapshot_customers SET label='tampered'")),/permission denied/);
  await assert.rejects(tenantTransaction(db.migrator,'a',client=>client.query("INSERT INTO mart.finance_snapshot_customers SELECT tenant_id,snapshot_id,'appended-customer',label,actual_values,expected_values FROM mart.finance_snapshot_customers LIMIT 1")),/membership is immutable/);
  const bad=evidence('2026-08-31');bad.customers[0]!.expected.net_aged_receivable='99.000000';await assert.rejects(publishFinanceSnapshot(db.migrator,bad),/Exact governed/);
 }finally{await db.close();}
});

test('more than 3000 governed customers use bounded stable search and selected-ID hydration',{skip:!enabled},async()=>{
 const {db,repository}=await fixture();try {
  await publishFinanceSnapshot(db.migrator,evidence('2026-09-30',3105));
  const context={tenantId:'a',locale:'en' as const},request={metric:'net_aged_receivable' as const,asOf:'2026-10-08',limit:50};
  const first=await repository.searchDimensionOptions('customer',context,{...request,selectedIds:['fixture:03104']});
  assert.equal(first.values.length,50);assert.equal(first.selected[0]?.label,'Customer 3104');assert.ok(first.nextCursor);
  const second=await repository.searchDimensionOptions('customer',context,{...request,cursor:first.nextCursor});assert.equal(second.values.length,50);assert.equal(second.values[0]?.id,'fixture:00050');assert.equal(new Set([...first.values,...second.values].map(option=>option.id)).size,100);
  const search=await repository.searchDimensionOptions('customer',context,{...request,search:'Customer 310'});assert.equal(search.values.length,6);
  await assert.rejects(repository.searchDimensionOptions('customer',{...context,enforcedFilters:[{dimension:'customer',values:['fixture:03104']}]},{...request,cursor:first.nextCursor}),/Invalid dimension continuation/);
  const scoped=await repository.searchDimensionOptions('customer',{...context,enforcedFilters:[{dimension:'customer',values:['fixture:03104']}]},request);assert.deepEqual(scoped.values.map(option=>option.id),['fixture:03104']);
  const drill=new TrustedDrillThroughRepository(db.runtime,scope=>repository.getPublishedCapabilities(scope));
  const bucketQuery={metric:'aged_at_date' as const,dateRange:{from:'2025-10-01',to:'2026-10-08'}};
  const bucketSummary=await repository.execute(bucketQuery,context),started=performance.now();
  const bucket=await drill.drill({query:bucketQuery,sourceAsOf:bucketSummary.metadata.sourceAsOf!,release:bucketSummary.metadata.release!.datasetId,limit:50},context);
  assert.equal(bucket.rows.length,50);assert.equal(Number(bucket.value),bucketSummary.rows[0]!.value);
  process.stdout.write(`drill-benchmark ${JSON.stringify({name:'Receivables bucket',records:3105,firstPageMs:performance.now()-started})}\n`);
  const headline=await repository.execute({metric:'net_aged_receivable',dateRange:{from:'2025-10-01',to:'2026-10-08'}},context);assert.equal(headline.rows[0]?.value,310500);
 }finally{await db.close();}
});


test('Finance drill pins a single published customer snapshot, signed bucket amounts and scoped pages',{skip:!enabled},async()=>{
 const {db,repository}=await fixture();try {
  const snapshot=evidence('2026-09-30',3);
  for(const customer of snapshot.customers)customer.actual={...customer.actual};
  const credit=snapshot.customers[1]!;for(const measure of ['net_aged_receivable','aged_at_date'])credit.actual[measure]='-25.000000';credit.actual.gross_open_receivable_components='0.000000';credit.actual.credit_balances='-25.000000';credit.expected={...credit.actual};
  snapshot.totals.net_aged_receivable='175.000000';snapshot.totals.aged_at_date='175.000000';snapshot.totals.gross_open_receivable_components='200.000000';snapshot.totals.credit_balances='-25.000000';
  await publishFinanceSnapshot(db.migrator,snapshot);
  const context={tenantId:'a',locale:'ar' as const},query={metric:'net_aged_receivable' as const,dateRange:{from:'2026-01-01',to:'2026-10-08'}};
  const summary=await repository.execute(query,context),release=summary.metadata.release!.datasetId;
  const drill=new TrustedDrillThroughRepository(db.runtime,scope=>repository.getPublishedCapabilities(scope));
  const started=performance.now(),first=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,limit:2,sort:{field:'customer',direction:'asc'}},context);
  const firstPageMs=performance.now()-started;
  const second=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,limit:2,sort:{field:'customer',direction:'asc'},cursor:first.nextCursor!},context);
  assert.equal(Number(first.value),summary.rows[0]!.value);assert.equal(first.snapshotAsOf,'2026-09-30');assert.equal([...first.rows,...second.rows].reduce((sum,row)=>sum+Number(row.amount),0),175);
  assert.equal(first.grain,'customer_snapshot');assert.equal(second.hasMore,false);
  const scoped=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release,clicked:{dimension:'customer',values:['fixture:00001']}},context);assert.equal(scoped.value,'-25.000000');assert.equal(scoped.rows[0]!.customer,'Customer 1');
  const bucket=await drill.drill({query:{...query,metric:'credit_balances'},sourceAsOf:summary.metadata.sourceAsOf!,release},context);assert.equal(bucket.value,'-25.000000');
  await assert.rejects(drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release},{...context,enforcedFilters:[{dimension:'salesperson',values:['rep']}]}));
  // Later month-end publication does not alter an already-open immutable snapshot.
  await publishFinanceSnapshot(db.migrator,evidence('2026-08-31'));
  assert.equal((await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release},context)).snapshotAsOf,'2026-09-30');
  process.stdout.write(`drill-finance-first-page ${JSON.stringify({rows:3,ms:firstPageMs})}\n`);
 }finally{await db.close();}
});

test('AI Analyst direct Finance execution pins latest trusted snapshot <= Oct 8 with scoped customers, approved analyses and reusable drill lineage',{skip:!enabled},async()=>{
 const {AnalyticsIntentExecutor,analyticsResultDrillRequest}=await import('../../../application/src/analytics-execution.ts');
 const {DefaultAuthorizationPolicy}=await import('../../../application/src/security.ts');
 const {db,repository}=await fixture();try {
  await publishFinanceSnapshot(db.migrator,evidence('2026-09-30',2));
  await publishFinanceSnapshot(db.migrator,evidence('2026-08-31',1));
  const identity:import('@el-dabboos/domain').RequestContext={principal:{userId:'synthetic-analyst',membershipId:'synthetic-membership'},tenant:{tenantId:'a'},locale:'en',authorization:{permissions:['analytics:query'],metricDomains:['finance'],enforcedFilters:[]}};
  const executor=new AnalyticsIntentExecutor(repository,repository,new DefaultAuthorizationPolicy(),{timeZone:'Asia/Baghdad',clock:()=>new Date('2026-10-08T12:00:00Z')});
  const intent:import('../../../application/src/analytics-intent.ts').AnalyticsIntent={context:{dateRange:{from:'2026-10-08',to:'2026-10-08'}},analyses:[{series:[{metric:'net_aged_receivable'}]}]};
  const output=await executor.execute(intent,identity);assert.ok('analyses' in output);
  const entry=output.analyses[0]!.series[0]!;assert.equal(entry.status,'SUPPORTED');
  assert.equal(entry.result.rows[0]!.value,200);assert.equal(entry.result.metadata.snapshotAsOf,'2026-09-30');assert.equal(entry.form,'snapshot');assert.equal(entry.result.metadata.reconciliation?.status,'exact');
  const request=analyticsResultDrillRequest(entry,null);assert.ok(request);
  const drill=new TrustedDrillThroughRepository(db.runtime,scope=>repository.getPublishedCapabilities(scope));
  const page=await drill.drill(request,{tenantId:'a',locale:'en'});assert.equal(page.value,'200.000000');assert.equal(page.snapshotAsOf,'2026-09-30');
  const scoped=await executor.execute({...intent,analyses:[{dimension:'customer',series:[{metric:'net_aged_receivable'}]}]}, {...identity,authorization:{...identity.authorization,enforcedFilters:[{dimension:'customer',values:['fixture:00001']}]}});
  assert.ok('analyses' in scoped);const scopedResult=scoped.analyses[0]!.series[0]!;assert.notEqual(scopedResult.status,'EXECUTION_FAILED');if(scopedResult.status!=='EXECUTION_FAILED')assert.deepEqual(scopedResult.result.rows.map(row=>row.key),['fixture:00001']);
  const missing=await executor.execute({...intent,context:{dateRange:{from:'2025-01-01',to:'2025-01-01'}}},identity);assert.equal(missing.status,'DATA_NOT_READY');
  process.stdout.write(`analytics-intent-benchmark ${JSON.stringify(output.timing)}\n`);
 }finally{await db.close();}
});

test('snapshot candidate preserves facts, replaces only its month, and rejects bad controls and non-month-end evidence',{skip:!enabled},async()=>{
 const {db,repository}=await fixture();
 try{
  assert.equal((await db.admin.query('SELECT * FROM mart.analytics_anchor_capabilities')).rowCount,0);
  const membership=async()=> (await db.admin.query('SELECT member.month::text,member.family,member.partition_id,trusted.revision_id FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) ORDER BY month,family')).rows;
  await publishFinanceSnapshot(db.ingestor,evidence('2026-08-31'));await publishFinanceSnapshot(db.ingestor,evidence('2026-09-30'));
  const before=await membership();
  const bad=evidence('2026-07-31');bad.totals.net_aged_receivable='99.000000';
  await assert.rejects(publishFinanceSnapshot(db.ingestor,bad),/Exact governed Finance summary/);assert.deepEqual(await membership(),before);
  await assert.rejects(publishFinanceSnapshot(db.ingestor,evidence('2026-07-30')),/finance_month_end/);assert.deepEqual(await membership(),before);
  await assert.rejects(publishFinanceSnapshot(db.ingestor,evidence('2026-07-31'),async()=>{throw new Error('retained source lost');}),/retained source lost/);assert.deepEqual(await membership(),before);
  await publishFinanceSnapshot(db.ingestor,evidence('2026-08-31',2));
  const after=await membership();
  for(const prior of before){const next=after.find(row=>row.month===prior.month&&row.family===prior.family)!;assert.notEqual(next.revision_id,prior.revision_id);if(prior.month==='2026-08-01')assert.notEqual(next.partition_id,prior.partition_id);else assert.equal(next.partition_id,prior.partition_id);}
  assert.equal((await repository.execute({metric:'net_aged_receivable',dateRange:{from:'2026-08-01',to:'2026-08-31'}},{tenantId:'a',locale:'en'})).rows[0]?.value,200);
  assert.equal((await db.admin.query('SELECT * FROM mart.finance_snapshot_publications')).rowCount,0);
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query("INSERT INTO mart.analytics_serving_members SELECT tenant_id,revision_id,'2026-07-01',partition_id,family FROM mart.analytics_serving_members WHERE family='receivables' LIMIT 1")),/Partition identity mismatch|immutable/);
 }finally{await db.close();}
});

test('exact customer snapshot vectors supply their customer grain independently of summary-only baseline dimensions',{skip:!enabled},async()=>{
 const {db,repository}=await fixture(true),context={tenantId:'a',locale:'en' as const},dateRange={from:'2026-09-01',to:'2026-09-30'};
 try{
  await assert.rejects(repository.execute({metric:'net_aged_receivable',groupBy:'customer',dateRange},context),/Uncertified/);
  await publishFinanceSnapshot(db.ingestor,evidence('2026-09-30'));
  const capabilities=await repository.getPublishedCapabilities(context);
  for(const metric of ['gross_open_receivable_components','credit_balances'] as const){
   assert.ok(capabilities.releases.filter(release=>release.mappingId==='trusted-receivables').flatMap(release=>release.capabilities).filter(capability=>capability.metric===metric).every(capability=>capability.summary&&capability.dimensions.includes('customer')&&capability.dimensions.includes('month')));
   assert.equal((await repository.execute({metric,dateRange},context)).rows[0]?.value,metric==='credit_balances'?0:100);
   assert.equal((await repository.execute({metric,groupBy:'customer',dateRange},context)).rows[0]?.value,metric==='credit_balances'?0:100);
   assert.deepEqual((await repository.searchDimensionOptions('customer',context,{metric,asOf:dateRange.to})).values.map(option=>option.id),['fixture:00000']);
   assert.deepEqual((await repository.execute({metric,groupBy:'month',dateRange},context)).rows.map(row=>row.value),[metric==='credit_balances'?0:100]);
  }
  assert.equal((await repository.execute({metric:'net_aged_receivable',groupBy:'customer',dateRange},context)).rows[0]?.value,100);
  assert.deepEqual((await repository.searchDimensionOptions('customer',context,{metric:'net_aged_receivable',asOf:dateRange.to})).values.map(option=>option.id),['fixture:00000']);
  assert.ok(capabilities.releases.flatMap(release=>release.capabilities).every(capability=>!capability.analyses.includes('percentageContribution')));
  for(const analysis of [{ranking:true as const},{topN:{limit:1,direction:'top' as const}}]){
   await assert.rejects(repository.execute({metric:'net_aged_receivable',groupBy:'customer',dateRange,analysis},context),/Uncertified/);
  }
 }finally{await db.close();}
});

test('concurrent Finance promotions retain both months in a serialized trusted ancestry',{skip:!enabled},async()=>{
 const {db}=await fixture();
 try{
  const parent=(await db.admin.query('SELECT revision_id FROM mart.analytics_trusted_serving')).rows[0].revision_id;
  await Promise.all(['2026-08-31','2026-09-30'].map(date=>publishFinanceSnapshot(db.ingestor,evidence(date))));
  const members=(await db.admin.query("SELECT snapshot_date::text FROM mart.trusted_finance_snapshots ORDER BY snapshot_date")).rows;
  assert.deepEqual(members.map(row=>row.snapshot_date),['2026-08-31','2026-09-30']);
  const revisions=(await db.admin.query("SELECT revision_id,parent_revision FROM mart.analytics_serving_revisions WHERE purpose='snapshot'")).rows;
  assert.equal(revisions.length,2);
  const first=revisions.find(row=>row.parent_revision===parent)!;
  const second=revisions.find(row=>row.parent_revision===first.revision_id)!;
  assert.equal((await db.admin.query('SELECT revision_id FROM mart.analytics_trusted_serving')).rows[0].revision_id,second.revision_id);
 }finally{await db.close();}
});

test('verified empty Finance cutoffs publish zero balances and empty customer detail while missing cutoffs remain unavailable',{skip:!enabled},async()=>{
 const {db,repository}=await fixture(),context={tenantId:'a',locale:'en' as const};
 try {
  const before=(await db.admin.query('SELECT * FROM mart.analytics_source_cursors')).rows;
  const empty=evidence('2026-06-30',0);
  const published=await publishFinanceSnapshot(db.ingestor,empty);
  assert.equal(published.alreadyPublished,false);
  assert.equal((await publishFinanceSnapshot(db.ingestor,empty)).alreadyPublished,true);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_source_cursors')).rows,before);
  const query={metric:'net_aged_receivable' as const,dateRange:{from:'2026-06-01',to:'2026-06-30'}};
  for(const metric of receivableMeasures){const summary=await repository.execute({...query,metric},context);assert.equal(summary.rows[0]?.value,0);assert.equal(summary.metadata.snapshotAsOf,empty.date);assert.equal(summary.metadata.availability,undefined);}
  const summary=await repository.execute(query,context);
  const customers=await repository.execute({...query,groupBy:'customer'},context);assert.deepEqual(customers.rows,[]);assert.equal(customers.metadata.snapshotAsOf,empty.date);
  const month=await repository.execute({...query,groupBy:'month'},context);assert.deepEqual(month.rows,[{key:'2026-06',value:0}]);
  const page=await repository.searchDimensionOptions('customer',context,{metric:'net_aged_receivable',asOf:empty.date,limit:50});assert.deepEqual(page.values,[]);
  const drill=new TrustedDrillThroughRepository(db.runtime,scope=>repository.getPublishedCapabilities(scope));
  const detail=await drill.drill({query,sourceAsOf:summary.metadata.sourceAsOf!,release:published.snapshotId},context);assert.deepEqual(detail.rows,[]);assert.equal(detail.value,'0');assert.equal(detail.hasMore,false);assert.equal(detail.snapshotAsOf,empty.date);
  const absent=await repository.execute({...query,dateRange:{from:'2025-12-01',to:'2025-12-31'}},context);assert.equal(absent.rows[0]?.value,null);assert.equal(absent.metadata.availability?.state,'DATA_NOT_READY');
  const hidden=await tenantTransaction(db.runtime,'b',client=>client.query('SELECT * FROM mart.finance_snapshot_evidence'),true);assert.equal(hidden.rowCount,0);
  await assert.rejects(publishFinanceSnapshot(db.ingestor,evidence('2026-07-31',0),async()=>{throw new Error('empty source lease lost');}),/empty source lease lost/);
  assert.equal((await db.admin.query("SELECT count(*)::int count FROM mart.finance_snapshot_evidence WHERE snapshot_date='2026-07-31'")).rows[0].count,0);
  const valid=evidence('2026-07-31');await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query('INSERT INTO mart.finance_snapshot_customers VALUES($1,$2,$3,NULL,$4,$4)',['a',published.snapshotId,'fabricated',JSON.stringify(valid.customers[0]!.actual)])),/membership is immutable/);
 }finally{await db.close();}
});

test('database guards refuse empty nonzero totals and nonempty null operands',{skip:!enabled},async()=>{
 const {db}=await fixture();
 try {
  const original=(await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows;
  for(const malformed of ['empty-nonzero','nonempty-null']){
   await assert.rejects(tenantTransaction(db.ingestor,'a',async client=>{
    const totals=evidence('2026-07-31',0).totals;
    if(malformed==='empty-nonzero')totals.net_aged_receivable='1.000000';
    await client.query(`INSERT INTO mart.finance_snapshot_evidence VALUES($1,$2,'2026-07-31',NULL,(SELECT definition_version FROM mart.analytics_baselines WHERE tenant_id=$1),'IQD','2026-10-08','synthetic-only',$3,$4)`,['a',malformed,malformed==='empty-nonzero'?0:1,JSON.stringify(totals)]);
    if(malformed==='nonempty-null')await client.query('INSERT INTO mart.finance_snapshot_customers VALUES($1,$2,$3,NULL,$4,$4)',['a',malformed,'fixture',JSON.stringify({...totals,aged_1_30:null})]);
    await client.query("INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,family,snapshot_id) VALUES($1,$2,'2026-07-01','receivables',$2)",['a',malformed]);
   }),/Exact approved snapshot partition required|finance_complete_values/);
  }
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows,original);
 }finally{await db.close();}
});

test('forward empty-snapshot migration preserves an existing nonempty publication and migration replay',{skip:!enabled},async()=>{
 const db=await database(false),directory=await mkdtemp('/tmp/finance-before-empty-'),url=pathToFileURL(directory+'/');
 try {
  await cp(migrationDirectory,url,{recursive:true});await rm(new URL('042_empty_finance_snapshots.sql',url));await rm(new URL('043_scoped_derived_inputs.sql',url));await rm(new URL('044_post_exposure_review.sql',url));await rm(new URL('045_grouped_review_controls.sql',url));await rm(new URL('046_business_purpose.sql',url));await rm(new URL('047_immutable_review_membership.sql',url));await rm(new URL('048_review_serving_access.sql',url));await rm(new URL('049_review_fact_projection.sql',url));await rm(new URL('050_review_snapshot_identity.sql',url));await migratePostgres(db.migrator,url);
  const specification=mapping(),rule=specification.measures[2]!;
  specification.measures=receivableMeasures.map(measureId=>({...rule,measureId,dimensionMappings:{customer:'Synthetic governed identity'}}));
  specification.capabilities=receivableMeasures.map(metric=>({metric,dimensions:['customer','month']}));
  await deploy(db.migrator,specification);await bootstrapOperationalServing(db.migrator,'a');
  await publishFinanceSnapshot(db.ingestor,evidence('2026-09-30'));
  const before=(await db.admin.query('SELECT * FROM mart.finance_snapshot_evidence')).rows;
  assert.deepEqual(await migratePostgres(db.migrator),[42,43,44,45,46,47,48,49,50]);assert.deepEqual(await migratePostgres(db.migrator),[]);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.finance_snapshot_evidence')).rows,before);
  await publishFinanceSnapshot(db.ingestor,evidence('2026-06-30',0));
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  assert.equal((await repository.execute({metric:'net_aged_receivable',dateRange:{from:'2026-09-01',to:'2026-09-30'}},{tenantId:'a',locale:'en'})).rows[0]?.value,100);
 }finally{await db.close();await rm(directory,{recursive:true});}
});
