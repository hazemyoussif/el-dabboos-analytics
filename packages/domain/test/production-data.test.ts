import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { certifiedDimensions, factTransition, productionFactIdentity, reconciliationStatus, validateProductionFact, validateSnapshotUniqueness, validateSourceMapping, validateFactBatch } from '../src/production-data.ts';
import type { ProductionFact, ReconciliationCase, SourceMapping } from '../src/production-data.ts';
import { factMeasureIds } from '../src/catalog.ts';

// Synthetic approval is a test fixture only, never a registered production mapping.
const mapping: SourceMapping = {
  tenantId: 'synthetic-a', sourceId: 'fixture', datasetId: 'orders-v1', mappingId: 'orders', mappingVersion: '1', businessBasis: 'synthetic confirmed orders',
  reportingCurrency: 'IQD', businessOwner: 'test-owner', approval: { status: 'approved', reference: 'synthetic-only', approvedAt: '2026-01-01T00:00:00.000Z' },
  measures: [{ measureId: 'revenue', sourceObject: 'fixture_order', grain: 'order', eligibleStates: ['confirmed'], recognitionRule: 'business date', timeZone: 'Asia/Baghdad',
    amountBasis: 'tax inclusive', taxTreatment: 'included', signConvention: 'signed', identityRule: 'record + component', correctionRule: 'ordered revision and explicit tombstone', currencyPolicy: 'native-iqd', dimensionMappings: { branch: 'approved branch identity' } }],
  capabilities: [{ metric: 'revenue', dimensions: ['month','branch'] }],
};
const fact: ProductionFact = {
  tenantId: mapping.tenantId, datasetId: mapping.datasetId, measureId: 'revenue', kind: 'event', businessDate: '2025-12-15', value: '100.000000', dimensions: { branch: 'test-branch' },
  sourceId: 'fixture', sourceObject: 'fixture_order', sourceRecordId: 'record-1', componentId: 'whole', sourceVersion: 'opaque-a', sourceRevision: '1',
  mappingId: 'orders', mappingVersion: '1', batchId: 'batch-1', sourceAsOf: '2026-01-01T10:00:00.000Z', frozenRevision: 'freeze-1', status: 'active',
  currency: { mode: 'native', transactionCurrency: 'IQD', transactionValue: '100.000000', reportingCurrency: 'IQD', policyReference: 'native-iqd' },
};
const snapshotMapping: SourceMapping = { ...mapping, measures: [{ ...mapping.measures[0]!, measureId: 'outstanding_amount' }], capabilities: [{ metric: 'outstanding_amount', dimensions: ['branch','month'] }] };
const snap: ProductionFact = { ...fact, measureId: 'outstanding_amount', kind: 'snapshot', entityId: 'receivable-1' };

test('stable event identity survives date corrections; tenant and dataset identities cannot collide', () => {
  validateProductionFact(fact, mapping);
  assert.equal(productionFactIdentity(fact), productionFactIdentity({ ...fact, businessDate: '2025-11-15', sourceRevision: '2', sourceVersion: 'b' }));
  assert.notEqual(productionFactIdentity(fact), productionFactIdentity({ ...fact, tenantId: 'synthetic-b' }));
  assert.notEqual(productionFactIdentity(fact), productionFactIdentity({ ...fact, datasetId: 'invoice-basis-v1' }));
  assert.throws(() => validateProductionFact({ ...fact, tenantId: 'synthetic-b' }, mapping), /mapping_scope/);
});
test('snapshot identity contains entity and effective date; conflicting source owners fail', () => {
  validateProductionFact(snap, snapshotMapping);
  assert.notEqual(productionFactIdentity(snap), productionFactIdentity({ ...snap, businessDate: '2025-12-16' }));
  assert.notEqual(productionFactIdentity(snap), productionFactIdentity({ ...snap, entityId: 'receivable-2' }));
  assert.throws(() => validateSnapshotUniqueness([snap, { ...snap, sourceRecordId: 'different' }]), /ambiguous_snapshot/);
  assert.doesNotThrow(() => validateSnapshotUniqueness([snap, { ...snap, tenantId: 'synthetic-b' }]));
  assert.throws(() => validateProductionFact({ ...snap, entityId: undefined }, snapshotMapping), /snapshot_entity/);
});
test('same-version replay retains original content while linking the new batch separately', () => {
  const replay = { ...fact, batchId: 'batch-2', sourceAsOf: '2026-02-01T00:00:00.000Z', frozenRevision: 'freeze-2' };
  assert.equal(factTransition(undefined, fact, mapping), 'insert');
  assert.equal(factTransition(fact, replay, mapping), 'replay');
  assert.equal(fact.batchId, 'batch-1');
  assert.equal(replay.batchId, 'batch-2');
  assert.notEqual(fact.businessDate, fact.sourceAsOf.slice(0, 10));
  assert.throws(() => factTransition(fact, { ...replay, businessDate: '2025-12-14' }, mapping), /identity_conflict/);
});
test('newer revision replaces; older revision and reused opaque versions fail closed', () => {
  const next = { ...fact, sourceRevision: '10', sourceVersion: 'opaque-z', businessDate: '2025-11-15' };
  assert.equal(factTransition(fact, next, mapping), 'replace');
  assert.throws(() => factTransition(next, fact, mapping), /stale_revision/);
  assert.throws(() => factTransition(fact, { ...next, sourceVersion: fact.sourceVersion }, mapping), /identity_conflict/);
});
test('tombstone replaces current contribution, replays idempotently and blocks stale resurrection', () => {
  const deleted: ProductionFact = { ...fact, status: 'tombstone', sourceVersion: 'delete-v2', sourceRevision: '2' };
  assert.equal(factTransition(fact, deleted, mapping), 'replace');
  assert.equal(factTransition(deleted, deleted, mapping), 'replay');
  assert.throws(() => factTransition(deleted, fact, mapping), /stale_revision/);
});
for (const [label, patch] of Object.entries({
  blankTenant: { tenantId: ' ' }, unknownMeasure: { measureId: 'made_up' }, derivedMeasure: { measureId: 'gross_margin' }, invalidDate: { businessDate: '2025-02-29' },
  infinity: { value: Infinity }, nan: { value: NaN }, floatingNumber: { value: 100 }, extraPrecision: { value: '100.0000001' }, overflow: { value: '1000000000000000000000000.000000' },
  blankSource: { sourceRecordId: '' }, unknownDimension: { dimensions: { postal_code: 'x' } }, uncertifiedDimension: { dimensions: { branch: 'x', product: 'p' } },
  missingDimension: { dimensions: {} }, absentCurrency: { currency: undefined }, unknownField: { rawPayload: {} }, invalidTimestamp: { sourceAsOf: '2026-02-30T00:00:00.000Z' },
})) test(`strict production validator rejects ${label}`, () => assert.throws(() => validateProductionFact({ ...fact, ...patch }, mapping)));

test('native and converted monetary lineage is explicit; no FX math is inferred', () => {
  assert.throws(() => validateProductionFact({ ...fact, currency: { ...fact.currency, transactionCurrency: 'USD' } }, mapping), /currency/);
  assert.throws(() => validateProductionFact({ ...fact, currency: { ...fact.currency, reportingCurrency: 'EGP' } }, mapping), /currency/);
  assert.throws(() => validateProductionFact({ ...fact, currency: { ...fact.currency, transactionValue: '1.000000' } }, mapping), /currency/);
  const converted = { mode: 'converted', transactionCurrency: 'USD', transactionValue: '1.000000', reportingCurrency: 'IQD', policyReference: 'native-iqd', rate: '100.000000000000', rateDate: '2025-12-15', rateReference: 'synthetic-approved-rate' };
  assert.doesNotThrow(() => validateProductionFact({ ...fact, currency: converted }, mapping));
  assert.throws(() => validateProductionFact({ ...fact, currency: { ...converted, rateReference: '' } }, mapping), /currency_rate/);
  assert.throws(() => validateProductionFact({ ...fact, currency: { ...converted, rate: '0.000000000000' } }, mapping), /currency_rate/);
});
test('mapping approval and capability intersection cannot expand the semantic catalog', () => {
  const pending: SourceMapping = { ...mapping, approval: { status: 'pending' } };
  assert.deepEqual(certifiedDimensions(pending, 'revenue'), []);
  assert.doesNotThrow(() => validateProductionFact(fact, pending));
  assert.deepEqual(certifiedDimensions(mapping, 'revenue'), ['month','branch']);
  assert.throws(() => validateSourceMapping({ ...mapping, capabilities: [{ metric: 'revenue', dimensions: ['warehouse'] }] }), /capability/);
  assert.throws(() => validateSourceMapping({ ...mapping, capabilities: [{ metric: 'revenue', dimensions: ['product'] }] }), /capability/);
  assert.throws(() => validateSourceMapping({ ...mapping, capabilities: [{ metric: 'average_order_value', dimensions: ['branch'] }] }), /capability_inputs/);
});
const control: ReconciliationCase = {
  caseId: 'case-1', tenantId: 'synthetic-a', datasetId: mapping.datasetId, mappingVersion: '1', measureId: 'revenue', sourceReportReference: 'synthetic-report', frozenRevision: 'freeze-1', batchIds: ['batch-1'],
  from: '2025-12-01', to: '2025-12-31', grouping: 'branch', groupKey: 'test-branch', expectedValue: '100.000000', actualValue: '100.000000', expectedCount: '1', actualCount: '1', tolerance: { status: 'pending' },
};
test('reconciliation stays reported until explicit approved tolerance, then compares exact decimals', () => {
  assert.equal(reconciliationStatus(control), 'reported');
  assert.throws(() => reconciliationStatus({ ...control, tolerance: undefined }), /tolerance/);
  const approved: ReconciliationCase = { ...control, tolerance: { status: 'approved', absoluteValue: '0.000000', absoluteCount: '0', approvalReference: 'test-only' } };
  assert.equal(reconciliationStatus(approved), 'passed');
  assert.equal(reconciliationStatus({ ...approved, actualValue: '100.000001' }), 'failed');
  assert.equal(reconciliationStatus({ ...approved, actualCount: '2' }), 'failed');
  assert.throws(() => reconciliationStatus({ ...approved, batchIds: [] }), /reconciliation_batches/);
});
test('migration measure vocabulary matches canonical inputs and current view excludes tombstones', () => {
  const sql = readFileSync(new URL('../../data/migrations/postgres/001_production_foundation.sql', import.meta.url), 'utf8') + readFileSync(new URL('../../data/migrations/postgres/007_transaction_metrics.sql', import.meta.url),'utf8');
  const ids = [...sql.matchAll(/\('([a-z_]+)','(?:event|snapshot)',(?:true|false)\)/g)].map(m => m[1]);
  assert.deepEqual(ids.sort(), [...factMeasureIds].sort());
  assert.match(sql, /r.status = 'active' AND b.status = 'committed'/);
});

test('batch lineage must match facts, counts close and watermark cannot publish early', () => {
  const batch = { tenantId: mapping.tenantId, sourceId: mapping.sourceId, companyIds: ['synthetic-company'], batchId: fact.batchId, datasetId: mapping.datasetId, mappingId: mapping.mappingId, mappingVersion: mapping.mappingVersion, adapterVersion: '1', startedAt: '2026-01-01T09:00:00.000Z', sourceAsOf: fact.sourceAsOf, frozenRevision: fact.frozenRevision, status: 'running', rowsRead: 1, rowsAccepted: 1, rowsRejected: 0, factsInserted: 1, factsUpdated: 0, factsTombstoned: 0, factsReplayed: 0 };
  assert.doesNotThrow(() => validateFactBatch(batch, [fact], mapping));
  assert.throws(() => validateFactBatch(batch, [{ ...fact, batchId: 'other' }], mapping), /batch_lineage/);
  assert.throws(() => validateFactBatch({ ...batch, watermarkEnd: 'next' }, [fact], mapping), /premature_watermark/);
  assert.throws(() => validateFactBatch({ ...batch, status: 'committed' }, [fact], mapping), /batch_completion/);
  assert.doesNotThrow(() => validateFactBatch({ ...batch, status: 'committed', completedAt: '2026-01-01T11:00:00.000Z', watermarkEnd: 'next' }, [fact], mapping));
  assert.throws(() => validateFactBatch(batch, [fact, { ...fact, businessDate: '2025-12-01' }], mapping), /identity_conflict/);
});
