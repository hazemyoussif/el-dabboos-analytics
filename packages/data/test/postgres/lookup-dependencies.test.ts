import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import type {AnalyticsCursor,AnalyticsJobRun,ProductionFact} from '@el-dabboos/domain';
import {sourceFixture} from './odoo-source-fixture.ts';
import {enabled} from './support.ts';
import {deploy} from './fixtures.ts';
import {odooComparisonCandidate} from '../../src/odoo/mapping.ts';
import {OdooOperationalSnapshot} from '../../src/operational/source.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {recordOperationalRun,writeOperationalCursor} from '../../src/postgres/operational-evidence.ts';
import {readLookupDependencyContext,writeLookupDependencies} from '../../src/operational/lookup-dependency-store.ts';
import {operationalDefinitionVersion} from '../../src/operational/definition-version.ts';
import type {OperationalBaseline,LookupDependencyUpdate} from '../../src/operational/contracts.ts';
import type {OdooLookupDependency} from '../../src/odoo/lookup-types.ts';
const config={connection:{},credentialPolicy:'least_privilege' as const,tenantId:'el-dabboos-iq',sourceId:'el-dabboos-odoo18-pg',companyIds:['1'],batchSize:2,statementTimeoutMs:15000,snapshotMaxDurationMs:600000};
async function fixture() {
 const f=await sourceFixture();
 try {
  await f.db.admin.query("DELETE FROM sale_order WHERE company_id=1 AND id>3; INSERT INTO res_partner VALUES(21,'Other Outlet','Other City',9,NULL,false,'2026-10-01'),(80,'Other Rep',NULL,NULL,NULL,false,'2026-10-01'); INSERT INTO res_users(id,partner_id,write_date) VALUES(8,80,'2026-10-01'); INSERT INTO res_country_state VALUES(8,'Region A','2026-10-01'),(9,'Region B','2026-10-01'); UPDATE res_partner SET city='City A',state_id=8 WHERE id=20; UPDATE sale_order SET partner_id=21,user_id=8,business_line_id=2 WHERE id=3");
  const mapping=odooComparisonCandidate({...config,datasetId:'synthetic-lookups',mappingId:'odoo18',mappingVersion:'1',businessOwner:'SYNTHETIC TEST ONLY',reportingCurrency:'IQD',timeZone:'Asia/Baghdad'});
  await deploy(f.db.migrator,mapping);
  const scope:OperationalBaseline={tenantId:config.tenantId,sourceId:config.sourceId,reportingCurrency:'IQD',datasets:[mapping.datasetId],definitionVersion:operationalDefinitionVersion(),mappingVersion:'1',from:'2026-09-01',to:'2026-09-30',coveredMonths:['2026-09'],mappings:[mapping],capabilities:{tenantId:config.tenantId,mode:'certified',releases:[]}};
  await tenantTransaction(f.db.migrator,scope.tenantId,client=>client.query('INSERT INTO mart.analytics_baselines VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[scope.tenantId,scope.sourceId,scope.reportingCurrency,scope.datasets,scope.definitionVersion,scope.mappingVersion,JSON.stringify(scope.mappings),JSON.stringify(scope.capabilities),scope.from,scope.to]));
  return {...f,scope,async open(){const lease=await f.openSnapshot();return new OdooOperationalSnapshot(f.source,config,lease,scope);}};
 }catch(error){await f.close();throw error;}
}
async function observe(f:Awaited<ReturnType<typeof fixture>>,cursor:AnalyticsCursor|null,projectionVersion?:string) {
 const source=await f.open();
 try {
  const result=await tenantTransaction(f.db.ingestor,f.scope.tenantId,async client=>{
   const context=await readLookupDependencyContext(client,f.scope,cursor);
   if(context&&projectionVersion)context.projectionVersion=projectionVersion;
   const facts:ProductionFact[]=[],dependencies:OdooLookupDependency[]=[];let version:string|undefined;
   for await(const page of source.records(f.scope,cursor,undefined,context)) {
    facts.push(...page.facts);dependencies.push(...page.lookupDependencies??[]);
    if(page.lookupProjectionVersion)version=page.lookupProjectionVersion;
   }
   assert.ok(version);
   return {facts,update:{dependencies,projectionVersion:version} satisfies LookupDependencyUpdate};
  });
  return {...result,cutoff:source.cutoff};
 }finally{await source.close();}
}
function successful(scope:OperationalBaseline,cutoff:string):AnalyticsJobRun {
 return {tenantId:scope.tenantId,runId:randomUUID(),kind:'sync',actorId:'synthetic-metadata-only',trigger:'operator',sourceCutoff:cutoff,sourceRevision:'synthetic-metadata',mappingVersion:scope.mappingVersion,definitionVersion:scope.definitionVersion,startedAt:cutoff,completedAt:cutoff,status:'unchanged',recordsChanged:0,partitionsAffected:0,caseCount:0,mismatchCount:0,evidenceHash:'no-changes',servingRelease:null};
}
async function commit(f:Awaited<ReturnType<typeof fixture>>,observation:Awaited<ReturnType<typeof observe>>,fail=false) {
 return tenantTransaction(f.db.ingestor,f.scope.tenantId,async client=>{
  const run=successful(f.scope,observation.cutoff),cursor={cutoff:observation.cutoff,objects:{}};
  await recordOperationalRun(client,run,[]);await writeOperationalCursor(client,{tenantId:f.scope.tenantId,runId:run.runId,cursor});
  await writeLookupDependencies(client,{baseline:f.scope,runId:run.runId,cutoff:observation.cutoff},observation.update);
  if(fail)throw new Error('Synthetic publication failure');return cursor;
 });
}
async function initialize(f:Awaited<ReturnType<typeof fixture>>) {const observed=await observe(f,null);return commit(f,observed);}
const documents=(facts:readonly ProductionFact[])=>[...new Set(facts.map(row=>`${row.sourceObject}:${row.sourceRecordId}`))].sort();

test('lookup dependencies: cold initialization inventories inputs, missing metadata preserves an accepted cursor and projection changes require migration',{skip:!enabled},async()=>{
 const f=await fixture();try {
  const observed=await observe(f,null);
  assert.deepEqual(documents(observed.facts),['account_move:1','account_move:2','account_move:3','sale_order:1','sale_order:2','sale_order:3']);
  assert.deepEqual(new Set(observed.update.dependencies.map(row=>row.object)),new Set(['customer','salesperson','business_line','state']));
  assert.ok(observed.update.dependencies.every(row=>/^[0-9a-f]{64}$/.test(row.fingerprint)));
  const retained=await observe(f,{cutoff:'2026-10-10T00:00:00.000Z',objects:{}});
  assert.deepEqual(retained.facts,[],'missing optional metadata cannot restart accepted document history');
  assert.deepEqual(retained.update.dependencies,[],'untouched lookups remain outside the polling overlap');
  const cursor=await commit(f,observed);
  await assert.rejects(observe(f,cursor,'0'.repeat(64)),/explicit baseline migration required/);
 }finally{await f.close();}
});

test('lookup dependencies: timestamp-only edits produce no document extraction or fingerprint changes',{skip:!enabled},async()=>{
 const f=await fixture();try {
  const cursor=await initialize(f);
  await f.db.admin.query('UPDATE business_line SET write_date=clock_timestamp() WHERE id=1');
  const observed=await observe(f,cursor);
  assert.deepEqual(observed.facts,[]);assert.deepEqual(observed.update.dependencies,[]);
  await commit(f,observed);
 }finally{await f.close();}
});

for(const scenario of [
 {name:'Business Line rename',sql:"UPDATE business_line SET name='Renamed Line',write_date=clock_timestamp() WHERE id=1",expected:['account_move:1','account_move:2','sale_order:1','sale_order:2'],label:'businessLine',value:'Renamed Line'},
 {name:'customer rename',sql:"UPDATE res_partner SET name='Renamed Customer',write_date=clock_timestamp() WHERE id=20",expected:['account_move:1','account_move:2','account_move:3','sale_order:1','sale_order:2'],label:'customer',value:'Renamed Customer'},
 {name:'State rename',sql:"UPDATE res_country_state SET name='Renamed Region',write_date=clock_timestamp() WHERE id=8",expected:['account_move:1','account_move:2','account_move:3','sale_order:1','sale_order:2'],label:'state',value:'Renamed Region'},
 {name:'salesperson partner assignment',sql:"UPDATE res_users SET partner_id=80,write_date=clock_timestamp() WHERE id=7",expected:['account_move:1','account_move:3','sale_order:1','sale_order:2'],label:'salesperson',value:'Other Rep'},
])test(`lookup dependencies: ${scenario.name} extracts exactly its dependent documents`,{skip:!enabled},async()=>{
 const f=await fixture();try {
  const cursor=await initialize(f);await f.db.admin.query(scenario.sql);
  const observed=await observe(f,cursor);
  assert.deepEqual(documents(observed.facts),scenario.expected);
  assert.equal(observed.update.dependencies.length,1);
  for(const fact of observed.facts)assert.equal(fact.transaction?.labels[scenario.label as keyof NonNullable<ProductionFact['transaction']>['labels']],scenario.value);
 }finally{await f.close();}
});

test('lookup dependencies: header amount and assignment changes remain independent of lookup timestamps',{skip:!enabled},async()=>{
 const f=await fixture();try {
  const cursor=await initialize(f);
  await f.db.admin.query("UPDATE sale_order SET amount_total=123,user_id=8,write_date=clock_timestamp() WHERE id=1");
  const observed=await observe(f,cursor);
  assert.deepEqual(documents(observed.facts),['sale_order:1']);assert.deepEqual(observed.update.dependencies,[]);
  const row=observed.facts.find(fact=>fact.measureId==='order_revenue');assert.equal(row?.value,'123.000000');assert.equal(row?.dimensions.salesperson,'el-dabboos-odoo18-pg:8');
 }finally{await f.close();}
});

test('lookup dependencies: tenant/runtime isolation and successful-cursor guard reject unauthorized metadata',{skip:!enabled},async()=>{
 const f=await fixture();try {
  const cursor=await initialize(f);
  await tenantTransaction(f.db.ingestor,'other',async client=>{
   assert.equal((await client.query('SELECT count(*)::int count FROM mart.analytics_lookup_dependencies')).rows[0].count,0);
   assert.equal((await readLookupDependencyContext(client,{...f.scope,tenantId:'other'},cursor))?.initialized,false);
  });
  await assert.rejects(tenantTransaction(f.db.runtime,f.scope.tenantId,client=>client.query('SELECT * FROM mart.analytics_lookup_dependencies')),{code:'42501'});
  await assert.rejects(tenantTransaction(f.db.ingestor,f.scope.tenantId,client=>client.query("UPDATE mart.analytics_lookup_dependencies SET source_record_id='999'")),{code:'42501'});
  await assert.rejects(tenantTransaction(f.db.ingestor,f.scope.tenantId,async client=>{
   const run=successful(f.scope,cursor.cutoff);await recordOperationalRun(client,run,[]);
   await writeLookupDependencies(client,{baseline:f.scope,runId:run.runId,cutoff:cursor.cutoff},{dependencies:[],projectionVersion:'0'.repeat(64)});
  }),/successful matching source cursor/);
 }finally{await f.close();}
});

test('lookup dependencies: failed publication preserves fingerprints, audit, checkpoint and cursor together',{skip:!enabled},async()=>{
 const f=await fixture();try {
  const cursor=await initialize(f);
  const before=(await f.db.admin.query('SELECT source_object,source_record_id,fingerprint,cutoff,run_id FROM mart.analytics_lookup_dependencies ORDER BY 1,2')).rows;
  const checkpoint=(await f.db.admin.query('SELECT * FROM mart.analytics_lookup_dependency_checkpoints')).rows;
  const runs=(await f.db.admin.query('SELECT count(*)::int count FROM mart.analytics_operation_runs')).rows[0].count;
  await f.db.admin.query("UPDATE business_line SET name='Unpublished Name',write_date=clock_timestamp() WHERE id=1");
  const observed=await observe(f,cursor);assert.equal(observed.update.dependencies.length,1);
  await assert.rejects(commit(f,observed,true),/Synthetic publication failure/);
  assert.deepEqual((await f.db.admin.query('SELECT source_object,source_record_id,fingerprint,cutoff,run_id FROM mart.analytics_lookup_dependencies ORDER BY 1,2')).rows,before);
  assert.deepEqual((await f.db.admin.query('SELECT * FROM mart.analytics_lookup_dependency_checkpoints')).rows,checkpoint);
  assert.equal((await f.db.admin.query('SELECT cutoff FROM mart.analytics_source_cursors')).rows[0].cutoff.toISOString(),cursor.cutoff);
  assert.equal((await f.db.admin.query('SELECT count(*)::int count FROM mart.analytics_operation_runs')).rows[0].count,runs);
 }finally{await f.close();}
});
