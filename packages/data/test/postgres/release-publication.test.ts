import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresReleasePromotion } from '../../src/postgres/release-promotion.ts';
import { PostgresMappingReleases } from '../../src/postgres/mapping-releases.ts';
import { PostgresReconciliation } from '../../src/postgres/reconciliation.ts';
import { PostgresMartWriter } from '../../src/postgres/writer.ts';
import { PostgresAnalyticsRepository } from '../../src/postgres/repository.ts';
import { readReleaseRows,releaseFingerprint } from '../../src/postgres/release-transfer.ts';
import { tenantTransaction } from '../../src/postgres/session.ts';
import { database,enabled } from './support.ts';
import { batch,certify,clock,evidence,fact,mapping } from './fixtures.ts';

const scope = { tenantId: 'a',datasetId: 'release',reference: 'SYNTHETIC PROMOTION ONLY' };
async function reconcile(db: Awaited<ReturnType<typeof database>>,wrongValue = false) {
  await new PostgresMappingReleases(db.migrator).registerCandidate({ ...mapping(),approval: { status: 'pending' } });
  await new PostgresMartWriter(db.ingestor,{ a: ['fixture-company'] },clock).commit(batch(),[{ facts: [fact()] }],{ ...evidence,completeness: 'complete_scope' });
  const caseIds = [];
  for (const measureId of ['revenue','order_count','outstanding_amount'] as const) {
    const caseId = `control-${measureId}`;
    await new PostgresReconciliation(db.ingestor).record([{ caseId,tenantId: 'a',datasetId: 'release',mappingVersion: '1',measureId,sourceReportReference: 'SYNTHETIC EXACT SOURCE CONTROL',frozenRevision: 'freeze-1',batchIds: ['batch-1'],from: '2026-02-01',to: '2026-02-28',grouping: null,groupKey: null,expectedValue: measureId==='revenue' ? wrongValue ? '101.000000' : '100.000000' : '0.000000',actualValue: '0.000000',expectedCount: measureId==='revenue' ? '1' : '0',actualCount: '0',tolerance: { status: 'approved',absoluteValue: '0.000000',absoluteCount: '0',approvalReference: 'SYNTHETIC ZERO TOLERANCE' } }],'IQD');
    caseIds.push(caseId);
  }
  return caseIds;
}
async function authorize(db: Awaited<ReturnType<typeof database>>,caseIds: string[]) {
  await certify(db.migrator,{ ...scope,caseIds,from: '2026-02-01',to: '2026-02-28',measureId: 'revenue',value: '100.000000' });
  await new PostgresMappingReleases(db.migrator).approve({ ...scope,caseIds,reference: 'SYNTHETIC TEST ONLY',approvedAt: clock().toISOString() });
}

test('authorized exact certification is immutable; promotion preserves facts, is atomic/idempotent and needs explicit binding', { skip: !enabled },async () => {
  const source = await database(), target = await database();
  const promotion = new PostgresReleasePromotion(source.migrator,target.migrator);
  const repository = new PostgresAnalyticsRepository(target.runtime,{ reportingCurrencies: { a: 'IQD' } });
  try {
    const caseIds = await reconcile(source);
    await assert.rejects(promotion.promote(scope),/Approved certified/);
    await assert.rejects(promotion.bind(scope),/Approved certified/);
    await assert.rejects(new PostgresMappingReleases(source.migrator).approve({ ...scope,caseIds,approvedAt: clock().toISOString() }),/business certification/);
    await authorize(source,caseIds);
    await assert.rejects(tenantTransaction(source.migrator,'a',client => client.query('DELETE FROM mart.release_certifications')),/Immutable/);
    await assert.rejects(tenantTransaction(source.migrator,'a',client => client.query("UPDATE mart.release_certifications SET recorded_by='forged'")),/Immutable/);
    assert.equal((await tenantTransaction(source.migrator,'a',client => client.query('SELECT recorded_by FROM mart.release_certifications'),true)).rows[0].recorded_by,'foundation_test_migrator');
    await assert.rejects(tenantTransaction(source.ingestor,'a',client => client.query('INSERT INTO mart.release_certifications SELECT * FROM mart.release_certifications')),/permission/);
    const before = await tenantTransaction(source.migrator,'a',client => readReleaseRows(client,scope),true);
    const result = await promotion.promote(scope);
    assert.equal(result.alreadyPromoted,false);
    assert.equal(result.fingerprint,releaseFingerprint(before));
    assert.deepEqual(await tenantTransaction(target.migrator,'a',client => readReleaseRows(client,scope),true),before);
    await assert.rejects(repository.execute({ metric: 'revenue' },{ tenantId: 'a',locale: 'en' }),/binding/);
    assert.equal((await promotion.promote(scope)).alreadyPromoted,true);
    assert.equal(await promotion.bind(scope),'a/release');
    assert.equal((await repository.execute({ metric: 'revenue' },{ tenantId: 'a',locale: 'en' })).rows[0]!.value,100);
    assert.equal((await tenantTransaction(target.runtime,'other',client => client.query('SELECT * FROM mart.canonical_facts'),true)).rowCount,0);
    await assert.rejects(repository.execute({ metric: 'revenue' },{ tenantId: 'other',locale: 'en' }),/binding/);
    assert.equal((await promotion.promote(scope)).alreadyPromoted,true);
  } finally { await Promise.all([source.close(),target.close()]); }
});

test('human approval cannot override failed reconciliation; failed transfer rolls back target publication', { skip: !enabled },async () => {
  const source = await database(), target = await database(), failed = await database();
  try {
    const failedIds = await reconcile(failed,true);
    await assert.rejects(authorize(failed,failedIds),/exact completed reconciliation/);
    assert.equal((await tenantTransaction(failed.migrator,'a',client => client.query('SELECT * FROM mart.release_certifications'),true)).rowCount,0);
    const caseIds = await reconcile(source);
    await authorize(source,caseIds);
    await target.admin.query(`CREATE FUNCTION mart.fail_transfer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC TRANSFER FAILURE'; END $$;
      CREATE TRIGGER synthetic_failure BEFORE INSERT ON mart.fact_revisions FOR EACH ROW EXECUTE FUNCTION mart.fail_transfer()`);
    await assert.rejects(new PostgresReleasePromotion(source.migrator,target.migrator).promote(scope),/SYNTHETIC TRANSFER FAILURE/);
    for (const table of ['mapping_releases','ingestion_batches','fact_revisions','release_promotions','serving_bindings']) {
      assert.equal((await tenantTransaction(target.migrator,'a',client => client.query(`SELECT * FROM mart.${table}`),true)).rowCount,0);
    }
  } finally { await Promise.all([source.close(),target.close(),failed.close()]); }
});

test('certification cannot hide failed controls from the same frozen dataset and period', { skip: !enabled },async () => {
  const db = await database();
  try {
    const caseIds = await reconcile(db);
    const original = (await tenantTransaction(db.migrator,'a',client => client.query("SELECT specification FROM mart.reconciliation_evidence WHERE case_id='control-revenue'"),true)).rows[0].specification;
    await new PostgresReconciliation(db.ingestor).record([{ ...original,caseId: 'failed-extra-control',expectedValue: '101.000000' }],'IQD');
    await assert.rejects(authorize(db,caseIds),/Failed technical evidence cannot be omitted/);
  } finally { await db.close(); }
});
