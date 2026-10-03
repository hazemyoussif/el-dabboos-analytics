import { categoricalDimensions } from '@el-dabboos/domain';
import type { ProductionFact, SourceMapping } from '@el-dabboos/domain';
export type FactRow = Record<string, unknown>;
const iso = (v: unknown) => v instanceof Date ? v.toISOString() : String(v);
export function productionFactFromRow(r: FactRow, m: SourceMapping): ProductionFact {
  const f: ProductionFact = {
    tenantId: String(r.tenant_id), datasetId: String(r.dataset_id), measureId: r.measure_id as ProductionFact['measureId'],
    kind: r.kind as ProductionFact['kind'], businessDate: iso(r.business_date).slice(0,10), value: String(r.value),
    dimensions: Object.fromEntries(categoricalDimensions.filter(d => r[d] != null).map(d => [d,String(r[d])])),
    sourceId: m.sourceId, sourceObject: String(r.source_object), sourceRecordId: String(r.source_record_id), componentId: String(r.component_id),
    sourceVersion: String(r.source_version), sourceRevision: String(r.source_revision), mappingId: m.mappingId, mappingVersion: m.mappingVersion,
    batchId: String(r.batch_id), sourceAsOf: iso(r.source_as_of), frozenRevision: String(r.frozen_revision), status: r.status as ProductionFact['status'],
    ...(r.entity_id == null ? {} : { entityId: String(r.entity_id) }),
    ...(r.source_updated_at == null ? {} : { sourceUpdatedAt: iso(r.source_updated_at) }),
  };
  if (r.monetary) f.currency = {
    transactionCurrency: String(r.transaction_currency), transactionValue: String(r.transaction_value), reportingCurrency: String(r.reporting_currency),
    policyReference: String(r.currency_policy_reference), ...(r.base_currency == null ? {} : { baseCurrency: String(r.base_currency) }),
    ...(r.currency_mode === 'native' ? { mode: 'native' } : { mode: 'converted', rate: String(r.conversion_rate), rateDate: iso(r.rate_date).slice(0,10), rateReference: String(r.rate_reference) }),
  };
  return f;
}
export function factColumns(f: ProductionFact): Record<string, unknown> {
  const c = f.currency;
  return {
    tenant_id: f.tenantId, dataset_id: f.datasetId, fact_key: JSON.stringify([f.tenantId,f.datasetId,f.sourceId,f.sourceObject,f.sourceRecordId,f.componentId,f.measureId,...(f.kind === 'snapshot' ? [f.entityId,f.businessDate] : [])]),
    source_revision: f.sourceRevision, source_version: f.sourceVersion, source_object: f.sourceObject, source_record_id: f.sourceRecordId,
    component_id: f.componentId, measure_id: f.measureId, kind: f.kind, monetary: !!c, business_date: f.businessDate, entity_id: f.entityId ?? null,
    value: f.value, status: f.status, ...Object.fromEntries(categoricalDimensions.map(d => [d,f.dimensions[d] ?? null])),
    currency_mode: c?.mode ?? null, transaction_currency: c?.transactionCurrency ?? null, transaction_value: c?.transactionValue ?? null,
    base_currency: c?.baseCurrency ?? null, reporting_currency: c?.reportingCurrency ?? null, currency_policy_reference: c?.policyReference ?? null,
    conversion_rate: c?.mode === 'converted' ? c.rate : null, rate_date: c?.mode === 'converted' ? c.rateDate : null, rate_reference: c?.mode === 'converted' ? c.rateReference : null,
    source_updated_at: f.sourceUpdatedAt ?? null, source_as_of: f.sourceAsOf, frozen_revision: f.frozenRevision, batch_id: f.batchId,
  };
}
