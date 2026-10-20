#!/usr/bin/env bash
# Three prepared-cell query plans only; no deployment, preparation, persistent settings or activation.
set -euo pipefail
cd /opt/el-dabboos/analytics
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
test "$(docker inspect --format '{{.Config.Image}} {{.State.Status}}' el-dabboos-staging-api-1)" = 'el-dabboos-api:6d400594998d2b9e5fae42cd7e33045ec688c619 running'
docker exec -i el-dabboos-staging-api-1 node --experimental-transform-types --disable-warning=ExperimentalWarning --input-type=module <<'PREPARED_CELL_PLAN_PROBE'
import assert from 'node:assert/strict';

/** EXPLAIN expressions can contain customer identifiers; export only structural fields and counters. */
export function safeCellPlan(document){
 const nodes=[];
 const numericFields=['Plan Rows','Total Cost','Actual Rows','Actual Loops','Rows Removed by Filter','Rows Removed by Join Filter','Heap Fetches','Shared Hit Blocks','Shared Read Blocks','Temp Read Blocks','Temp Written Blocks'];
 const stringFields=['Node Type','Relation Name','Index Name','Join Type','Parent Relationship','Subplan Name','Sort Method'];
 function visit(node,parent,depth){
  assert.ok(node&&typeof node==='object'&&depth<=50&&nodes.length<500,'Plan structure exceeded diagnostic bound');
  const position=nodes.length,output={position,parent};
  for(const field of numericFields)if(typeof node[field]==='number'&&Number.isFinite(node[field]))output[field]=node[field];
  for(const field of stringFields)if(typeof node[field]==='string'&&/^[A-Za-z0-9_ .-]{1,128}$/.test(node[field]))output[field]=node[field];
  for(const field of ['Index Cond','Filter','Join Filter','Hash Cond'])output['has'+field.replaceAll(' ','')]=typeof node[field]==='string';
  nodes.push(output);for(const child of node.Plans??[])visit(child,position,depth+1);
 }
 visit(document.Plan,null,0);
 const timings={};for(const field of ['Generation','Inlining','Optimization','Emission','Total'])if(typeof document.JIT?.Timing?.[field]==='number')timings[field]=document.JIT.Timing[field];
 for(const field of ['Generation','Inlining','Optimization','Emission','Total'])if(typeof document.JIT?.Timings?.[field]==='number')timings[field]=document.JIT.Timings[field];
 return {planningMs:document['Planning Time'],executionMs:document['Execution Time'],jit:{functions:document.JIT?.Functions??0,timings},nodes};
}
const cases=[
 {name:'product-invoice-detail',query:{metric:'net_invoiced_revenue',groupBy:'product',dateRange:{from:'2026-01-01',to:'2026-01-31'},analysis:{topN:{direction:'top',limit:10}}}},
 {name:'customer-debt-detail',query:{metric:'review_customer_balance',groupBy:'customer',dateRange:{from:'2026-09-01',to:'2026-09-30'},analysis:{topN:{direction:'top',limit:100}}}},
 {name:'customer-debt-summary',query:{metric:'review_customer_balance',dateRange:{from:'2026-09-01',to:'2026-09-30'}}}
];
export async function probePreparedCellPlans(scope,deps){
 const {context,revision,read,emit}=scope;
 async function state(){return read(async client=>{
  const row=(await client.query(`SELECT trusted.revision_id,
   EXISTS(SELECT 1 FROM mart.prepared_revision_seals WHERE tenant_id=$1 AND revision_id=$2) sealed,
   EXISTS(SELECT 1 FROM mart.prepared_activation WHERE tenant_id=$1) activated
   FROM mart.analytics_trusted_serving trusted WHERE tenant_id=$1`,[context.tenantId,revision])).rows[0];
  assert.ok(row?.revision_id===revision&&row.sealed&&!row.activated,'Expected sealed inactive publication changed');
 });}
 await state();
 for(const item of cases){
  emit({stage:'cellPlanCaseStarted',case:item.name,metric:item.query.metric,groupBy:item.query.groupBy??null});
  await read(async client=>{
   deps.validateQuery(item.query,context);
   const publication=await deps.preparedPublication(client,context,revision),{family,release}=deps.preparedQueryRelease(item.query,context,publication);
   assert.ok(family==='review'||family==='business','Expected representative prepared family changed');
   const captured=[],marker=new Error('Internal cell plan capture');
   const observed={query(...args){
    const text=typeof args[0]==='string'?args[0]:args[0]?.text??'';
    if(/\bmart\.prepared_cells\b/.test(text)){captured.push({text,params:args[1]});throw marker;}
    return client.query(...args);
   }};
   try{
    await deps.readPreparedSelection(observed,{query:item.query,context,range:item.query.dateRange??release.period,family,maxGroups:4000,timeBuckets:'observed',read:{revision}});
   }catch(error){if(error!==marker)throw error;}
   assert.equal(captured.length,1,'Expected exactly one captured cell statement');
   const statement=captured[0],segments=JSON.parse(statement.params[1]);
   emit({stage:'cellPlanSelection',case:item.name,family,segments:segments.map(segment=>({timeGrain:segment.time_grain,grainDimensions:JSON.parse(segment.grain_id),from:segment.from,to:segment.to})),datasetCount:new Set(segments.map(segment=>segment.data_id)).size});
   const jit=(await client.query('SHOW jit')).rows[0].jit;assert.ok(jit==='on'||jit==='off');
   async function explain(mode){
    emit({stage:'cellPlanExplainStarted',case:item.name,mode});
    const began=performance.now(),result=await client.query('EXPLAIN (ANALYZE,BUFFERS,TIMING OFF,SUMMARY ON,FORMAT JSON) '+statement.text,statement.params);
    const plan=safeCellPlan(result.rows[0]['QUERY PLAN'][0]);
    emit({stage:'cellPlan',case:item.name,mode,wallMs:performance.now()-began,...plan});return plan;
   }
   const native=await explain('native');
   if(jit==='on'&&native.jit.functions>0){
    await client.query("SELECT set_config('jit','off',true)");
    await explain('transaction-jit-off');
    await client.query("SELECT set_config('jit',$1,true)",[jit]);
    await explain('native-repeat');
   }
  });
  await state();
 }
 emit({stage:'preparedCellPlanProbeComplete',activationPerformed:false,measurement:'Sequential SQL plans on sealed data; not report/browser latency. JIT off is transaction-local and only compared when native SQL actually uses JIT.'});
}

import {createRequire} from 'node:module';
const {Pool}=createRequire('/workspace/packages/data/package.json')('pg');
const {validateQuery}=await import('/workspace/packages/domain/src/index.ts');
const {verifyMartRuntimeRole,tenantTransaction}=await import('/workspace/packages/data/src/postgres/session.ts');
const {preparedPublication,preparedQueryRelease}=await import('/workspace/packages/data/src/prepared/publication-metadata.ts');
const {readPreparedSelection}=await import('/workspace/packages/data/src/prepared/selection.ts');
let lastProgress={stage:'initialization'};
const emit=record=>{lastProgress={stage:record.stage,...(record.case?{case:record.case}:{}),...(record.mode?{mode:record.mode}:{})};console.log(JSON.stringify(record));};
let target;try{target=new URL(process.env.MART_RUNTIME_URL);}catch{throw new Error('Invalid protected runtime target');}
assert.ok(target.hostname==='postgres'&&target.pathname==='/el_dabboos_analytics_staging','Unexpected database target');
const configuredTimeout=Number(process.env.MART_STATEMENT_TIMEOUT_MS??15000);
assert.ok(Number.isInteger(configuredTimeout)&&configuredTimeout>=1&&configuredTimeout<=120000);
const timeout=Math.min(configuredTimeout,15000);
target.searchParams.set('application_name','el-dabboos-prepared-cell-plans');
const pool=new Pool({connectionString:target.toString(),max:1,connectionTimeoutMillis:5000,options:`-c default_transaction_read_only=on -c statement_timeout=${timeout}`});
let historyAttempts=0;
pool.on('connect',client=>{const query=client.query.bind(client);client.query=(...args)=>{
 const sql=typeof args[0]==='string'?args[0]:args[0]?.text??'';
 if(/\b(review_facts|review_controls|analytics_fact_heads|analytics_fact_revisions|finance_snapshot_customers|prepared_input_rows|prepared_expected_cells|prepared_work_[a-z_]+)\b/i.test(sql)){historyAttempts++;throw new Error('Prepared history access blocked');}
 return query(...args);
};});
pool.on('error',()=>{emit({stage:'readOnlyConnectionFailed'});process.exit(1);});
const deadline=setTimeout(()=>{emit({stage:'cellPlanDeadlineExceeded',lastProgress,historyAttempts,activationPerformed:false});process.exit(124);},180000);
try{
 emit({stage:'cellPlanStartup',version:'cell-plans-v1',statementTimeoutMs:timeout,workerDeadlineMs:180000});
 await verifyMartRuntimeRole(pool);
 const context={tenantId:'el-dabboos-iq',locale:'ar'},revision='6eb4a954-7437-4774-98f2-dae23d60bd81';
 const read=operation=>tenantTransaction(pool,context.tenantId,operation,true,timeout);
 await probePreparedCellPlans({context,revision,read,emit},{validateQuery,preparedPublication,preparedQueryRelease,readPreparedSelection});
 assert.equal(historyAttempts,0);emit({stage:'preparedCellAccessVerified',historyAttempts,activationPerformed:false});
}catch(error){
 const code=typeof error?.code==='string'&&/^[A-Z0-9_]+$/.test(error.code)?error.code:'CELL_PLAN_STOPPED';
 emit({stage:'cellPlanStopped',code,lastProgress,historyAttempts,activationPerformed:false});process.exitCode=1;
}finally{clearTimeout(deadline);await pool.end();}

PREPARED_CELL_PLAN_PROBE
