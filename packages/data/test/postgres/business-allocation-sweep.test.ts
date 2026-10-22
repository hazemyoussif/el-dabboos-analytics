import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {deltaFixture} from './business-delta-fixture.ts';
import {reviewSourceFixture} from './review-source-fixture.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {OdooSnapshotLease} from '../../src/odoo/snapshot.ts';
import {sweepBusinessAllocations} from '../../src/business/allocation-sweep.ts';
import type {RecordedAllocationDeletion} from '../../src/operational/contracts.ts';

test('Business allocation sweep checks recorded identities in company scope and rejects missing prior edges',{skip:!enabled},async()=>{
 const {db,accepted}=await deltaFixture(false);let lease:OdooSnapshotLease|undefined;
 try{
  await db.admin.query(reviewSourceFixture);
  await db.admin.query(`TRUNCATE account_partial_reconcile;
   INSERT INTO account_partial_reconcile(id,company_id) VALUES(10,1),(11,2),(99,1)`);
  const links={debitLineId:'100',creditLineId:'200',debitMoveId:'10',creditMoveId:'20'};
  await tenantTransaction(db.ingestor,'a',client=>client.query(`INSERT INTO mart.business_allocation_links
   SELECT tenant_id,source_id,'11',source_cutoff,source_revision,partition_id,'2026-10-01',$2::jsonb
   FROM mart.review_extractions WHERE tenant_id='a' AND partition_id=$1`,[accepted.partitionId,JSON.stringify(links)]));
  const config={tenantId:'a',sourceId:'fixture',companyIds:['1'],batchSize:2,statementTimeoutMs:15000,snapshotMaxDurationMs:60000,connection:{}};
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  const removed:RecordedAllocationDeletion[]=[];
  const evidence=await tenantTransaction(db.ingestor,'a',client=>sweepBusinessAllocations(client,{pool:db.admin,config,lease:lease!,partitionId:accepted.partitionId,
   previousCutoff:'2026-10-20T09:00:00.000Z'},async records=>{removed.push(...records);}));
  assert.deepEqual(evidence,{checked:2,missing:1,coverage:'recorded-identities-only'});
  assert.deepEqual(removed.map(record=>record.id),['11'],'company-2 presence cannot satisfy a company-1 identity');
  assert.deepEqual(removed[0]?.allocationLinks,links);
  assert.equal(removed[0]?.linksCutoff,'2026-10-20T09:00:00.000Z');
  assert.equal((await tenantTransaction(db.ingestor,'b',client=>client.query('SELECT * FROM mart.business_allocation_links'),true)).rowCount,0);
  await lease.close();lease=undefined;
  await db.admin.query('DELETE FROM account_partial_reconcile WHERE id=10');
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>sweepBusinessAllocations(client,{pool:db.admin,config,lease:lease!,partitionId:accepted.partitionId,
   previousCutoff:'2026-10-20T09:00:00.000Z'},async()=>{})),/lacks accepted prior links/);
 }finally{await lease?.close();await db.close();}
});
