import assert from 'node:assert/strict';
import test from 'node:test';
import { odooAgedCustomerSql,odooAgedPopulationSql,odooAgedBridgeSql } from '../../../../scripts/integration/odoo-aged-report-query.ts';
import { database,enabled } from './support.ts';

test('Odoo export candidate: all six boundaries, signed buckets, maturity fallback, historical settlement and company isolation',{skip:!enabled},async()=>{
 const fixture=await database(false);
 try {
  await fixture.admin.query(`CREATE TABLE res_currency(id int,name text,rounding numeric);
   CREATE TABLE res_company(id int,currency_id int);
   CREATE TABLE res_partner(id int,name text,commercial_partner_id int);
   CREATE TABLE account_account(id int,account_type text);
   CREATE TABLE account_move(id int,company_id int,state text,move_type text,date date);
   CREATE TABLE account_move_line(id int,move_id int,partner_id int,company_id int,account_id int,date date,date_maturity date,balance numeric,amount_residual numeric,amount_currency numeric,currency_id int);
   CREATE TABLE account_partial_reconcile(id int,company_id int,debit_move_id int,credit_move_id int,amount numeric,max_date date);
   CREATE TABLE account_payment(id int,company_id int,move_id int,payment_type text,partner_type text);
   INSERT INTO res_currency VALUES(1,'IQD',0.001),(2,'USD',0.01);
   INSERT INTO res_company VALUES(1,1),(2,1);
   INSERT INTO account_account VALUES(1,'asset_receivable'),(2,'liability_payable');
   INSERT INTO res_partner SELECT identity,'Synthetic '||identity,identity FROM generate_series(1,26) identity;
   INSERT INTO account_move SELECT identity,1,'posted','out_invoice','2026-09-01' FROM generate_series(1,26) identity;
   INSERT INTO account_move_line SELECT identity,identity,identity,1,1,'2026-09-01',
    '2026-09-30'::date-(ARRAY[-1,0,1,30,31,60,61,90,91,120,121])[identity],100,100,100,1 FROM generate_series(1,11) identity;
   INSERT INTO account_move_line SELECT identity,identity,identity,1,1,'2026-09-01','2026-09-30',100,100,100,1 FROM generate_series(12,26) identity;
   UPDATE account_move_line SET date_maturity=NULL,date='2026-08-30' WHERE id=12;
   UPDATE account_move SET date='2026-08-30' WHERE id=12;
   UPDATE account_move_line SET partner_id=13,balance=-100,amount_residual=-100,date_maturity='2026-05-01' WHERE id=14;
   UPDATE account_move SET move_type='out_refund' WHERE id=14;
   UPDATE account_move_line SET amount_residual=60 WHERE id=15;
   UPDATE account_move_line SET balance=-40,amount_residual=0 WHERE id=16;
   INSERT INTO account_partial_reconcile VALUES(1,1,15,16,40,'2026-09-01');
   UPDATE account_move_line SET amount_residual=0 WHERE id IN(17,19);
   UPDATE account_move_line SET balance=-100,amount_residual=0 WHERE id IN(18,20);
   UPDATE account_move_line SET date='2026-10-01' WHERE id=18;
   UPDATE account_move SET date='2026-10-01' WHERE id=18;
   INSERT INTO account_partial_reconcile VALUES(2,1,17,18,100,'2026-10-01'),(3,1,19,20,100,'2026-09-01');
   UPDATE account_move_line SET partner_id=21,move_id=21,balance=50,amount_residual=50 WHERE id IN(21,22);
   UPDATE account_move_line SET date_maturity='2026-08-31' WHERE id=22;
   UPDATE account_move SET company_id=2 WHERE id=23;
   UPDATE account_move_line SET company_id=2 WHERE id=23;
   UPDATE account_move SET state='draft' WHERE id=24;
   UPDATE account_move_line SET account_id=2 WHERE id=25;
   UPDATE account_move_line SET currency_id=2,amount_currency=1 WHERE id=26;`);
  const rows=(await fixture.admin.query(odooAgedCustomerSql,[1,'2026-09-30',100])).rows;
  const customers=new Map(rows.map(row=>[row.partner_reference,row]));
  const boundaries=['current','current','1_30','1_30','31_60','31_60','61_90','61_90','91_120','91_120','older'];
  for (const [index,bucket] of boundaries.entries()) assert.equal(customers.get(String(index+1))?.[bucket],'100.000000');
  assert.equal(customers.get('12')?.['31_60'],'100.000000');
  assert.equal(customers.get('13')?.total,'0.000000');
  assert.equal(customers.get('13')?.current,'100.000000');assert.equal(customers.get('13')?.older,'-100.000000');
  assert.equal(customers.get('15')?.current,'60.000000');assert.equal(customers.has('16'),false);
  assert.equal(customers.get('17')?.current,'100.000000');assert.equal(customers.has('18'),false);
  assert.equal(customers.has('19'),false);assert.equal(customers.has('20'),false);
  assert.equal(customers.get('21')?.current,'50.000000');assert.equal(customers.get('21')?.['1_30'],'50.000000');
  assert.equal(customers.get('21')?.components,'2');
  for (const identity of ['23','24','25']) assert.equal(customers.has(identity),false);
  assert.equal(customers.get('26')?.current,'100.000000');
  const population=(await fixture.admin.query(odooAgedPopulationSql,[1,'2026-09-30'])).rows[0];
  assert.equal(population.missing_maturity_positive_amount,'100.000000');assert.equal(population.later_settlement_components,'1');
  const bridge=(await fixture.admin.query(odooAgedBridgeSql,[1,'2026-09-30'])).rows;
  assert.deepEqual(bridge.find(row=>row.maturity_policy==='missing_maturity_accounting_date_fallback'),{bucket:'31_60',maturity_policy:'missing_maturity_accounting_date_fallback',sign:'positive_open',components:'1',amount:'100.000000'});
  // Move the later payment to the cutoff: both sides then disappear from the historical report.
  await fixture.admin.query("UPDATE account_move_line SET date='2026-09-30' WHERE id=18; UPDATE account_move SET date='2026-09-30' WHERE id=18; UPDATE account_partial_reconcile SET max_date='2026-09-30' WHERE id=2");
  const cutoffRows=(await fixture.admin.query(odooAgedCustomerSql,[1,'2026-09-30',100])).rows;
  assert.equal(cutoffRows.some(row=>['17','18'].includes(row.partner_reference)),false);
 } finally {await fixture.close();}
});
