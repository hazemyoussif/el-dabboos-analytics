import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {commandSyncMembers} from '../../src/business/command-sync.ts';

test('Command sync startup selects accepted legacy and extended Business members in month order without source access',{skip:!enabled},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const legacy=await exposeReviewMonth(db.ingestor,fixture('2026-09',false,'business'),'business');
  const extended=await exposeReviewMonth(db.ingestor,fixture('2026-10',true,'business',true),'business');
  const members=await commandSyncMembers(db.ingestor,'a');
  assert.deepEqual(members.map(member=>({month:member.month,partitionId:member.partitionId,mappingId:member.mapping.mappingId})),[
   {month:'2026-09',partitionId:legacy.partitionId,mappingId:'business-purpose-v1'},
   {month:'2026-10',partitionId:extended.partitionId,mappingId:'business-purpose-v1-sales-command'},
  ]);
  assert.ok(members.every(member=>Number.isFinite(Date.parse(member.cutoff))));
  assert.deepEqual(await commandSyncMembers(db.ingestor,'b'),[]);
 }finally{await db.close();}
});
