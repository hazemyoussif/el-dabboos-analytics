import assert from 'node:assert/strict';
import test from 'node:test';
import { historicalJobOptions } from '../src/historical-job-options.ts';
const args = ['backfill','--tenant','el-dabboos-iq','--from','2025-10-01','--to','2025-12-31','--checkpoint-dir','/tmp/synthetic-history'];
test('operator command selects only requested bounded months and explicit recovery',()=>{
  const options=historicalJobOptions(args);
  assert.deepEqual(options.periods.map(period=>period.month),['2025-10','2025-11','2025-12']);
  assert.equal(options.retryIncomplete,false);
  assert.equal(historicalJobOptions([...args,'--retry-incomplete']).retryIncomplete,true);
});
test('operator command rejects ambiguous input and unauthorized source tenants',()=>{
  assert.throws(()=>historicalJobOptions([...args,'--from','2026-01-01']),/Invalid/);
  assert.throws(()=>historicalJobOptions(args.map(value=>value==='el-dabboos-iq'?'another-tenant':value)),/approved only/);
  assert.throws(()=>historicalJobOptions([...args,'--sql','SELECT 1']),/Invalid/);
  assert.throws(()=>historicalJobOptions(args.map(value=>value==='2025-10-01'?'2025-10-02':value)),/boundaries/);
});
