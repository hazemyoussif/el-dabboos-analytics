import type { Pool } from 'pg';
import type { FactMeasureId, IngestionBatch, ProductionFact, SourceMapping } from '@el-dabboos/domain';
import { semanticCatalog } from '@el-dabboos/domain';
import { tenantTransaction } from '../../src/postgres/session.ts';
export const clock = () => new Date('2026-10-01T12:00:00.000Z');
export const evidence = { sourceObjects: ['fixture'], requestLimit: 1000, completeness: 'incremental' as const, deletionEvidence: 'explicit' as const, paginationComplete: true, watermarkEnd: 'fixture-end' };
export function mapping(tenantId = 'a'): SourceMapping {
  return { tenantId, sourceId: 'fixture', datasetId: 'release', mappingId: 'synthetic', mappingVersion: '1', businessBasis: 'SYNTHETIC TEST ONLY', reportingCurrency: 'IQD', businessOwner: 'synthetic-test-fixture', approval: { status: 'approved',reference: 'TEST ONLY: NOT A PRODUCTION APPROVAL',approvedAt: '2026-01-01T00:00:00.000Z' },
    measures: ['revenue','order_count','outstanding_amount'].map(id => ({ measureId: id as FactMeasureId,sourceObject: 'fixture',grain: 'synthetic record',eligibleStates: ['confirmed'],recognitionRule: 'test date',timeZone: 'Asia/Baghdad',amountBasis: 'test signed amount',taxTreatment: 'test only',signConvention: 'signed',identityRule: 'record/component',correctionRule: 'explicit full replacement and tombstone',currencyPolicy: 'test-native',dimensionMappings: { branch: 'test branch' } })),
    capabilities: ['revenue','order_count','average_order_value','outstanding_amount','sales_growth'].map(metric => ({ metric: metric as SourceMapping['capabilities'][number]['metric'],dimensions: ['branch','date','month','quarter','year'] })),
  };
}
export async function deploy(pool: Pool, m: SourceMapping) {
  await tenantTransaction(pool,m.tenantId, async c => {
    await c.query('INSERT INTO mart.mapping_releases VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [m.tenantId,m.datasetId,m.sourceId,m.mappingId,m.mappingVersion,m.businessBasis,m.reportingCurrency,m.approval.status,m.approval.status === 'approved' ? m.approval.reference : null,JSON.stringify(m)]);
    await c.query('INSERT INTO mart.serving_bindings VALUES ($1,$2)', [m.tenantId,m.datasetId]);
  });
}
export function fact(recordId = 'one', patch: Partial<ProductionFact> = {}): ProductionFact {
  const measure = patch.measureId ?? 'revenue';
  const kind = Object.values(semanticCatalog).some(m => m.semantics.kind === 'snapshot' && m.semantics.measure === measure) ? 'snapshot' : 'event';
  const f: ProductionFact = { tenantId: 'a',datasetId: 'release',measureId: measure,kind,businessDate: '2026-02-15',value: '100.000000',dimensions: { branch: 'cairo' },sourceId: 'fixture',sourceObject: 'fixture',sourceRecordId: recordId,componentId: 'whole',sourceVersion: 'v1',sourceRevision: '1',mappingId: 'synthetic',mappingVersion: '1',batchId: 'batch-1',sourceAsOf: '2026-10-01T10:00:00.000Z',frozenRevision: 'freeze-1',status: 'active',...(kind === 'snapshot' ? { entityId: recordId } : {}),...patch };
  if (measure !== 'order_count') f.currency = patch.currency ?? { mode: 'native',transactionCurrency: 'IQD',transactionValue: f.value,reportingCurrency: 'IQD',policyReference: 'test-native' };
  return f;
}
export function batch(id = 'batch-1', rows = 1, tenantId = 'a'): IngestionBatch {
  return { tenantId,sourceId: 'fixture',companyIds: ['fixture-company'],batchId: id,datasetId: 'release',mappingId: 'synthetic',mappingVersion: '1',adapterVersion: 'test-only',startedAt: '2026-10-01T09:00:00.000Z',sourceAsOf: '2026-10-01T10:00:00.000Z',frozenRevision: 'freeze-1',status: 'running',rowsRead: rows,rowsAccepted: rows,rowsRejected: 0,factsInserted: 0,factsUpdated: 0,factsTombstoned: 0,factsReplayed: 0 };
}
