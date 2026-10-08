import test from 'node:test';
import assert from 'node:assert/strict';
import {coveredSlot,coverageMetadata} from '../src/operational/coverage.ts';
const coverage={from:'2025-10-01',to:'2026-10-08',cutoff:'2026-10-08T00:21:08.728Z',cutoffDay:'2026-10-08',months:['2025-10','2026-09','2026-10']};
test('event coverage clips qualifying slots and never treats future or missing partitions as zero',()=>{
 const slot={key:null,match_key:null,from:'2026-09-01',to:'2026-11-30'};
 assert.equal(coveredSlot(slot,coverage)?.to,'2026-10-08');
 assert.equal(coveredSlot({...slot,from:'2026-11-01'},coverage),null);
 assert.equal(coveredSlot({...slot,from:'2026-01-01',to:'2026-01-31'},coverage),null);
 assert.equal(coverageMetadata({metric:'order_revenue',dateRange:{from:slot.from,to:slot.to}},coverage,'2026-10-07').availability?.state,'PARTIAL_COVERAGE');
 assert.equal(coverageMetadata({metric:'order_revenue',dateRange:{from:'2026-11-01',to:'2026-11-30'}},coverage,null).availability?.state,'DATA_NOT_READY');
});
test('same-day partial source cutoff and full historical coverage remain distinct',()=>{
 assert.equal(coverageMetadata({metric:'order_revenue',dateRange:{from:'2026-09-01',to:'2026-10-08'}},coverage,'2026-10-07').coverage?.status,'partial');
 assert.equal(coverageMetadata({metric:'order_revenue',dateRange:{from:'2026-09-01',to:'2026-09-30'}},coverage,null).coverage?.status,'complete');
});
test('snapshots use resolved cutoff and missing snapshot remains structured availability',()=>{
 const query={metric:'net_aged_receivable' as const,dateRange:{from:'2026-09-01',to:'2026-10-08'}};
 assert.equal(coverageMetadata(query,coverage,'2026-09-30').availability,undefined);
 assert.equal(coverageMetadata({...query,dateRange:{from:'2025-09-01',to:'2025-09-30'}},coverage,null).availability?.reason,'no_snapshot');
});
