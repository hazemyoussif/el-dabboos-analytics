import { createHash } from 'node:crypto';
import { validateProductionFact } from '@el-dabboos/domain';
import type { FactMeasureId, IngestionBatch, ProductionFact, SourceMapping, SourceRecord, TransactionEvidence } from '@el-dabboos/domain';
import type { OdooSourceRow } from './rows.ts';
import { odooRevision, sourceTimestamp } from './cursor.ts';
export function exactOdooAmount(value: string): string {
  if (!/^-?(0|[1-9]\d{0,23})(\.\d{1,6})?$/.test(value)) throw new Error('Invalid source decimal');
  const [whole,fraction=''] = value.split('.');
  const result = `${whole}.${fraction.padEnd(6,'0')}`;
  return result==='-0.000000' ? '0.000000' : result;
}
const stableId = (id: string|null,scope: string): string => id===null ? 'unassigned' : `${scope}:${id}`;
function transactionEvidence(row: OdooSourceRow): TransactionEvidence {
  return { sourceCompanyId: row.company_id,state: row.state,documentType: row.object==='sale_order' ? 'order' : row.move_type,paymentState: row.object==='account_move' ? row.payment_state : null,
    untaxedAmount: exactOdooAmount(row.amount_untaxed),taxAmount: exactOdooAmount(row.amount_tax),totalAmount: exactOdooAmount(row.amount_total),currency: row.currency,
    labels: { customer: row.partner_name,salesperson: row.salesperson_name,businessLine: row.business_line_name,state: row.state_name },area: row.area,
    location: { latitude: row.latitude ?? null,longitude: row.longitude ?? null,shopGps: row.shop_gps ?? null },
    relatedLines: row.object==='account_move' ? row.order_lineage.map(line => ({ sourceOrderId: line.order_id,sourceOrderLineId: line.order_line_id,sourceInvoiceLineId: line.invoice_line_id })) : [] };
}
interface Contribution { measureId: FactMeasureId; value: string; eligible: boolean }
function contributions(row: OdooSourceRow): Contribution[] {
  if (row.object==='sale_order') return [
    { measureId: 'order_revenue',value: exactOdooAmount(row.amount_total),eligible: row.state==='sale' },
    { measureId: 'order_count',value: '1.000000',eligible: row.state==='sale' },
    { measureId: 'cancelled_orders',value: '1.000000',eligible: row.state==='cancel' },
  ];
  const value = exactOdooAmount(row.amount_untaxed);
  const invoice = row.state==='posted' && row.move_type==='out_invoice';
  const refund = row.state==='posted' && row.move_type==='out_refund';
  if (invoice && value.startsWith('-') || refund && value!=='0.000000' && !value.startsWith('-')) throw new Error('Unexpected invoice sign');
  return [
    { measureId: 'net_invoiced_revenue',value,eligible: invoice || refund },
    { measureId: 'invoiced_revenue',value,eligible: invoice },
    { measureId: 'refund_value',value: value.startsWith('-') ? value.slice(1) : value,eligible: refund },
    { measureId: 'invoice_count',value: '1.000000',eligible: invoice },
    { measureId: 'refund_count',value: '1.000000',eligible: refund },
  ];
}
/** Deterministic all-or-reject mapping; ineligible contributions explicitly tombstone previous eligibility. */
export function mapOdooRecord(record: SourceRecord<OdooSourceRow>,mapping: SourceMapping,batch: IngestionBatch,period?: { from: string; to: string }): ProductionFact[] {
  const row = record.payload;
  const observedCopy=batch.frozenRevision.startsWith('orm-observed-copy-v1:');
  const sourceVersion=observedCopy?createHash('sha256').update(JSON.stringify(row)).digest('hex'):record.version;
  const sourceRevision=observedCopy?(BigInt(Date.parse(batch.sourceAsOf))*1000n).toString():record.revision;
  if (!batch.companyIds.includes(row.company_id) || batch.tenantId!==mapping.tenantId || batch.sourceId!==mapping.sourceId || record.object!==row.object || record.recordId!==row.id || record.version!==row.write_date || record.revision!==odooRevision(row.write_date) || record.change!=='upsert') throw new Error('Source mapping scope or version');
  if (!row.business_date) throw new Error('Source business date required');
  const scope = `${mapping.sourceId}:${row.company_id}`;
  const dimensions = { salesperson: stableId(row.salesperson_id,mapping.sourceId),customer: stableId(row.partner_id,mapping.sourceId),business_line: stableId(row.business_line_id,scope),city: row.city?.trim() || 'unassigned',state: stableId(row.state_id,mapping.sourceId) };
  const transaction = transactionEvidence(row);
  const inPeriod = !period || row.business_date>=period.from && row.business_date<=period.to;
  return contributions(row).map(contribution => {
    const rule = mapping.measures.find(measure => measure.measureId===contribution.measureId && measure.sourceObject===row.object);
    if (!rule) throw new Error('Registered transaction mapping required');
    const monetary = ['order_revenue','net_invoiced_revenue','invoiced_revenue','refund_value'].includes(contribution.measureId);
    const fact: ProductionFact = { tenantId: mapping.tenantId,datasetId: mapping.datasetId,measureId: contribution.measureId,kind: 'event',businessDate: row.business_date!,value: contribution.value,
      dimensions,sourceId: mapping.sourceId,sourceObject: row.object,sourceRecordId: row.id,componentId: 'whole',sourceVersion,sourceRevision,sourceUpdatedAt: sourceTimestamp(row.write_date),
      mappingId: mapping.mappingId,mappingVersion: mapping.mappingVersion,batchId: batch.batchId,sourceAsOf: batch.sourceAsOf,frozenRevision: batch.frozenRevision,status: contribution.eligible && inPeriod ? 'active' : 'tombstone',transaction,
      ...(monetary ? { currency: { mode: 'native' as const,transactionCurrency: row.currency,transactionValue: contribution.value,reportingCurrency: mapping.reportingCurrency,policyReference: rule.currencyPolicy } } : {}) };
    validateProductionFact(fact,mapping);
    return fact;
  });
}
