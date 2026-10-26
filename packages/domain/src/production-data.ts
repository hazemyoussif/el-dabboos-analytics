import { validateTransactionEvidence } from './transaction-evidence.ts';
import type { TransactionEvidence } from './transaction-evidence.ts';
/** Offline ingestion contracts. No source DTO, execution query, transport or database dependency. */
import type { DimensionId, FactMeasureId, MetricId } from './contracts.ts';
import { categoricalDimensions, factMeasureIds, isFactMeasureId, isMetricId, requiredMeasures, semanticCatalog } from './catalog.ts';
import { validDateRange } from './validation.ts';

export interface SourceScope { tenantId: string; sourceId: string; companyIds: readonly string[] }
export interface SourceReadRequest extends SourceScope {
  limit: number; // Adapter must enforce 1..1000 and a bounded transport deadline.
  cursor?: string;
  watermark?: string;
  frozenRevision?: string;
}
export interface SourceRecord<T> {
  object: string; recordId: string; version: string;
  /** Adapter-certified monotonic order, not an opaque token compared lexically or arrival time. */
  revision: string;
  sourceUpdatedAt?: string;
  change: 'upsert' | 'delete';
  payload: T;
}
export interface SourceBatch<T> extends SourceScope {
  rows: readonly SourceRecord<T>[];
  sourceAsOf: string;
  frozenRevision: string;
  nextCursor?: string;
  watermarkEnd?: string; // Publish only after every page in this extraction commits.
  completeness: 'incremental' | 'complete_scope';
  deletionEvidence: 'explicit' | 'complete_scope_diff' | 'unavailable';
}
export interface SourceBatchReader<T> { readBatch(request: SourceReadRequest): Promise<SourceBatch<T>> }

export interface MeasureMapping {
  population?: CustomerProductPopulationBasis;
  measureId: FactMeasureId;
  sourceObject: string;
  grain: string;
  eligibleStates: readonly string[];
  recognitionRule: string;
  timeZone: string;
  amountBasis: string;
  taxTreatment: string;
  signConvention: string;
  identityRule: string;
  correctionRule: string;
  currencyPolicy: string;
  dimensionMappings: Partial<Record<DimensionId, string>>;
}
export interface CustomerProductPopulationBasis {
  version:1;years:readonly number[];excludedProductCategories:readonly string[];forecast:'positive';
}
export interface SourceMapping {
  tenantId: string; sourceId: string;
  /** Immutable dataset release: one business basis, mapping version and reporting currency. */
  datasetId: string; mappingId: string; mappingVersion: string; businessBasis: string;
  reportingCurrency: string;
  businessOwner: string;
  approval: { status: 'pending' } | { status: 'approved'; reference: string; approvedAt: string };
  measures: readonly MeasureMapping[];
  capabilities: readonly { metric: MetricId; dimensions: readonly DimensionId[] }[];
}
export type CurrencyLineage = {
  transactionCurrency: string; transactionValue: string;
  baseCurrency?: string;
  reportingCurrency: string;
  policyReference: string;
} & ({ mode: 'native' } | { mode: 'converted'; rate: string; rateDate: string; rateReference: string });
export interface ProductionFact {
  tenantId: string; datasetId: string; measureId: FactMeasureId;
  kind: 'event' | 'snapshot'; businessDate: string;
  /** Canonical decimal text, exactly six fractional digits; never a JS float. */
  value: string;
  entityId?: string;
  dimensions: Partial<Record<DimensionId, string>>;
  sourceId: string; sourceObject: string; sourceRecordId: string;
  /** Stable component within a source record; "whole" for unsplit records. */
  componentId: string;
  sourceVersion: string; sourceRevision: string; sourceUpdatedAt?: string;
  mappingId: string; mappingVersion: string;
  batchId: string; sourceAsOf: string; frozenRevision: string;
  status: 'active' | 'tombstone';
  currency?: CurrencyLineage;
  transaction?: TransactionEvidence;
  /** Display evidence only; stable dimensions remain the identity and authorization boundary. */
  displayLabels?: Partial<Record<'customer_salesperson'|'customer_state'|'customer_tag'|'coverage_year'|'invoice_document_state'|'invoice_payment_state'|'receipt_state'|'order_state'|'customer' | 'salesperson' | 'businessLine' | 'product' | 'product_category' | 'brand' | 'customer_segment' | 'customer_class' | 'uom' | 'journal' | 'supplier' | 'warehouse' | 'state', string>>;
}
export interface IngestionBatch extends SourceScope {
  batchId: string; datasetId: string; mappingId: string; mappingVersion: string; adapterVersion: string;
  startedAt: string; completedAt?: string; sourceAsOf: string; frozenRevision: string;
  watermarkStart?: string; watermarkEnd?: string;
  status: 'running' | 'committed' | 'failed';
  rowsRead: number; rowsAccepted: number; rowsRejected: number;
  factsInserted: number; factsUpdated: number; factsTombstoned: number; factsReplayed: number;
}
export interface DataQualityReject {
  tenantId: string; batchId: string; sourceId: string;
  /** Opaque/HMAC reference; no raw customer record, value or free-form exception message. */
  safeRecordReference: string;
  reason: 'invalid_shape' | 'invalid_measure' | 'invalid_date' | 'invalid_numeric' | 'currency' | 'capability' | 'identity_conflict' | 'stale_revision';
  field: 'record' | 'measure' | 'date' | 'value' | 'currency' | 'dimension' | 'identity';
  occurredAt: string;
}
export interface ReconciliationCase {
  caseId: string; tenantId: string; datasetId: string; mappingVersion: string;
  measureId: FactMeasureId; sourceReportReference: string; frozenRevision: string;
  /** Exact immutable committed batch set, not the mutable current-facts view. */
  batchIds: readonly string[];
  from: string; to: string; grouping: DimensionId | null; groupKey: string | null;
  expectedValue: string; actualValue: string; expectedCount: string; actualCount: string;
  tolerance: { status: 'pending' } | { status: 'approved'; absoluteValue: string; absoluteCount: string; approvalReference: string };
}

function fail(code: string): never { throw new Error(`Production data: ${code}`); }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200 && v.trim() === v;
function shape(v: unknown, required: string[], optional: string[] = []): asserts v is Record<string, unknown> {
  if (!object(v) || required.some(k => !Object.hasOwn(v, k)) || Object.keys(v).some(k => ![...required, ...optional].includes(k))) fail('invalid_shape');
}
const date = (v: unknown): v is string => validDateRange({ from: v, to: v });
const timestamp = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const currencyCode = (v: unknown): v is string => typeof v === 'string' && /^[A-Z]{3}$/.test(v);
const unsigned = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9]\d{0,19})$/.test(v);
export const isCanonicalDecimal = (v: unknown): v is string => typeof v === 'string' && /^-?(0|[1-9]\d{0,23})\.\d{6}$/.test(v) && v !== '-0.000000';
const decimalUnits = (v: string): bigint => BigInt(v.replace('.', ''));
const snapshot = (id: FactMeasureId) => Object.values(semanticCatalog).some(m => m.semantics.kind === 'snapshot' && m.semantics.measure === id);
const monetary = (id: FactMeasureId) => Object.values(semanticCatalog).some(m => m.type === 'currency' && requiredMeasures(m.id).includes(id) && m.semantics.kind !== 'ratio');
// Catalog semantics are static; tenant mappings remain fully validated on every call.
const dimensionsByMeasure = new Map(factMeasureIds.map(measureId => {
  const metrics = Object.values(semanticCatalog).filter(metric => requiredMeasures(metric.id).includes(measureId));
  return [measureId, categoricalDimensions.filter(dimension => metrics.every(metric => metric.dimensions.includes(dimension)))] as const;
}));
const measureDimensions = (id: FactMeasureId) => dimensionsByMeasure.get(id) ?? [];

export function validateCustomerProductPopulationBasis(value:unknown):asserts value is CustomerProductPopulationBasis{
 shape(value,['version','years','excludedProductCategories','forecast']);
 if(value.version!==1||value.forecast!=='positive'||!Array.isArray(value.years)||!value.years.length||value.years.length>4||new Set(value.years).size!==value.years.length||value.years.some(year=>!Number.isSafeInteger(year)||year<1900||year>9999))fail('population_basis');
 if(!Array.isArray(value.excludedProductCategories)||!value.excludedProductCategories.length||value.excludedProductCategories.length>200||new Set(value.excludedProductCategories).size!==value.excludedProductCategories.length||!value.excludedProductCategories.every(text))fail('population_categories');
}
function validateOptionalPopulation(value:unknown){if(value!==undefined)validateCustomerProductPopulationBasis(value);}

export function validateSourceMapping(value: unknown): asserts value is SourceMapping {
  shape(value, ['tenantId','sourceId','datasetId','mappingId','mappingVersion','businessBasis','reportingCurrency','businessOwner','approval','measures','capabilities']);
  for (const key of ['tenantId','sourceId','datasetId','mappingId','mappingVersion','businessBasis','businessOwner']) if (!text(value[key])) fail('mapping_identity');
  if (!currencyCode(value.reportingCurrency)) fail('currency');
  const a = value.approval;
  if (!object(a)) fail('approval');
  if (a.status === 'pending') shape(a, ['status']);
  else { shape(a, ['status','reference','approvedAt']); if (a.status !== 'approved' || !text(a.reference) || !timestamp(a.approvedAt)) fail('approval'); }
  if (!Array.isArray(value.measures) || !value.measures.length || value.measures.length > 128) fail('mapping_measures');
  const seen = new Set<string>();
  for (const m of value.measures) {
    shape(m, ['measureId','sourceObject','grain','eligibleStates','recognitionRule','timeZone','amountBasis','taxTreatment','signConvention','identityRule','correctionRule','currencyPolicy','dimensionMappings'],['population']);
    validateOptionalPopulation(m.population);
    if (typeof m.measureId !== 'string' || !isFactMeasureId(m.measureId) || seen.has(m.measureId)) fail('invalid_measure');
    seen.add(m.measureId);
    for (const k of ['sourceObject','grain','recognitionRule','timeZone','amountBasis','taxTreatment','signConvention','identityRule','correctionRule','currencyPolicy']) if (!text(m[k])) fail('mapping_rule');
    if (!Array.isArray(m.eligibleStates) || m.eligibleStates.length > 32 || !m.eligibleStates.every(text)) fail('mapping_states');
    if (!object(m.dimensionMappings) || Object.entries(m.dimensionMappings).some(([d, rule]) => !measureDimensions(m.measureId as FactMeasureId).includes(d as DimensionId) || !text(rule))) fail('capability');
  }
  if (!Array.isArray(value.capabilities) || !value.capabilities.length || value.capabilities.length > 128) fail('capability');
  const metrics = new Set<string>();
  for (const c of value.capabilities) {
    shape(c, ['metric','dimensions']);
    if (typeof c.metric !== 'string' || !isMetricId(c.metric) || metrics.has(c.metric)) fail('capability');
    metrics.add(c.metric);
    if (!requiredMeasures(c.metric).every(id => seen.has(id))) fail('capability_inputs');
    if (!Array.isArray(c.dimensions) || new Set(c.dimensions).size !== c.dimensions.length || c.dimensions.some(d => !semanticCatalog[c.metric as MetricId].dimensions.includes(d) || (categoricalDimensions.includes(d) && !requiredMeasures(c.metric as MetricId).every(id => Object.hasOwn((value.measures as MeasureMapping[]).find(m => m.measureId === id)!.dimensionMappings, d))))) fail('capability');
  }
}
export function certifiedDimensions(mapping: SourceMapping, metric: MetricId): readonly DimensionId[] {
  validateSourceMapping(mapping);
  if (mapping.approval.status !== 'approved') return [];
  return mapping.capabilities.find(c => c.metric === metric)?.dimensions ?? [];
}
export function validateProductionFact(value: unknown, mapping: SourceMapping): asserts value is ProductionFact {
  validateSourceMapping(mapping);
  shape(value, ['tenantId','datasetId','measureId','kind','businessDate','value','dimensions','sourceId','sourceObject','sourceRecordId','componentId','sourceVersion','sourceRevision','mappingId','mappingVersion','batchId','sourceAsOf','frozenRevision','status'], ['entityId','sourceUpdatedAt','currency','transaction','displayLabels']);
  for (const key of ['tenantId','datasetId','sourceId','sourceObject','sourceRecordId','componentId','sourceVersion','mappingId','mappingVersion','batchId','frozenRevision']) if (!text(value[key])) fail('identity');
  for (const key of ['tenantId','datasetId','sourceId','mappingId','mappingVersion'] as const) if (value[key] !== mapping[key]) fail('mapping_scope');
  if (typeof value.measureId !== 'string' || !isFactMeasureId(value.measureId)) fail('invalid_measure');
  const rule = mapping.measures.find(m => m.measureId === value.measureId);
  if (!rule || rule.sourceObject !== value.sourceObject) fail('mapping_measure');
  if (value.kind !== (snapshot(value.measureId) ? 'snapshot' : 'event')) fail('fact_kind');
  if ((value.kind === 'snapshot' || value.entityId !== undefined) && !text(value.entityId)) fail('snapshot_entity');
  if (!date(value.businessDate)) fail('invalid_date');
  if (!isCanonicalDecimal(value.value)) fail('invalid_numeric');
  if (!unsigned(value.sourceRevision) || !timestamp(value.sourceAsOf) || (value.sourceUpdatedAt !== undefined && !timestamp(value.sourceUpdatedAt))) fail('lineage');
  if (!['active','tombstone'].includes(String(value.status))) fail('status');
  if (!object(value.dimensions) || Object.entries(value.dimensions).some(([d, v]) => !Object.hasOwn(rule.dimensionMappings, d) || !text(v))) fail('capability');
  if (value.transaction!==undefined) validateTransactionEvidence(value.transaction as TransactionEvidence);
  validateDisplayLabels(value.displayLabels);
  // Certified categorical attribution is required, never silently absent or defaulted.
  if (Object.keys(rule.dimensionMappings).some(d => !Object.hasOwn(value.dimensions as object, d))) fail('missing_dimension');
  if (!monetary(value.measureId)) { if (value.currency !== undefined) fail('unexpected_currency'); return; }
  const c = value.currency;
  if (!object(c)) fail('currency');
  shape(c, ['mode','transactionCurrency','transactionValue','reportingCurrency','policyReference'], c.mode === 'converted' ? ['baseCurrency','rate','rateDate','rateReference'] : ['baseCurrency']);
  if (!currencyCode(c.transactionCurrency) || !currencyCode(c.reportingCurrency) || c.reportingCurrency !== mapping.reportingCurrency || (c.baseCurrency !== undefined && !currencyCode(c.baseCurrency)) || !isCanonicalDecimal(c.transactionValue) || c.policyReference !== rule.currencyPolicy) fail('currency');
  if (c.mode === 'native') { if (c.transactionCurrency !== c.reportingCurrency || c.transactionValue !== value.value) fail('currency'); }
  else if (c.mode === 'converted') {
    if (typeof c.rate !== 'string' || !/^(0|[1-9]\d{0,11})\.\d{12}$/.test(c.rate) || BigInt(c.rate.replace('.', '')) <= 0n || !date(c.rateDate) || !text(c.rateReference)) fail('currency_rate');
  } else fail('currency');
}
/** JSON tuple avoids delimiter collisions; revision and business date are not event identity. */
export function productionFactIdentity(f: ProductionFact): string {
  return JSON.stringify([f.tenantId, f.datasetId, f.sourceId, f.sourceObject, f.sourceRecordId, f.componentId, f.measureId,
    ...(f.kind === 'snapshot' ? [f.entityId, f.businessDate] : [])]);
}
function canonical(v: unknown): string {
  const normalize = (x: unknown): unknown => Array.isArray(x) ? x.map(normalize) : object(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, normalize(x[k])])) : x;
  return JSON.stringify(normalize(v));
}
function content(f: ProductionFact): string {
  return canonical(Object.fromEntries(Object.entries(f).filter(([key]) => !['batchId','sourceAsOf','frozenRevision'].includes(key))));
}
/** Pure writer decision, not a persistence implementation. Caller locks identity before applying. */
export function factTransition(current: ProductionFact | undefined, incoming: ProductionFact, mapping: SourceMapping): 'insert' | 'replace' | 'replay' {
  validateProductionFact(incoming, mapping);
  if (!current) return 'insert';
  validateProductionFact(current, mapping);
  if (productionFactIdentity(current) !== productionFactIdentity(incoming)) fail('identity_mismatch');
  if (current.kind === 'event' && current.entityId !== incoming.entityId) fail('identity_conflict');
  if (current.sourceRevision === incoming.sourceRevision) {
    if (content(current) !== content(incoming)) fail('identity_conflict');
    return 'replay';
  }
  if (current.sourceVersion === incoming.sourceVersion) fail('identity_conflict');
  if (BigInt(incoming.sourceRevision) < BigInt(current.sourceRevision)) fail('stale_revision');
  return 'replace';
}
/** Cross-record snapshot ambiguity; tombstones retain ownership so stale data cannot resurrect it. */
export function validateSnapshotUniqueness(facts: readonly ProductionFact[]): void {
  const owners = new Map<string, string>();
  for (const f of facts) if (f.kind === 'snapshot') {
    const key = JSON.stringify([f.tenantId, f.datasetId, f.measureId, f.entityId, f.businessDate]);
    const owner = productionFactIdentity(f);
    if (owners.has(key) && owners.get(key) !== owner) fail('ambiguous_snapshot');
    owners.set(key, owner);
  }
}
export function reconciliationStatus(value: unknown): 'reported' | 'passed' | 'failed' {
  shape(value, ['caseId','tenantId','datasetId','mappingVersion','measureId','sourceReportReference','frozenRevision','batchIds','from','to','grouping','groupKey','expectedValue','actualValue','expectedCount','actualCount','tolerance']);
  for (const k of ['caseId','tenantId','datasetId','mappingVersion','sourceReportReference','frozenRevision']) if (!text(value[k])) fail('reconciliation_identity');
  if (typeof value.measureId !== 'string' || !isFactMeasureId(value.measureId) || !validDateRange({ from: value.from, to: value.to })) fail('reconciliation_scope');
  if (!Array.isArray(value.batchIds) || !value.batchIds.length || value.batchIds.length > 1000 || !value.batchIds.every(text) || new Set(value.batchIds).size !== value.batchIds.length) fail('reconciliation_batches');
  if (value.grouping !== null && ![...categoricalDimensions, 'date','month','quarter','year'].includes(String(value.grouping))) fail('reconciliation_group');
  if (value.grouping === null ? value.groupKey !== null : !text(value.groupKey)) fail('reconciliation_group');
  if (!isCanonicalDecimal(value.expectedValue) || !isCanonicalDecimal(value.actualValue) || !unsigned(value.expectedCount) || !unsigned(value.actualCount)) fail('reconciliation_numeric');
  const t = value.tolerance;
  if (!object(t)) fail('tolerance');
  if (t.status === 'pending') { shape(t, ['status']); return 'reported'; }
  shape(t, ['status','absoluteValue','absoluteCount','approvalReference']);
  if (t.status !== 'approved' || !text(t.approvalReference) || !isCanonicalDecimal(t.absoluteValue) || decimalUnits(t.absoluteValue) < 0n || !unsigned(t.absoluteCount)) fail('tolerance');
  const abs = (n: bigint) => n < 0n ? -n : n;
  return abs(decimalUnits(value.actualValue) - decimalUnits(value.expectedValue)) <= decimalUnits(t.absoluteValue) && abs(BigInt(value.actualCount) - BigInt(value.expectedCount)) <= BigInt(t.absoluteCount) ? 'passed' : 'failed';
}

/** Validate the batch and its canonical lineage before opening the writer transaction. */
export function validateFactBatch(value: unknown, facts: readonly ProductionFact[], mapping: SourceMapping): asserts value is IngestionBatch {
  shape(value, ['tenantId','sourceId','companyIds','batchId','datasetId','mappingId','mappingVersion','adapterVersion','startedAt','sourceAsOf','frozenRevision','status','rowsRead','rowsAccepted','rowsRejected','factsInserted','factsUpdated','factsTombstoned','factsReplayed'], ['completedAt','watermarkStart','watermarkEnd']);
  validateSourceMapping(mapping);
  for (const k of ['tenantId','sourceId','batchId','datasetId','mappingId','mappingVersion','adapterVersion','frozenRevision']) if (!text(value[k])) fail('batch_identity');
  for (const k of ['tenantId','sourceId','datasetId','mappingId','mappingVersion'] as const) if (value[k] !== mapping[k]) fail('batch_scope');
  if (!Array.isArray(value.companyIds) || !value.companyIds.length || value.companyIds.length > 100 || !value.companyIds.every(text) || new Set(value.companyIds).size !== value.companyIds.length) fail('batch_companies');
  if (!timestamp(value.startedAt) || !timestamp(value.sourceAsOf) || (value.completedAt !== undefined && (!timestamp(value.completedAt) || value.completedAt < value.startedAt))) fail('batch_time');
  for (const k of ['watermarkStart','watermarkEnd']) if (value[k] !== undefined && !text(value[k])) fail('batch_watermark');
  if (!['running','committed','failed'].includes(String(value.status))) fail('batch_status');
  for (const k of ['rowsRead','rowsAccepted','rowsRejected','factsInserted','factsUpdated','factsTombstoned','factsReplayed']) if (!Number.isSafeInteger(value[k]) || Number(value[k]) < 0) fail('batch_counts');
  if (value.status === 'committed' && (!timestamp(value.completedAt) || Number(value.rowsRead) !== Number(value.rowsAccepted) + Number(value.rowsRejected))) fail('batch_completion');
  if (value.status !== 'committed' && value.watermarkEnd !== undefined) fail('premature_watermark');
  const current = new Map<string, ProductionFact>();
  for (const f of facts) {
    validateProductionFact(f, mapping);
    for (const k of ['tenantId','sourceId','datasetId','mappingId','mappingVersion','batchId','sourceAsOf','frozenRevision'] as const) if (f[k] !== value[k]) fail('batch_lineage');
    const id = productionFactIdentity(f);
    const prior = current.get(id);
    // A page must have at most one version per identity; normalize ordered source changes upstream.
    if (prior && (prior.sourceRevision !== f.sourceRevision || factTransition(prior, f, mapping) !== 'replay')) fail('batch_identity_conflict');
    current.set(id, f);
  }
  validateSnapshotUniqueness(facts);
}

function validateDisplayLabels(labels: unknown): void {
  if (labels === undefined) return;
  if (!object(labels) || Object.entries(labels).some(([key,value]) => !['customer_salesperson','customer_state','customer_tag','coverage_year','invoice_document_state','invoice_payment_state','receipt_state','order_state','customer','salesperson','businessLine','product','product_category','brand','customer_segment','customer_class','uom','journal','supplier','warehouse','state'].includes(key) || typeof value !== 'string' || !value.trim() || value.length > 500)) fail('display_labels');
}
