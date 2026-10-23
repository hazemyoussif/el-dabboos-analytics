import test from 'node:test';
import assert from 'node:assert/strict';
import {drainCommandBackgroundUnits} from '../src/analytics-background-drain.ts';

test('reused binding batches stop at ten units and retain the last checkpoint result',async()=>{
 let calls=0;
 const result=await drainCommandBackgroundUnits(async()=>({phase:'prepared_binding',checkpoint:++calls}),()=>calls*100);
 assert.equal(calls,10);assert.equal(result.units,10);assert.equal(result.checkpoint,10);
});
test('new preparation and publication return immediately after cheap replay/binding work',async()=>{
 for(const final of ['prepared_chunk','prepared_sealed','published','capture_sealed','covered','background_busy']){
  const phases=['canonical_fact_page','prepared_binding',final];let calls=0;
  const result=await drainCommandBackgroundUnits(async()=>({phase:phases[calls++]!}),()=>0);
  assert.equal(calls,3);assert.equal(result.phase,final);
 }
});
test('elapsed work budget prevents another unit and worker errors propagate',async()=>{
 let elapsed=0,calls=0;
 const result=await drainCommandBackgroundUnits(async()=>{calls++;elapsed=10001;return {phase:'prepared_binding'};},()=>elapsed);
 assert.equal(calls,1);assert.equal(result.units,1);
 await assert.rejects(drainCommandBackgroundUnits(async()=>{throw new Error('synthetic checkpoint failure');}),/synthetic checkpoint failure/);
});
