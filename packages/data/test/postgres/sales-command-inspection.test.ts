import assert from 'node:assert/strict';
import test from 'node:test';
import {database,enabled} from './support.ts';
import {reviewSourceFixture} from './review-source-fixture.ts';
import {OdooSnapshotLease} from '../../src/odoo/snapshot.ts';
import {inspectSalesCommandSource} from '../../src/odoo/sales-command-inspection.ts';

test('sales source inspection uses one read-only snapshot, preserves unknown states, checks header grain and exposes no customer rows',{skip:!enabled},async()=>{
 const db=await database();let lease:OdooSnapshotLease|undefined;
 const config={tenantId:'a',sourceId:'fixture',companyIds:['1'],batchSize:2,statementTimeoutMs:15000,snapshotMaxDurationMs:60000,connection:{}};
 try{
  await db.admin.query(reviewSourceFixture);
  await db.admin.query(`ALTER TABLE account_move ADD COLUMN amount_residual numeric,ADD COLUMN payment_state text;
   ALTER TABLE res_users ADD PRIMARY KEY(id);ALTER TABLE account_move_line ADD COLUMN salesperson_id int REFERENCES res_users(id);
   UPDATE account_move SET amount_residual=45,payment_state='partial' WHERE id=1;
   INSERT INTO account_move_line(id,company_id,move_id,account_id,partner_id,amount_residual) VALUES(103,1,1,1,20,10);
   INSERT INTO sale_order(id,company_id,state,date_order) VALUES(3,1,'unknown_source_state','2026-09-15'),(4,2,'other_company','2026-09-15'),(5,1,'next_local_day','2026-09-30 22:30');`);
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  const output=await inspectSalesCommandSource(db.admin,config,lease,{from:'2026-09-01',to:'2026-09-30'},'Asia/Baghdad');
  assert.deepEqual(output.states.orders,[{state:'cancel',count:'1'},{state:'sale',count:'1'},{state:'unknown_source_state',count:'1'}]);
  assert.deepEqual(output.states.invoice_payments,[{state:'partial',count:'1'}]);
  assert.deepEqual(output.states.receipts,[{state:'canceled',count:'1'},{state:'paid',count:'4'}]);
  assert.deepEqual(output.invoiceIdentity,{headers:'1',multiple_receivable_lines:'1',missing_residual:'0',foreign_currency_headers:'0'});
  assert.deepEqual(output.fields.find(field=>field.object==='account_move_line'&&field.field==='salesperson_id')?.target_objects,['res_users']);
  assert.equal(output.sourceAsOf,lease.evidence.sourceAsOf);assert.equal(output.frozenRevision,lease.evidence.frozenRevision);
  assert.ok(!JSON.stringify(output).includes('Customer A'));
  const idle=(await db.admin.query("SELECT count(*)::int count FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction' AND pid<>pg_backend_pid()")).rows[0];
  assert.equal(idle.count,1,'only the retained source owner remains open');
  assert.equal((await db.admin.query('SELECT amount_residual::text value FROM account_move WHERE id=1')).rows[0].value,'45');
  await lease.close();lease=undefined;
  await db.admin.query('ALTER TABLE account_move DROP COLUMN payment_state');
  lease=await OdooSnapshotLease.open(db.admin,config,60000,'staging_read_only');
  const absent=await inspectSalesCommandSource(db.admin,config,lease,{from:'2026-09-01',to:'2026-09-30'},'Asia/Baghdad');
  assert.equal(absent.states.invoice_payments,null,'an unavailable field is distinct from an empty eligible cohort');
 }finally{await lease?.close();await db.close();}
});
