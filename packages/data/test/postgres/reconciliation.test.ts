import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReconciliationCase } from '@el-dabboos/domain';
import { PostgresReconciliation } from '../../src/postgres/reconciliation.ts';
import { PostgresMartWriter } from '../../src/postgres/writer.ts';
import { database,enabled } from './support.ts';
import { deploy,mapping,batch,fact,evidence,clock } from './fixtures.ts';
test('reconciliation: frozen revisions survive later corrections, exact decimals, pending tolerance and group completeness', { skip: !enabled },async () => {
  const db = await database(); const writer = new PostgresMartWriter(db.ingestor,{ a: ['fixture-company'] },clock); const reconcile = new PostgresReconciliation(db.ingestor);
  const control: ReconciliationCase = { caseId: 'pending',tenantId: 'a',datasetId: 'release',mappingVersion: '1',measureId: 'revenue',sourceReportReference: 'synthetic-report-only',frozenRevision: 'freeze-1',batchIds: ['batch-1'],from: '2026-02-01',to: '2026-02-28',grouping: 'branch',groupKey: 'cairo',expectedValue: '100.000001',actualValue: '0.000000',expectedCount: '1',actualCount: '0',tolerance: { status: 'pending' } };
  try {
    await deploy(db.migrator,mapping());
    await writer.commit(batch(),[{ facts: [fact('one',{ value: '100.000001' })] }],{ ...evidence,completeness: 'complete_scope' });
    const pending = await reconcile.record([control],'IQD'); assert.equal(pending.status,'reported'); assert.equal(pending.cases[0]?.actualValue,'100.000001');
    const approved = { ...control,caseId: 'approved',tolerance: { status: 'approved' as const,absoluteValue: '0.000000',absoluteCount: '0',approvalReference: 'SYNTHETIC TEST ONLY' } };
    assert.equal((await reconcile.record([approved],'IQD')).status,'passed');
    await writer.commit({ ...batch('update'),watermarkStart: 'fixture-end',sourceAsOf: '2026-10-01T11:00:00.000Z',frozenRevision: 'freeze-2' },[{ facts: [fact('one',{ batchId: 'update',sourceAsOf: '2026-10-01T11:00:00.000Z',frozenRevision: 'freeze-2',sourceRevision: '2',sourceVersion: 'v2',value: '200.000001' })] }],evidence);
    assert.equal((await reconcile.record([{ ...approved,caseId: 'historical' }],'IQD')).cases[0]?.actualValue,'100.000001');
    assert.equal((await reconcile.record([{ ...approved,caseId: 'current',batchIds: ['batch-1','update'],frozenRevision: 'freeze-2',expectedValue: '200.000001' }],'IQD')).status,'passed');
    const missing = await reconcile.record([{ ...approved,caseId: 'missing',groupKey: 'missing',expectedValue: '0.000000',expectedCount: '0' }],'IQD');
    assert.equal(missing.status,'failed'); assert.deepEqual(missing.missingGroups,['missing']); assert.deepEqual(missing.unexpectedGroups,['cairo']);
    await assert.rejects(reconcile.record([{ ...approved,caseId: 'no-baseline',batchIds: ['update'],frozenRevision: 'freeze-2' }],'IQD'), /baseline/);
    await assert.rejects(reconcile.record([{ ...approved,caseId: 'bad-release',mappingVersion: '2' }],'IQD'), /release/);
    await assert.rejects(reconcile.record([{ ...approved,caseId: 'bad-currency' }],'EGP'), /currency/);
    assert.equal((await db.admin.query("SELECT specification->>'actualValue' v FROM mart.reconciliation_evidence WHERE case_id='historical'")).rows[0].v,'100.000001');
    assert.equal((await db.admin.query('SELECT count(*) n FROM mart.reconciliation_batches')).rows[0].n,'6');
  } finally { await db.close(); }
});
