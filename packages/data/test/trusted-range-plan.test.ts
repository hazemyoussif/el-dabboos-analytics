import test from 'node:test';
import assert from 'node:assert/strict';
import {planTrustedRange} from '../src/operational/range-plan.ts';
import {querySlots} from '../src/postgres/query-slots.ts';
const partitions=Array.from({length:12},(_,index)=>{const date=new Date(Date.UTC(2025,9+index,1));return {month:date.toISOString().slice(0,7),partitionId:`partition-${index}`,monthly:true};});
const plan=(from:string,to:string,available=partitions)=>planTrustedRange([{key:null,match_key:null,from,to}],available);
test('trusted planner selects twelve monthly partitions for exact annual coverage',()=>assert.deepEqual(plan('2025-10-01','2026-09-30').map(segment=>segment.grain),Array(12).fill('monthly')));
test('trusted planner uses daily edges and monthly middle with disjoint exact coverage',()=>assert.deepEqual(plan('2026-04-17','2026-07-12').map(({from,to,grain})=>({from,to,grain})),[
 {from:'2026-04-17',to:'2026-04-30',grain:'daily'},{from:'2026-05-01',to:'2026-05-31',grain:'monthly'},{from:'2026-06-01',to:'2026-06-30',grain:'monthly'},{from:'2026-07-01',to:'2026-07-12',grain:'daily'}
]));
test('trusted planner falls back to daily when monthly proof is incompatible or unavailable',()=>assert.deepEqual(plan('2026-05-01','2026-05-31',partitions.map(partition=>({...partition,monthly:false}))).map(segment=>segment.grain),['daily']));
test('partial month and leap-year boundaries are exact',()=>{
 assert.equal(plan('2026-05-07','2026-05-23')[0]?.grain,'daily');
 assert.equal(plan('2024-02-01','2024-02-29',[{month:'2024-02',partitionId:'leap',monthly:true}])[0]?.grain,'monthly');
});
test('full-month filter with day output uses thirty-one daily points',()=>{
 const dates=Array.from({length:31},(_,index)=>`2026-05-${String(index+1).padStart(2,'0')}`);
 const slots=querySlots({metric:'order_revenue',groupBy:'date',dateRange:{from:'2026-05-01',to:'2026-05-31'}},dates);
 const selected=planTrustedRange(slots.current,partitions);assert.equal(selected.length,31);assert.ok(selected.every(segment=>segment.grain==='daily'&&segment.from===segment.to));
});
test('missing coverage is absent from plan and is never manufactured as a zero partition',()=>assert.deepEqual(plan('2026-10-01','2026-10-08'),[]));
test('proved current-month rollup cannot cover unloaded future days or fabricate a complete month',()=>{
 const partial=[{month:'2026-10',partitionId:'partial',monthly:true,availableFrom:'2025-10-01',availableThrough:'2026-10-08'}];
 assert.deepEqual(plan('2026-10-01','2026-10-31',partial).map(({from,to,grain})=>({from,to,grain})),[{from:'2026-10-01',to:'2026-10-08',grain:'daily'}]);
 assert.deepEqual(plan('2026-10-09','2026-10-31',partial),[]);
});
