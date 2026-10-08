import assert from 'node:assert/strict';
import test from 'node:test';
import { controlComponentSql,controlQualitySql } from '../../../../scripts/integration/receivables-control-query.ts';
import { receivableSummarySql,receivableReportBaseSql } from '../../src/operational/receivable-summary-sql.ts';
import { mapReceivableSnapshots,receivableMeasures } from '../../src/receivable-aging.ts';
import { database,enabled } from './support.ts';

test('independent Finance control: maturity boundaries, historical reconciliations, installments, credits, currency and company isolation', {skip:!enabled},async()=>{
 const fixture=await database(false);
 try {
  await fixture.admin.query(`CREATE TABLE res_currency(id int,name text,rounding numeric);
   CREATE TABLE res_company(id int,currency_id int);
   CREATE TABLE account_account(id int,account_type text);
   CREATE TABLE account_move(id int,company_id int,state text,move_type text,date date);
   CREATE TABLE account_move_line(id int,move_id int,partner_id int,company_id int,account_id int,date date,date_maturity date,balance numeric,amount_residual numeric,amount_currency numeric,currency_id int);
   CREATE TABLE account_partial_reconcile(id int,company_id int,debit_move_id int,credit_move_id int,amount numeric,max_date date);
   CREATE TABLE account_payment(id int,company_id int,move_id int,payment_type text,partner_type text);
   INSERT INTO res_currency VALUES(1,'IQD',0.001),(2,'USD',0.01);
   INSERT INTO res_company VALUES(1,1),(2,1);
   INSERT INTO account_account VALUES(1,'asset_receivable'),(2,'liability_payable');
   INSERT INTO account_move SELECT identity,1,'posted','out_invoice','2026-09-01' FROM generate_series(1,24) identity;
   UPDATE account_move SET state='draft' WHERE id=17;
   UPDATE account_move SET company_id=2 WHERE id=18;
   UPDATE account_move SET move_type='entry' WHERE id IN(14,19,20,21,22);
   UPDATE account_move SET move_type='out_refund' WHERE id=23;
   UPDATE account_move SET date='2026-10-03' WHERE id IN(21,22);
   INSERT INTO account_move_line SELECT identity,identity,10,CASE WHEN identity=18 THEN 2 ELSE 1 END,1,
    CASE WHEN identity IN(21,22) THEN '2026-10-03'::date ELSE '2026-09-01'::date END,
    CASE identity WHEN 1 THEN '2026-10-01'::date WHEN 2 THEN '2026-09-30'::date WHEN 3 THEN '2026-09-29'::date
     WHEN 4 THEN '2026-08-31'::date WHEN 5 THEN '2026-08-30'::date WHEN 6 THEN '2026-07-02'::date
     WHEN 7 THEN '2026-07-01'::date WHEN 8 THEN NULL WHEN 16 THEN '2026-08-31'::date ELSE '2026-09-30'::date END,
    CASE identity WHEN 14 THEN -20 WHEN 15 THEN 50 WHEN 16 THEN 50 WHEN 19 THEN -60 WHEN 20 THEN -100 WHEN 21 THEN -100 WHEN 22 THEN -100 WHEN 23 THEN -40 ELSE 100 END,
    CASE identity WHEN 9 THEN 40 WHEN 10 THEN 0 WHEN 11 THEN 0 WHEN 12 THEN 0 WHEN 13 THEN 60 WHEN 14 THEN -20
     WHEN 15 THEN 50 WHEN 16 THEN 50 WHEN 19 THEN 0 WHEN 20 THEN 0 WHEN 21 THEN 0 WHEN 22 THEN 0 WHEN 23 THEN 0 ELSE 100 END,
    CASE WHEN identity=24 THEN 1 ELSE 100 END,CASE WHEN identity=24 THEN 2 ELSE 1 END FROM generate_series(1,24) identity;
   UPDATE account_move_line SET move_id=15 WHERE id=16;
   INSERT INTO account_partial_reconcile VALUES(1,1,9,19,60,'2026-09-01'),(2,1,10,20,100,'2026-09-01'),
    (3,1,11,21,100,'2026-10-03'),(4,1,12,22,100,'2026-10-03'),(5,1,13,23,40,'2026-09-01');
   INSERT INTO account_payment VALUES(1,1,19,'inbound','customer'),(2,1,20,'inbound','customer');`);
  const parameters=[1,'2026-09-30',100];
  const rows=(await fixture.admin.query(controlComponentSql('open'),parameters)).rows;
  const summary=(await fixture.admin.query(receivableSummarySql,parameters.slice(0,2))).rows[0];
  const mapped=mapReceivableSnapshots(rows.map(row=>({componentId:row.component_id,customerId:row.customer_id,accountingDate:row.accounting_date,maturityDate:row.due_date,residual:row.residual})),'2026-09-30');
  for(const measure of receivableMeasures)assert.equal(BigInt(summary[measure].replace('.','')),mapped.reduce((total,row)=>total+BigInt(row.values[measure].replace('.','')),0n));
  const report=(await fixture.admin.query(receivableReportBaseSql+" SELECT id::text,residual::numeric(30,6)::text residual FROM reconstructed WHERE residual<>0 ORDER BY reconstructed.id",parameters.slice(0,2))).rows;
  assert.deepEqual(report,rows.map(row=>({id:row.component_id,residual:row.residual})));
  const byIdentity=new Map(rows.map(row=>[row.component_id,row]));
  assert.deepEqual(['1','2','3','4','5','6','7','8'].map(identity=>byIdentity.get(identity)?.bucket),['current','current','1_30','1_30','31_90','31_90','over_90','missing_due_date']);
  assert.equal(byIdentity.get('9')?.residual,'40.000000');
  assert.equal(byIdentity.get('9')?.reconciled_at_cutoff,'60.000000');
  assert.equal(byIdentity.get('9')?.payment_applied,'60.000000');
  assert.equal(byIdentity.has('10'),false);
  assert.equal(byIdentity.get('11')?.residual,'100.000000');
  assert.equal(byIdentity.get('12')?.residual,'100.000000');
  assert.equal(byIdentity.get('13')?.residual,'60.000000');
  assert.equal(byIdentity.get('13')?.credit_note_applied,'40.000000');
  assert.equal(byIdentity.get('14')?.bucket,'unapplied_credit_or_advance');
  assert.equal(byIdentity.get('14')?.residual,'-20.000000');
  assert.deepEqual(['15','16'].map(identity=>[byIdentity.get(identity)?.move_id,byIdentity.get(identity)?.bucket,byIdentity.get(identity)?.residual]),[['15','current','50.000000'],['15','1_30','50.000000']]);
  assert.equal(byIdentity.has('17'),false);
  assert.equal(byIdentity.has('18'),false);
  assert.equal(byIdentity.get('24')?.transaction_currency,'USD');
  assert.equal(byIdentity.get('24')?.residual,'100.000000');
  const quality=(await fixture.admin.query(controlQualitySql,parameters.slice(0,2))).rows[0];
  assert.equal(quality.current_residual_mismatches,'0');
  assert.equal(quality.ambiguous_components,'0');
  assert.equal(quality.positive_components,'15');
  assert.equal(quality.credit_components,'1');
  assert.equal(quality.open_components_with_later_settlement,'2');
  await fixture.admin.query("UPDATE account_move SET date='2026-09-30' WHERE id=20; UPDATE account_move_line SET date='2026-09-30' WHERE id=20; UPDATE account_partial_reconcile SET max_date='2026-09-30' WHERE id=2");
  assert.equal((await fixture.admin.query(controlComponentSql('open'),parameters)).rows.some(row=>row.component_id==='10'),false);
  await fixture.admin.query("UPDATE account_move SET date='2026-09-30' WHERE id=21; UPDATE account_move_line SET date='2026-09-30' WHERE id=21; UPDATE account_partial_reconcile SET max_date='2026-09-30' WHERE id=3; UPDATE account_move SET date='2026-09-29' WHERE id=22; UPDATE account_move_line SET date='2026-09-29' WHERE id=22; UPDATE account_partial_reconcile SET max_date='2026-09-29' WHERE id=4");
  const settledByCutoff=(await fixture.admin.query(controlComponentSql('open'),parameters)).rows;
  assert.equal(settledByCutoff.some(row=>row.component_id==='11' || row.component_id==='12'),false);
  await fixture.admin.query("UPDATE account_partial_reconcile SET max_date='2026-09-02' WHERE id=1");
  assert.equal((await fixture.admin.query(controlQualitySql,parameters.slice(0,2))).rows[0].ambiguous_components,'2');
 } finally {await fixture.close();}
});
