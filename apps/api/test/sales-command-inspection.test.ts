import assert from 'node:assert/strict';
import test from 'node:test';
import {parseInspectionPeriod} from '../src/sales-command-inspection.ts';
test('source inspection requires one explicit valid period and rejects hidden action or connection flags',()=>{
 assert.deepEqual(parseInspectionPeriod(['--from','2026-10-01','--to','2026-10-20']),{from:'2026-10-01',to:'2026-10-20'});
 for(const flags of [[],['--from','2026-02-30','--to','2026-03-01'],['--from','2026-10-20','--to','2026-10-01'],['--from','2026-10-01','--to','2026-10-20','--promote'],['--connection','private','--to','2026-10-20']])assert.throws(()=>parseInspectionPeriod(flags));
});
