import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {reviewSourceFixture} from './review-source-fixture.ts';
import {OdooSnapshotLease} from '../../src/odoo/snapshot.ts';
import {commandAllocationChanges,commandAllocationDiscoveryCutoff} from '../../src/business/allocation-changes.ts';

test('allocation discovery catches the gap when a full recipe refresh is newer than its graph, while retaining older recipe dependencies',{skip:!enabled},async()=>{
 const db=await database(false);let lease:OdooSnapshotLease|undefined;
 try{
  await db.admin.query(reviewSourceFixture);
  await db.admin.query("ALTER TABLE account_partial_reconcile ADD COLUMN create_date timestamp DEFAULT '2026-09-25 08:00:00',ADD COLUMN write_date timestamp DEFAULT '2026-09-25 09:00:00'");
  const config={tenantId:'a',sourceId:'fixture',companyIds:['1'],batchSize:2,statementTimeoutMs:15000,snapshotMaxDurationMs:60000,connection:{}};
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  for(const [recipe,graph] of [['2026-09-26T00:00:00Z','2026-09-24T00:00:00Z'],['2026-09-24T00:00:00Z','2026-09-26T00:00:00Z']]){
   const ids:string[]=[];
   for await(const page of commandAllocationChanges({pool:db.admin,config,lease,cutoff:commandAllocationDiscoveryCutoff(recipe!,new Date(graph!))}))ids.push(...page.map(change=>change.id));
   assert.deepEqual(ids.sort(),['1','2'],'neither the recipe cursor nor the graph cursor may hide a pending edge');
  }
 }finally{await lease?.close();await db.close();}
});
