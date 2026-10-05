import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { database,enabled } from './support.ts';
import { OdooPostgresSourceBatchReader } from '../../src/odoo/reader.ts';
import { verifyOdooSourceIdentity } from '../../src/odoo/identity.ts';
import { ingestOdooExtraction } from '../../src/odoo/ingestion.ts';
import { odooComparisonCandidate } from '../../src/odoo/mapping.ts';
import { PostgresMappingReleases } from '../../src/postgres/mapping-releases.ts';
import { readOdooControls } from '../../src/odoo/controls.ts';
import { reconcileExtraction } from '../../src/postgres/extraction-reconciliation.ts';
import { clock } from './fixtures.ts';
import type { ExtractionRun, ReconciliationCase } from '@el-dabboos/domain';

async function sourceFixture() {
  const db = await database();
  const username = `source_${randomUUID().replaceAll('-','')}`;
  const url = new URL(process.env.PG_TEST_ADMIN_URL!);
  url.pathname=(await db.admin.query('SELECT current_database() name')).rows[0].name;
  const setup = `
 CREATE TABLE public.res_currency(id int primary key,name text);
 CREATE TABLE public.res_partner(id int primary key,name text,city text,state_id int,area text,is_company boolean,write_date timestamp);
 CREATE TABLE public.res_country_state(id int primary key,name text,write_date timestamp);
 CREATE TABLE public.res_users(id int primary key,partner_id int,write_date timestamp);
 CREATE TABLE public.business_line(id int primary key,name text,write_date timestamp);
 CREATE TABLE public.sale_order(id int primary key,company_id int,write_date timestamp,date_order timestamp,state text,currency_id int,user_id int,create_uid int,partner_id int,business_line_id int,amount_untaxed numeric,amount_tax numeric,amount_total numeric);
 CREATE TABLE public.account_move(id int primary key,company_id int,write_date timestamp,invoice_date date,state text,currency_id int,invoice_user_id int,partner_id int,business_line_id int,amount_untaxed_signed numeric,amount_tax_signed numeric,amount_total_signed numeric,move_type text,payment_state text);
 CREATE TABLE public.sale_order_line(id int primary key,order_id int);
 CREATE TABLE public.account_move_line(id int primary key,move_id int);
 CREATE TABLE public.sale_order_line_invoice_rel(order_line_id int,invoice_line_id int);
 INSERT INTO public.res_currency VALUES (87,'IQD');
 INSERT INTO public.res_partner VALUES (20,'Synthetic Outlet',NULL,NULL,NULL,false,'2026-09-01'),(70,'Synthetic Rep',NULL,NULL,NULL,false,'2026-09-01');
 INSERT INTO public.res_users VALUES (7,70,'2026-09-01');
 INSERT INTO public.business_line VALUES (1,'General','2026-09-01'),(2,'No Sugar','2026-10-01');
 INSERT INTO public.sale_order
 SELECT id,1,'2026-10-01 10:00:00.123456','2026-09-15','sale',87,7,999,20,1,
 CASE WHEN id=2893 THEN 14597500 ELSE 500000 END,0,CASE WHEN id=2893 THEN 14597500 ELSE 500000 END FROM generate_series(1,2893) id;
 INSERT INTO public.sale_order VALUES (4000,2,'2026-10-01','2026-09-15','sale',87,7,999,20,1,999,0,999);
 INSERT INTO public.account_move VALUES
 (1,1,'2026-10-01 10:00:00.123456','2026-09-15','posted',87,7,20,1,1465712000,0,1465712000,'out_invoice','not_paid'),
 (2,1,'2026-10-01 10:00:00.123456','2026-09-20','posted',87,NULL,20,1,-18545500,0,-18545500,'out_refund','not_paid'),
 (3,1,'2026-10-01 10:00:00.123456','2026-10-01','posted',87,7,20,2,-100,0,-100,'out_refund','not_paid');
 INSERT INTO public.sale_order_line VALUES (11,1),(12,1);
 INSERT INTO public.account_move_line VALUES (21,1),(22,1);
 INSERT INTO public.sale_order_line_invoice_rel VALUES (11,21),(12,22);
 `;
  try {
    await db.admin.query(setup);
    await db.admin.query(`CREATE ROLE ${username} LOGIN PASSWORD 'SYNTHETIC_SOURCE_ONLY' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
    await db.admin.query(`GRANT USAGE ON SCHEMA public TO ${username}; GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${username}`);
    url.username=username;url.password='SYNTHETIC_SOURCE_ONLY';
    const source = new Pool({ connectionString: url.toString(),max: 1 });
    return { db,source,async close() { await source.end(); await db.close(); const admin = new Pool({ connectionString: process.env.PG_TEST_ADMIN_URL }); try { await admin.query(`DROP ROLE ${username}`); } finally { await admin.end(); } } };
  } catch (error) { await db.close(); throw error; }
}
const mapping = odooComparisonCandidate({ tenantId: 'el-dabboos-iq',sourceId: 'el-dabboos-odoo18-pg',datasetId: 'pilot-candidate',mappingId: 'odoo18',mappingVersion: '1',businessOwner: 'SYNTHETIC TEST ONLY',reportingCurrency: 'IQD',timeZone: 'Asia/Baghdad' });
const scope = { object: 'sale_order' as const,from: '2026-09-01',to: '2026-09-30',timeZone: 'Asia/Baghdad',sourceAsOf: '2026-10-01T10:00:00.000Z',frozenRevision: 'synthetic-freeze',freezeReference: 'IMMUTABLE SYNTHETIC SOURCE ONLY' };
const config = { connection: {},tenantId: mapping.tenantId,sourceId: mapping.sourceId,companyIds: ['1'],batchSize: 1000,statementTimeoutMs: 15000 };
const request = { tenantId: mapping.tenantId,sourceId: mapping.sourceId,companyIds: ['1'],limit: 1000,frozenRevision: scope.frozenRevision };

test('Odoo reader: read-only role, bounded keyset ties, company isolation, composite lookup revision and cursor validation', { skip: !enabled },async () => {
  const fixture = await sourceFixture();
  try {
    await verifyOdooSourceIdentity(fixture.source);
    await assert.rejects(verifyOdooSourceIdentity(fixture.db.admin),/read-only/);
    await assert.rejects(fixture.source.query('UPDATE public.sale_order SET amount_total=0'),/permission/);
    const reader = new OdooPostgresSourceBatchReader(fixture.source,config,scope);
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
    const invoices = await new OdooPostgresSourceBatchReader(fixture.source,config,{ ...scope,object: 'account_move' }).readBatch({ ...request,limit: 10 });
    assert.equal(invoices.rows.length,2); assert.equal(invoices.rows[0]!.payload.object,'account_move');
    if (invoices.rows[0]!.payload.object==='account_move') assert.equal(invoices.rows[0]!.payload.order_lineage.length,2);
    // A later extraction can detect a related label change without changing stable grouping IDs.
    await fixture.db.admin.query("UPDATE public.res_partner SET name='Renamed Synthetic Outlet',write_date='2026-10-02' WHERE id=20");
    const renamedReader = new OdooPostgresSourceBatchReader(fixture.source,config,{ ...scope,frozenRevision: 'synthetic-freeze-2',freezeReference: 'SECOND SYNTHETIC SNAPSHOT' });
    const renamed = await renamedReader.readBatch({ ...request,cursor: third.watermarkEnd!,frozenRevision: 'synthetic-freeze-2' });
    assert.equal(renamed.rows.length,1000); assert.equal(renamed.rows[0]!.payload.partner_id,'20');
    assert.ok(BigInt(renamed.rows[0]!.revision)>BigInt(first.rows[0]!.revision));
    await fixture.db.admin.query("UPDATE public.sale_order SET date_order='2026-10-01',write_date='2026-10-03' WHERE id=1");
    const incremental = new OdooPostgresSourceBatchReader(fixture.source,config,{ ...scope,mode: 'incremental',frozenRevision: 'synthetic-freeze-3',freezeReference: 'THIRD SYNTHETIC SNAPSHOT' });
    const changed = await incremental.readBatch({ ...request,cursor: third.watermarkEnd!,frozenRevision: 'synthetic-freeze-3' });
    assert.equal(changed.completeness,'incremental');
    // Related lookup updates sort first; scan until the later moved order appears.
    let changes = changed;
    while (changes.nextCursor) changes = await incremental.readBatch({ ...request,cursor: changes.nextCursor,frozenRevision: 'synthetic-freeze-3' });
    assert.ok(changes.rows.some(record => record.recordId==='1' && record.payload.business_date==='2026-10-01'));

  } finally { await fixture.close(); }
});

test('Odoo September-shaped pilot: source reader → candidate mapper → paged mart → DB control reconciliation; no approval/binding', { skip: !enabled },async () => {
  const fixture = await sourceFixture();
  try {
    await new PostgresMappingReleases(fixture.db.migrator).registerCandidate(mapping);
    const control = (caseId: string,measureId: ReconciliationCase['measureId'],expectedValue: string,expectedCount: string): Omit<ReconciliationCase,'batchIds'> => ({ caseId,tenantId: mapping.tenantId,datasetId: mapping.datasetId,mappingVersion: '1',measureId,sourceReportReference: 'SYNTHETIC CANDIDATE DB CONTROL ONLY',frozenRevision: scope.frozenRevision,from: scope.from,to: scope.to,grouping: null,groupKey: null,expectedValue,actualValue: '0.000000',expectedCount,actualCount: '0',tolerance: { status: 'approved',absoluteValue: '0.000000',absoluteCount: '0',approvalReference: 'SYNTHETIC EXACT CONTROL ONLY' } });
    for (const object of ['sale_order','account_move'] as const) {
      const run: ExtractionRun = { tenantId: mapping.tenantId,sourceId: mapping.sourceId,companyIds: ['1'],datasetId: mapping.datasetId,mappingId: mapping.mappingId,mappingVersion: mapping.mappingVersion,extractionId: `september-${object}`,sourceObjects: [object],from: scope.from,to: scope.to,sourceAsOf: scope.sourceAsOf,frozenRevision: scope.frozenRevision,freezeReference: scope.freezeReference,completeness: 'complete_scope' };
      const options = { sourcePool: fixture.source,martPool: fixture.db.ingestor,sourceConfig: config,mapping,run,scope: { ...scope,object },clock };
      const completed = await ingestOdooExtraction(options);
      assert.equal(completed.status,'complete'); assert.equal(completed.pageCount,object==='sale_order' ? 3 : 1);
      assert.deepEqual(await ingestOdooExtraction(options),completed);
      const controls = object==='sale_order'
        ? [control('orders','order_count','2893.000000','2893'),control('order-value','order_revenue','1460597500.000000','2893')]
        : [control('invoice-value','invoiced_revenue','1465712000.000000','1'),control('refund-value','refund_value','18545500.000000','1'),control('net-value','net_invoiced_revenue','1447166500.000000','2')];
      const independent = await readOdooControls(fixture.source,{ mapping,source: { ...scope,object },companyIds: ['1'],reportReference: 'INDEPENDENT SYNTHETIC DB HEADER CONTROL',tolerance: controls[0]!.tolerance });
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
