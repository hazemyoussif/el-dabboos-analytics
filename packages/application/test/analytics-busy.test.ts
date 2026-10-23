import test from 'node:test';
import assert from 'node:assert/strict';
import {AnalyticsOperationBusy} from '@el-dabboos/domain';
import {CheckpointedAnalyticsSync} from '../src/analytics-sync.ts';
import {AnalyticsOperations} from '../src/analytics-operations.ts';

for(const mode of ['checkpointed','atomic'] as const)test(`${mode} busy lock defers without failure audit or candidate work`,async()=>{
 const calls:string[]=[];
 const busy=new AnalyticsOperationBusy();
 const reject=async()=>{throw busy;};
 const recordFailure=async()=>{calls.push('failure');};
 const options={source:{open:async()=>{calls.push('open');return {cutoff:'2026-10-24T00:00:00Z',revision:'synthetic',mappingVersion:'1',definitionVersion:'1',close:async()=>{calls.push('close');}};}},
  clock:()=>new Date('2026-10-24T00:00:00Z'),runId:()=> 'synthetic-busy',
  impact:{through:'2026-10-31',movingAverageWindows:[],runningTotals:false,yearOverYear:false,contribution:false,snapshotDependencies:()=>[]}};
 const job=mode==='checkpointed'?new CheckpointedAnalyticsSync({...options,store:{session:reject,recordFailure}}):new AnalyticsOperations({...options,store:{transaction:reject,recordFailure}});
 await assert.rejects(job.run({tenantId:'a',actorId:'synthetic',trigger:'scheduled',kind:'sync'}),error=>error===busy);
 assert.deepEqual(calls,mode==='checkpointed'?[]:['open','close']);
});
