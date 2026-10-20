import test from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import type {AnalyticsPartition} from '@el-dabboos/domain';
import {readExactEventControls} from '../src/operational/source-controls.ts';
import type {OperationalBaseline} from '../src/operational/contracts.ts';
import type {OdooSnapshotLease} from '../src/odoo/snapshot.ts';
import type {OdooSourceConfig} from '../src/odoo/config.ts';
import {mapping} from './postgres/fixtures.ts';

test('large historical source-control scope is fully captured through bounded queries',async()=>{
 const sizes:number[]=[];let imported=false,verified=false,released=false;
 const client={query:async(text:string,values?:unknown[])=>{
  if(!text.startsWith('SELECT to_char'))return {rows:[]};
  assert.equal(imported,true);
  const identities=values![4] as string[];sizes.push(identities.length);
  assert.ok(identities.length<=5000);
  return {rows:identities.map(key=>({period:'2026-01',key,value:'1.000000',count:'1'}))};
 },release:()=>{released=true;}};
 const pool={connect:async()=>client} as unknown as Pool;
 const lease={importInto:async()=>{imported=true;},assertAlive:async()=>{verified=true;}} as unknown as OdooSnapshotLease;
 const config:OdooSourceConfig={tenantId:'a',sourceId:'fixture',companyIds:['1'],connection:{},batchSize:500,statementTimeoutMs:15000,snapshotMaxDurationMs:600000};
 const approved=mapping();approved.measures=[{...approved.measures[0]!,measureId:'order_revenue',sourceObject:'sale_order'}];
 const baseline={mappings:[approved],sourceId:'fixture'} as OperationalBaseline;
 const partitions:AnalyticsPartition[]=Array.from({length:5001},(_,index)=>({metric:'order_revenue',month:'2026-01',dimension:'customer',identity:`fixture:${index}`,dependency:'base'}));
 const controls=await readExactEventControls(pool,lease,config,baseline,partitions);
 assert.deepEqual(sizes,[5000,1]);assert.equal(controls.length,partitions.length);
 assert.deepEqual(controls.map(control=>control.partition.identity),partitions.map(partition=>partition.identity));
 assert.ok(controls.every(control=>control.value==='1.000000'&&control.count==='1'));
 assert.equal(verified,true);assert.equal(released,true);
});
