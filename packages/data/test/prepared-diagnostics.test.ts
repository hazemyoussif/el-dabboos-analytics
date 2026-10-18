import test from 'node:test';
import assert from 'node:assert/strict';
import {measurePreparedStep} from '../src/prepared/diagnostics.ts';
import type {PreparedStepEvent} from '../src/prepared/contracts.ts';

test('preparation diagnostics report bounded stage metadata and preserve the original failure without exposing values',async()=>{
 const events:PreparedStepEvent[]=[],scope={tenantId:'synthetic',revisionId:'synthetic',observeStep:(event:PreparedStepEvent)=>events.push(event)};
 assert.equal(await measurePreparedStep(scope,{step:'signature'},async()=>42),42);
 const error=Object.assign(new Error('canceling statement due to statement timeout'),{code:'57014',detail:'PRIVATE CUSTOMER VALUE',where:'PRIVATE SQL ARGUMENT'});
 await assert.rejects(measurePreparedStep(scope,{step:'binding'},async()=>{throw error;}),failure=>failure===error);
 assert.deepEqual(events.map(event=>[event.step,event.status]),[['signature','started'],['signature','completed'],['binding','started'],['binding','failed']]);
 assert.equal(events.at(-1)?.reason,'statement_timeout');assert.equal(events.at(-1)?.code,'57014');
 assert.ok(events.filter(event=>event.status!=='started').every(event=>Number.isFinite(event.elapsedMs)&&event.elapsedMs!>=0));
 assert.doesNotMatch(JSON.stringify(events),/PRIVATE|synthetic|canceling statement/);
 const cancelled=Object.assign(new Error('PRIVATE OTHER CANCELLATION'),{code:'57014'});
 await assert.rejects(measurePreparedStep(scope,{step:'binding'},async()=>{throw cancelled;}));
 assert.equal(events.at(-1)?.reason,'query_cancelled');
 assert.equal(await measurePreparedStep({tenantId:'synthetic',revisionId:'synthetic'},{step:'binding'},async()=>9),9);
});
