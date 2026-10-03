import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresMartWriter } from '../../src/postgres/writer.ts';
import { tenantTransaction } from '../../src/postgres/session.ts';
import { database, enabled } from './support.ts';
import { deploy, mapping, batch, fact, evidence, clock } from './fixtures.ts';

test('writer: replay, conflict/stale refusal, immutable corrections, deletes, currency and atomic retry', { skip: !enabled }, async () => {
  const db = await database();
  const writer = new PostgresMartWriter(db.ingestor,{ a: ['fixture-company'] },clock);
  try {
    await deploy(db.migrator,mapping());
    const first = await writer.commit(batch(),[{ facts: [fact()] }],evidence);
    assert.equal(first.factsInserted,1); assert.equal(first.watermarkEnd,'fixture-end');
    assert.deepEqual(await writer.commit(batch(),[{ facts: [fact()] }],evidence),first);
    const replay = await writer.commit(batch('replay'),[{ facts: [fact('one',{ batchId: 'replay' })] }],evidence);
    assert.equal(replay.factsReplayed,1);
    await assert.rejects(writer.commit(batch('conflict'),[{ facts: [fact('one',{ batchId: 'conflict', value: '101.000000' })] }],evidence), /identity_conflict/);
    await writer.commit(batch('update'),[{ facts: [fact('one',{ batchId: 'update',sourceRevision: '2',sourceVersion: 'v2',businessDate: '2026-03-01',value: '-50.000000' })] }],evidence);
    await assert.rejects(writer.commit(batch('stale'),[{ facts: [fact('one',{ batchId: 'stale' })] }],evidence), /stale_revision/);
    // An earlier write in this transaction must roll back when a later identity conflicts.
    await assert.rejects(writer.commit(batch('crash',2),[{ facts: [fact('aaa',{ batchId: 'crash' })] },{ facts: [fact('one',{ batchId: 'crash',sourceRevision: '2',sourceVersion: 'v2',value: '500.000000' })] }],evidence));
    assert.equal((await db.admin.query("SELECT count(*) n FROM mart.ingestion_batches WHERE batch_id IN ('conflict','stale','crash')")).rows[0].n,'0');
    assert.equal((await db.admin.query("SELECT count(*) n FROM mart.fact_heads WHERE fact_key LIKE '%aaa%'")).rows[0].n,'0');
    await writer.commit(batch('crash',2),[{ facts: [fact('aaa',{ batchId: 'crash' })] },{ facts: [fact('one',{ batchId: 'crash',sourceRevision: '3',sourceVersion: 'v3',status: 'tombstone' })] }],evidence);
    assert.equal((await tenantTransaction(db.runtime,'a',c => c.query("SELECT sum(value)::text v FROM mart.canonical_facts"),true)).rows[0].v,'100.000000');
    assert.equal((await db.admin.query("SELECT count(*) n FROM mart.fact_revisions WHERE source_record_id='one'")).rows[0].n,'3');
    await assert.rejects(writer.commit({ ...batch('unauthorized'),companyIds: ['foreign'] },[{ facts: [fact('x',{ batchId: 'unauthorized' })] }],evidence), /company/);
    await assert.rejects(writer.commit(batch('partial'),[{ facts: [fact('x',{ batchId: 'partial' })] }],{ ...evidence,paginationComplete: false }), /extraction/);
    const converted = fact('fx',{ batchId: 'fx',currency: { mode: 'converted',transactionCurrency: 'USD',transactionValue: '1.000000',reportingCurrency: 'IQD',policyReference: 'test-native',rate: '100.000000000000',rateDate: '2026-02-15',rateReference: 'test-rate' } });
    await writer.commit(batch('fx'),[{ facts: [converted] }],evidence);
    assert.equal((await db.admin.query("SELECT conversion_rate::text r FROM mart.fact_revisions WHERE source_record_id='fx'")).rows[0].r,'100.000000000000');
  } finally { await db.close(); }
});
test('writer: full fanout replacement, snapshot date correction, persistent ownership conflict rollback', { skip: !enabled }, async () => {
  const db = await database(); const writer = new PostgresMartWriter(db.ingestor,{ a: ['fixture-company'] },clock);
  try {
    await deploy(db.migrator,mapping());
    const a = fact('split',{ componentId: 'A' }); const b = fact('split',{ componentId: 'B' });
    await writer.commit(batch(),[{ facts: [a,b] }],evidence);
    const next = (f: typeof a, status = f.status): typeof a => ({ ...f,batchId: 'split-2',sourceVersion: 'v2',sourceRevision: '2',status });
    await assert.rejects(writer.commit(batch('split-2'),[{ facts: [next(a)] }],evidence), /explicit tombstone/);
    await writer.commit(batch('split-2'),[{ facts: [next(a),next(b,'tombstone')] }],evidence);
    const s = fact('snapshot',{ measureId: 'outstanding_amount',batchId: 'snapshot' });
    await writer.commit(batch('snapshot'),[{ facts: [s] }],evidence);
    const tombstone = { ...s,batchId: 'move',sourceVersion: 'v2',sourceRevision: '2',status: 'tombstone' as const };
    const moved = { ...tombstone,businessDate: '2026-02-16',status: 'active' as const };
    await writer.commit(batch('move'),[{ facts: [tombstone,moved] }],evidence);
    assert.equal((await db.admin.query("SELECT count(*) n FROM mart.canonical_facts WHERE kind='snapshot'")).rows[0].n,'1');
    await assert.rejects(writer.commit(batch('collision'),[{ facts: [fact('other',{ measureId: 'outstanding_amount',entityId: 'snapshot',businessDate: '2026-02-16',batchId: 'collision' })] }],evidence), /snapshot/);
    assert.equal((await db.admin.query("SELECT count(*) n FROM mart.ingestion_batches WHERE batch_id='collision'")).rows[0].n,'0');
  } finally { await db.close(); }
});
test('writer: concurrent same-identity ingestion converges and newer/stale races serialize', { skip: !enabled }, async () => {
  const db = await database(); const writer = new PostgresMartWriter(db.ingestor,{ a: ['fixture-company'] },clock);
  try {
    await deploy(db.migrator,mapping());
    const results = await Promise.all(['a','b'].map(id => writer.commit(batch(id),[{ facts: [fact('one',{ batchId: id })] }],evidence)));
    assert.equal(results.reduce((n,b) => n+b.factsInserted,0),1); assert.equal(results.reduce((n,b) => n+b.factsReplayed,0),1);
    const results2 = await Promise.allSettled(['3','2'].map(rev => writer.commit(batch(`rev-${rev}`),[{ facts: [fact('one',{ batchId: `rev-${rev}`,sourceRevision: rev,sourceVersion: `v${rev}` })] }],evidence)));
    assert.ok(results2.some(r => r.status === 'fulfilled'));
    assert.equal((await db.admin.query('SELECT source_revision::text r FROM mart.fact_heads')).rows[0].r,'3');
    const rejects = await writer.commit({ ...batch('reject'),rowsAccepted: 0,rowsRejected: 1 },[{ reject: { tenantId: 'a',batchId: 'reject',sourceId: 'fixture',safeRecordReference: 'hmac_test_only',reason: 'currency',field: 'currency',occurredAt: clock().toISOString() } }],evidence);
    assert.equal(rejects.rowsRejected,1); assert.equal((await db.admin.query('SELECT count(*) n FROM mart.data_quality_rejects')).rows[0].n,'1');
  } finally { await db.close(); }
});
