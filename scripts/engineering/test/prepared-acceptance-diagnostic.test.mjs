import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {latencyGate,rowDifferences,metadataDifferences,profilePool} from '../../../docs/qa/maintenance/prepared-acceptance-diagnosis-2026-10-19.mjs';

test('release latency gate rejects both first and repeat regressions even below the absolute limits',()=>{
 assert.deepEqual(latencyGate(3037,2971,161),{absolute:true,noRegression:false});
 assert.deepEqual(latencyGate(100,99,100),{absolute:true,noRegression:true});
 assert.equal(latencyGate(101,90,100).noRegression,false);
 assert.equal(latencyGate(90,101,100).noRegression,false);
 assert.equal(latencyGate(4000,3500,5000).absolute,false);
 assert.throws(()=>latencyGate(NaN,0,1));
});
test('diagnostic separates numeric, null, membership and ordering mismatches without exporting values or identities',()=>{
 const result=rowDifferences([{key:'PRIVATE:first',value:90001},{key:'PRIVATE:null',value:null},{key:'PRIVATE:missing',value:90003}],
  [{key:'PRIVATE:null',value:90004},{key:'PRIVATE:first',value:90005},{key:'PRIVATE:extra',value:90006}]);
 assert.deepEqual(result,{expectedRows:3,actualRows:3,duplicateExpected:0,duplicateActual:0,missingIdentities:1,extraIdentities:1,nullDifferences:1,numericDifferences:1,otherFieldDifferences:0,orderDiffers:true});
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE|9000/);
 const metadata=metadataDifferences({coverage:{from:'2024-06-01',through:'2026-10-19'},release:{datasetId:'PRIVATE:source',period:{from:'2024-06-01'}}},
  {coverage:{from:'2025-01-01',through:'2026-10-19'},release:{datasetId:'PRIVATE:source',period:{from:'2025-01-01'}}});
 assert.deepEqual(metadata.fields,['coverage','release']);assert.equal(metadata.release.identifierFieldsEqual.datasetId,true);
 assert.doesNotMatch(JSON.stringify(metadata),/PRIVATE/);
});

test('the pasteable company command embeds the synthetically tested diagnostic exactly',()=>{
 const helper=readFileSync(new URL('../../../docs/qa/maintenance/prepared-acceptance-diagnosis-2026-10-19.mjs',import.meta.url),'utf8');
 const command=readFileSync(new URL('../../../docs/qa/maintenance/prepared-acceptance-diagnosis-2026-10-19.sh',import.meta.url),'utf8');
 assert.ok(command.includes(helper));
});

function callbackPool({checkoutError=false,queryError=false}={}){
 const listeners=new Map(),client={query(...args){
  const callback=args.at(-1),result={rows:[{safe:true}]},error=queryError?new Error('synthetic query failure'):null;
  if(typeof callback==='function'){queueMicrotask(()=>callback(error,error?undefined:result));return;}
  return error?Promise.reject(error):Promise.resolve(result);
 }};
 let released=0;
 return {on(event,listener){listeners.set(event,listener);},
  connect(callback){
   if(listeners.has('connect')){listeners.get('connect')(client);listeners.delete('connect');}
   const release=()=>{released++;},error=checkoutError?new Error('synthetic checkout failure'):null;
   if(typeof callback==='function'){queueMicrotask(()=>callback(error,error?undefined:client,release));return;}
   return error?Promise.reject(error):Promise.resolve(Object.assign(client,{release}));
  },
  query(sql){return new Promise((resolve,reject)=>this.connect((error,connection,release)=>{
   if(error){reject(error);return;}
   connection.query(sql,(failure,result)=>{release();if(failure)reject(failure);else resolve(result);});
  }));},get released(){return released;}};
}
test('pool profiling preserves callback checkout used by startup Pool.query and records completed callback SQL',async()=>{
 const pool=callbackPool(),profile=profilePool(pool);
 const completed=await Promise.race([pool.query('SELECT role_check').then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),100))]);
 assert.equal(completed,true,'startup Pool.query must finish through callback checkout');
 assert.equal(pool.released,1);assert.equal(profile.snapshot().samples.guardsAndBindings.calls,1);
 const client=await pool.connect();assert.deepEqual((await client.query('SELECT promise_read')).rows,[{safe:true}]);client.release();
 assert.equal(pool.released,2);assert.equal(profile.snapshot().samples.poolWait.calls,2);
 assert.equal(profile.snapshot().samples.guardsAndBindings.calls,2);
});

test('profiling forwards callback and promise failures without losing completion or release',async()=>{
 const denied=callbackPool({checkoutError:true}),checkoutProfile=profilePool(denied);
 await assert.rejects(denied.query('SELECT role_check'),/synthetic checkout failure/);
 await assert.rejects(denied.connect(),/synthetic checkout failure/);
 assert.equal(checkoutProfile.snapshot().samples.poolWait.calls,2);assert.equal(denied.released,0);
 const broken=callbackPool({queryError:true}),queryProfile=profilePool(broken);
 await assert.rejects(broken.query('SELECT role_check'),/synthetic query failure/);
 const client=await broken.connect();try{await assert.rejects(client.query('SELECT promise_read'),/synthetic query failure/);}finally{client.release();}
 assert.equal(queryProfile.snapshot().samples.guardsAndBindings.calls,2);assert.equal(broken.released,2);
});
test('callback-compatible profiling retains the prepared history access guard',async()=>{
 const pool=callbackPool(),profile=profilePool(pool,true),client=await pool.connect();
 try{assert.throws(()=>client.query('SELECT * FROM mart.review_facts'),/Prepared history access blocked/);}finally{client.release();}
 assert.equal(profile.snapshot().historyAttempts,1);assert.equal(pool.released,1);
});
