import test from 'node:test';
import assert from 'node:assert/strict';
import {numericOutput} from '../src/postgres/sql.ts';
test('annual whole IQD totals remain exact beyond the scaled six-decimal integer threshold',()=>{
  assert.equal(numericOutput('18000000000.000000'),18000000000);
  assert.equal(numericOutput('-18000000000.000000'),-18000000000);
  assert.equal(numericOutput('1359461092.610000'),1359461092.61);
});
test('large fractional or unsafe integer totals are refused without rounding away stored precision',()=>{
  for (const value of ['18000000000.000001','18000000000.000002','9007199254740992.000000','9007199254740993.000000','100.0000001']) assert.throws(()=>numericOutput(value),/Unsafe|boundary/);
});

test('large current-period cent totals preserve significant decimal precision without storage-scale false failures',()=>{
  for(const value of ['17828645788.140000','17584811686.580000','17830116437.580000','-17828645788.140000'])assert.equal(numericOutput(value)!.toFixed(2),value.replace(/0{4}$/, ''));
  assert.equal(numericOutput('9007199254740991.000000'),Number.MAX_SAFE_INTEGER);
  assert.throws(()=>numericOutput('17828645788.140001'),/Unsafe/);
});
