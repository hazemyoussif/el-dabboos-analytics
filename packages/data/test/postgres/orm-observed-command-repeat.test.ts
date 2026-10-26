import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {deltaFixture,deltaSource,storedCounts,changedInvoice} from './business-delta-fixture.ts';
import {exposeBusinessDeltaMonth,exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

const revision='orm-observed-copy-v1:'+'a'.repeat(64),cutoff='2026-10-20T09:00:00.000Z';
test('repeated Command checks of one sealed API copy retain accepted rows, observations and publication',{skip:!enabled},async()=>{
 const {db,source,accepted}=await deltaFixture(true,revision);
 try{
  const before=await storedCounts(db);
  const delta={...deltaSource(source,cutoff,[]),revision};
  for(let repeat=0;repeat<2;repeat++){
   const result=await exposeBusinessDeltaMonth(db.ingestor,delta);
   assert.equal(result.unchanged,true);assert.equal(result.revisionId,accepted.revisionId);
  }
  assert.deepEqual(await storedCounts(db),before);
  assert.equal((await tenantTransaction(db.ingestor,'a',client=>client.query('SELECT count(*)::int count FROM mart.business_recipe_checks'),true)).rows[0].count,0);
  await assert.rejects(exposeBusinessDeltaMonth(db.ingestor,{...delta,revision:'orm-observed-copy-v1:'+'b'.repeat(64)}),/Newer review source cutoff/);
  await assert.rejects(exposeBusinessDeltaMonth(db.ingestor,{...delta,cutoff:'2026-10-20T08:00:00Z'}),/Newer review source cutoff/);
  await assert.rejects(exposeReviewMonth(db.ingestor,{...source,cutoff,revision},'business'),/Newer review source cutoff/);
 }finally{await db.close();}
});
test('same-copy API delta still requires independent exact identity controls',{skip:!enabled},async()=>{
 const {db,source,initial}=await deltaFixture(true,revision);
 try{
  const before=await storedCounts(db),facts=changedInvoice(initial,cutoff).map(fact=>({...fact,frozenRevision:revision}));
  const delta={...deltaSource(source,cutoff,[{object:'command_invoice',id:'10',facts}]),revision,identityControls:async()=>[]};
  await assert.rejects(exposeBusinessDeltaMonth(db.ingestor,delta),/Business delta independent identity controls do not match/);
  assert.deepEqual(await storedCounts(db),before);
 }finally{await db.close();}
});
test('same-copy dependency observations reuse immutable allocation links without duplicating them',{skip:!enabled},async()=>{
 const {db,source}=await deltaFixture(true,revision);
 try{
  const links={debitLineId:'100',creditLineId:'200',debitMoveId:'10',creditMoveId:'20'};
  const changes=async function*(dependencyLinks=links){yield [{id:'10',from:'2026-10-01',createdAt:'2026-10-20T08:00:00.000000Z',updatedAt:'2026-10-20T08:00:00.000000Z',links:dependencyLinks}];};
  for(let repeat=0;repeat<2;repeat++){
   const delta={...deltaSource(source,cutoff,[],['command_order']),revision,allocationChanges:changes()};
   assert.equal((await exposeBusinessDeltaMonth(db.ingestor,delta)).unchanged,true);
  }
  await assert.rejects(exposeBusinessDeltaMonth(db.ingestor,{...deltaSource(source,cutoff,[],['command_order']),revision,allocationChanges:changes({...links,debitMoveId:'30'})}),/duplicate key/);
  const result=await tenantTransaction(db.ingestor,'a',client=>client.query('SELECT allocation_links FROM mart.business_allocation_links'),true);
  assert.deepEqual(result.rows,[{allocation_links:links}]);
  assert.equal((await tenantTransaction(db.ingestor,'b',client=>client.query('SELECT 1 FROM mart.business_allocation_links'),true)).rowCount,0);
 }finally{await db.close();}
});
