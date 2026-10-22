import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {reviewSourceFixture} from './review-source-fixture.ts';
import {discoverCommandChanges,commandObjects} from '../../src/business/command-changes.ts';
import {OdooSnapshotLease} from '../../src/odoo/snapshot.ts';

test('Command discovery follows ownership, state exits and recognition dates in bounded company-scoped pages',{skip:!enabled},async()=>{
 const db=await database();let lease:OdooSnapshotLease|undefined;
 try{
  await db.admin.query(reviewSourceFixture);
  for(const table of ['res_company','res_currency','res_partner','res_country_state','res_users','account_account','account_move_line','account_partial_reconcile','account_move','account_payment','sale_order'])
   await db.admin.query(`ALTER TABLE ${table} ADD write_date timestamp DEFAULT '2000-01-01'`);
  await db.admin.query(`ALTER TABLE res_partner ADD user_id int DEFAULT 31,ADD state_id int;
   ALTER TABLE account_payment ADD salesperson_id int DEFAULT 30;
   ALTER TABLE account_move_line ADD salesperson_id int DEFAULT 30;
   INSERT INTO res_users(id,partner_id,write_date) VALUES(31,20,clock_timestamp() AT TIME ZONE 'UTC');
   UPDATE account_move SET state='cancel' WHERE id=1;
   UPDATE account_move_line SET amount_residual=0 WHERE id=100;
   UPDATE account_partial_reconcile SET max_date=current_date+30 WHERE id=1;
   INSERT INTO account_move(id,company_id,invoice_date) VALUES(99,2,current_date);
   INSERT INTO account_move(id,company_id,invoice_date,partner_id) VALUES(98,1,(clock_timestamp() AT TIME ZONE 'Asia/Baghdad')::date,NULL)`);
  const config={tenantId:'a',sourceId:'fixture',companyIds:['1'],batchSize:2,statementTimeoutMs:15000,snapshotMaxDurationMs:60000,connection:{}};
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  const cutoff=new Date(Date.parse(lease.evidence.sourceAsOf)-86400000).toISOString();
  const month=lease.evidence.sourceAsOf.slice(0,7),found=new Map<string,string[]>();
  for(const object of commandObjects){
   const ids:string[]=[];
   await discoverCommandChanges({pool:db.admin,config,lease,object,cutoff,month,timeZone:'Asia/Baghdad',completeSnapshot:false},async page=>{
    assert.ok(page.length<=2);ids.push(...page);
   });
   assert.equal(new Set(ids).size,ids.length);found.set(object,ids);
  }
  assert.ok(found.get('command_invoice')!.includes('1'),'a state exit still requests the prior root');
  assert.ok(found.get('command_invoice')!.includes('98'),'unchanged future-dated headers enter on their recognition day');
  assert.equal(found.get('command_invoice')!.includes('99'),false,'other companies are excluded');
  assert.ok(found.get('command_order')!.includes('1'),'changed customer owner invalidates dependent orders');
  assert.ok(found.get('command_receipt')!.includes('10'),'changed customer owner invalidates dependent receipts');
  assert.ok(found.get('command_allocation')!.includes('1'),'invoice ownership invalidates allocation attribution');
  const open:string[]=[];
  await discoverCommandChanges({pool:db.admin,config,lease,object:'command_receivable',cutoff,month,timeZone:'Asia/Baghdad',completeSnapshot:true},async ids=>{open.push(...ids);});
  assert.ok(open.includes('100'),'zero current residual with future allocations still contributes to as-of debt');
 }finally{await lease?.close();await db.close();}
});
