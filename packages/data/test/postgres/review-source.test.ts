import type {ProductionFact} from '@el-dabboos/domain';
import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {OdooSnapshotLease} from '../../src/odoo/snapshot.ts';
import {OdooReviewReader} from '../../src/review/source.ts';
import {reviewMapping} from '../../src/review/definitions.ts';
const schema=`CREATE TABLE res_company(id int PRIMARY KEY,currency_id int);
 CREATE TABLE res_currency(id int PRIMARY KEY,name text,rounding numeric);
 CREATE TABLE account_account(id int PRIMARY KEY,account_type text);
 CREATE TABLE account_move(id int PRIMARY KEY,company_id int,state text,move_type text,invoice_date date,date date,amount_untaxed_signed numeric,currency_id int,partner_id int,invoice_user_id int,business_line_id int);
 CREATE TABLE account_move_line(id int PRIMARY KEY,company_id int,move_id int,account_id int,partner_id int,date date,date_maturity date,balance numeric,amount_residual numeric,amount_currency numeric,currency_id int,display_type text,product_id int,price_subtotal numeric);
 CREATE TABLE account_payment(id int PRIMARY KEY,company_id int,payment_type text,partner_type text,state text,date date,amount numeric,currency_id int,move_id int,partner_id int);
 CREATE TABLE account_partial_reconcile(id int PRIMARY KEY,company_id int,debit_move_id int,credit_move_id int,amount numeric,max_date date);
 CREATE TABLE sale_order(id int PRIMARY KEY,company_id int,currency_id int,state text,partner_id int,user_id int,business_line_id int,date_order timestamp,margin numeric,amount_untaxed numeric);
 CREATE TABLE product_product(id int PRIMARY KEY,product_tmpl_id int);
 CREATE TABLE product_template(id int PRIMARY KEY,categ_id int,name jsonb);
 CREATE TABLE res_partner(id int,name text);CREATE TABLE res_users(id int,partner_id int);CREATE TABLE business_line(id int,company_id int,name text);CREATE TABLE product_category(id int,name text);CREATE TABLE res_country_state(id int);
 CREATE TABLE sale_order_line(id int);CREATE TABLE sale_order_line_invoice_rel(id int);
 INSERT INTO res_currency VALUES(1,'IQD',0.01);INSERT INTO res_company VALUES(1,1),(2,1);INSERT INTO account_account VALUES(1,'asset_receivable'),(2,'income');
 INSERT INTO product_template VALUES(1,60,'{"en_US":"Product A","ar_001":"منتج أ"}'),(2,61,'{"en_US":"Product B"}');INSERT INTO product_category VALUES(60,'Category A'),(61,'Category B');INSERT INTO res_partner VALUES(20,'Customer A');INSERT INTO product_product VALUES(50,1),(51,2);
 INSERT INTO sale_order VALUES(1,1,1,'sale',20,30,40,'2026-09-15 10:00:00',40,200),(2,1,1,'cancel',20,30,40,'2026-09-15',999,999);
 INSERT INTO account_move VALUES(1,1,'posted','out_invoice','2026-09-05','2026-09-05',125,1,20,30,40),
 (2,1,'posted','out_refund','2026-09-10','2026-09-10',-5,1,20,30,40),(10,1,'posted','entry',NULL,'2026-09-25',0,1,20,NULL,NULL),
 (11,1,'posted','entry',NULL,'2026-09-25',0,1,20,NULL,NULL),(12,1,'posted','entry',NULL,'2026-09-25',0,1,20,NULL,NULL),
 (15,1,'posted','entry',NULL,'2026-09-25',0,1,20,NULL,NULL);
 INSERT INTO account_move_line VALUES
 (100,1,1,1,20,'2026-09-05','2026-09-15',150,45,150,1,'payment_term',NULL,0),
 (101,1,1,2,20,'2026-09-05',NULL,-60,-60,-60,1,'product',50,60),
 (102,1,1,2,20,'2026-09-05',NULL,-65,-65,-65,1,'product',51,65),
 (200,1,2,1,20,'2026-09-10','2026-09-10',-5,0,-5,1,'payment_term',NULL,0),
 (201,1,2,2,20,'2026-09-10',NULL,5,5,5,1,'product',50,5),
 (1000,1,10,1,20,'2026-09-25',NULL,-150,-50,-150,1,'payment_term',NULL,0),
 (1100,1,11,1,20,'2026-09-25',NULL,-999,-999,-999,1,'payment_term',NULL,0),
 (1200,1,12,1,20,'2026-09-25',NULL,999,999,999,1,'payment_term',NULL,0),
 (1500,1,15,1,20,'2026-09-25',NULL,0,0,0,1,'payment_term',NULL,0);
 INSERT INTO account_payment VALUES(10,1,'inbound','customer','paid','2026-09-25',150,1,10,20),
 (11,1,'inbound','customer','canceled','2026-09-25',999,1,11,20),(12,1,'outbound','customer','paid','2026-09-25',999,1,12,20),
 (13,1,'inbound','customer','paid','2026-09-25',999,1,NULL,20),(14,2,'inbound','customer','paid','2026-09-25',999,1,10,20),
 (15,1,'inbound','customer','paid','2026-09-25',0,1,15,20);
 INSERT INTO account_partial_reconcile VALUES(1,1,100,1000,100,'2026-09-25'),(2,1,100,200,5,'2026-09-10');`;
test('real SQL recipes count inbound cash once, separate credit settlements, page all product lines and independently control headers',{skip:!enabled},async()=>{
 const db=await database();let lease:OdooSnapshotLease|undefined;
 try{
  await db.admin.query(schema);
  const config={tenantId:'a',sourceId:'fixture',companyIds:['1'],batchSize:2,statementTimeoutMs:15000,snapshotMaxDurationMs:60000,connection:{}};
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  const mapping=reviewMapping({tenantId:'a',sourceId:'fixture',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:'synthetic-sql'});
  const reader=new OdooReviewReader(db.admin,config,lease,{month:'2026-09',mapping}),facts:ProductionFact[]=[];
  for await(const page of reader.facts()){assert.ok(page.length<=2);facts.push(...page);}
  const sum=(measure:string)=>facts.filter(fact=>fact.measureId===measure).reduce((total,fact)=>total+Number(fact.value),0);
  assert.equal(sum('customer_cash_collected'),150);assert.equal(sum('cash_applied_to_invoices'),100);assert.equal(sum('unallocated_customer_receipts'),50);
  assert.equal(sum('collection_amount_days'),2000);assert.equal(sum('receivables_due_for_collection'),45);
  assert.equal(facts.find(fact=>fact.measureId==='customer_cash_collected'&&fact.sourceRecordId==='15')?.value,'0.000000');
  assert.equal(sum('net_invoiced_revenue'),120);assert.equal(sum('order_margin'),40);
  const controls=await reader.controls();assert.equal(controls.find(control=>control.measure==='net_invoiced_revenue'&&control.dimensions===null)?.value,'120.000000');
  assert.equal(facts.filter(fact=>fact.measureId==='invoiced_revenue').length,2);
  assert.equal(facts.find(fact=>fact.measureId==='invoiced_revenue')?.displayLabels?.customer,'Customer A');
  const interrupted=reader.facts()[Symbol.asyncIterator]();
  assert.equal((await interrupted.next()).done,false);await interrupted.return?.();
  const idle=(await db.admin.query("SELECT count(*)::int count FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction' AND pid<>pg_backend_pid()")).rows[0];
  assert.equal(idle.count,1,'only the retained snapshot owner may remain idle in a transaction after an interrupted reader');
  await reader.controls();
  await lease.close();lease=undefined;
  await db.admin.query('UPDATE account_move SET amount_untaxed_signed=126 WHERE id=1');
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  const invalid=new OdooReviewReader(db.admin,config,lease,{month:'2026-09',mapping});
  await assert.rejects(async()=>{for await(const page of invalid.facts())void page;},/quality/);
 }finally{await lease?.close();await db.close();}
});

async function allocationFixture(amount:string,rounding:string='0.001') {
 const db=await database();let lease:OdooSnapshotLease|undefined;
 try{
  await db.admin.query(schema);
  await db.admin.query('UPDATE res_currency SET rounding=$1 WHERE id=1',[rounding]);
  await db.admin.query('UPDATE account_partial_reconcile SET amount=$1 WHERE id=1',[amount]);
  await db.admin.query('UPDATE account_payment SET amount=100 WHERE id=10');
  await db.admin.query('UPDATE account_move_line SET balance=-100,amount_residual=0,amount_currency=-100 WHERE id=1000');
  const config={tenantId:'a',sourceId:'fixture',companyIds:['1'],batchSize:2,statementTimeoutMs:15000,snapshotMaxDurationMs:60000,connection:{}};
  const mapping=reviewMapping({tenantId:'a',sourceId:'fixture',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:'synthetic-allocation-precision'});
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  const reader=new OdooReviewReader(db.admin,config,lease,{month:'2026-09',mapping});
  return {db,lease,reader};
 }catch(error){await lease?.close();await db.close();throw error;}
}
for(const amount of ['100.000000000224','100.000000001'])test(`allocation residue ${amount} normalizes before over-allocation and weighted days, with exact source controls`,{skip:!enabled},async()=>{
 const {db,lease,reader}=await allocationFixture(amount);
 try{
  const facts:ProductionFact[]=[];
  for await(const page of reader.facts())facts.push(...page);
  const expected={customer_cash_collected:'100.000000',cash_applied_to_invoices:'100.000000',unallocated_customer_receipts:'0.000000',collection_amount_days:'2000.000000',collection_applied_amount:'100.000000'};
  const controls=await reader.controls();
  for(const [measure,value] of Object.entries(expected)){
   assert.equal(facts.find(fact=>fact.sourceObject==='account_payment'&&fact.sourceRecordId==='10'&&fact.measureId===measure)?.value,value);
   assert.equal(controls.find(control=>control.measure===measure&&control.dimensions===null)?.value,value);
  }
  assert.equal((await db.admin.query('SELECT amount::text FROM account_partial_reconcile WHERE id=1')).rows[0].amount,amount,'reader never rewrites the original source amount');
 }finally{await lease.close();await db.close();}
});
for(const [name,amount,rounding] of [
 ['above residue limit','100.0000000011','0.001'],
 ['real over-allocation','100.001','0.001'],
 ['negative allocation','-1','0.001'],
 ['zero allocation','0','0.001'],
 ['finer currency quantum','100.000000000224','0.000000001'],
 ['invalid currency quantum','100','0']
])test(`allocation precision policy rejects ${name} in facts and independent controls`,{skip:!enabled},async()=>{
 const {db,lease,reader}=await allocationFixture(amount!,rounding!);
 try{
  await assert.rejects(async()=>{for await(const page of reader.facts())void page;},/quality/);
  await assert.rejects(reader.controls(),/quality/);
 }finally{await lease.close();await db.close();}
});
