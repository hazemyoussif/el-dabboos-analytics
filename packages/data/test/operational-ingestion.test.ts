import test from 'node:test';
import assert from 'node:assert/strict';
import { missingOperationalMonths } from '../src/operational/ingestion.ts';

const baseline={to:'2026-09-30',mappings:[{measures:[{timeZone:'Asia/Baghdad'}]}]} as any;

test('operational bootstrap catch-up seeds missing current month from certified boundary',()=>{
 assert.deepEqual(
  missingOperationalMonths(baseline,'2026-10-11T16:00:00Z',new Set(['2026-09'])),
  ['2026-10']
 );
});

test('operational bootstrap catch-up is timezone aware and skips already served months',()=>{
 assert.deepEqual(
  missingOperationalMonths(baseline,'2026-10-31T21:30:00Z',new Set(['2026-09','2026-10'])),
  ['2026-11']
 );
});

test('operational bootstrap catch-up is empty when source cutoff is inside certified month',()=>{
 assert.deepEqual(
  missingOperationalMonths(baseline,'2026-09-30T12:00:00Z',new Set(['2026-09'])),
  []
 );
});
