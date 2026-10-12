import test from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {promoteFinancePartition} from '../src/operational/snapshot-promotion.ts';

test('Finance promotion refuses a lost trusted-pointer compare-and-set',async()=>{
 const client={query:async(sql:string)=>sql.startsWith('SELECT revision_id')?{rows:[{revision_id:'parent'}],rowCount:1}:{rows:[],rowCount:sql.startsWith('UPDATE mart.analytics_trusted_serving')?0:1}} as unknown as PoolClient;
 await assert.rejects(promoteFinancePartition(client,{tenantId:'synthetic',snapshotId:'exact',date:'2026-09-30',cutoff:'2026-10-01T00:00:00Z'}),/Trusted snapshot parent conflict/);
});
