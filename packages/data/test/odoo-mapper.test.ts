import assert from 'node:assert/strict';
import test from 'node:test';
import { mapOdooRecord,exactOdooAmount } from '../src/odoo/mapper.ts';
import { odooComparisonCandidate } from '../src/odoo/mapping.ts';
import { odooRevision,sourceTimestamp } from '../src/odoo/cursor.ts';
import { odooSourceConfig } from '../src/odoo/config.ts';
import type { OdooSourceRow } from '../src/odoo/rows.ts';
import type { SourceRecord } from '@el-dabboos/domain';
import { batch } from './postgres/fixtures.ts';
export const candidate = odooComparisonCandidate({ tenantId: 'el-dabboos-iq',sourceId: 'el-dabboos-odoo18-pg',datasetId: 'comparison-candidate',mappingId: 'odoo18-comparison',mappingVersion: '1',businessOwner: 'SYNTHETIC TEST ONLY',reportingCurrency: 'IQD',timeZone: 'Asia/Baghdad' });
const lineageBatch = { ...batch(),tenantId: candidate.tenantId,sourceId: candidate.sourceId,companyIds: ['1'],datasetId: candidate.datasetId,mappingId: candidate.mappingId,mappingVersion: candidate.mappingVersion };
export const order: OdooSourceRow = { object: 'sale_order',id: '10',company_id: '1',write_date: '2026-10-01 10:00:00.123456',business_date: '2026-09-30',state: 'sale',currency: 'IQD',currency_id: '87',salesperson_id: '7',salesperson_name: 'Synthetic Rep',partner_id: '20',partner_name: 'Synthetic Outlet',business_line_id: '1',business_line_name: 'General',city: null,state_id: null,state_name: null,area: null,amount_untaxed: '100',amount_tax: '15',amount_total: '115' };
export function sourceRecord(row: OdooSourceRow): SourceRecord<OdooSourceRow> { return { object: row.object,recordId: row.id,version: row.write_date,revision: odooRevision(row.write_date),sourceUpdatedAt: sourceTimestamp(row.write_date),change: 'upsert',payload: row }; }
const map = (row: OdooSourceRow) => mapOdooRecord(sourceRecord(row),candidate,lineageBatch);
const invoice: OdooSourceRow = { ...order,object: 'account_move',id: '30',state: 'posted',move_type: 'out_invoice',payment_state: 'not_paid',order_lineage: [{ order_id: '10',order_line_id: '11',invoice_line_id: '31' }] };

test('orders: confirmed totals, tax retained, business salesperson and stable outlet/Business Line; nulls remain grouped',() => {
  const facts = map(order);
  assert.equal(facts.find(fact => fact.measureId==='order_revenue')!.value,'115.000000');
  assert.equal(facts.find(fact => fact.measureId==='order_count')!.value,'1.000000');
  assert.equal(facts[0]!.dimensions.salesperson,'el-dabboos-odoo18-pg:7');
  assert.equal(facts[0]!.dimensions.customer,'el-dabboos-odoo18-pg:20');
  assert.equal(facts[0]!.dimensions.business_line,'el-dabboos-odoo18-pg:1:1');
  assert.equal(facts[0]!.transaction!.taxAmount,'15.000000');
  assert.equal(map({ ...order,salesperson_id: null,partner_id: null,business_line_id: null })[0]!.dimensions.salesperson,'unassigned');
  assert.equal(map({ ...order,amount_tax: '0',amount_total: '100' })[0]!.transaction!.taxAmount,'0.000000');
  for (const state of ['cancel','draft','done']) assert.equal(map({ ...order,state }).find(fact => fact.measureId==='order_revenue')!.status,'tombstone');
  assert.equal(map({ ...order,state: 'cancel' }).find(fact => fact.measureId==='cancelled_orders')!.status,'active');
  assert.equal(map({ ...order,partner_name: 'Renamed Outlet' })[0]!.dimensions.customer,facts[0]!.dimensions.customer);
});
test('invoices: signed untaxed net, positive refund magnitude, refund issue date, separate header count and bridge evidence',() => {
  const facts = map(invoice);
  assert.equal(facts.find(fact => fact.measureId==='net_invoiced_revenue')!.value,'100.000000');
  assert.equal(facts[0]!.transaction!.totalAmount,'115.000000');
  assert.deepEqual(facts[0]!.transaction!.relatedLines,[{ sourceOrderId: '10',sourceOrderLineId: '11',sourceInvoiceLineId: '31' }]);
  const refund = map({ ...invoice,move_type: 'out_refund',business_date: '2026-10-15',amount_untaxed: '-100',amount_tax: '-15',amount_total: '-115' });
  assert.equal(refund.find(fact => fact.measureId==='net_invoiced_revenue')!.value,'-100.000000');
  assert.equal(refund.find(fact => fact.measureId==='refund_value')!.value,'100.000000');
  assert.equal(refund[0]!.businessDate,'2026-10-15');
  assert.equal(refund.find(fact => fact.measureId==='invoice_count')!.status,'tombstone');
  assert.equal(refund.find(fact => fact.measureId==='refund_count')!.status,'active');
  for (const state of ['draft','cancel']) assert.ok(map({ ...invoice,state }).every(fact => fact.status==='tombstone'));
  assert.throws(() => map({ ...invoice,move_type: 'out_refund' }),/sign/);
});
test('mapping rejects cross-company, foreign native currency, invalid precision/date and malformed source version',() => {
  assert.throws(() => map({ ...order,company_id: '2' }),/scope/);
  assert.throws(() => map({ ...order,currency: 'USD' }),/currency/);
  assert.throws(() => map({ ...order,business_date: '2026-09-31' }),/date/);
  assert.throws(() => map({ ...order,business_date: null }),/date/);
  assert.throws(() => map({ ...order,amount_total: '1.1234567' }),/decimal/);
  assert.equal(exactOdooAmount('-0'),'0.000000');
  assert.throws(() => exactOdooAmount('NaN'),/decimal/);
  assert.throws(() => mapOdooRecord({ ...sourceRecord(order),revision: '1' },candidate,lineageBatch),/version/);
});
test('source config uses local tunnel and explicit company allowlist; errors contain no values',() => {
  const environment = { ODOO_SOURCE_HOST: '127.0.0.1',ODOO_SOURCE_DATABASE: 'synthetic',ODOO_SOURCE_USER: 'synthetic_reader',ODOO_SOURCE_PASSWORD: 'SYNTHETIC_TEST_ONLY',ODOO_SOURCE_COMPANY_IDS: '1' };
  const config = odooSourceConfig(environment,{ tenantId: candidate.tenantId,sourceId: candidate.sourceId });
  assert.deepEqual(config.companyIds,['1']); assert.equal(config.batchSize,500);
  assert.throws(() => odooSourceConfig({ ...environment,ODOO_SOURCE_HOST: 'external.example' },config),/local tunnel/);
  assert.throws(() => odooSourceConfig({ ...environment,ODOO_SOURCE_COMPANY_IDS: '1,1' },config),/scope/);
  assert.throws(() => odooSourceConfig({ ...environment,ODOO_SOURCE_BATCH_SIZE: '1001' },config),/bounds/);
});

test('incremental period corrections tombstone a previously recognized order when its business date moves outside the pilot',() => {
  const moved = mapOdooRecord(sourceRecord({ ...order,business_date: '2026-10-01' }),candidate,lineageBatch,{ from: '2026-09-01',to: '2026-09-30' });
  assert.ok(moved.every(fact => fact.status==='tombstone'));
  assert.equal(moved[0]!.businessDate,'2026-10-01');
});
test('stored optional geography is preserved without geocoding or requiring a location',() => {
  const facts = map({ ...order,latitude: '33.123456789',longitude: '44.987654321',shop_gps: 'stored shop coordinate' });
  assert.deepEqual(facts[0]!.transaction!.location,{ latitude: '33.123456789',longitude: '44.987654321',shopGps: 'stored shop coordinate' });
  assert.deepEqual(map(order)[0]!.transaction!.location,{ latitude: null,longitude: null,shopGps: null });
});
