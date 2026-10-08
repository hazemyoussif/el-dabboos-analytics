import test from 'node:test';
import assert from 'node:assert/strict';
import {CachedSourceAvailability} from '../src/analytics-source-availability.ts';
test('cached source health recovers independently of reads, preserves last connection and rejects stale/other tenant availability',async()=>{
 let time=Date.parse('2026-10-08T08:00:00Z'),calls=0,available=true;
 const health=new CachedSourceAvailability('approved',async()=>{calls++;return {relayAvailable:true,sourceAvailable:available};},()=>time);
 assert.equal(health.snapshot('approved').sourceAvailable,false);
 await health.refresh();assert.equal(calls,1);const connected=health.snapshot('approved');assert.equal(connected.sourceAvailable,true);assert.equal(connected.lastSuccessfulConnection,'2026-10-08T08:00:00.000Z');
 for(let read=0;read<10;read++)health.snapshot('approved');assert.equal(calls,1);
 assert.equal(health.snapshot('other').sourceAvailable,false);assert.equal(health.snapshot('other').lastSuccessfulConnection,null);
 time+=76000;assert.equal(health.snapshot('approved').sourceAvailable,false);
 available=false;await health.refresh();assert.equal(health.snapshot('approved').relayAvailable,true);assert.equal(health.snapshot('approved').lastSuccessfulConnection,connected.lastSuccessfulConnection);
 available=true;time+=30000;await health.refresh();assert.equal(health.snapshot('approved').sourceAvailable,true);assert.notEqual(health.snapshot('approved').lastSuccessfulConnection,connected.lastSuccessfulConnection);
 await health.close();await health.refresh();assert.equal(calls,3);
});
test('probe errors are sanitized availability and concurrent checks share one bounded probe',async()=>{
 let release:()=>void=()=>{};let calls=0;
 const health=new CachedSourceAvailability('approved',async()=>{calls++;await new Promise<void>(resolve=>{release=resolve;});throw new Error('postgres://secret:password@private-source');});
 const first=health.refresh(),second=health.refresh();assert.equal(calls,1);release();await Promise.all([first,second]);
 assert.equal(health.snapshot('approved').sourceAvailable,false);assert.ok(!JSON.stringify(health.snapshot('approved')).includes('secret'));await health.close();
});
