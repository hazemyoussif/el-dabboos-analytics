import type {ProductionFact} from '@el-dabboos/domain';
import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {OdooSnapshotLease} from '../../src/odoo/snapshot.ts';
import {OdooReviewReader} from '../../src/review/source.ts';
import {reviewMapping} from '../../src/review/definitions.ts';
import {reviewSourceFixture as schema} from './review-source-fixture.ts';
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

async function receiptCurrencyFixture(scenario:'zero'|'nonzero'|'allocated'|'missing') {
 const db=await database();let lease:OdooSnapshotLease|undefined;
 try{
  await db.admin.query(schema);
  await db.admin.query("INSERT INTO res_currency VALUES(2,'USD',0.01)");
  await db.admin.query('UPDATE account_payment SET currency_id=$1 WHERE id=$2',[scenario==='missing'?null:2,scenario==='nonzero'?10:15]);
  if(scenario==='allocated')await db.admin.query("INSERT INTO account_partial_reconcile VALUES(3,1,100,1500,0.000000001,'2026-09-25')");
  const config={tenantId:'a',sourceId:'fixture',companyIds:['1'],batchSize:2,statementTimeoutMs:15000,snapshotMaxDurationMs:60000,connection:{}};
  const mapping=reviewMapping({tenantId:'a',sourceId:'fixture',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:'synthetic-receipt-currency'});
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  const reader=new OdooReviewReader(db.admin,config,lease,{month:'2026-09',mapping});
  return {db,lease,reader};
 }catch(error){await lease?.close();await db.close();throw error;}
}
for(const scenario of ['zero','nonzero','allocated','missing'] as const)test(`receipt currency: ${scenario} preserves native IQD scope and exact controls`,{skip:!enabled},async()=>{
 const {db,lease,reader}=await receiptCurrencyFixture(scenario);
 try{
  if(scenario!=='zero'){
   await assert.rejects(async()=>{for await(const page of reader.facts())void page;},/quality/);
   await assert.rejects(reader.controls(),/quality/);return;
  }
  const facts:ProductionFact[]=[];
  for await(const page of reader.facts())facts.push(...page);
  const zeros=facts.filter(fact=>fact.sourceObject==='account_payment'&&fact.sourceRecordId==='15');
  assert.equal(zeros.length,5);assert.ok(zeros.every(fact=>fact.value==='0.000000'));
  assert.equal(zeros.find(fact=>fact.measureId==='customer_cash_collected')?.currency?.reportingCurrency,'IQD');
  const cash=(await reader.controls()).find(control=>control.measure==='customer_cash_collected'&&control.dimensions===null);
  assert.equal(cash?.value,'150.000000');assert.equal(cash?.count,'2','zero receipt is retained, not silently dropped');
  const original=(await db.admin.query("SELECT payment.currency_id,payment.amount::text,currency.name FROM account_payment payment JOIN res_currency currency ON currency.id=payment.currency_id WHERE payment.id=15")).rows[0];
  assert.deepEqual(original,{currency_id:2,amount:'0',name:'USD'},'read-only reader leaves original currency and zero amount unchanged');
 }finally{await lease.close();await db.close();}
});
