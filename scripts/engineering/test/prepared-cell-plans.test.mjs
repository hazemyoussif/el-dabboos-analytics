import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeCellPlan} from '../../../docs/qa/maintenance/prepared-cell-plans-2026-10-19.mjs';

test('cell plan export keeps access counters but redacts SQL expressions and customer data',()=>{
 const plan=safeCellPlan({Plan:{'Node Type':'Index Scan','Relation Name':'prepared_cells','Index Name':'prepared_cells_pkey',
  'Plan Rows':100,'Actual Rows':0,'Actual Loops':1,'Shared Read Blocks':0,'Heap Fetches':0,
  'Index Cond':"customer = 'PRIVATE_CUSTOMER'",Filter:'value = 987654321',Output:['PRIVATE_CUSTOMER'],
  Plans:[{'Node Type':'Aggregate','Actual Rows':1,'Actual Loops':1}]},'Planning Time':2,'Execution Time':3,
  JIT:{Functions:4,Timing:{Generation:0,Inlining:1,Optimization:2,Emission:3,Total:6},Options:{private:'PRIVATE_CUSTOMER'}}});
 assert.equal(plan.nodes[0]['Actual Rows'],0);assert.equal(plan.nodes[0]['Heap Fetches'],0);
 assert.equal(plan.nodes[0].hasIndexCond,true);assert.equal(plan.nodes[0].hasFilter,true);
 assert.equal(plan.nodes[1].parent,0);assert.equal(plan.nodes[1].position,1);
 assert.deepEqual(plan.jit,{functions:4,timings:{Generation:0,Inlining:1,Optimization:2,Emission:3,Total:6}});
 assert.equal(plan.executionMs,3);assert.doesNotMatch(JSON.stringify(plan),/PRIVATE_CUSTOMER|987654321|Output|Options/);
 assert.deepEqual(safeCellPlan({Plan:{'Node Type':'Result'},JIT:{Timings:{Total:8}}}).jit,{functions:0,timings:{Total:8}});
});

test('cell plan export refuses unexpectedly large or cyclic structures',()=>{
 assert.throws(()=>safeCellPlan({Plan:{Plans:Array.from({length:500},()=>({'Node Type':'Result'}))}}),/bound/);
 const cyclic={};cyclic.Plans=[cyclic];assert.throws(()=>safeCellPlan({Plan:cyclic}),/bound/);
});

test('pasteable plan probe embeds the tested helper and keeps its operational bounds',()=>{
 const helper=readFileSync(new URL('../../../docs/qa/maintenance/prepared-cell-plans-2026-10-19.mjs',import.meta.url),'utf8');
 const command=readFileSync(new URL('../../../docs/qa/maintenance/prepared-cell-plans-2026-10-19.sh',import.meta.url),'utf8');
 assert.ok(command.includes(helper));assert.match(command,/max:1/);assert.match(command,/180000/);
 assert.match(command,/Math.min\(configuredTimeout,15000\)/);assert.match(command,/default_transaction_read_only=on/);
 assert.doesNotMatch(command,/ALTER |CREATE INDEX|prepareRevision|activatePrepared/);
});


test('JIT report remeasurement embeds the validated diagnostic and isolates the diagnostic connection option',()=>{
 const helper=readFileSync(new URL('../../../docs/qa/maintenance/prepared-acceptance-diagnosis-2026-10-19.mjs',import.meta.url),'utf8');
 const command=readFileSync(new URL('../../../docs/qa/maintenance/prepared-jit-report-probe-2026-10-19.sh',import.meta.url),'utf8');
 assert.ok(command.includes(helper));
 assert.ok(command.includes("new Pool({...poolOptions,options:poolOptions.options+' -c jit=off'}),baselinePool=new Pool(poolOptions)"));
 assert.match(command,/preparedJit,baselineJit/);assert.match(command,/jit-report-v1/);
 assert.doesNotMatch(command,/ALTER SYSTEM|ALTER DATABASE|ALTER ROLE|prepareRevision|activatePrepared/);
});
