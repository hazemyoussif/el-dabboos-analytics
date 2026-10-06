import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresAnalyticsRepository } from '../../src/postgres/repository.ts';
import { tenantTransaction } from '../../src/postgres/session.ts';
import { database,enabled } from './support.ts';
import { deploy,mapping } from './fixtures.ts';
test('runtime sees only safe approval-linked coverage for the bound tenant and no evidence payloads', { skip: !enabled },async () => {
  const db = await database();
  try {
    await deploy(db.migrator,mapping());
    const repo = new PostgresAnalyticsRepository(db.runtime,{ reportingCurrencies: { a: 'IQD' } });
    const published = await repo.getPublishedCapabilities({ tenantId: 'a',locale: 'en' });
    assert.deepEqual(published.releases[0]!.capabilities.map(capability=>capability.metric),['revenue','order_count']);
    assert.ok(published.releases[0]!.capabilities.every(capability=>capability.dimensions.length===0 && capability.analyses.length===0));
    assert.deepEqual(published.releases[0]!.period,{ from: '2026-01-01',to: '2026-01-31' });
    assert.deepEqual(await repo.getPublishedCapabilities({ tenantId: 'b',locale: 'en' }),{ tenantId: 'b',mode: 'certified',releases: [] });
    const result = await repo.execute({ metric: 'order_count',dateRange: published.releases[0]!.period! },{ tenantId: 'a',locale: 'en' });
    assert.equal(result.metadata.release!.mappingVersion,'1');
    assert.equal(result.metadata.release!.certificationReference,published.releases[0]!.certificationReference);
    const cross = await tenantTransaction(db.runtime,'b',client=>client.query('SELECT * FROM mart.published_reconciliation_coverage($1,$2)',['a','release']),true);
    assert.equal(cross.rowCount,0);
    await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query('SELECT specification FROM mart.reconciliation_evidence'),true),/permission denied/);
  } finally { await db.close(); }
});

test('certifying and binding a new mapping version leaves the approved v1 release byte-for-byte explainable', { skip: !enabled },async () => {
  const { PostgresMappingReleases } = await import('../../src/postgres/mapping-releases.ts');
  const { PostgresMartWriter } = await import('../../src/postgres/writer.ts');
  const { PostgresReconciliation } = await import('../../src/postgres/reconciliation.ts');
  const { PostgresReleaseCertification } = await import('../../src/postgres/release-certification.ts');
  const { batch,evidence,clock } = await import('./fixtures.ts');
  const db = await database();
  try {
    await deploy(db.migrator,mapping());
    const readHistory = () => tenantTransaction(db.migrator,'a',client=>client.query("SELECT specification,approval_reference,approval_case_ids FROM mart.mapping_releases WHERE tenant_id='a' AND dataset_id='release'"));
    const history = await readHistory(); assert.equal(history.rowCount,1);
    const original = JSON.stringify(history.rows);
    const next = mapping(); next.datasetId='release-v2'; next.mappingVersion='2'; next.measures[0]!.amountBasis='NEW SYNTHETIC APPROVED DEFINITION';
    const releases = new PostgresMappingReleases(db.migrator);
    await releases.registerCandidate({ ...next,approval: { status: 'pending' } });
    await new PostgresMartWriter(db.migrator,{ a: ['fixture-company'] },clock).commit({ ...batch('v2-calibration',0),datasetId: next.datasetId,mappingVersion: '2' },[],{ ...evidence,completeness: 'complete_scope' });
    const caseIds: string[] = [];
    for (const measure of next.measures) {
      const caseId=`v2-${measure.measureId}`; caseIds.push(caseId);
      await new PostgresReconciliation(db.migrator).record([{ caseId,tenantId: 'a',datasetId: next.datasetId,mappingVersion: '2',measureId: measure.measureId,sourceReportReference: 'SYNTHETIC V2 EMPTY CONTROL',frozenRevision: 'freeze-1',batchIds: ['v2-calibration'],from: '2026-01-01',to: '2026-01-31',grouping: null,groupKey: null,expectedValue: '0.000000',actualValue: '0.000000',expectedCount: '0',actualCount: '0',tolerance: { status: 'approved',absoluteValue: '0.000000',absoluteCount: '0',approvalReference: 'SYNTHETIC ONLY' } }],'IQD');
    }
    await new PostgresReleaseCertification(db.migrator).record({ tenantId: 'a',datasetId: next.datasetId,mappingVersion: '2',reference: 'SYNTHETIC-V2',approverReference: 'synthetic-operator',approvedAt: clock().toISOString(),companyIds: ['fixture-company'],from: '2026-01-01',to: '2026-01-31',caseIds,technicalReference: 'synthetic-controls',evidenceKind: 'authorized_business_approval',approvedValues: [{ measureId: 'revenue',value: '0.000000' }],businessSemantics: ['NEW SYNTHETIC APPROVED DEFINITION'] });
    await releases.approve({ tenantId: 'a',datasetId: next.datasetId,caseIds,reference: 'SYNTHETIC-V2',approvedAt: clock().toISOString() });
    await tenantTransaction(db.migrator,'a',client=>client.query('UPDATE mart.serving_bindings SET dataset_id=$1 WHERE tenant_id=$2',[next.datasetId,'a']));
    const repo = new PostgresAnalyticsRepository(db.runtime,{ reportingCurrencies: { a: 'IQD' } });
    assert.equal((await repo.getPublishedCapabilities({ tenantId: 'a',locale: 'en' })).releases[0]!.mappingVersion,'2');
    assert.equal(JSON.stringify((await readHistory()).rows),original);
    assert.equal((await tenantTransaction(db.migrator,'a',client=>client.query("SELECT count(*)::int count FROM mart.mapping_releases WHERE tenant_id='a' AND approval_status='approved'"))).rows[0].count,2);
  } finally { await db.close(); }
});
