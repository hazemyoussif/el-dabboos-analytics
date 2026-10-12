import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {enabled} from './support.ts';
import {AnalyticsOperations} from '../../../application/src/analytics-operations.ts';
import {OdooOperationalSource} from '../../src/operational/source.ts';
import {PostgresOperationalStore} from '../../src/operational/store.ts';
import {operationalPerformanceFixture,changeSource,historyRowsPerObject,changedRowsPerObject} from '../performance/operational-fixture.ts';

interface Timing {calls:number;ms:number;maxMs:number}
function observeQueries(pool:Pool) {
 const timings=new Map<string,Timing>();
 const connect=pool.connect.bind(pool);
 const observed=new WeakSet<object>();
 pool.connect=(async()=>{
  const client=await connect();
  if(!observed.has(client)){
   observed.add(client);const query=client.query.bind(client);
   client.query=(async(text:string,values?:unknown[])=>{
    const key=text.replace(/\s+/g,' ').trim();const started=performance.now();
    try{return await query(text,values);}finally{const elapsed=performance.now()-started;const timing=timings.get(key)??{calls:0,ms:0,maxMs:0};timing.calls++;timing.ms+=elapsed;timing.maxMs=Math.max(timing.maxMs,elapsed);timings.set(key,timing);}
   }) as typeof client.query;
  }
  return client;
 }) as typeof pool.connect;
 return {reset(){timings.clear();},report(){return [...timings].map(([sql,timing])=>({sql,...timing})).sort((left,right)=>right.ms-left.ms);}};
}

test('representative operational pipeline: 280k revisions, source read through atomic promotion and replay',{skip:!enabled,timeout:600000},async()=>{
 const fixture=await operationalPerformanceFixture();
 try {
  assert.equal((await fixture.db.admin.query('SELECT count(*)::int count FROM mart.analytics_fact_heads')).rows[0].count,historyRowsPerObject*8);
  await changeSource(fixture.db);
  const mart=observeQueries(fixture.db.ingestor),sourceQueries=observeQueries(fixture.source);
  const config={credentialPolicy:'least_privilege' as const,connection:{},tenantId:'a',sourceId:'fixture',companyIds:['1'],batchSize:500,statementTimeoutMs:15000,snapshotMaxDurationMs:600000};
  const source=new OdooOperationalSource(fixture.owner,fixture.source,config,fixture.baseline);
  async function run(label:string) {
   mart.reset();sourceQueries.reset();const runId=randomUUID(),started=performance.now(),cpu=process.cpuUsage();
   const result=await new AnalyticsOperations({store:new PostgresOperationalStore(fixture.db.ingestor,runId),source,runId:()=>runId,clock:()=>new Date(),impact:{through:fixture.baseline.to,movingAverageWindows:[],runningTotals:false,yearOverYear:false,contribution:false,snapshotDependencies:()=>[]}}).run({tenantId:'a',actorId:'synthetic-performance',trigger:'operator',kind:'sync'});
   const wallMs=performance.now()-started,cpuUsed=process.cpuUsage(cpu);
   const details=(await fixture.db.admin.query('SELECT details FROM mart.analytics_run_details WHERE run_id=$1',[runId])).rows[0].details;
   process.stdout.write(`pipeline-performance ${JSON.stringify({label,historyRowsPerObject,changedRowsPerObject,wallMs,cpuMs:(cpuUsed.user+cpuUsed.system)/1000,result,details:{durations:details.durations,rowsDiscovered:details.rowsDiscovered,canonicalRevisions:details.canonicalRevisions,partitionCount:details.partitions.length,refreshedMonths:details.refreshedMonths},mart:mart.report(),source:sourceQueries.report()})}\n`);
   return {result,wallMs};
  }
  const changed=await run('changed-and-retired');assert.equal(changed.result.status,'passed');assert.equal(changed.result.mismatchCount,0);assert.equal(changed.result.recordsChanged,4100);
  const revisions=(await fixture.db.admin.query('SELECT count(*)::int count FROM mart.analytics_fact_revisions')).rows[0].count;
  const replay=await run('unchanged');assert.equal(replay.result.status,'unchanged');assert.equal(replay.result.servingRelease,changed.result.servingRelease);
  assert.equal((await fixture.db.admin.query('SELECT count(*)::int count FROM mart.analytics_fact_revisions')).rows[0].count,revisions);
  assert.ok(changed.wallMs<600000,'representative changed sync must fit the unchanged source lease');
 }finally{await fixture.close();}
});
