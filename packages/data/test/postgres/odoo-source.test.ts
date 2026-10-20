import {sourceFixture} from './odoo-source-fixture.ts';
import {readHistoricalSourceInventory} from '../../src/odoo/history-inventory.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import { Pool } from 'pg';
import type {PoolClient,QueryResult} from 'pg';
import { database,enabled } from './support.ts';
import { OdooPostgresSourceBatchReader } from '../../src/odoo/reader.ts';
import {createOdooSourcePool,odooSourceConfig} from '../../src/odoo/config.ts';
import { verifyOdooSourceIdentity } from '../../src/odoo/identity.ts';
import { ingestOdooExtraction } from '../../src/odoo/ingestion.ts';
import { odooComparisonCandidate } from '../../src/odoo/mapping.ts';
import { PostgresMappingReleases } from '../../src/postgres/mapping-releases.ts';
import { readOdooControls } from '../../src/odoo/controls.ts';
import { reconcileExtraction } from '../../src/postgres/extraction-reconciliation.ts';
import { OdooSnapshotLease } from '../../src/odoo/snapshot.ts';
import { ingestRetainedOdooPilot } from '../../src/odoo/pilot.ts';
import { PostgresExtractionRuns } from '../../src/postgres/extractions.ts';
import { PostgresMartWriter } from '../../src/postgres/writer.ts';
import { clock } from './fixtures.ts';
import type { ExtractionRun, ReconciliationCase } from '@el-dabboos/domain';

const mapping = odooComparisonCandidate({ tenantId: 'el-dabboos-iq',sourceId: 'el-dabboos-odoo18-pg',datasetId: 'pilot-candidate',mappingId: 'odoo18',mappingVersion: '1',businessOwner: 'SYNTHETIC TEST ONLY',reportingCurrency: 'IQD',timeZone: 'Asia/Baghdad' });
const baseScope = { object: 'sale_order' as const,from: '2026-09-01',to: '2026-09-30',timeZone: 'Asia/Baghdad',sourceAsOf: '2026-10-01T10:00:00.000Z',frozenRevision: 'synthetic-freeze',freezeReference: 'IMMUTABLE SYNTHETIC SOURCE ONLY' };
const config = { credentialPolicy: 'least_privilege' as const,connection: {},tenantId: mapping.tenantId,sourceId: mapping.sourceId,companyIds: ['1'],batchSize: 1000,statementTimeoutMs: 15000,snapshotMaxDurationMs: 600000 };
const baseRequest = { tenantId: mapping.tenantId,sourceId: mapping.sourceId,companyIds: ['1'],limit: 1000,frozenRevision: baseScope.frozenRevision };

test('Odoo reader: read-only role, bounded keyset ties, company isolation, composite lookup revision and cursor validation', { skip: !enabled },async () => {
  const fixture = await sourceFixture();
  try {
    const snapshot = await fixture.openSnapshot();
    const scope = { ...baseScope,...snapshot.evidence };
    const request = { ...baseRequest,frozenRevision: scope.frozenRevision };
    await verifyOdooSourceIdentity(fixture.source);
    await assert.rejects(verifyOdooSourceIdentity(fixture.db.admin),/read-only/);
    await assert.rejects(fixture.source.query('UPDATE public.sale_order SET amount_total=0'),/permission/);
    const reader = new OdooPostgresSourceBatchReader(fixture.source,config,scope,snapshot);
    const first = await reader.readBatch(request);
    assert.equal(first.rows.length,1000); assert.equal(first.rows[0]!.recordId,'1'); assert.equal(first.rows.at(-1)!.recordId,'1000');
    assert.equal(first.rows[0]!.payload.salesperson_id,'7'); // create_uid=999 is never used.
    const second = await reader.readBatch({ ...request,cursor: first.nextCursor! });
    const third = await reader.readBatch({ ...request,cursor: second.nextCursor! });
    assert.equal(second.rows[0]!.recordId,'1001'); assert.equal(third.rows.length,893); assert.equal(third.nextCursor,undefined);
    assert.ok(third.rows.every(row => row.payload.company_id==='1'));
    assert.deepEqual((await reader.readBatch(request)).rows,first.rows);
    await assert.rejects(reader.readBatch({ ...request,companyIds: ['2'] }),/scope/);
    await assert.rejects(reader.readBatch({ ...request,tenantId: 'other' }),/scope/);
    await assert.rejects(reader.readBatch({ ...request,limit: 1001 }),/limit/);
    await assert.rejects(reader.readBatch({ ...request,cursor: '["bad","1"]' }),/cursor/);
    await assert.rejects(reader.readBatch({ ...request,frozenRevision: 'different' }),/freeze/);
    const invoices = await new OdooPostgresSourceBatchReader(fixture.source,config,{ ...scope,object: 'account_move' },snapshot).readBatch({ ...request,limit: 10 });
    assert.equal(invoices.rows.length,2); assert.equal(invoices.rows[0]!.payload.object,'account_move');
    if (invoices.rows[0]!.payload.object==='account_move') assert.equal(invoices.rows[0]!.payload.order_lineage.length,2);
    // A later extraction can detect a related label change without changing stable grouping IDs.
    await fixture.db.admin.query("UPDATE public.res_partner SET name='Renamed Synthetic Outlet',write_date='2026-10-02' WHERE id=20");
    assert.equal((await reader.readBatch(request)).rows[0]!.payload.partner_name,'Synthetic Outlet');
    await snapshot.close();
    const renamedSnapshot = await fixture.openSnapshot();
    const renamedReader = new OdooPostgresSourceBatchReader(fixture.source,config,{ ...baseScope,...renamedSnapshot.evidence },renamedSnapshot);
    const renamed = await renamedReader.readBatch({ ...request,cursor: third.watermarkEnd!,frozenRevision: renamedSnapshot.evidence.frozenRevision });
    assert.equal(renamed.rows.length,1000); assert.equal(renamed.rows[0]!.payload.partner_id,'20');
    assert.ok(BigInt(renamed.rows[0]!.revision)>BigInt(first.rows[0]!.revision));
    await fixture.db.admin.query("UPDATE public.sale_order SET date_order='2026-10-01',write_date='2026-10-03' WHERE id=1");
    await renamedSnapshot.close();
    const movedSnapshot = await fixture.openSnapshot();
    const incremental = new OdooPostgresSourceBatchReader(fixture.source,config,{ ...baseScope,mode: 'incremental',...movedSnapshot.evidence },movedSnapshot);
    const changed = await incremental.readBatch({ ...request,cursor: third.watermarkEnd!,frozenRevision: movedSnapshot.evidence.frozenRevision });
    assert.equal(changed.completeness,'incremental');
    // Related lookup updates sort first; scan until the later moved order appears.
    let changes = changed;
    while (changes.nextCursor) changes = await incremental.readBatch({ ...request,cursor: changes.nextCursor,frozenRevision: movedSnapshot.evidence.frozenRevision });
    assert.ok(changes.rows.some(record => record.recordId==='1' && record.payload.business_date==='2026-10-01'));

  } finally { await fixture.close(); }
});

test('Odoo September-shaped pilot: source reader → candidate mapper → paged mart → DB control reconciliation; no approval/binding', { skip: !enabled },async () => {
  const fixture = await sourceFixture();
  try {
    const snapshot = await fixture.openSnapshot();
    const scope = { ...baseScope,...snapshot.evidence };
    await new PostgresMappingReleases(fixture.db.migrator).registerCandidate(mapping);
    const control = (caseId: string,measureId: ReconciliationCase['measureId'],expectedValue: string,expectedCount: string): Omit<ReconciliationCase,'batchIds'> => ({ caseId,tenantId: mapping.tenantId,datasetId: mapping.datasetId,mappingVersion: '1',measureId,sourceReportReference: 'SYNTHETIC CANDIDATE DB CONTROL ONLY',frozenRevision: scope.frozenRevision,from: scope.from,to: scope.to,grouping: null,groupKey: null,expectedValue,actualValue: '0.000000',expectedCount,actualCount: '0',tolerance: { status: 'approved',absoluteValue: '0.000000',absoluteCount: '0',approvalReference: 'SYNTHETIC EXACT CONTROL ONLY' } });
    for (const object of ['sale_order','account_move'] as const) {
      const run: ExtractionRun = { tenantId: mapping.tenantId,sourceId: mapping.sourceId,companyIds: ['1'],datasetId: mapping.datasetId,mappingId: mapping.mappingId,mappingVersion: mapping.mappingVersion,extractionId: `september-${object}`,sourceObjects: [object],from: scope.from,to: scope.to,sourceAsOf: scope.sourceAsOf,frozenRevision: scope.frozenRevision,freezeReference: scope.freezeReference,completeness: 'complete_scope' };
      const options = { sourcePool: fixture.source,martPool: fixture.db.ingestor,sourceConfig: config,mapping,run,scope: { ...scope,object },snapshot,clock };
      const completed = await ingestOdooExtraction(options);
      assert.equal(completed.status,'complete'); assert.equal(completed.pageCount,object==='sale_order' ? 3 : 1);
      assert.deepEqual(await ingestOdooExtraction(options),completed);
      const controls = object==='sale_order'
        ? [control('orders','order_count','2893.000000','2893'),control('order-value','order_revenue','1460597500.000000','2893')]
        : [control('invoice-value','invoiced_revenue','1465712000.000000','1'),control('refund-value','refund_value','18545500.000000','1'),control('net-value','net_invoiced_revenue','1447166500.000000','2')];
      const independent = await readOdooControls(fixture.source,{ mapping,source: { ...scope,object },companyIds: ['1'],reportReference: 'INDEPENDENT SYNTHETIC DB HEADER CONTROL',tolerance: controls[0]!.tolerance },snapshot);
      for (const set of independent) assert.equal((await reconcileExtraction(fixture.db.ingestor,run.extractionId,set,'IQD')).status,'passed');
      for (const expected of controls) assert.equal((await reconcileExtraction(fixture.db.ingestor,run.extractionId,[expected],'IQD')).status,'passed');
      const business = { ...controls[0]!,caseId: `business-${object}`,grouping: 'business_line' as const,groupKey: 'el-dabboos-odoo18-pg:1:1' };
      assert.equal((await reconcileExtraction(fixture.db.ingestor,run.extractionId,[business],'IQD')).status,'passed');
      const rep = object==='sale_order'
        ? [{ ...controls[0]!,caseId: 'orders-rep',grouping: 'salesperson' as const,groupKey: 'el-dabboos-odoo18-pg:7' }]
        : [{ ...controls[2]!,caseId: 'invoice-rep',grouping: 'salesperson' as const,groupKey: 'el-dabboos-odoo18-pg:7',expectedValue: '1465712000.000000',expectedCount: '1' },{ ...controls[2]!,caseId: 'unassigned-rep',grouping: 'salesperson' as const,groupKey: 'unassigned',expectedValue: '-18545500.000000',expectedCount: '1' }];
      assert.equal((await reconcileExtraction(fixture.db.ingestor,run.extractionId,rep,'IQD')).status,'passed');
    }
    assert.equal((await fixture.db.admin.query('SELECT approval_status FROM mart.mapping_releases')).rows[0].approval_status,'pending');
    assert.equal((await fixture.db.admin.query('SELECT count(*) total FROM mart.serving_bindings')).rows[0].total,'0');
    assert.equal((await fixture.db.runtime.query('SELECT * FROM mart.fact_revisions')).rowCount,0);
  } finally { await fixture.close(); }
});

function retainedRun(snapshot: OdooSnapshotLease,extractionId: string): ExtractionRun {
  return { tenantId: mapping.tenantId,sourceId: mapping.sourceId,companyIds: ['1'],datasetId: mapping.datasetId,mappingId: mapping.mappingId,mappingVersion: mapping.mappingVersion,extractionId,sourceObjects: ['sale_order','account_move'],from: baseScope.from,to: baseScope.to,sourceAsOf: snapshot.evidence.sourceAsOf,frozenRevision: snapshot.evidence.frozenRevision,freezeReference: snapshot.evidence.freezeReference,completeness: 'complete_scope' };
}
async function smallPilotFixture() {
  const fixture = await sourceFixture();
  await fixture.db.admin.query('DELETE FROM public.sale_order WHERE company_id=1 AND id>3');
  await new PostgresMappingReleases(fixture.db.migrator).registerCandidate(mapping);
  return fixture;
}

test('retained snapshot: concurrent source changes are invisible to all pages and controls; live-lease checkpoint resume and atomic certification', { skip: !enabled },async () => {
  const fixture = await smallPilotFixture();
  const snapshot = await fixture.openSnapshot();
  const run = retainedRun(snapshot,'retained-success');
  const options = { sourcePool: fixture.source,martPool: fixture.db.ingestor,sourceConfig: { ...config,batchSize: 2 },mapping,run,snapshot };
  const original = PostgresMartWriter.prototype.commit;
  let failed = false;
  try {
    PostgresMartWriter.prototype.commit = async function(...args: Parameters<typeof original>) {
      if (args[2].page?.pageNumber===2 && !failed) { failed = true; throw new Error('Synthetic transient page failure'); }
      return original.apply(this,args);
    };
    await assert.rejects(ingestRetainedOdooPilot(options),/transient/);
    const runs = new PostgresExtractionRuns(fixture.db.ingestor,{ [mapping.tenantId]: ['1'] });
    assert.equal((await runs.resume(mapping.tenantId,run.extractionId)).checkpoint.pageCount,1);
    await assert.rejects(reconcileExtraction(fixture.db.ingestor,run.extractionId,[{ caseId: 'incomplete',tenantId: mapping.tenantId,datasetId: mapping.datasetId,mappingVersion: '1',measureId: 'order_count',sourceReportReference: 'SYNTHETIC',frozenRevision: run.frozenRevision,from: run.from,to: run.to,grouping: null,groupKey: null,expectedValue: '3.000000',actualValue: '0.000000',expectedCount: '3',actualCount: '0',tolerance: { status: 'pending' } }],'IQD'),/Completed/);
    await fixture.db.admin.query("UPDATE public.sale_order SET amount_total=amount_total+999,write_date='2026-10-04' WHERE company_id=1; UPDATE public.account_move SET amount_untaxed_signed=amount_untaxed_signed+100 WHERE id=1");
    const result = await ingestRetainedOdooPilot(options);
    assert.equal(result.checkpoint.status,'complete'); assert.equal(result.checkpoint.pageCount,3); assert.equal(result.checkpoint.rowCount,5);
    assert.ok(result.reconciliation.every(group => group.status==='passed'));
    const cases = result.reconciliation.flatMap(group => group.cases);
    assert.equal(cases.find(control => control.measureId==='order_revenue' && control.grouping===null)!.actualValue,'1500000.000000');
    assert.equal(cases.find(control => control.measureId==='net_invoiced_revenue' && control.grouping===null)!.actualValue,'1447166500.000000');
    assert.ok(cases.some(control => control.grouping==='business_line'));
    assert.ok(cases.some(control => control.grouping==='salesperson' && control.groupKey==='unassigned'));
    assert.match(snapshot.evidence.descriptor,/^\d+:\d+:/);
    assert.equal((await fixture.db.admin.query('SELECT approval_status FROM mart.mapping_releases')).rows[0].approval_status,'pending');
    assert.equal((await fixture.db.admin.query('SELECT count(*) n FROM mart.serving_bindings')).rows[0].n,'0');
    const persisted = JSON.stringify((await fixture.db.admin.query('SELECT specification FROM mart.extraction_runs')).rows);
    assert.ok(persisted.includes(snapshot.evidence.frozenRevision));
    assert.ok(!/[0-9A-F]{8}-[0-9A-F]{8}-\d+/.test(persisted));
    assert.deepEqual(JSON.parse(JSON.stringify(snapshot)),snapshot.evidence);
  } finally { PostgresMartWriter.prototype.commit = original; await fixture.close(); }
});

test('retained snapshot: owner termination forbids old-run resume; new lease requires a new logical run', { skip: !enabled },async () => {
  const fixture = await smallPilotFixture();
  const snapshot = await fixture.openSnapshot();
  const run = retainedRun(snapshot,'retained-lost');
  const original = PostgresMartWriter.prototype.commit;
  const options = { sourcePool: fixture.source,martPool: fixture.db.ingestor,sourceConfig: { ...config,batchSize: 2 },mapping,run,snapshot };
  try {
    PostgresMartWriter.prototype.commit = async function(...args: Parameters<typeof original>) {
      if (args[2].page?.pageNumber===2) throw new Error('Synthetic checkpoint stop');
      return original.apply(this,args);
    };
    await assert.rejects(ingestRetainedOdooPilot(options),/checkpoint stop/);
    PostgresMartWriter.prototype.commit = original;
    const pid = (await fixture.db.admin.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction' ORDER BY xact_start LIMIT 1")).rows[0].pid;
    await fixture.db.admin.query('SELECT pg_terminate_backend($1)',[pid]);
    await assert.rejects(ingestRetainedOdooPilot(options),/lease lost/);
    await snapshot.close();
    const fresh = await fixture.openSnapshot();
    await assert.rejects(ingestRetainedOdooPilot({ ...options,snapshot: fresh }),/scope conflict/);
    const result = await ingestRetainedOdooPilot({ ...options,snapshot: fresh,run: retainedRun(fresh,'retained-new') });
    assert.equal(result.checkpoint.status,'complete');
    const old = (await fixture.db.admin.query('SELECT status,page_count FROM mart.extraction_runs WHERE extraction_id=$1',[run.extractionId])).rows[0];
    assert.equal(old.status,'running'); assert.equal(old.page_count,1);
    assert.equal((await fixture.db.admin.query("SELECT count(*) n FROM mart.reconciliation_batches WHERE batch_id LIKE 'retained-lost-%'")).rows[0].n,'0');
  } finally { PostgresMartWriter.prototype.commit = original; await fixture.close(); }
});

test('retained snapshot: loss during final certification rolls back terminal page, completion and all reconciliation evidence', { skip: !enabled },async () => {
  const fixture = await smallPilotFixture();
  const snapshot = await fixture.openSnapshot();
  const run = retainedRun(snapshot,'retained-terminal-loss');
  const original = PostgresMartWriter.prototype.commit;
  try {
    PostgresMartWriter.prototype.commit = async function(...args: Parameters<typeof original>) {
      const certify = args[3];
      if (!certify) return original.apply(this,args);
      return original.call(this,args[0],args[1],args[2],async client => {
        const query = client.query.bind(client);
        let lost = false;
        client.query = (async (...queryArgs: Parameters<typeof query>) => {
          const result = await query(...queryArgs);
          if (!lost && String(queryArgs[0]).startsWith('INSERT INTO mart.reconciliation_evidence')) { lost = true; await snapshot.close(); }
          return result;
        }) as typeof client.query;
        try { await certify(client); } finally { client.query = query; }
      });
    };
    await assert.rejects(ingestRetainedOdooPilot({ sourcePool: fixture.source,martPool: fixture.db.ingestor,sourceConfig: { ...config,batchSize: 2 },mapping,run,snapshot }),/lease lost/);
    const stored = (await fixture.db.admin.query('SELECT status,page_count,row_count FROM mart.extraction_runs')).rows[0];
    assert.equal(stored.status,'running'); assert.equal(stored.page_count,2); assert.equal(stored.row_count,'3');
    assert.equal((await fixture.db.admin.query('SELECT count(*) n FROM mart.reconciliation_evidence')).rows[0].n,'0');
    assert.equal((await fixture.db.admin.query('SELECT count(*) n FROM mart.ingestion_batches')).rows[0].n,'2');
    assert.equal((await fixture.db.runtime.query('SELECT * FROM mart.fact_revisions')).rowCount,0);
  } finally { PostgresMartWriter.prototype.commit = original; await fixture.close(); }
});

test('retained snapshot: maximum lease duration expires and cleanup is idempotent', { skip: !enabled },async () => {
  const fixture = await sourceFixture();
  try {
    const snapshot = await fixture.openSnapshot(100);
    await new Promise(resolve => setTimeout(resolve,150));
    await assert.rejects(snapshot.assertAlive(),/lease lost/);
    await snapshot.close(); await snapshot.close();
    const count = (await fixture.db.admin.query("SELECT count(*) n FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction'")).rows[0].n;
    assert.equal(count,'0');
  } finally { await fixture.close(); }
});


test('staging exception: broader credential may export an RR/RO snapshot, default remains strict and lease identity excludes config', { skip: !enabled },async () => {
  const fixture = await sourceFixture();
  let snapshot: OdooSnapshotLease | undefined;
  try {
    await assert.rejects(verifyOdooSourceIdentity(fixture.db.admin),/read-only/);
    await verifyOdooSourceIdentity(fixture.db.admin,'staging_read_only');
    const identity = { tenantId: config.tenantId,sourceId: config.sourceId,connection: { password: randomUUID() } };
    snapshot = await OdooSnapshotLease.open(fixture.db.admin,identity,600000,'staging_read_only');
    assert.deepEqual(snapshot.identity,{ tenantId: config.tenantId,sourceId: config.sourceId });
    const reader = new OdooPostgresSourceBatchReader(fixture.source,config,{ ...baseScope,...snapshot.evidence },snapshot);
    const page = await reader.readBatch({ ...baseRequest,limit: 1,frozenRevision: snapshot.evidence.frozenRevision });
    assert.equal(page.rows.length,1);
    await snapshot.assertAlive();
  } finally { await snapshot?.close(); await fixture.close(); }
});

test('concrete operational source discovers January inserts/updates by October write_date, bounded cutoff and moved dimension controls',{skip:!enabled},async()=>{
 const fixture=await sourceFixture();
 try {
  await fixture.db.admin.query("DELETE FROM sale_order WHERE company_id=1 AND id<>1; UPDATE sale_order SET date_order='2026-01-15',write_date='2026-10-02' WHERE id=1");
  await fixture.db.admin.query("INSERT INTO sale_order SELECT 99,company_id,'2026-10-03','2026-01-16',state,currency_id,user_id,create_uid,partner_id,business_line_id,amount_untaxed,amount_tax,amount_total FROM sale_order WHERE id=1; INSERT INTO sale_order SELECT 100,company_id,'2030-01-01','2026-01-17',state,currency_id,user_id,create_uid,partner_id,business_line_id,amount_untaxed,amount_tax,amount_total FROM sale_order WHERE id=1");
  const {OdooOperationalSnapshot}=await import('../../src/operational/source.ts');
  const baseline={tenantId:mapping.tenantId,sourceId:mapping.sourceId,reportingCurrency:'IQD',datasets:[mapping.datasetId],mappingVersion:'1',definitionVersion:'fixture-definition',mappings:[mapping],capabilities:{tenantId:mapping.tenantId,mode:'certified' as const,releases:[]},from:'2026-01-01',to:'2026-09-30'};
  const cursor={cutoff:'2026-10-02T00:00:00.000Z',objects:{}};
  const snapshot=await fixture.openSnapshot();const source=new OdooOperationalSnapshot(fixture.source,config,snapshot,baseline);
  const pages=[];for await(const page of source.records(baseline,cursor))pages.push(page);
  const orders=pages.flatMap(page=>page.facts).filter(fact=>fact.sourceObject==='sale_order');
  assert.ok(orders.some(fact=>fact.sourceRecordId==='1'&&fact.businessDate==='2026-01-15'));
  assert.ok(orders.some(fact=>fact.sourceRecordId==='99'));assert.ok(!orders.some(fact=>fact.sourceRecordId==='100'));
  const retained=source.retain();assert.equal(retained.cutoff,source.cutoff);assert.equal(retained.revision,source.revision);await source.close();await source.close();assert.deepEqual(await retained.present('sale_order',['1','99']),['1','99']);await retained.close();
  await fixture.db.admin.query("UPDATE sale_order SET date_order='2026-02-01',user_id=NULL,business_line_id=2,write_date='2026-10-04' WHERE id=1");
  const changedLease=await fixture.openSnapshot(),changed=new OdooOperationalSnapshot(fixture.source,config,changedLease,baseline);
  const moved=[];for await(const page of changed.records(baseline,cursor))moved.push(...page.facts);
  assert.ok(moved.some(fact=>fact.sourceRecordId==='1'&&fact.businessDate==='2026-02-01'&&fact.dimensions.salesperson==='unassigned'&&fact.dimensions.business_line==='el-dabboos-odoo18-pg:1:2'));
  const controls=await changed.controls(baseline,[{metric:'order_revenue',month:'2026-01',dimension:'salesperson',identity:'el-dabboos-odoo18-pg:7',dependency:'base'},{metric:'order_revenue',month:'2026-02',dimension:'salesperson',identity:'unassigned',dependency:'base'}]);
  assert.deepEqual(controls.map(control=>control.value),['1000000.000000','500000.000000']);
  assert.deepEqual(await changed.present('sale_order',['1','99','101']),['1','99']);
  await changed.close();
 }finally{await fixture.close();}
});

// Isolated synthetic database: even credentials with write authority get read-only sessions.
test('configured Odoo connections default to read-only before identity/operation queries',{skip:!enabled},async()=>{
 const db=await database(false),url=new URL(process.env.PG_TEST_ADMIN_URL!);
 url.pathname='/'+(await db.admin.query('SELECT current_database() name')).rows[0].name;
 const config=odooSourceConfig({ODOO_SOURCE_HOST:url.hostname,ODOO_SOURCE_PORT:url.port,ODOO_SOURCE_DATABASE:url.pathname.slice(1),ODOO_SOURCE_USER:decodeURIComponent(url.username),ODOO_SOURCE_PASSWORD:decodeURIComponent(url.password),ODOO_SOURCE_COMPANY_IDS:'1'},{tenantId:'synthetic',sourceId:'synthetic'});
 const source=createOdooSourcePool(config);
 try {assert.equal((await source.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'on');await assert.rejects(source.query('CREATE TABLE synthetic_write_attempt(id int)'),{code:'25006'});assert.equal((await db.admin.query("SELECT to_regclass('public.synthetic_write_attempt') name")).rows[0].name,null);}
 finally {await source.end();await db.close();}
});

test('incremental composite revision discovers lookup-only changes outside business-date scope',{skip:!enabled},async()=>{
 const fixture=await sourceFixture();
 try {
  await fixture.db.admin.query("ALTER TABLE public.res_partner ADD COLUMN partner_latitude numeric, ADD COLUMN gps_shop_location text, ADD COLUMN unrelated_blob bytea; UPDATE public.res_partner SET area='Synthetic Area',partner_latitude=33.125,gps_shop_location='Synthetic GPS',unrelated_blob=decode(repeat('ab',65536),'hex') WHERE id=20");
  await fixture.db.admin.query("INSERT INTO public.res_country_state VALUES(8,'Synthetic Region','2026-10-03'); UPDATE public.res_partner SET state_id=8 WHERE id=20; UPDATE public.res_users SET write_date='2026-10-02' WHERE id=7; UPDATE public.business_line SET name='Renamed General',write_date='2026-10-04' WHERE id=1");
  const snapshot=await fixture.openSnapshot();
  const reader=new OdooPostgresSourceBatchReader(fixture.source,config,{...baseScope,from:'2026-01-01',to:'2026-01-31',mode:'incremental',modificationFrom:'2026-10-03 00:00:00.000000',...snapshot.evidence},snapshot);
  const first=await reader.readBatch({...baseRequest,frozenRevision:snapshot.evidence.frozenRevision,limit:2});
  assert.deepEqual(first.rows.map(row=>row.recordId),['1','2']);assert.ok(first.rows.every(row=>row.version==='2026-10-04 00:00:00.000000'&&row.payload.business_line_name==='Renamed General'&&row.payload.state_name==='Synthetic Region'&&row.payload.business_date==='2026-09-15'));
  assert.equal(first.rows[0]!.payload.area,'Synthetic Area');assert.equal(first.rows[0]!.payload.latitude,'33.125');assert.equal(first.rows[0]!.payload.longitude,null);assert.equal(first.rows[0]!.payload.shop_gps,'Synthetic GPS');
  const next=await reader.readBatch({...baseRequest,frozenRevision:snapshot.evidence.frozenRevision,limit:2,cursor:first.nextCursor!});assert.deepEqual(next.rows.map(row=>row.recordId),['3','4']);
 }finally{await fixture.close();}
});

test('history inventory discovers earliest company-1 history in business timezone without excluding drafts or including other companies',{skip:!enabled},async()=>{
 const fixture=await sourceFixture();
 try {
  await fixture.db.admin.query("INSERT INTO public.sale_order(id,company_id,date_order,state) VALUES (5001,1,'2024-05-31 22:00:00','sale'),(5002,1,'2024-04-01','draft'),(5003,2,'2020-01-01','sale')");
  const snapshot=await fixture.openSnapshot();
  const config=odooSourceConfig({ODOO_SOURCE_HOST:'localhost',ODOO_SOURCE_DATABASE:'synthetic',ODOO_SOURCE_USER:'synthetic',ODOO_SOURCE_PASSWORD:'SYNTHETIC_ONLY',ODOO_SOURCE_COMPANY_IDS:'1'},{tenantId:'el-dabboos-iq',sourceId:'el-dabboos-odoo18-pg'});
  const result=await readHistoricalSourceInventory(fixture.source,snapshot,config,'Asia/Baghdad');
  const april=result.months.find(row=>row.month==='2024-04');assert.equal(april?.eligible_headers,'0');
  const june=result.months.find(row=>row.month==='2024-06');assert.equal(june?.first_date,'2024-06-01');assert.equal(june?.eligible_headers,'1');
  assert.ok(!result.months.some(row=>row.month==='2020-01'));
 }finally{await fixture.close();}
});


function observeCursorQueries(pool:Pool) {
 const statements:string[]=[];
 pool.on('connect',client=>{
  const query=client.query.bind(client) as (text:string,parameters?:unknown[])=>Promise<QueryResult>;
  client.query=(async(text:string,parameters?:unknown[])=>{
   statements.push(text);
   if(text.startsWith('FETCH FORWARD')) {
    const state=(await query("SELECT current_setting('transaction_read_only') read_only,current_setting('transaction_isolation') isolation")).rows[0];
    assert.deepEqual(state,{read_only:'on',isolation:'repeatable read'});
   }
   return query(text,parameters);
  }) as PoolClient['query'];
 });
 return statements;
}
async function assertCursorReleased(pool:Pool) {
 assert.equal(pool.waitingCount,0);assert.equal(pool.idleCount,1);
 const client=await pool.connect();
 try {
  const state=(await client.query("SELECT (SELECT count(*)::int FROM pg_cursors) cursors,current_setting('transaction_isolation') isolation")).rows[0];
  assert.deepEqual(state,{cursors:0,isolation:'read committed'});
 }finally{client.release();}
}

test('Odoo cursor stream: bounded ties match keyset pages, one declaration, invoice and empty boundaries',{skip:!enabled,timeout:15000},async()=>{
 const fixture=await sourceFixture();
 try {
  const statements=observeCursorQueries(fixture.source),snapshot=await fixture.openSnapshot();
  const scope={...baseScope,...snapshot.evidence},request={...baseRequest,frozenRevision:snapshot.evidence.frozenRevision};
  const reader=new OdooPostgresSourceBatchReader(fixture.source,config,scope,snapshot);
  const pages=[];for await(const page of reader.readBatches(request))pages.push(page);
  assert.deepEqual(pages.map(page=>page.rows.length),[1000,1000,893]);
  assert.deepEqual(pages.flatMap(page=>page.rows.map(row=>row.recordId)),Array.from({length:2893},(_,index)=>String(index+1)));
  assert.equal(statements.filter(sql=>sql.startsWith('DECLARE ')).length,1);
  assert.equal(statements.filter(sql=>sql.startsWith('FETCH FORWARD')).length,3);
  for(let index=0;index<pages.length;index++) {
   const expected=await reader.readBatch({...request,...(index?{cursor:pages[index-1]!.nextCursor!}:{})});
   assert.deepEqual(pages[index],expected);
  }
  const invoices=[];
  for await(const page of new OdooPostgresSourceBatchReader(fixture.source,config,{...scope,object:'account_move'},snapshot).readBatches({...request,limit:1}))invoices.push(page);
  assert.deepEqual(invoices.map(page=>page.rows.map(row=>row.recordId)),[['1'],['2']]);
  assert.equal(invoices.at(-1)!.nextCursor,undefined);assert.ok(invoices.at(-1)!.watermarkEnd);
  if(invoices[0]!.rows[0]!.payload.object==='account_move')assert.equal(invoices[0]!.rows[0]!.payload.order_lineage.length,2);
  const empty=[];
  for await(const page of new OdooPostgresSourceBatchReader(fixture.source,config,{...scope,from:'2020-01-01',to:'2020-01-31'},snapshot).readBatches(request))empty.push(page);
  assert.equal(empty.length,1);assert.deepEqual(empty[0]!.rows,[]);assert.equal(empty[0]!.nextCursor,undefined);
  for(const invalid of [{companyIds:['2']},{tenantId:'other'},{limit:1001},{cursor:'["bad","1"]'},{frozenRevision:'different'}]) {
   await assert.rejects(async()=>{for await(const page of reader.readBatches({...request,...invalid}))void page;});
  }
  await assertCursorReleased(fixture.source);
 }finally{await fixture.close();}
});

test('Odoo cursor stream: retained snapshot excludes concurrent edits, new rows, other companies and upper-cutoff violations',{skip:!enabled,timeout:15000},async()=>{
 const fixture=await sourceFixture();
 try {
  await fixture.db.admin.query("DELETE FROM sale_order WHERE company_id=1 AND id>4; UPDATE sale_order SET write_date=clock_timestamp()+interval '1 day' WHERE id=4");
  const snapshot=await fixture.openSnapshot(),request={...baseRequest,limit:1,frozenRevision:snapshot.evidence.frozenRevision};
  const reader=new OdooPostgresSourceBatchReader(fixture.source,config,{...baseScope,...snapshot.evidence,mode:'incremental'},snapshot);
  const pages=reader.readBatches(request);
  try {
   assert.equal((await pages.next()).value!.rows[0]!.recordId,'1');
   await fixture.db.admin.query("UPDATE sale_order SET amount_total=999,write_date=clock_timestamp() WHERE id IN (2,3); UPDATE res_partner SET name='Concurrent label',write_date=clock_timestamp() WHERE id=20; INSERT INTO sale_order SELECT 5,company_id,write_date,date_order,state,currency_id,user_id,create_uid,partner_id,business_line_id,amount_untaxed,amount_tax,amount_total FROM sale_order WHERE id=3");
   for(const id of ['2','3']) {
    const page=(await pages.next()).value!;
    assert.equal(page.completeness,'incremental');assert.equal(page.rows.length,1);
    assert.equal(page.rows[0]!.recordId,id);assert.equal(page.rows[0]!.payload.amount_total,'500000');
    assert.equal(page.rows[0]!.payload.partner_name,'Synthetic Outlet');
   }
   assert.equal((await pages.next()).done,true);
  }finally{await pages.return(undefined);}
  await assertCursorReleased(fixture.source);
 }finally{await fixture.close();}
});

test('Odoo cursor stream: consumer failure closes the transaction and returns the sole reader connection',{skip:!enabled,timeout:15000},async()=>{
 const fixture=await sourceFixture();
 try {
  const snapshot=await fixture.openSnapshot();
  const reader=new OdooPostgresSourceBatchReader(fixture.source,config,{...baseScope,...snapshot.evidence},snapshot);
  const failure=new Error('Synthetic downstream failure');
  await assert.rejects(async()=>{
   for await(const page of reader.readBatches({...baseRequest,limit:1,frozenRevision:snapshot.evidence.frozenRevision})) {
    assert.equal(page.rows[0]!.recordId,'1');throw failure;
   }
  },error=>error===failure);
  await assertCursorReleased(fixture.source);
  await snapshot.assertAlive();
 }finally{await fixture.close();}
});

test('Odoo cursor stream: expired lease rejects buffered rows and rolls back the reader',{skip:!enabled,timeout:15000},async()=>{
 const fixture=await sourceFixture();
 try {
  const snapshot=await fixture.openSnapshot(500);
  const reader=new OdooPostgresSourceBatchReader(fixture.source,config,{...baseScope,...snapshot.evidence},snapshot);
  const pages=reader.readBatches({...baseRequest,limit:1,frozenRevision:snapshot.evidence.frozenRevision});
  try {
   assert.equal((await pages.next()).value!.rows[0]!.recordId,'1');
   await new Promise(resolve=>setTimeout(resolve,550));
   await assert.rejects(pages.next(),{name:'OdooSnapshotUnavailable'});
  }finally{await pages.return(undefined);}
  await assertCursorReleased(fixture.source);
  assert.equal((await fixture.db.admin.query("SELECT count(*)::int count FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction'")).rows[0].count,0);
 }finally{await fixture.close();}
});

test('Odoo cursor stream: database fetch failure preserves the error and releases the reader',{skip:!enabled,timeout:15000},async()=>{
 const fixture=await sourceFixture();
 try {
  fixture.source.on('connect',client=>{
   const query=client.query.bind(client) as (text:string,parameters?:unknown[])=>Promise<QueryResult>;
   client.query=((text:string,parameters?:unknown[])=>query(text.startsWith('FETCH FORWARD')?'SELECT 1/0':text,parameters)) as PoolClient['query'];
  });
  const snapshot=await fixture.openSnapshot();
  const reader=new OdooPostgresSourceBatchReader(fixture.source,config,{...baseScope,...snapshot.evidence},snapshot);
  await assert.rejects(async()=>{for await(const page of reader.readBatches({...baseRequest,frozenRevision:snapshot.evidence.frozenRevision}))void page;},{code:'22012'});
  await assertCursorReleased(fixture.source);
 }finally{await fixture.close();}
});
