import test from 'node:test';
import assert from 'node:assert/strict';
import { odooIncrementalWindow } from '../src/odoo/incremental-watermark.ts';
import { odooTransactionSql } from '../src/odoo/sql.ts';

test('durable overlap uses previous successful source cutoff and never a business date',()=>{
 const result=odooIncrementalWindow({cutoff:'2026-10-08T12:00:00.123Z',objects:{}},'2026-10-08T12:05:00Z');
 assert.equal(result.modificationFrom,'2026-10-08 11:58:00.123000');assert.equal(result.sourceCutoff,'2026-10-08T12:05:00Z');
 assert.equal(odooIncrementalWindow(null,'2026-10-08T00:00:00Z').modificationFrom,'1970-01-01 00:00:00.000000');
 assert.throws(()=>odooIncrementalWindow({cutoff:'2026-10-09T00:00:00Z',objects:{}},'2026-10-08T00:00:00Z'),/regress/);
 assert.throws(()=>odooIncrementalWindow(null,'bad'),/cutoff/);
});
test('source SQL bounds modification discovery by cutoff and tie identity; incremental mode does not filter business dates',()=>{
 for(const object of ['sale_order','account_move'] as const) {
  const sql=odooTransactionSql(object);
  assert.ok(sql.includes('>($4::timestamp,$5::bigint)'));assert.ok(sql.includes('<=$9::timestamptz'));assert.ok(sql.includes('$8::boolean OR'));
  assert.ok(sql.includes('ORDER BY'));assert.ok(sql.includes('LIMIT $6'));
 }
});
