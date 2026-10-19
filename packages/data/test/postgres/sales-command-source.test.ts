import assert from 'node:assert/strict';
import test from 'node:test';
import type {ProductionFact} from '@el-dabboos/domain';
import {database,enabled} from './support.ts';
import {reviewSourceFixture} from './review-source-fixture.ts';
import {OdooSnapshotLease} from '../../src/odoo/snapshot.ts';
import {OdooBusinessReader} from '../../src/business/source.ts';
import {businessMapping} from '../../src/business/definitions.ts';
import {commandDebtRecipe} from '../../src/business/sales-command-recipes.ts';
import {assertSalesCommandHeaders} from '../../src/business/sales-command-controls.ts';
import {withSalesCommandMapping} from '../../src/business/sales-command-mapping.ts';

const extra=`ALTER TABLE account_partial_reconcile ADD create_date timestamp DEFAULT '2026-09-05 10:00:00';
 ALTER TABLE account_move ADD amount_total numeric DEFAULT 0,ADD amount_residual numeric DEFAULT 0,ADD payment_state text DEFAULT 'not_paid';
 UPDATE account_move SET amount_total=150,amount_residual=35,payment_state='partial',invoice_user_id=99 WHERE id=1;
 UPDATE account_move SET amount_total=5 WHERE id=2;
 ALTER TABLE account_payment ADD salesperson_id int DEFAULT 30;
 ALTER TABLE account_move_line ADD salesperson_id int DEFAULT 30;
 ALTER TABLE res_partner ADD user_id int DEFAULT 31,ADD state_id int DEFAULT 1;
 ALTER TABLE sale_order ADD amount_total numeric;UPDATE sale_order SET amount_total=amount_untaxed*1.2;
 INSERT INTO sale_order VALUES(3,1,1,'done',20,30,40,'2026-09-16',0,100,120),(4,1,1,'mystery',21,30,40,'2026-09-16',0,100,120),
 (5,2,1,'sale',22,30,40,'2026-09-16',0,999,999),(6,1,1,'sale',20,30,40,'2026-08-31 21:30:00',0,10,12);
 ALTER TABLE res_country_state ADD name text;INSERT INTO res_country_state VALUES(1,'Synthetic state');
 INSERT INTO res_users VALUES(30,20),(31,20);
 CREATE TABLE product_brand(id int,name text);CREATE TABLE stock_warehouse(id int,name text);CREATE TABLE uom_uom(id int,name text);CREATE TABLE account_journal(id int,name text);
 INSERT INTO account_move(id,company_id,state,move_type,date,currency_id,partner_id) VALUES(16,1,'posted','entry','2026-09-05',1,20);
 INSERT INTO account_payment VALUES(16,1,'inbound','customer','paid','2026-09-05',10,1,16,20,30),
 (17,1,'inbound','customer','mystery','2026-09-05',0,1,NULL,NULL,30),(18,1,'inbound','customer','paid','2026-09-05',500,1,NULL,NULL,30);
 UPDATE account_move_line SET amount_residual=35 WHERE id=100;
 INSERT INTO account_move_line(id,company_id,move_id,account_id,partner_id,date,balance,amount_residual,currency_id) VALUES(1600,1,16,1,20,'2026-09-05',-10,0,1);
 INSERT INTO account_partial_reconcile(id,company_id,debit_move_id,credit_move_id,amount,max_date) VALUES(3,1,100,1600,10,'2026-09-05');`;

test('command source headers, refunds, same-day cash and attribution reconcile without line fanout or daily customer counting',{skip:!enabled,timeout:60000},async()=>{
 const db=await database();let lease:OdooSnapshotLease|undefined;
 try{
  await db.admin.query(reviewSourceFixture+extra);
  const config={tenantId:'a',sourceId:'fixture',companyIds:['1'],batchSize:2,statementTimeoutMs:15000,snapshotMaxDurationMs:60000,connection:{}};
  const base=businessMapping({tenantId:'a',sourceId:'fixture',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:'SYNTHETIC COMMAND',current:false});
  const mapping=withSalesCommandMapping(base,false);
  assert.ok(base.measures.every(rule=>mapping.measures.includes(rule)),'opt-in preserves all original rules');
  const commands={...mapping,measures:mapping.measures.filter(rule=>rule.measureId.startsWith('command_')),capabilities:mapping.capabilities.filter(capability=>capability.metric.startsWith('command_'))};
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  const reader=new OdooBusinessReader(db.admin,config,lease,{month:'2026-09',mapping:commands}),facts:ProductionFact[]=[];
  for await(const page of reader.facts()){assert.ok(page.length<=2);facts.push(...page);}
  const sum=(measure:string)=>facts.filter(fact=>fact.measureId===measure).reduce((total,fact)=>total+Number(fact.value),0);
  const controlClient=await db.admin.connect();
  try{await assert.rejects(assertSalesCommandHeaders(controlClient,[],{companyId:1,from:'2026-09-01',to:'2026-09-30',timeZone:'Asia/Baghdad',measures:['command_invoice_total']}),/Independent Sales Command Center header/,'a missing nonzero operand cannot certify as an empty measure');}finally{controlClient.release();}
  assert.equal(facts.find(fact=>fact.measureId==='command_invoice_total')?.dimensions.salesperson,'fixture:30','reference receivable-line attribution is used even when header invoice_user_id differs');
  assert.equal(sum('command_invoice_count'),1);assert.equal(sum('command_invoice_total'),150);
  assert.equal(sum('command_net_invoices'),145);assert.equal(sum('command_invoice_refunds'),5);
  assert.equal(sum('command_order_count'),3,'sale/done and Baghdad midnight included; other company and unknown states excluded');
  assert.equal(sum('command_order_value'),372);assert.equal(sum('command_cancelled_count'),1);
  assert.equal(sum('command_cash_received'),160,'signed outbound refunds net; partnerless nonzero transfer excluded');
  assert.equal(sum('command_same_day_cash'),10,'later allocation and invoice credit offsets excluded');
  assert.ok(facts.some(fact=>fact.dimensions.order_state==='fixture:mystery'));
  assert.ok(facts.some(fact=>fact.dimensions.receipt_state==='fixture:mystery'));
  assert.ok(facts.filter(fact=>fact.measureId==='command_cash_received').every(fact=>fact.dimensions.salesperson==='fixture:30'));
  assert.ok((await reader.controls()).some(control=>control.measure==='command_invoice_count'&&control.dimensions===null&&control.value==='1.000000'));
  const balances=(await db.admin.query(commandDebtRecipe,[1,'2026-09-01','2026-09-30','Asia/Baghdad','2026-09-30'])).rows;
  assert.ok(balances.every(row=>row.dimensions.salesperson==='31'),'customer owner takes precedence over line salesperson');
  assert.deepEqual(balances.filter(row=>row.measure_id==='command_overdue_days').map(row=>Number(row.amount)),[15],'only positive overdue debits with known maturity contribute age');
  assert.equal(balances.filter(row=>row.measure_id==='command_unknown_maturity').reduce((total,row)=>total+Number(row.amount),0),-50,'unknown maturity and signed credits remain separate');
  await lease.close();lease=undefined;
  await db.admin.query("UPDATE account_partial_reconcile SET create_date='2026-09-06 10:00:00' WHERE id=3");
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  const later=new OdooBusinessReader(db.admin,config,lease,{month:'2026-09',mapping:commands});let laterCash=0;
  for await(const page of later.facts())for(const fact of page)if(fact.measureId==='command_same_day_cash')laterCash+=Number(fact.value);
  assert.equal(laterCash,0,'later-created reconciliation is not same-day cash even when its accounting max_date is backdated');

 }finally{await lease?.close();await db.close();}
});
