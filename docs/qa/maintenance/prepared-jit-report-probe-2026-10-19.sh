#!/usr/bin/env bash
# Bounded report remeasurement. JIT disabled only on dedicated diagnostic prepared connections; no deployment or preparation.
set -euo pipefail
cd /opt/el-dabboos/analytics
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
test "$(docker inspect --format '{{.Config.Image}} {{.State.Status}}' el-dabboos-staging-api-1)" = 'el-dabboos-api:6d400594998d2b9e5fae42cd7e33045ec688c619 running'
docker exec -i el-dabboos-staging-api-1 node --experimental-transform-types --disable-warning=ExperimentalWarning --input-type=module <<'BOUNDED_PREPARED_DIAGNOSIS'
import assert from 'node:assert/strict';

export function latencyGate(firstMs,repeatMs,baselineMs){
 assert.ok([firstMs,repeatMs,baselineMs].every(value=>Number.isFinite(value)&&value>=0),'Valid timings required');
 return {absolute:firstMs<=5000&&repeatMs<=3000,noRegression:firstMs<=baselineMs&&repeatMs<=baselineMs};
}
/** Values and identities remain in memory; only mismatch categories leave this function. */
export function rowDifferences(expected,actual){
 const left=new Map(expected.map(row=>[row.key,row])),right=new Map(actual.map(row=>[row.key,row]));
 const shared=[...left.keys()].filter(key=>right.has(key));
 const numeric=shared.filter(key=>left.get(key).value!==right.get(key).value);
 return {expectedRows:expected.length,actualRows:actual.length,
  duplicateExpected:expected.length-left.size,duplicateActual:actual.length-right.size,
  missingIdentities:[...left.keys()].filter(key=>!right.has(key)).length,
  extraIdentities:[...right.keys()].filter(key=>!left.has(key)).length,
  nullDifferences:numeric.filter(key=>left.get(key).value===null||right.get(key).value===null).length,
  numericDifferences:numeric.filter(key=>left.get(key).value!==null&&right.get(key).value!==null).length,
  otherFieldDifferences:shared.filter(key=>{const {key:expectedKey,value:expectedValue,...expectedFields}=left.get(key),{key:actualKey,value:actualValue,...actualFields}=right.get(key);void expectedKey;void expectedValue;void actualKey;void actualValue;return !equal(expectedFields,actualFields);}).length,
  orderDiffers:JSON.stringify(expected.map(row=>row.key))!==JSON.stringify(actual.map(row=>row.key))};
}
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='executedAt').sort(([left],[right])=>left.localeCompare(right)).map(([key,item])=>[key,canonical(item)]));
 return value;
}
const equal=(left,right)=>JSON.stringify(canonical(left))===JSON.stringify(canonical(right));
export function metadataDifferences(expected,actual){
 const fields=[...new Set([...Object.keys(expected),...Object.keys(actual)])].filter(key=>key!=='executedAt'&&!equal(expected[key],actual[key]));
 const releaseKeys=['datasetId','sourceId','mappingId','mappingVersion','certificationReference','outputCertificationReference'];
 return {fields,...(fields.includes('coverage')?{coverage:{baseline:expected.coverage,prepared:actual.coverage}}:{}),
  ...(fields.includes('release')?{release:{baselinePeriod:expected.release?.period,preparedPeriod:actual.release?.period,
   baselineSelection:expected.release?.selectionSemantics,preparedSelection:actual.release?.selectionSemantics,
   identifierFieldsEqual:Object.fromEntries(releaseKeys.map(key=>[key,equal(expected.release?.[key],actual.release?.[key])]))}}:{})};
}
export function profilePool(pool,guardPrepared=false){
 const samples={};let historyAttempts=0;
 const originalConnect=pool.connect.bind(pool);
 pool.connect=callback=>{
  const start=performance.now();
  if(typeof callback==='function')return originalConnect((error,client,release)=>{
   record('poolWait',performance.now()-start);callback(error,client,release);
  });
  return originalConnect().then(client=>{record('poolWait',performance.now()-start);return client;},error=>{record('poolWait',performance.now()-start);throw error;});
 };
 function record(category,ms){const sample=samples[category]??={calls:0,ms:0};sample.calls++;sample.ms+=ms;}
 pool.on('connect',client=>{
  const query=client.query.bind(client);
  client.query=(...args)=>{
   const sql=typeof args[0]==='string'?args[0]:args[0]?.text??'';
   if(guardPrepared&&/\b(review_facts|review_controls|analytics_fact_heads|analytics_fact_revisions|finance_snapshot_customers|prepared_input_rows|prepared_expected_cells|prepared_work_[a-z_]+)\b/i.test(sql)){
    historyAttempts++;throw new Error('Prepared history access blocked');
   }
   const category=/\bprepared_cells\b/.test(sql)?'preparedCells':/analytics_partitions|analytics_baselines|finance_snapshot_evidence|review_extractions/.test(sql)?'publication':/BEGIN|COMMIT|set_config/.test(sql)?'transaction':'guardsAndBindings';
   const start=performance.now(),callback=args.at(-1);
   if(typeof callback==='function'){
    args[args.length-1]=(...result)=>{record(category,performance.now()-start);callback(...result);};
    try{return query(...args);}catch(error){record(category,performance.now()-start);throw error;}
   }
   try{return Promise.resolve(query(...args)).finally(()=>record(category,performance.now()-start));}
   catch(error){record(category,performance.now()-start);throw error;}
  };
 });
 return {reset(){for(const key of Object.keys(samples))delete samples[key];},snapshot(){return {historyAttempts,samples:structuredClone(samples)};}};
}
const completeSnapshotSql=`WITH observations AS MATERIALIZED (
 SELECT DISTINCT ON(control.measure_id) control.measure_id,member.partition_id,control.expected_value,control.expected_count,
 least((member.month+interval '1 month - 1 day')::date,(part.capabilities->'releases'->0->'period'->>'to')::date)::text observation_day
 FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id) JOIN mart.review_controls control USING(tenant_id,partition_id)
 WHERE member.tenant_id=$1 AND member.revision_id=$2 AND member.family='business' AND extraction.definition_version=$5
 AND control.measure_id=$3 AND control.scope_key='summary'
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') rule WHERE rule->>'measureId'=control.measure_id)
 AND least((member.month+interval '1 month - 1 day')::date,(part.capabilities->'releases'->0->'period'->>'to')::date)<=$4::date
 ORDER BY control.measure_id,observation_day DESC
 ),population AS MATERIALIZED (
 SELECT fact.amount,fact.dimensions->>'customer' customer FROM observations observation JOIN mart.review_facts fact
 ON fact.tenant_id=$1 AND fact.partition_id=observation.partition_id AND fact.measure_id=observation.measure_id AND fact.business_day=observation.observation_day
 ),customers AS (SELECT customer,sum(amount)::text value FROM population WHERE customer IS NOT NULL GROUP BY customer)
 SELECT 'customer' kind,customer key,value,NULL::boolean exact FROM (SELECT * FROM customers ORDER BY customer COLLATE "C" LIMIT 4001) bounded
 UNION ALL SELECT 'total',NULL,CASE WHEN EXISTS(SELECT 1 FROM observations) THEN coalesce(sum(amount),0)::text END,
 coalesce(sum(amount),0)=(SELECT expected_value FROM observations) AND count(*)=(SELECT expected_count FROM observations) FROM population`;

export async function diagnosePreparedAcceptance(scope,deps){
 const {prepared,baseline,read,context,revision,emit,preparedProfile,baselineProfile}=scope;
 const check=()=>read(async client=>{
  const state=(await client.query(`SELECT trusted.revision_id,
   EXISTS(SELECT 1 FROM mart.prepared_revision_seals WHERE tenant_id=$1 AND revision_id=$2) sealed,
   EXISTS(SELECT 1 FROM mart.prepared_activation WHERE tenant_id=$1) activated
   FROM mart.analytics_trusted_serving trusted WHERE tenant_id=$1`,[context.tenantId,revision])).rows[0];
  assert.ok(state?.revision_id===revision&&state.sealed&&!state.activated,'Expected sealed inactive publication changed');
 });
 emit({stage:'publicationStateCheckStarted'});await check();
 emit({stage:'preparedCapabilitiesStarted'});
 const capabilities=await prepared.getPublishedCapabilities(context);
 emit({stage:'baselineCapabilitiesStarted'});
 const reference=await baseline.getPublishedCapabilities(context);
 for(const [report,dateRange] of [['customer-debt-aging',{from:'2026-09-01',to:'2026-09-30'}],['product-invoice-performance',{from:'2026-01-01',to:'2026-01-31'}]]){
  await check();
  const source=deps.dashboardTemplates.find(template=>template.id===report);assert.ok(source);
  const template=deps.supportedPurposeTemplate(source,capabilities);
  const spec={schemaVersion:2,id:report,title:template.name,locale:'ar',filters:{dateRange},widgets:template.widgets,layout:template.layout};
  const now=new Date();deps.assertPublishedDashboard(spec,capabilities,'Asia/Baghdad',now);deps.assertPublishedDashboard(spec,reference,'Asia/Baghdad',now);
  const runs={};
  for(const mode of ['first','repeat','baseline']){
   const profile=mode==='baseline'?baselineProfile:preparedProfile;profile.reset();
   emit({stage:'reportStarted',report,mode});const start=performance.now();
   const result=await new deps.DashboardExecutor(mode==='baseline'?baseline:prepared,()=>now).execute(spec,context,{timeZone:'Asia/Baghdad'});
   assert.equal(result.metadata.failedSeries,0);assert.equal(result.metadata.servingRevision,revision);
   runs[mode]={result,ms:performance.now()-start};
   emit({stage:'reportProfile',report,mode,executorMs:runs[mode].ms,...profile.snapshot(),timingMeaning:'SQL and pool wait are accumulated durations across calls and can overlap; do not add them to executor wall time'});
  }
  const differences=[];
  for(const [widgetId,widget] of Object.entries(runs.baseline.result.widgetResults))for(const [seriesId,expected] of Object.entries(widget.seriesResults)){
   const actual=runs.first.result.widgetResults[widgetId]?.seriesResults[seriesId];assert.ok(expected.status==='success'&&actual?.status==='success');
   if(!equal(expected.result,actual.result))differences.push({widget:widgetId,series:seriesId,rows:rowDifferences(expected.result.rows,actual.result.rows),metadata:metadataDifferences(expected.result.metadata,actual.result.metadata)});
  }
  emit({stage:'reportComparison',report,completeEqual:equal(runs.baseline.result,runs.first.result),stableRepeat:equal(runs.first.result,runs.repeat.result),gate:latencyGate(runs.first.ms,runs.repeat.ms,runs.baseline.ms),differences});
 }
 for(const metric of ['review_customer_balance','receivable_unknown_due','positive_receivable_not_due','positive_due_0_30','positive_due_over_90']){
  await check();
  const dateRange={from:'2026-09-01',to:'2026-09-30'};
  emit({stage:'completeSnapshotReconciliationStarted',metric});
  const source=await read(client=>client.query(completeSnapshotSql,[context.tenantId,revision,metric,dateRange.to,deps.businessDefinitionVersion()]));
  const total=source.rows.find(row=>row.kind==='total'),rows=source.rows.filter(row=>row.kind==='customer').map(row=>({key:row.key,value:deps.numericOutput(row.value)})).sort((left,right)=>left.key<right.key?-1:left.key>right.key?1:0);
  assert.ok(rows.length<=4000,'Canonical customer comparison exceeded report group bound');
  const canonicalTotal=[{key:null,value:deps.numericOutput(total.value)}],query={metric,dateRange};
  const preparedTotal=await prepared.execute(query,context,{revision}),preparedDetail=await prepared.execute({...query,groupBy:'customer'},context,{revision});
  const baselineTotal=await baseline.execute(query,context,{revision}),baselineDetail=await baseline.execute({...query,groupBy:'customer'},context,{revision});
  emit({stage:'completeSnapshotReconciliation',metric,acceptedControlsExact:total.exact===true,
   preparedTotalEqual:equal(canonicalTotal,preparedTotal.rows),baselineTotalEqual:equal(canonicalTotal,baselineTotal.rows),
   preparedDetail:rowDifferences(rows,preparedDetail.rows),baselineDetail:rowDifferences(rows,baselineDetail.rows)});
 }
 emit({stage:'factMetadataPairStarted'});
 const query={metric:'net_invoiced_revenue',dateRange:{from:'2026-01-01',to:'2026-10-19'}};
 const old=await baseline.execute(query,context,{revision}),candidate=await prepared.execute(query,context,{revision});
 emit({stage:'factMetadataPair',metric:query.metric,rows:rowDifferences(old.rows,candidate.rows),metadata:metadataDifferences(old.metadata,candidate.metadata)});
 const history=capabilities.releases.filter(release=>release.period&&release.capabilities.some(capability=>capability.metric==='period_net_sales')).sort((left,right)=>Date.parse(right.period.to)-Date.parse(right.period.from)-(Date.parse(left.period.to)-Date.parse(left.period.from)))[0];
 if(history){
  emit({stage:'businessMetadataPairStarted'});
  const eventQuery={metric:'period_net_sales',groupBy:'month',dateRange:history.period};
  const previous=await baseline.execute(eventQuery,context,{revision}),current=await prepared.execute(eventQuery,context,{revision});
  emit({stage:'businessMetadataPair',metric:eventQuery.metric,rows:rowDifferences(previous.rows,current.rows),metadata:metadataDifferences(previous.metadata,current.metadata)});
 }
 await check();emit({stage:'boundedDiagnosisComplete',activationPerformed:false});
}

import {createRequire} from 'node:module';
const {Pool}=createRequire('/workspace/packages/data/package.json')('pg');
const app=await import('/workspace/packages/application/src/index.ts');
const {PreparedAnalyticsRepository}=await import('/workspace/packages/data/src/prepared/repository.ts');
const {TrustedAnalyticsRepository}=await import('/workspace/packages/data/src/operational/repository.ts');
const {verifyMartRuntimeRole,tenantTransaction}=await import('/workspace/packages/data/src/postgres/session.ts');
const {businessDefinitionVersion}=await import('/workspace/packages/data/src/business/definitions.ts');
const {numericOutput}=await import('/workspace/packages/data/src/postgres/sql.ts');
let lastProgress={stage:'initialization'};
const emit=record=>{lastProgress={stage:record.stage,...(record.report?{report:record.report}:{}),...(record.mode?{mode:record.mode}:{}),...(record.metric?{metric:record.metric}:{})};console.log(JSON.stringify(record));};
let target;try{target=new URL(process.env.MART_RUNTIME_URL);}catch{throw new Error('Invalid protected runtime target');}
assert.ok(target.hostname==='postgres'&&target.pathname==='/el_dabboos_analytics_staging','Unexpected database target');
const configuredMax=Number(process.env.MART_POOL_MAX??8),configuredTimeout=Number(process.env.MART_STATEMENT_TIMEOUT_MS??15000);
assert.ok(Number.isInteger(configuredMax)&&configuredMax>=1&&configuredMax<=64&&Number.isInteger(configuredTimeout)&&configuredTimeout>=1&&configuredTimeout<=120000,'Invalid runtime bounds');
const max=Math.min(configuredMax,8),timeout=Math.min(configuredTimeout,15000);
target.searchParams.set('application_name','el-dabboos-prepared-jit-report-probe');
const poolOptions={connectionString:target.toString(),max,connectionTimeoutMillis:5000,options:`-c default_transaction_read_only=on -c statement_timeout=${timeout}`};
const preparedPool=new Pool({...poolOptions,options:poolOptions.options+' -c jit=off'}),baselinePool=new Pool(poolOptions);
const preparedProfile=profilePool(preparedPool,true),baselineProfile=profilePool(baselinePool);
for(const pool of [preparedPool,baselinePool])pool.on('error',()=>{emit({stage:'readOnlyConnectionFailed'});process.exit(1);});
const deadline=setTimeout(()=>{emit({stage:'diagnosisDeadlineExceeded',lastProgress,prepared:preparedProfile.snapshot(),baseline:baselineProfile.snapshot(),activationPerformed:false});process.exit(124);},180000);
try{
 emit({stage:'startupRoleCheckStarted',repository:'prepared',diagnosticVersion:'jit-report-v1'});
 await verifyMartRuntimeRole(preparedPool);
 emit({stage:'startupRoleCheckStarted',repository:'baseline',diagnosticVersion:'jit-report-v1'});
 await verifyMartRuntimeRole(baselinePool);
 const preparedJit=(await preparedPool.query('SHOW jit')).rows[0].jit,baselineJit=(await baselinePool.query('SHOW jit')).rows[0].jit;
 assert.equal(preparedJit,'off');
 emit({stage:'startupRoleChecksComplete',diagnosticVersion:'jit-report-v1',preparedJit,baselineJit,jitScope:'Dedicated diagnostic prepared connections only; installed code unchanged'});
 const context={tenantId:'el-dabboos-iq',locale:'ar'},revision='6eb4a954-7437-4774-98f2-dae23d60bd81';
 const read=operation=>tenantTransaction(baselinePool,context.tenantId,operation,true,timeout);
 const options={reportingCurrencies:{[context.tenantId]:'IQD'},statementTimeoutMs:timeout,maxGroups:4000};
 const prepared=new PreparedAnalyticsRepository(preparedPool,options),baseline=new TrustedAnalyticsRepository(baselinePool,options);
 emit({stage:'boundedReadOnlyDiagnosisStarted',revision,max,statementTimeoutMs:timeout,workerDeadlineMs:180000,noSourceAccess:true,activationPerformed:false});
 await diagnosePreparedAcceptance({prepared,baseline,read,context,revision,emit,preparedProfile,baselineProfile},{...app,businessDefinitionVersion,numericOutput});
 assert.equal(preparedProfile.snapshot().historyAttempts,0);
}catch(error){
 const code=typeof error?.code==='string'&&/^[A-Z0-9_]+$/.test(error.code)?error.code:'DIAGNOSIS_STOPPED';
 emit({code,lastProgress,stage:'diagnosisStopped',reason:'Pinned state, capability, timeout or read-only check failed; no activation',activationPerformed:false});process.exitCode=1;
}finally{clearTimeout(deadline);await Promise.all([preparedPool.end(),baselinePool.end()]);}

BOUNDED_PREPARED_DIAGNOSIS
