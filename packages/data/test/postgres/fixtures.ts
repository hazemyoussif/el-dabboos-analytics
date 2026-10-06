import type { Pool } from 'pg';
import type { FactMeasureId, IngestionBatch, ProductionFact, SourceMapping } from '@el-dabboos/domain';
import { semanticCatalog } from '@el-dabboos/domain';
import { PostgresReleaseCertification } from '../../src/postgres/release-certification.ts';
import { PostgresMappingReleases } from '../../src/postgres/mapping-releases.ts';
import { PostgresMartWriter } from '../../src/postgres/writer.ts';
import { PostgresReconciliation } from '../../src/postgres/reconciliation.ts';
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
  const releases = new PostgresMappingReleases(pool);
  await releases.registerCandidate({ ...m,approval: { status: 'pending' } });
  const calibration = { ...batch('fixture-calibration',0,m.tenantId),datasetId: m.datasetId,sourceId: m.sourceId,mappingId: m.mappingId,mappingVersion: m.mappingVersion,sourceAsOf: '2026-01-01T10:00:00.000Z',startedAt: '2026-01-01T09:00:00.000Z' };
  await new PostgresMartWriter(pool,{ [m.tenantId]: ['fixture-company'] },clock).commit(calibration,[],{ ...evidence,sourceObjects: [...new Set(m.measures.map(measure => measure.sourceObject))],completeness: 'complete_scope' });
  const caseIds = [];
  for (const measure of m.measures) {
    const caseId = `fixture-certification-${measure.measureId}`;
    await new PostgresReconciliation(pool).record([{ caseId,tenantId: m.tenantId,datasetId: m.datasetId,mappingVersion: m.mappingVersion,measureId: measure.measureId,sourceReportReference: 'EMPTY SYNTHETIC CALIBRATION ONLY',frozenRevision: 'freeze-1',batchIds: ['fixture-calibration'],from: '2026-01-01',to: '2026-01-31',grouping: null,groupKey: null,expectedValue: '0.000000',actualValue: '0.000000',expectedCount: '0',actualCount: '0',tolerance: { status: 'approved',absoluteValue: '0.000000',absoluteCount: '0',approvalReference: 'SYNTHETIC TEST ONLY' } }],m.reportingCurrency);
    caseIds.push(caseId);
  }
  await certify(pool,{ tenantId: m.tenantId,datasetId: m.datasetId,caseIds,from: '2026-01-01',to: '2026-01-31',measureId: m.measures[0]!.measureId,value: '0.000000' });
  await releases.approve({ tenantId: m.tenantId,datasetId: m.datasetId,caseIds,reference: 'SYNTHETIC TEST ONLY',approvedAt: clock().toISOString() });
  await tenantTransaction(pool,m.tenantId,client => client.query('INSERT INTO mart.serving_bindings VALUES ($1,$2)',[m.tenantId,m.datasetId]));
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

export async function certify(pool: Pool,control: { tenantId: string; datasetId: string; caseIds: string[]; from: string; to: string; measureId: FactMeasureId; value: string }) {
  await new PostgresReleaseCertification(pool).record({ tenantId: control.tenantId,datasetId: control.datasetId,mappingVersion: '1',reference: 'SYNTHETIC TEST ONLY',approverReference: 'synthetic-authorized-operator',approvedAt: clock().toISOString(),companyIds: ['fixture-company'],from: control.from,to: control.to,caseIds: control.caseIds,technicalReference: 'synthetic-exact-controls',evidenceKind: 'authorized_business_approval',approvedValues: [{ measureId: control.measureId,value: control.value }],businessSemantics: ['SYNTHETIC TEST ONLY: fixture business basis'] });
}
