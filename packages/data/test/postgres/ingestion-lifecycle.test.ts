import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExtractionRun, ReconciliationCase } from '@el-dabboos/domain';
import { PostgresMappingReleases } from '../../src/postgres/mapping-releases.ts';
import { PostgresExtractionRuns } from '../../src/postgres/extractions.ts';
import type { ExtractionEvidence } from '../../src/postgres/writer.ts';
import { PostgresMartWriter } from '../../src/postgres/writer.ts';
import { PostgresAnalyticsRepository } from '../../src/postgres/repository.ts';
import { PostgresReconciliation } from '../../src/postgres/reconciliation.ts';
import { reconcileExtraction } from '../../src/postgres/extraction-reconciliation.ts';
import { tenantTransaction } from '../../src/postgres/session.ts';
import { database, enabled } from './support.ts';
import { mapping, batch, fact, evidence, clock } from './fixtures.ts';
const partialEvidence: ExtractionEvidence = { sourceObjects: ['fixture'],requestLimit: 1000,completeness: 'incremental',deletionEvidence: 'explicit',paginationComplete: false };
const run: ExtractionRun = { tenantId: 'a',sourceId: 'fixture',companyIds: ['fixture-company'],datasetId: 'release',mappingId: 'synthetic',mappingVersion: '1',extractionId: 'september',sourceObjects: ['fixture'],from: '2026-09-01',to: '2026-09-30',sourceAsOf: '2026-10-01T10:00:00.000Z',frozenRevision: 'freeze-1',freezeReference: 'IMMUTABLE SYNTHETIC SOURCE',completeness: 'complete_scope' };
const expected: Omit<ReconciliationCase,'batchIds'> = { caseId: 'september-control',tenantId: 'a',datasetId: 'release',mappingVersion: '1',measureId: 'revenue',sourceReportReference: 'SYNTHETIC CANDIDATE DB CONTROL ONLY',frozenRevision: 'freeze-1',from: '2026-09-01',to: '2026-09-30',grouping: null,groupKey: null,expectedValue: '1460597500.000000',actualValue: '0.000000',expectedCount: '2893',actualCount: '0',tolerance: { status: 'approved',absoluteValue: '0.000000',absoluteCount: '0',approvalReference: 'SYNTHETIC EXACT CONTROL ONLY' } };

test('candidate lifecycle: 2,893 records, bounded atomic pages, crash resume, exact frozen controls, approval and tenant gates', { skip: !enabled },async () => {
  const db = await database();
  const releases = new PostgresMappingReleases(db.migrator);
  const runs = new PostgresExtractionRuns(db.ingestor,{ a: ['fixture-company'] });
  const writer = new PostgresMartWriter(db.ingestor,{ a: ['fixture-company'] },clock);
  const repo = new PostgresAnalyticsRepository(db.runtime,{ reportingCurrencies: { a: 'IQD' } });
  const approval = { tenantId: 'a',datasetId: 'release',caseIds: [expected.caseId],reference: 'SYNTHETIC TEST ONLY',approvedAt: clock().toISOString() };
  try {
    const candidate = { ...mapping(),approval: { status: 'pending' as const } };
    await releases.registerCandidate(candidate);
    const original = (await db.admin.query('SELECT specification FROM mart.mapping_releases')).rows[0].specification;
    await assert.rejects(tenantTransaction(db.migrator,'a',client => client.query("UPDATE mart.mapping_releases SET business_basis='changed'")),/immutable/);
    await assert.rejects(tenantTransaction(db.migrator,'a',client => client.query("UPDATE mart.mapping_releases SET specification=jsonb_set(specification,'{businessBasis}','\"changed\"')")),/immutable/);
    await assert.rejects(releases.approve(approval),/successful/);
    await assert.rejects(tenantTransaction(db.migrator,'a',client => client.query("INSERT INTO mart.serving_bindings VALUES ('a','release')")),/approved reconciled/);
    await assert.rejects(new PostgresMappingReleases(db.ingestor).registerCandidate({ ...candidate,datasetId: 'forbidden' }),/permission/);
    await assert.rejects(runs.begin({ ...run,companyIds: ['foreign'] }),/company/);
    assert.equal((await runs.begin(run)).pageCount,0);
    await assert.rejects(runs.begin({ ...run,to: '2026-10-01' }),/identity conflict/);
    const pageRecords = (start: number,length: number,batchId: string) => Array.from({ length },(_,index) => ({ facts: [fact(String(start+index),{ batchId,businessDate: '2026-09-15',value: start+index===2893 ? '14597500.000000' : '500000.000000' })] }));
    const firstBatch = batch('page-1',1000);
    const firstEvidence = { ...partialEvidence,completeness: 'complete_scope' as const,page: { extractionId: run.extractionId,pageNumber: 1,cursorEnd: '1000' } };
    const first = await writer.commit(firstBatch,pageRecords(1,1000,'page-1'),firstEvidence);
    assert.deepEqual(await writer.commit(firstBatch,pageRecords(1,1000,'page-1'),firstEvidence),first);
    assert.deepEqual(await writer.commit({ ...firstBatch,startedAt: '2026-10-01T11:00:00.000Z' },pageRecords(1,1000,'page-1'),firstEvidence),first);
    await assert.rejects(writer.commit(firstBatch,pageRecords(2,1000,'page-1'),firstEvidence),/replay conflict/);
    await assert.rejects(reconcileExtraction(db.ingestor,run.extractionId,[expected],'IQD'),/Completed/);
    await assert.rejects(repo.execute({ metric: 'revenue' },{ tenantId: 'a',locale: 'en' }),/binding/);
    const secondEvidence = { ...firstEvidence,cursorStart: '1000',page: { extractionId: run.extractionId,pageNumber: 2,cursorEnd: '2000' } };
    const bad = pageRecords(1001,1000,'page-2');
    bad[900]!.facts[0]!.sourceRecordId = '1';
    bad[900]!.facts[0]!.value = '999.000000';
    bad[900]!.facts[0]!.currency!.transactionValue = '999.000000';
    await assert.rejects(writer.commit(batch('page-2',1000),bad,secondEvidence),/identity_conflict/);
    const resumed = await new PostgresExtractionRuns(db.ingestor,{ a: ['fixture-company'] }).resume('a',run.extractionId);
    assert.equal(resumed.checkpoint.cursor,'1000'); assert.equal(resumed.checkpoint.rowCount,1000);
    assert.equal((await db.admin.query("SELECT count(*) total FROM mart.ingestion_batches WHERE batch_id='page-2'")).rows[0].total,'0');
    assert.equal((await db.admin.query('SELECT count(*) total FROM mart.fact_revisions')).rows[0].total,'1000');
    await writer.commit(batch('page-2',1000),pageRecords(1001,1000,'page-2'),secondEvidence);
    await assert.rejects(writer.commit(batch('oversized',1001),pageRecords(2001,1001,'oversized'),{ ...secondEvidence,page: { extractionId: run.extractionId,pageNumber: 3,cursorEnd: '3001' },cursorStart: '2000' }),/bounded/);
    await writer.commit(batch('page-3',893),pageRecords(2001,893,'page-3'),{ ...evidence,completeness: 'complete_scope',cursorStart: '2000',page: { extractionId: run.extractionId,pageNumber: 3,cursorEnd: '2893' } });
    const completed = await runs.resume('a',run.extractionId);
    assert.equal(completed.checkpoint.status,'complete'); assert.equal(completed.checkpoint.pageCount,3); assert.equal(completed.checkpoint.rowCount,2893); assert.equal(completed.checkpoint.cursor,'2893');
    await assert.rejects(writer.commit(batch('after-terminal',0),[],{ ...evidence,completeness: 'complete_scope',cursorStart: '2893',page: { extractionId: run.extractionId,pageNumber: 4 } }),/checkpoint/);
    await assert.rejects(new PostgresReconciliation(db.ingestor).record([{ ...expected,batchIds: ['page-1','page-3'] }],'IQD'),/omits pages/);
    await assert.rejects(reconcileExtraction(db.ingestor,run.extractionId,[{ ...expected,mappingVersion: 'wrong' }],'IQD'),/release/);
    const result = await reconcileExtraction(db.ingestor,run.extractionId,[expected],'IQD');
    assert.equal(result.status,'passed'); assert.equal(result.cases[0]!.actualValue,expected.expectedValue);
    assert.equal(result.cases[0]!.actualCount,'2893');
    await assert.rejects(new PostgresMappingReleases(db.ingestor).approve(approval),/permission/);
    await assert.rejects(releases.approve(approval),/every mapping measure/);
    const caseIds = [expected.caseId];
    for (const measureId of ['order_count','outstanding_amount'] as const) {
      const control = { ...expected,caseId: `unused-${measureId}`,measureId,expectedValue: '0.000000',expectedCount: '0' };
      assert.equal((await reconcileExtraction(db.ingestor,run.extractionId,[control],'IQD')).status,'passed');
      caseIds.push(control.caseId);
    }
    await releases.approve({ ...approval,caseIds });
    assert.deepEqual((await db.admin.query('SELECT specification FROM mart.mapping_releases')).rows[0].specification,original);
    assert.equal((await db.runtime.query('SELECT * FROM mart.fact_revisions')).rowCount,0);
    await tenantTransaction(db.migrator,'a',client => client.query("INSERT INTO mart.serving_bindings VALUES ('a','release')")); // Synthetic test only.
    assert.equal((await repo.execute({ metric: 'revenue' },{ tenantId: 'a',locale: 'en' })).rows[0]!.value,1460597500);
    assert.equal((await tenantTransaction(db.runtime,'other',client => client.query('SELECT * FROM mart.canonical_facts'),true)).rowCount,0);
  } finally { await db.close(); }
});

test('serving retains completed revisions while correction pages are incomplete, including replayed revisions', { skip: !enabled },async () => {
  const { deploy } = await import('./fixtures.ts');
  const db = await database();
  const writer = new PostgresMartWriter(db.ingestor,{ a: ['fixture-company'] },clock);
  const runs = new PostgresExtractionRuns(db.ingestor,{ a: ['fixture-company'] });
  const repo = new PostgresAnalyticsRepository(db.runtime,{ reportingCurrencies: { a: 'IQD' } });
  try {
    await deploy(db.migrator,mapping());
    await writer.commit(batch('baseline'),[{ facts: [fact('one',{ batchId: 'baseline',businessDate: '2026-09-15' })] }],{ ...evidence,completeness: 'complete_scope' });
    await runs.begin({ ...run,extractionId: 'correction',completeness: 'incremental' });
    const corrected = fact('one',{ batchId: 'correction-page',businessDate: '2026-09-15',sourceVersion: 'v2',sourceRevision: '2',value: '200.000000' });
    const pageEvidence = { ...partialEvidence,completeness: 'incremental' as const,page: { extractionId: 'correction',pageNumber: 1,cursorEnd: 'one' } };
    await writer.commit(batch('correction-page'),[{ facts: [corrected] }],pageEvidence);
    assert.equal((await repo.execute({ metric: 'revenue' },{ tenantId: 'a',locale: 'en' })).rows[0]!.value,100);
    assert.equal((await tenantTransaction(db.runtime,'a',client => client.query("SELECT * FROM mart.fact_revisions WHERE source_revision=2"),true)).rowCount,0);
    assert.equal((await tenantTransaction(db.runtime,'a',client => client.query("SELECT * FROM mart.ingestion_batches WHERE batch_id='correction-page'"),true)).rowCount,0);
    await writer.commit(batch('empty-terminal',0),[],{ ...evidence,cursorStart: 'one',page: { extractionId: 'correction',pageNumber: 2 } });
    assert.equal((await repo.execute({ metric: 'revenue' },{ tenantId: 'a',locale: 'en' })).rows[0]!.value,200);
    await runs.begin({ ...run,extractionId: 'replay',completeness: 'incremental' });
    await writer.commit(batch('replayed'),[{ facts: [{ ...corrected,batchId: 'replayed' }] }],{ ...evidence,page: { extractionId: 'replay',pageNumber: 1,cursorEnd: 'one' } });
    assert.equal((await repo.execute({ metric: 'revenue' },{ tenantId: 'a',locale: 'en' })).rows[0]!.value,200);
    await assert.rejects(runs.resume('other','replay'),/Unknown/);
  } finally { await db.close(); }
});
