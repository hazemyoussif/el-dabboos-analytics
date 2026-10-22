import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import type {PoolClient,QueryResult} from 'pg';
import type {AnalyticsCursor,AnalyticsJobRun} from '@el-dabboos/domain';
import {AnalyticsOperations} from '../../../application/src/analytics-operations.ts';
import {database,enabled} from './support.ts';
import {deploy} from './fixtures.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {recordOperationalRun,writeOperationalCursor} from '../../src/postgres/operational-evidence.ts';
import {receivableSummaryCandidate} from '../../src/receivable-aging.ts';
import {operationalDefinitionVersion} from '../../src/operational/definition-version.ts';
import {OdooOperationalSnapshot} from '../../src/operational/source.ts';
import {OdooSnapshotLease} from '../../src/odoo/snapshot.ts';
import {readReceivableDependencyContext,writeReceivableDependencies} from '../../src/operational/receivable-dependency-store.ts';
import {PostgresOperationalStore} from '../../src/operational/store.ts';
import type {OperationalBaseline,OperationalSnapshot,ReceivableDependency} from '../../src/operational/contracts.ts';
const sourceConfig={connection:{},credentialPolicy:'staging_read_only' as const,tenantId:'a',sourceId:'fixture',companyIds:['1'],batchSize:2,statementTimeoutMs:15000,snapshotMaxDurationMs:600000};
function baseline(tenantId='a'):OperationalBaseline {
 const mapping=receivableSummaryCandidate({tenantId,sourceId:'fixture',datasetId:'synthetic-receivables',mappingId:'synthetic-aging',mappingVersion:'1',businessOwner:'SYNTHETIC TEST ONLY',reportingCurrency:'IQD',timeZone:'Asia/Baghdad',cutoff:'2026-09-30'});
 return {tenantId,sourceId:'fixture',reportingCurrency:'IQD',datasets:[mapping.datasetId],definitionVersion:operationalDefinitionVersion(),mappingVersion:'1',from:'2026-07-01',to:'2026-09-30',coveredMonths:['2026-07','2026-08','2026-09'],mappings:[mapping],capabilities:{tenantId,mode:'certified',releases:[]}};
}
async function registerBaseline(client:PoolClient,scope:OperationalBaseline) {
 await client.query(`INSERT INTO mart.analytics_baselines VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[scope.tenantId,scope.sourceId,scope.reportingCurrency,scope.datasets,scope.definitionVersion,scope.mappingVersion,JSON.stringify(scope.mappings),JSON.stringify(scope.capabilities),scope.from,scope.to]);
}
async function fixture(initialDate='2026-07-15') {
 const db=await database(),scope=baseline();
 try {
  await deploy(db.migrator,scope.mappings[0]!);
  await tenantTransaction(db.migrator,'a',client=>registerBaseline(client,scope));
  await db.admin.query(`CREATE TABLE res_currency(id int PRIMARY KEY,name text,rounding numeric);
   CREATE TABLE res_company(id int PRIMARY KEY,currency_id int);
   CREATE TABLE account_account(id int PRIMARY KEY,account_type text);
   CREATE TABLE account_move(id int PRIMARY KEY,company_id int,state text,move_type text,date date,write_date timestamp);
   CREATE TABLE account_move_line(id int PRIMARY KEY,move_id int,partner_id int,company_id int,account_id int,date date,date_maturity date,balance numeric,amount_residual numeric,amount_currency numeric,currency_id int,write_date timestamp);
   CREATE TABLE account_partial_reconcile(id int PRIMARY KEY,company_id int,debit_move_id int,credit_move_id int,amount numeric,max_date date,write_date timestamp);
   CREATE TABLE account_payment(id int PRIMARY KEY,company_id int,move_id int,payment_type text,partner_type text,write_date timestamp);
   CREATE TABLE sale_order(id int);CREATE TABLE res_partner(id int);CREATE TABLE res_users(id int);
   CREATE TABLE business_line(id int);CREATE TABLE res_country_state(id int);CREATE TABLE sale_order_line(id int);CREATE TABLE sale_order_line_invoice_rel(id int);
   INSERT INTO res_currency VALUES(1,'IQD',0.001);INSERT INTO res_company VALUES(1,1),(2,1);
   INSERT INTO account_account VALUES(1,'asset_receivable'),(2,'liability_payable');`);
  for(const table of ['account_move','account_move_line','account_partial_reconcile','account_payment'])
   await db.admin.query(`ALTER TABLE ${table} ADD create_date timestamp DEFAULT (clock_timestamp() AT TIME ZONE 'UTC')`);
  await db.admin.query("INSERT INTO account_move VALUES(1,1,'posted','out_invoice',$1,'2026-10-01'),(9,2,'posted','out_invoice','2020-01-01','2026-10-01')",[initialDate]);
  await db.admin.query("INSERT INTO account_move_line VALUES(1,1,1,1,1,$1,$1,100,100,100,1,'2026-10-01'),(9,9,9,2,1,'2020-01-01','2020-01-01',999,999,999,1,'2026-10-01')",[initialDate]);
  const leases:OdooSnapshotLease[]=[];
  return {db,scope,async open(){const lease=await OdooSnapshotLease.open(db.admin,sourceConfig,600000,'staging_read_only');leases.push(lease);return new OdooOperationalSnapshot(db.admin,sourceConfig,lease,scope);},async close(){for(const lease of leases)await lease.close();await db.close();}};
 }catch(error){await db.close();throw error;}
}
function unchanged(scope:OperationalBaseline,cutoff:string,runId=randomUUID()):AnalyticsJobRun {
 return {tenantId:scope.tenantId,runId,kind:'sync',actorId:'synthetic-dependency-test',trigger:'operator',sourceCutoff:cutoff,sourceRevision:'synthetic-metadata-only',mappingVersion:scope.mappingVersion,definitionVersion:scope.definitionVersion,startedAt:cutoff,completedAt:cutoff,status:'unchanged',recordsChanged:0,partitionsAffected:0,caseCount:0,mismatchCount:0,evidenceHash:'no-changes',servingRelease:null};
}
async function commitDependencies(client:PoolClient,scope:OperationalBaseline,cutoff:string,dependencies:readonly ReceivableDependency[]) {
 const run=unchanged(scope,cutoff),cursor={cutoff,objects:{}};
 await recordOperationalRun(client,run,[]);await writeOperationalCursor(client,{tenantId:scope.tenantId,runId:run.runId,cursor});
 await writeReceivableDependencies(client,{baseline:scope,runId:run.runId,cutoff},dependencies);return cursor;
}
async function observeSnapshots(f:Awaited<ReturnType<typeof fixture>>,source:OdooOperationalSnapshot,cursor:AnalyticsCursor|null) {
 return tenantTransaction(f.db.ingestor,'a',async client=>{
  const context=await readReceivableDependencyContext(client,f.scope,cursor),dependencies:ReceivableDependency[]=[],cutoffs:string[]=[],totals:string[]=[];
  let complete=false;
  for await(const page of source.snapshots(f.scope,cursor,false,context)) {
   dependencies.push(...page.receivableDependencies??[]);if(page.receivableDependenciesComplete)complete=true;
   const total=page.facts.find(fact=>fact.measureId==='net_aged_receivable');
   if(total){cutoffs.push(total.businessDate);totals.push(total.value);}
  }
  return {dependencies,cutoffs,totals,complete};
 });
}
async function initialize(f:Awaited<ReturnType<typeof fixture>>) {
 const source=await f.open();
 try {
  const observed=await observeSnapshots(f,source,null);
  const cursor=await tenantTransaction(f.db.ingestor,'a',client=>commitDependencies(client,f.scope,source.cutoff,observed.dependencies));
  return {cursor,observed};
 }finally{await source.close();}
}

test('receivable dependencies: initializes every cutoff and all four input models before enabling narrowing',{skip:!enabled},async()=>{
 const f=await fixture();try {
  await f.db.admin.query("INSERT INTO account_move VALUES(2,1,'posted','entry','2026-08-10','2026-10-01'); INSERT INTO account_move_line VALUES(2,2,1,1,1,'2026-08-10','2026-08-10',-40,0,-40,1,'2026-10-01'); UPDATE account_move_line SET amount_residual=60 WHERE id=1; INSERT INTO account_partial_reconcile VALUES(1,1,1,2,40,'2026-08-10','2026-10-01'); INSERT INTO account_payment VALUES(1,1,2,'inbound','customer','2026-10-01')");
  const {cursor,observed}=await initialize(f);
  assert.deepEqual(observed.cutoffs,['2026-07-31','2026-08-31','2026-09-30']);assert.deepEqual(observed.totals,['100.000000','60.000000','60.000000']);
  assert.equal(observed.complete,true);assert.equal(observed.dependencies.length,6);
  assert.deepEqual(new Set(observed.dependencies.map(row=>row.object)),new Set(['account_move_line','account_move','account_partial_reconcile','account_payment']));
  assert.equal(observed.dependencies.some(row=>row.id==='9'),false);
  await tenantTransaction(f.db.ingestor,'a',async client=>{
   assert.equal((await readReceivableDependencyContext(client,f.scope,cursor))?.initialized,true);
   assert.equal((await readReceivableDependencyContext(client,{...f.scope,mappingVersion:'2'},cursor))?.initialized,false);
  });
  await assert.rejects(tenantTransaction(f.db.ingestor,'a',client=>readReceivableDependencyContext(client,f.scope,{...cursor,cutoff:'2026-10-01T00:00:00.000Z'})),/checkpoint conflicts with accepted cursor/);
 }finally{await f.close();}
});

for(const scenario of [
 {name:'forward',initial:'2026-08-15',next:'2026-09-15',cutoffs:['2026-08-31','2026-09-30'],totals:['0.000000','100.000000']},
 {name:'backdated',initial:'2026-09-15',next:'2026-07-15',cutoffs:['2026-07-31','2026-08-31','2026-09-30'],totals:['100.000000','100.000000','100.000000']},
])test(`receivable dependencies: ${scenario.name} correction retains the old and new cutoff footprint`,{skip:!enabled},async()=>{
 const f=await fixture(scenario.initial);try {
  const {cursor}=await initialize(f);
  await f.db.admin.query("UPDATE account_move SET date=$1,write_date=clock_timestamp() WHERE id=1",[scenario.next]);
  await f.db.admin.query("UPDATE account_move_line SET date=$1,date_maturity=$1,write_date=clock_timestamp() WHERE id=1",[scenario.next]);
  const source=await f.open();try {
   const observed=await observeSnapshots(f,source,cursor);
   assert.deepEqual(observed.cutoffs,scenario.cutoffs);assert.deepEqual(observed.totals,scenario.totals);
   assert.deepEqual(new Set(observed.dependencies.map(row=>row.object)),new Set(['account_move','account_move_line']));
  }finally{await source.close();}
 }finally{await f.close();}
});

test('receivable dependencies: a new current-period input does not recheck earlier published cutoffs',{skip:!enabled},async()=>{
 const f=await fixture();try {
  const {cursor}=await initialize(f);
  await f.db.admin.query("INSERT INTO account_move VALUES(3,1,'posted','out_invoice','2026-10-20',clock_timestamp()); INSERT INTO account_move_line VALUES(3,3,1,1,1,'2026-10-20','2026-10-20',50,50,50,1,clock_timestamp())");
  const source=await f.open();try {
   const observed=await observeSnapshots(f,source,cursor);
   assert.equal(observed.complete,true);assert.equal(observed.dependencies.length,2);assert.deepEqual(observed.cutoffs,[]);
  }finally{await source.close();}
 }finally{await f.close();}
});

test('receivable dependencies: tenant isolation, runtime denial and matching successful cursor guards',{skip:!enabled},async()=>{
 const f=await fixture();try {
  const {cursor}=await initialize(f);
  await tenantTransaction(f.db.ingestor,'b',async client=>{
   assert.equal((await client.query('SELECT count(*)::int count FROM mart.analytics_receivable_dependencies')).rows[0].count,0);
   assert.equal((await readReceivableDependencyContext(client,baseline('b'),cursor))?.initialized,false);
  });
  await assert.rejects(tenantTransaction(f.db.runtime,'a',client=>client.query('SELECT * FROM mart.analytics_receivable_dependencies')),{code:'42501'});
  await assert.rejects(tenantTransaction(f.db.ingestor,'b',client=>writeReceivableDependencies(client,{baseline:f.scope,runId:'forged',cutoff:cursor.cutoff},[])),/row-level security/);
  await assert.rejects(tenantTransaction(f.db.ingestor,'a',async client=>{
   const run=unchanged(f.scope,cursor.cutoff);await recordOperationalRun(client,run,[]);
   await writeReceivableDependencies(client,{baseline:f.scope,runId:run.runId,cutoff:cursor.cutoff},[]);
  }),/successful matching source cursor/);
  await assert.rejects(tenantTransaction(f.db.ingestor,'a',client=>client.query("UPDATE mart.analytics_receivable_dependencies SET source_record_id='999'")),{code:'42501'});
 }finally{await f.close();}
});

test('receivable dependencies: operational sync closes source first and rolls back audit, cursor, heads and checkpoint together',{skip:!enabled},async()=>{
 const f=await fixture();try {
  let closed=false,failCheckpoint=false;
  const source:OperationalSnapshot={cutoff:'2026-10-10T00:00:00.000Z',revision:'synthetic',mappingVersion:f.scope.mappingVersion,definitionVersion:f.scope.definitionVersion,
   close:async()=>{closed=true;},
   async *records(){yield {object:'receivable_dependency',facts:[],rows:0,receivableDependencies:[{object:'account_move_line' as const,id:'1',from:'2026-08-15'}],receivableDependenciesComplete:true};},
   async *recordsMonth(){yield* [];},async *snapshots(){yield* [];},async *presence(){yield* [];},present:async(_object,ids)=>ids,controls:async()=>[]};
  const guarded=new WeakSet<PoolClient>();
  f.db.ingestor.on('acquire',client=>{
   if(guarded.has(client))return;guarded.add(client);
   const query=client.query.bind(client) as (text:string,parameters?:unknown[])=>Promise<QueryResult>;
   client.query=((text:string,parameters?:unknown[])=>{
    if(text.startsWith('INSERT INTO mart.analytics_receivable_dependencies'))assert.equal(closed,true);
    if(failCheckpoint&&text.startsWith('INSERT INTO mart.analytics_receivable_dependency_checkpoints'))throw new Error('Synthetic checkpoint failure');
    return query(text,parameters);
   }) as PoolClient['query'];
  });
  const operations=new AnalyticsOperations({store:new PostgresOperationalStore(f.db.ingestor,'synthetic-sync'),source:{open:async()=>source},runId:()=> 'synthetic-sync',clock:()=>new Date('2026-10-20T00:00:00.000Z'),impact:{through:'2026-09-30',movingAverageWindows:[],runningTotals:false,yearOverYear:false,contribution:false,snapshotDependencies:()=>[]}});
  assert.equal((await operations.run({tenantId:'a',actorId:'synthetic',trigger:'operator',kind:'sync'})).status,'unchanged');
  const before=(await f.db.admin.query('SELECT cutoff,run_id FROM mart.analytics_source_cursors')).rows;
  source.cutoff='2026-10-11T00:00:00.000Z';closed=false;failCheckpoint=true;
  const failing=new AnalyticsOperations({store:new PostgresOperationalStore(f.db.ingestor,'synthetic-failure'),source:{open:async()=>source},runId:()=> 'synthetic-failure',clock:()=>new Date('2026-10-20T00:00:00.000Z'),impact:{through:'2026-09-30',movingAverageWindows:[],runningTotals:false,yearOverYear:false,contribution:false,snapshotDependencies:()=>[]}});
  await assert.rejects(failing.run({tenantId:'a',actorId:'synthetic',trigger:'operator',kind:'sync'}),/Synthetic checkpoint failure/);
  assert.deepEqual((await f.db.admin.query('SELECT cutoff,run_id FROM mart.analytics_source_cursors')).rows,before);
  assert.deepEqual((await f.db.admin.query('SELECT cutoff,run_id FROM mart.analytics_receivable_dependency_checkpoints')).rows,before);
  assert.deepEqual((await f.db.admin.query('SELECT cutoff,run_id FROM mart.analytics_receivable_dependencies')).rows,before);
  assert.equal((await f.db.admin.query("SELECT count(*)::int count FROM mart.analytics_operation_runs WHERE run_id='synthetic-failure'")).rows[0].count,0);
 }finally{await f.close();}
});
