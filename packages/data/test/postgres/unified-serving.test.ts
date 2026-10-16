import {publishFinanceSnapshot} from '../../src/operational/finance-publication.ts';
import {receivableMeasures} from '../../src/receivable-aging.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {database,enabled} from './support.ts';
import {mapping,deploy} from './fixtures.ts';
import {historicalMember} from './historical-fixtures.ts';
import {migratePostgres,migrationDirectory} from '../../src/postgres/migrations.ts';
import {tenantTransaction,verifyMartRuntimeRole} from '../../src/postgres/session.ts';
import {operationalDefinitionVersion} from '../../src/operational/definition-version.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';
import {PostgresMappingReleases} from '../../src/postgres/mapping-releases.ts';
import {PostgresMartWriter} from '../../src/postgres/writer.ts';
import {PostgresReconciliation} from '../../src/postgres/reconciliation.ts';
import {PostgresReleaseCertification} from '../../src/postgres/release-certification.ts';
import {batch,evidence} from './fixtures.ts';

async function legacyDatabase(){
 const db=await database(false),directory=await mkdtemp('/tmp/unified-pre-refactor-'),url=pathToFileURL(directory+'/');
 try{await cp(migrationDirectory,url,{recursive:true});await rm(new URL('040_unified_serving.sql',url));await rm(new URL('041_historical_month_imports.sql',url));await rm(new URL('042_empty_finance_snapshots.sql',url));await rm(new URL('043_scoped_derived_inputs.sql',url));await rm(new URL('044_post_exposure_review.sql',url));await rm(new URL('045_grouped_review_controls.sql',url));await rm(new URL('046_business_purpose.sql',url));await rm(new URL('047_immutable_review_membership.sql',url));await rm(new URL('048_review_serving_access.sql',url));await rm(new URL('049_review_fact_projection.sql',url));await rm(new URL('050_review_snapshot_identity.sql',url));await rm(new URL('051_review_typed_cover.sql',url));await migratePostgres(db.migrator,url);}
 finally{await rm(directory,{recursive:true});}
 return db;
}
async function legacyOperational(db:Awaited<ReturnType<typeof database>>,specification=mapping()){
 await deploy(db.migrator,specification);
 await tenantTransaction(db.migrator,'a',async client=>{
  const capabilities={tenantId:'a',mode:'certified',releases:[{datasetId:'release',sourceId:'fixture',mappingId:'synthetic',mappingVersion:'1',certificationReference:'SYNTHETIC TEST ONLY',period:{from:'2026-01-01',to:'2026-01-31'},capabilities:[{metric:'revenue',summary:true,dimensions:['month'],analyses:[]}]}]};
  await client.query("INSERT INTO mart.analytics_baselines VALUES('a','fixture','IQD',ARRAY['release'],$1,'1',$2,$3,'2026-01-01','2026-01-31')",[operationalDefinitionVersion(),JSON.stringify([specification]),JSON.stringify(capabilities)]);
  await client.query("INSERT INTO mart.analytics_partitions VALUES('a','legacy-january','2026-01-01')");
  await client.query("INSERT INTO mart.analytics_aggregate_proofs(tenant_id,partition_id,definition_version,mapping_version,business_timezone,daily_rows,monthly_rows) VALUES('a','legacy-january',$1,'1','Asia/Baghdad',0,0)",[operationalDefinitionVersion()]);
  await client.query("INSERT INTO mart.analytics_serving_revisions VALUES('a','legacy-operational',NULL,NULL,'2026-10-01',ARRAY['2026-01-01'::date])");
  await client.query("INSERT INTO mart.analytics_serving_members VALUES('a','legacy-operational','2026-01-01','legacy-january')");
  await client.query("INSERT INTO mart.analytics_trusted_serving VALUES('a','legacy-operational')");
 });
}

async function separateFinanceAnchor(db:Awaited<ReturnType<typeof database>>){
 const specification=mapping();specification.datasetId='finance-anchor';specification.mappingVersion='6';
 specification.measures=[{...specification.measures[2]!,measureId:'net_aged_receivable',dimensionMappings:{customer:'Synthetic customer'}}];
 specification.capabilities=[{metric:'net_aged_receivable',dimensions:['customer','month']}];
 const releases=new PostgresMappingReleases(db.migrator);
 await releases.registerCandidate({...specification,approval:{status:'pending'}});
 const calibration={...batch('finance-calibration',0),datasetId:specification.datasetId,mappingVersion:'6'};
 await new PostgresMartWriter(db.migrator,{a:['fixture-company']}).commit(calibration,[],{...evidence,completeness:'complete_scope'});
 const caseId='finance-calibration-case';
 await new PostgresReconciliation(db.migrator).record([{caseId,tenantId:'a',datasetId:specification.datasetId,mappingVersion:'6',measureId:'net_aged_receivable',sourceReportReference:'SYNTHETIC ONLY',frozenRevision:'freeze-1',batchIds:[calibration.batchId],from:'2026-01-01',to:'2026-01-31',grouping:null,groupKey:null,expectedValue:'0.000000',actualValue:'0.000000',expectedCount:'0',actualCount:'0',tolerance:{status:'approved',absoluteValue:'0.000000',absoluteCount:'0',approvalReference:'SYNTHETIC ONLY'}}],'IQD');
 await new PostgresReleaseCertification(db.migrator).record({tenantId:'a',datasetId:specification.datasetId,mappingVersion:'6',reference:'SYNTHETIC ONLY',approverReference:'synthetic-authorized-operator',approvedAt:'2026-10-01T12:00:00.000Z',companyIds:['fixture-company'],from:'2026-01-01',to:'2026-01-31',caseIds:[caseId],technicalReference:'synthetic-exact-controls',evidenceKind:'authorized_business_approval',approvedValues:[{measureId:'net_aged_receivable',value:'0.000000'}],businessSemantics:['SYNTHETIC ONLY']});
 await releases.approve({tenantId:'a',datasetId:specification.datasetId,caseIds:[caseId],reference:'SYNTHETIC ONLY',approvedAt:'2026-10-01T12:00:00.000Z'});
 await tenantTransaction(db.migrator,'a',client=>client.query("UPDATE mart.serving_bindings SET dataset_id='finance-anchor' WHERE tenant_id='a'"));
}

test('migration preserves separately versioned Finance anchors and exact snapshots without changing approvals',{skip:!enabled},async()=>{
 const db=await legacyDatabase();
 try{
  const specification=mapping(),rule=specification.measures[2]!;
  specification.measures=receivableMeasures.map(measureId=>({...rule,measureId,dimensionMappings:{customer:'Synthetic customer'}}));
  specification.capabilities=receivableMeasures.map(metric=>({metric,dimensions:['customer','month']}));
  await legacyOperational(db,specification);await separateFinanceAnchor(db);
  const values=Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?'100.000000':'0.000000']));
  await tenantTransaction(db.migrator,'a',async client=>{
   await client.query("INSERT INTO mart.analytics_anchor_capabilities VALUES('a','finance-anchor',$1)",[JSON.stringify({tenantId:'a',mode:'certified',releases:[{datasetId:'finance-anchor',capabilities:[{metric:'net_aged_receivable',dimensions:['customer']}]}]})]);
   await client.query("INSERT INTO mart.finance_snapshot_evidence VALUES('a','different-version-finance','2025-09-30','finance-anchor',$1,'IQD','2026-10-01','synthetic-finance-freeze',1,$2)",[operationalDefinitionVersion(),JSON.stringify(values)]);
   await client.query("INSERT INTO mart.finance_snapshot_customers VALUES('a','different-version-finance','customer','Synthetic customer',$1,$1)",[JSON.stringify(values)]);
   await client.query("INSERT INTO mart.finance_snapshot_publications VALUES('a','2025-09-30','different-version-finance')");
  });
  const approvals=(await db.admin.query('SELECT * FROM mart.mapping_releases ORDER BY dataset_id')).rows;
  const snapshots=(await db.admin.query('SELECT * FROM mart.finance_snapshot_evidence')).rows;
  assert.deepEqual(await migratePostgres(db.migrator),[40,41,42,43,44,45,46,47,48,49,50,51]);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.mapping_releases ORDER BY dataset_id')).rows,approvals);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.finance_snapshot_evidence')).rows,snapshots);
  assert.equal((await db.admin.query('SELECT dataset_id FROM mart.serving_bindings')).rows[0].dataset_id,'finance-anchor');
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  assert.equal((await repository.execute({metric:'net_aged_receivable',groupBy:'customer',dateRange:{from:'2025-09-01',to:'2025-09-30'}},{tenantId:'a',locale:'en'})).rows[0]?.value,100);
 }finally{await db.close();}
});

test('separately versioned anchors without exact published Finance snapshots fail adoption without losing the binding',{skip:!enabled},async()=>{
 const db=await legacyDatabase();
 try{
  await legacyOperational(db);await separateFinanceAnchor(db);
  await assert.rejects(migratePostgres(db.migrator),/exact published snapshots/);
  assert.equal((await db.admin.query('SELECT dataset_id FROM mart.serving_bindings')).rows[0].dataset_id,'finance-anchor');
  assert.equal((await db.admin.query('SELECT max(version) version FROM mart_admin.mart_schema_migrations')).rows[0].version,39);
 }finally{await db.close();}
});

test('forward migration adopts certified historical events and aging beside operational serving without any Odoo connection',{skip:!enabled},async()=>{
 const db=await legacyDatabase();
 try{
  await legacyOperational(db);
  for(const month of Array.from({length:12},(_,index)=>`2025-${String(index+1).padStart(2,'0')}`)){await historicalMember(db,month,'events','150.000000');await historicalMember(db,month,'aging','900.000000');}
  await tenantTransaction(db.migrator,'a',client=>client.query("INSERT INTO mart.historical_serving_bindings(tenant_id,reference,anchor_dataset_id,period_from,period_to,approval_reference) VALUES('a','synthetic-history','release','2025-01-01','2025-12-31','SYNTHETIC ONLY')"));
  const original=(await db.admin.query('SELECT * FROM mart.historical_release_members ORDER BY period_from,kind')).rows;
  assert.deepEqual(await migratePostgres(db.migrator),[40,41,42,43,44,45,46,47,48,49,50,51]);
  assert.deepEqual(await migratePostgres(db.migrator),[]);
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}}),context={tenantId:'a',locale:'en' as const};
  const members=(await db.admin.query('SELECT member.month::text,member.family FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) ORDER BY month')).rows;
  assert.equal(members.length,13);assert.equal(members[0].month,'2025-01-01');assert.equal(members.at(-1).month,'2026-01-01');assert.equal(original.length,24);
  const range={from:'2025-11-01',to:'2025-12-31'};
  assert.equal((await repository.execute({metric:'revenue',dateRange:range},context)).rows[0]?.value,300);
  const aging=await repository.execute({metric:'net_aged_receivable',dateRange:range},context);assert.equal(aging.rows[0]?.value,900);assert.equal(aging.metadata.snapshotAsOf,'2025-12-31');
  assert.deepEqual((await repository.execute({metric:'net_aged_receivable',groupBy:'month',dateRange:range},context)).rows.map(row=>row.value),[900,900]);
  await assert.rejects(repository.execute({metric:'net_aged_receivable',groupBy:'customer',dateRange:range},context),/Uncertified/);
  const values=Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?'100.000000':'0.000000']));
  await publishFinanceSnapshot(db.ingestor,{tenantId:'a',date:'2025-11-30',currency:'IQD',sourceCutoff:'2026-10-01T10:00:00.000Z',sourceRevision:'synthetic-customer-freeze',totals:values,customers:[{id:'exact-customer',actual:values,expected:values}]});
  // A customer snapshot supersedes the same-date summary, without hiding later or earlier summaries.
  assert.equal((await repository.execute({metric:'net_aged_receivable',dateRange:range},context)).rows[0]?.value,900);
  assert.deepEqual((await repository.execute({metric:'net_aged_receivable',groupBy:'month',dateRange:{from:'2025-10-01',to:'2025-12-31'}},context)).rows.map(row=>row.value),[900,100,900]);
  const customer=await repository.execute({metric:'net_aged_receivable',groupBy:'customer',dateRange:range},context);
  assert.deepEqual(customer.rows,[{key:'exact-customer',value:100}]);
  assert.equal(customer.metadata.snapshotAsOf,'2025-11-30'); // Customer rows select their own grain, never the later company summary.

  assert.deepEqual((await db.admin.query('SELECT * FROM mart.historical_release_members ORDER BY period_from,kind')).rows,original);
  assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.analytics_trusted_serving')).rows[0].count,1);
  await verifyMartRuntimeRole(db.runtime);
  assert.equal((await tenantTransaction(db.runtime,'b',client=>client.query('SELECT * FROM mart.analytics_aggregate_bases'),true)).rowCount,0);
  assert.equal((await db.admin.query("SELECT count(*)::int count FROM pg_class JOIN pg_namespace ON pg_namespace.oid=relnamespace WHERE nspname='mart' AND relkind='r' AND relname<>'measure_definitions' AND (NOT relrowsecurity OR NOT relforcerowsecurity)")).rows[0].count,0);
 }finally{await db.close();}
});

test('migration adopts an existing frozen customer Finance publication without reading source or requiring its anchor at runtime',{skip:!enabled},async()=>{
 const db=await legacyDatabase();
 try{
  const specification=mapping(),rule=specification.measures[2]!;
  specification.measures=receivableMeasures.map(measureId=>({...rule,measureId,dimensionMappings:{customer:'Synthetic customer'}}));
  specification.capabilities=receivableMeasures.map(metric=>({metric,dimensions:['customer','month']}));
  await legacyOperational(db,specification);
  const values=Object.fromEntries(receivableMeasures.map(measure=>[measure,['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(measure)?'100.000000':'0.000000']));
  await tenantTransaction(db.migrator,'a',async client=>{
   const capabilities={tenantId:'a',mode:'certified',releases:[{datasetId:'release',capabilities:[{metric:'net_aged_receivable',dimensions:['customer']}]}]};
   await client.query("INSERT INTO mart.analytics_anchor_capabilities VALUES('a','release',$1)",[JSON.stringify(capabilities)]);
   await client.query("INSERT INTO mart.finance_snapshot_evidence VALUES('a','legacy-finance','2025-09-30','release',$1,'IQD','2026-10-01','synthetic-freeze',1,$2)",[operationalDefinitionVersion(),JSON.stringify(values)]);
   await client.query("INSERT INTO mart.finance_snapshot_customers VALUES('a','legacy-finance','customer','Synthetic customer',$1,$1)",[JSON.stringify(values)]);
   await client.query("INSERT INTO mart.finance_snapshot_publications VALUES('a','2025-09-30','legacy-finance')");
  });
  assert.deepEqual(await migratePostgres(db.migrator),[40,41,42,43,44,45,46,47,48,49,50,51]);
  const repository=new TrustedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'}});
  const result=await repository.execute({metric:'net_aged_receivable',groupBy:'customer',dateRange:{from:'2025-01-01',to:'2026-10-01'}},{tenantId:'a',locale:'en'});
  assert.deepEqual(result.rows,[{key:'customer',value:100}]);assert.equal(result.metadata.release?.datasetId,'legacy-finance');
  const members=(await db.admin.query('SELECT member.family FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) ORDER BY family')).rows;
  assert.deepEqual(members.map(row=>row.family),['facts','receivables']);
  assert.equal((await db.admin.query('SELECT * FROM mart.finance_snapshot_publications')).rowCount,1);
 }finally{await db.close();}
});

test('migration 040 adoption failure rolls back schema, adopted data and ledger together',{skip:!enabled},async()=>{
 const db=await legacyDatabase(),directory=await mkdtemp('/tmp/unified-rollback-'),url=pathToFileURL(directory+'/');
 try{
  await legacyOperational(db);
  const prior=(await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows;
  const facts=(await db.admin.query('SELECT * FROM mart.analytics_fact_revisions')).rows;
  await cp(migrationDirectory,url,{recursive:true});
  const companion=new URL('040_unified_serving.adoption.cjs',url);
  await writeFile(companion,await readFile(companion,'utf8')+`
const originalAdoption=module.exports.adoptLegacyServing;
module.exports={adoptLegacyServing:async client=>{await originalAdoption(client);throw new Error('synthetic failure after adoption');}};
`);
  await assert.rejects(migratePostgres(db.migrator,url),/synthetic failure after adoption/);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_trusted_serving')).rows,prior);
  assert.deepEqual((await db.admin.query('SELECT * FROM mart.analytics_fact_revisions')).rows,facts);
  assert.equal((await db.admin.query("SELECT count(*)::int count FROM information_schema.columns WHERE table_schema='mart' AND table_name='analytics_partitions' AND column_name='family'")).rows[0].count,0);
  assert.equal((await db.admin.query('SELECT max(version) version FROM mart_admin.mart_schema_migrations')).rows[0].version,39);
  assert.deepEqual(await migratePostgres(db.migrator),[40,41,42,43,44,45,46,47,48,49,50,51]);
  assert.deepEqual(await migratePostgres(db.migrator),[]);
 }finally{await db.close();await rm(directory,{recursive:true});}
});
