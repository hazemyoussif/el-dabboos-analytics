import test from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {refreshOperationalMonths} from '../src/operational/aggregates.ts';
import type {OperationalProgress} from '../src/operational/progress.ts';

interface QueryCall {text:string;values:unknown[]}
function recordingClient(reuse:boolean,failure?:{prefix:string;error:Error}) {
 const calls:QueryCall[]=[],partitions=new Map<string,string>();
 const client={query:async(text:string,values:unknown[]=[])=>{
  if(text.startsWith('INSERT INTO mart.analytics_partitions'))partitions.set(String(values[1]),`new-partition-${partitions.size+1}`);
  calls.push({text,values:JSON.parse(JSON.stringify(values,(_key,value)=>typeof value==='string'?partitions.get(value)??value:value)) as unknown[]});
  if(failure&&text.startsWith(failure.prefix))throw failure.error;
  if(text.startsWith('SELECT member.partition_id'))return {rows:[{partition_id:`prior-partition-${values[2]}`,exact:reuse}],rowCount:1};
  return {rows:[],rowCount:0};
 }} as unknown as PoolClient;
 return {client,calls};
}
const scope={tenantId:'private-tenant-sentinel',revisionId:'private-revision-sentinel',parent:'private-parent-sentinel',
 runId:'private-run-sentinel',cutoff:'2026-03-01T00:00:00.000Z',days:['2026-01-02','2026-02-03']};
const months=['2026-02','2026-01','2026-02'];

for(const reuse of [true,false])test(`refresh diagnostics preserve SQL, parameters and proof order with prior reuse ${reuse}`,async()=>{
 const plain=recordingClient(reuse),observed=recordingClient(reuse),events:OperationalProgress[]=[];
 const expected=await refreshOperationalMonths(plain.client,scope,months);
 const actual=await refreshOperationalMonths(observed.client,{...scope,observeProgress:event=>events.push(event)},months);
 assert.deepEqual(actual,['2026-01','2026-02']);assert.deepEqual(actual,expected);
 assert.deepEqual(observed.calls,plain.calls,'observation must not add, remove, reorder or alter SQL/parameters');
 const monthStarts=events.filter(event=>event.step==='refresh_month'&&event.state==='started');
 assert.deepEqual(monthStarts.map(event=>event.step==='refresh_month'?[event.month,event.monthIndex,event.totalMonths]:[]),[['2026-01',1,2],['2026-02',2,2]]);
 assert.equal(events.filter(event=>event.step==='refresh_month'&&event.state==='completed').length,2);
 assert.ok(!events.some(event=>event.state==='failed'));
 const sql=observed.calls.map(call=>call.text);
 const aggregateProof=sql.findIndex(text=>text.startsWith('INSERT INTO mart.analytics_aggregate_proofs'));
 const drillProof=sql.findIndex(text=>text.startsWith('INSERT INTO mart.analytics_drill_partitions'));
 const membership=sql.findIndex(text=>text.startsWith('INSERT INTO mart.analytics_serving_members VALUES'));
 assert.ok(aggregateProof>=0&&aggregateProof<drillProof&&drillProof<membership);
 const rebuild=observed.calls.find(call=>call.text.startsWith('INSERT INTO mart.analytics_aggregate_bases\n'))!;
 assert.deepEqual(rebuild.values[3],reuse?['2026-01-02']:null);
 assert.equal(sql.filter(text=>text.startsWith('INSERT INTO mart.analytics_aggregate_bases SELECT')).length,reuse?2:0);
 for(const secret of ['private-tenant-sentinel','private-revision-sentinel','private-parent-sentinel','private-run-sentinel'])assert.ok(!JSON.stringify(events).includes(secret));
});

const failures=[
 ['refresh_rebuild_daily','INSERT INTO mart.analytics_aggregate_bases\n'],
 ['refresh_aggregate_proof','INSERT INTO mart.analytics_aggregate_proofs'],
 ['refresh_drill_proof','INSERT INTO mart.analytics_drill_partitions'],
 ['refresh_membership_guard','INSERT INTO mart.analytics_serving_members VALUES'],
] as const;
for(const [step,prefix] of failures)test(`refresh diagnostics propagate ${step} failure without month completion or further SQL`,async()=>{
 const error=new Error('private-db-error-sentinel'),fixture=recordingClient(true,{prefix,error}),events:OperationalProgress[]=[];
 await assert.rejects(refreshOperationalMonths(fixture.client,{...scope,observeProgress:event=>events.push(event)},months),caught=>caught===error);
 assert.ok(fixture.calls.at(-1)!.text.startsWith(prefix));
 assert.equal(fixture.calls.filter(call=>call.text.startsWith('INSERT INTO mart.analytics_partitions')).length,1,'the next month must not start');
 const failed=events.filter(event=>event.state==='failed');
 assert.deepEqual(failed.map(event=>event.step),[step,'refresh_month']);
 assert.ok(failed.every(event=>event.step!=='mart_candidate_changes'&&event.month==='2026-01'&&Number.isFinite(event.durationMs)));
 assert.ok(!events.some(event=>event.step==='refresh_month'&&event.state==='completed'));
 assert.ok(!JSON.stringify(events).includes(error.message));
});
