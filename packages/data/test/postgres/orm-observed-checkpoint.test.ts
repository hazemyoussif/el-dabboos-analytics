import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {syncFixture,acceptedState} from './sync-fixture.ts';
import {TrustedAnalyticsRepository} from '../../src/operational/repository.ts';

test('observed API provenance survives checkpointed promotion and repeat receipts do not create business revisions',{skip:!enabled},async()=>{
 const fixture=await syncFixture();
 try {
  fixture.snapshot.revision='orm-observed-copy-v1:synthetic-test';
  fixture.state.changed=fixture.state.changed.map(fact=>({...fact,sourceVersion:`orm-observed:${fact.sourceRecordId}`,sourceRevision:'2000'}));
  fixture.state.population=fixture.state.changed;
  const result=await fixture.run();assert.equal(result.status,'passed');
  const repository=new TrustedAnalyticsRepository(fixture.db.runtime,{reportingCurrencies:{a:'IQD'}});
  const query={metric:'revenue' as const,dateRange:{from:'2026-01-01',to:'2026-01-31'}};
  const value=await repository.execute(query,{tenantId:'a',locale:'en'});
  assert.equal(value.metadata.sourceConsistency,'api_observed');
  const before=(await fixture.db.admin.query('SELECT count(*) count FROM mart.analytics_fact_revisions')).rows[0].count;
  fixture.snapshot.cutoff='2026-03-02T00:00:00.000Z';
  fixture.state.changed=fixture.state.changed.map(fact=>({...fact,sourceRevision:'3000'}));
  assert.equal((await fixture.run()).status,'unchanged');
  assert.equal((await fixture.db.admin.query('SELECT count(*) count FROM mart.analytics_fact_revisions')).rows[0].count,before);
 }finally{await fixture.db.close();}
});

test('failed final API recheck rolls back the complete checkpoint capture and retains accepted reads',{skip:!enabled},async()=>{
 const fixture=await syncFixture();
 try{
  const before=await acceptedState(fixture.db);
  fixture.snapshot.revision='orm-observed-copy-v1:unstable-test';
  fixture.snapshot.close=async()=>{throw new Error('Odoo ORM inputs changed during import');};
  await assert.rejects(fixture.run(),/changed during import/);
  assert.deepEqual(await acceptedState(fixture.db),before);
  assert.equal((await fixture.db.admin.query('SELECT count(*)::int count FROM mart.analytics_sync_seals')).rows[0].count,0);
 }finally{await fixture.db.close();}
});

