import test from 'node:test';
import type {TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {analyticsJobObservation} from '../src/analytics-job-observation.ts';
import {summarizeCandidateChanges} from '../../../packages/data/src/operational/candidate-change-summary.ts';
import {fact} from '../../../packages/data/test/postgres/fixtures.ts';

function captureStderr(context:TestContext) {
 const lines:string[]=[];
 context.mock.method(process.stderr,'write',(chunk:string|Uint8Array)=>{lines.push(String(chunk));return true;});
 return ()=>lines.map(line=>JSON.parse(line) as Record<string,unknown>);
}

test('operator diagnostics emit count-only candidate groups without source values or identities',context=>{
 const records=captureStderr(context),observation=analyticsJobObservation();
 const previous=fact('private-record-sentinel',{sourceObject:'account_move',businessDate:'2026-01-02',
  dimensions:{customer:'private-identity-sentinel'},displayLabels:{customer:'private-before-label'}});
 const next={...previous,value:'987654.123456',displayLabels:{customer:'private-after-label'}};
 observation.progress({step:'mart_candidate_changes',state:'completed',durationMs:12.6,
  summary:summarizeCandidateChanges([{previous,next}])});
 const output=records();
 assert.equal(output.length,2);
 assert.deepEqual(output[0],{stage:'analytics-candidate-changes',candidateOnly:true,elapsedMs:output[0]!.elapsedMs,
  classificationMs:13,entries:1,withoutPrevious:0,withPrevious:1,active:1,tombstone:0});
 assert.deepEqual(output[1],{stage:'analytics-candidate-change-group',candidateOnly:true,sourceObject:'account_move',month:'2026-01',
  entries:1,withoutPrevious:0,withPrevious:1,active:1,tombstone:0,changedFields:{value:1,displayLabels:1,'displayLabels.customer':1}});
 const serialized=JSON.stringify(output);
 for(const secret of ['private-record-sentinel','private-identity-sentinel','private-before-label','private-after-label','987654.123456'])assert.ok(!serialized.includes(secret));
});

test('operator refresh boundaries emit immediately before periodic or final flushing',context=>{
 const records=captureStderr(context),observation=analyticsJobObservation();
 observation.progress({step:'refresh_month',state:'started',month:'2026-01',monthIndex:1,totalMonths:2});
 assert.equal(records().length,1);
 assert.deepEqual(records()[0],{stage:'analytics-refresh',candidateOnly:true,step:'refresh_month',state:'started',
  elapsedMs:records()[0]!.elapsedMs,month:'2026-01',monthIndex:1,totalMonths:2});
 observation.progress({step:'refresh_aggregate_proof',state:'started',month:'2026-01'});
 assert.equal(records().length,2,'the active SQL step must be visible without finish()');
 observation.progress({step:'refresh_aggregate_proof',state:'failed',month:'2026-01',durationMs:7.4});
 const output=records();
 assert.deepEqual(output[2],{stage:'analytics-refresh',candidateOnly:true,step:'refresh_aggregate_proof',state:'failed',
  elapsedMs:output[2]!.elapsedMs,month:'2026-01',durationMs:7});
 const progress=output[3]!;
 assert.equal(progress.stage,'analytics-progress');
 assert.deepEqual(progress.activeSteps,['refresh_month']);
 assert.deepEqual(progress.timings,[{step:'refresh_aggregate_proof',completed:0,failed:1,durationMs:7}]);
 assert.ok(!output.some(record=>record.step==='refresh_month'&&record.state==='completed'));
});
