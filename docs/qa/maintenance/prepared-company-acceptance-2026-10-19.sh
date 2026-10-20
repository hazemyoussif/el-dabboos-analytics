#!/usr/bin/env bash
# Full read-only acceptance of one reviewed deployed candidate; never prepares or activates data.
set -euo pipefail
if [[ "${1:-}" != '--worker' ]]; then
  candidate=${1:?Usage: bash prepared-company-acceptance-2026-10-19.sh REVIEWED_COMMIT_SHA}
  [[ "$candidate" =~ ^[0-9a-f]{40}$ ]] || exit 2
  unit="el-dabboos-prepared-candidate-qa-$(date -u +%Y%m%dT%H%M%SZ)"
  state=$(mktemp -d "/opt/el-dabboos/state/${unit}-XXXXXX")
  cp -- "${BASH_SOURCE[0]}" "$state/run.sh"
  chmod 700 "$state/run.sh"
  systemd-run --unit="$unit" --property=RuntimeMaxSec=960 --collect /bin/bash "$state/run.sh" --worker "$candidate" "$state"
  printf 'Acceptance unit: %s.service\nOutput: %s/acceptance.log\n' "$unit" "$state"
  printf 'Read results with: tail -n 8 %q/acceptance.log\n' "$state"
  exit 0
fi
candidate=${2:?Reviewed candidate SHA required}
state=${3:?Output directory required}
[[ "$candidate" =~ ^[0-9a-f]{40}$ ]] || exit 2
exec >"$state/acceptance.log" 2>&1
cd /opt/el-dabboos/analytics
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
test "$(docker inspect --format '{{.Config.Image}} {{.State.Status}}' el-dabboos-staging-api-1)" = "el-dabboos-api:$candidate running"
docker exec -i el-dabboos-staging-api-1 node --experimental-transform-types --disable-warning=ExperimentalWarning --input-type=module <<'PREPARED_CANDIDATE_ACCEPTANCE'
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

export function canonical(value) {
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='executedAt').sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
 return value;
}
export const fingerprint=value=>createHash('sha256').update(JSON.stringify(canonical(value))??'undefined').digest('hex');
export function differences(expected,actual) {
 const result=[];
 for(const id of new Set([...Object.keys(expected.widgetResults),...Object.keys(actual.widgetResults)])){
  const left=expected.widgetResults[id],right=actual.widgetResults[id];
  if(!left||!right){result.push({widget:id,fields:['widgetPresence']});continue;}
  if(fingerprint(left.alignedRows)!==fingerprint(right.alignedRows))result.push({widget:id,fields:['alignedRows']});
  if(left.status!==right.status||fingerprint(left.window)!==fingerprint(right.window))result.push({widget:id,fields:['statusOrWindow']});
  for(const series of new Set([...Object.keys(left.seriesResults),...Object.keys(right.seriesResults)])){
   const a=left.seriesResults[series],b=right.seriesResults[series],fields=[];
   if(!a||!b||a.status!==b.status)fields.push('seriesPresenceOrStatus');
   else if(a.status==='success'){
    for(const key of ['metric','groupBy','rows'])if(fingerprint(a.result[key])!==fingerprint(b.result[key]))fields.push(key);
    for(const key of new Set([...Object.keys(a.result.metadata),...Object.keys(b.result.metadata)]))if(key!=='executedAt'&&fingerprint(a.result.metadata[key])!==fingerprint(b.result.metadata[key]))fields.push('metadata.'+key);
   }else if(fingerprint(a)!==fingerprint(b))fields.push('error');
   if(fields.length)result.push({widget:id,series,fields});
  }
 }
 for(const key of new Set([...Object.keys(expected.metadata),...Object.keys(actual.metadata)]))if(key!=='executedAt'&&fingerprint(expected.metadata[key])!==fingerprint(actual.metadata[key]))result.push({fields:['executionMetadata.'+key]});
 return result;
}
function observeRepository(repository,counters) {
 return {supportsResultWindows:true,...(repository.servingRevision?{servingRevision:repository.servingRevision}:{}),
  ...(repository.verifyExecution?{verifyExecution:()=>repository.verifyExecution()}:{}),
  ...(repository.createExecutionScope?{createExecutionScope:async context=>observeRepository(await repository.createExecutionScope(context),counters)}:{}),
  async execute(...args){counters.calls++;counters.active++;counters.peak=Math.max(counters.peak,counters.active);try{return await repository.execute(...args);}finally{counters.active--;}}
 };
}
function resultSummary(result,revision) {
 let rows=0,nonNull=0,emptySeries=0,allPinned=result.metadata.servingRevision===revision;const errors=[];
 for(const [widgetId,widget] of Object.entries(result.widgetResults))for(const [seriesId,series] of Object.entries(widget.seriesResults)){
  if(series.status==='success'){
   rows+=series.result.rows.length;nonNull+=series.result.rows.filter(row=>row.value!==null).length;
   if(!series.result.rows.length)emptySeries++;
   if(series.result.metadata.servingRevision!==revision)allPinned=false;
  }else errors.push({widget:widgetId,series:seriesId,code:series.error.code});
 }
 return {succeededWidgets:result.metadata.succeeded,failedWidgets:result.metadata.failed,succeededSeries:result.metadata.succeededSeries,failedSeries:result.metadata.failedSeries,rows,nonNull,emptySeries,allPinned,errors};
}

/** Read-only acceptance uses the installed governed executor and repositories. */
export async function runPreparedReportAcceptance(scope,deps) {
 const {prepared,baseline,read,tenant,revision,emit}=scope;
 const {DashboardExecutor,dashboardTemplates,supportedPurposeTemplate,templateCompatibility,supportedTemplatePeriod,assertPublishedDashboard,readPreparedSelection,preparedPublication,trustedMetricMonths}=deps;
 const context={tenantId:tenant,locale:'ar'},now=new Date(),timeZone='Asia/Baghdad';
 const checkState=()=>read(async client=>{
  const row=(await client.query(`SELECT trusted.revision_id,
   EXISTS(SELECT 1 FROM mart.prepared_revision_seals WHERE tenant_id=$1 AND revision_id=$2) sealed,
   EXISTS(SELECT 1 FROM mart.prepared_activation WHERE tenant_id=$1) activated,
   (SELECT count(*)::int FROM mart.prepared_bindings WHERE tenant_id=$1 AND revision_id=$2) bindings
   FROM mart.analytics_trusted_serving trusted WHERE trusted.tenant_id=$1`,[tenant,revision])).rows[0];
  assert.ok(row?.revision_id===revision&&row.sealed&&!row.activated&&row.bindings===scope.expectedBindings,'Expected current sealed inactive publication changed');return row;
 });
 await checkState();
 const window=await read(async client=>(await client.query('SELECT from_day::text AS "from",through_day::text AS "to" FROM mart.prepared_reporting_windows WHERE tenant_id=$1',[tenant])).rows[0]);
 if(scope.expectedReportingWindow)assert.deepEqual(window,scope.expectedReportingWindow,'Registered reporting window changed');
 emit({stage:'Expected result contract',reportingWindow:window??null,projection:'Only coverage dates and release reporting period; all data and source authority compared exactly'});
 const began=performance.now(),published=await prepared.getPublishedCapabilities(context),reference=await baseline.getPublishedCapabilities(context);
 const year={...published,releases:published.releases.flatMap(release=>{
  if(!release.period)return [];
  const from=release.period.from<'2026-01-01'?'2026-01-01':release.period.from,to=release.period.to>'2026-12-31'?'2026-12-31':release.period.to;
  return from<=to?[{...release,period:{from,to}}]:[];
 })};
 emit({stage:'Published capability discovery',ms:Math.round(performance.now()-began),releases:published.releases.length});
 const reports=[],catalog=[];
 for(const source of dashboardTemplates){
  const template=supportedPurposeTemplate(source,year),compatibility=templateCompatibility(template,year),period=supportedTemplatePeriod(template,year);
  if(compatibility.status!=='supported'||!period){catalog.push({report:source.id,status:compatibility.status,missing:compatibility.missing});continue;}
  reports.push({template,period});catalog.push({report:source.id,status:'supported',period,widgets:template.widgets.length});
 }
 emit({stage:'Complete template catalog',supported:reports.length,unavailable:catalog.filter(item=>item.status!=='supported').length,templates:catalog});
 assert.ok(reports.length>0,'No supported reports available');
 if(scope.expectedReports!==undefined)assert.equal(reports.length,scope.expectedReports,'Supported report catalog changed');
 const required=scope.requiredReports??['executive-sales-invoicing','receivables-aging','customer-debt-aging','customer-cash-collections','historical-executive-trend'];
 const missing=required.filter(id=>!reports.some(item=>item.template.id===id));
 let passing=missing.length===0,comparisons=0;const reportResults=[];
 if(missing.length)emit({stage:'Required reports unavailable; acceptance blocked',reports:missing});
 for(const {template,period} of reports){
  await checkState();
  const spec={schemaVersion:2,id:template.id,title:template.name,locale:'ar',filters:{dateRange:period},widgets:template.widgets,layout:template.layout};
  assertPublishedDashboard(spec,published,timeZone,now);assertPublishedDashboard(spec,reference,timeZone,now);
  const runs={};
  for(const mode of ['first','repeat','baseline']){
   const counters={calls:0,active:0,peak:0},repository=mode==='baseline'?baseline:prepared;
   emit({stage:'Report execution started',report:template.id,mode,period});
   const started=performance.now(),result=await new DashboardExecutor(observeRepository(repository,counters),()=>now).execute(spec,context,{timeZone});
   runs[mode]={result,ms:performance.now()-started,...counters,summary:resultSummary(result,revision)};
  }
  const expected=referenceExecutionForWindow(runs.baseline.result,window),nativeDiff=differences(runs.baseline.result,runs.first.result);
  const firstDiff=differences(expected,runs.first.result),repeatDiff=differences(runs.first.result,runs.repeat.result);
  const statuses=Object.values(runs).every(run=>run.summary.failedSeries===0&&run.summary.failedWidgets===0&&run.summary.allPinned&&run.summary.nonNull>0&&run.peak<=8);
  const timing=latencyGate(runs.first.ms,runs.repeat.ms,runs.baseline.ms),latency=timing.absolute&&timing.noRegression;
  const passed=statuses&&latency&&!firstDiff.length&&!repeatDiff.length;
  passing=passing&&passed;comparisons++;
  const row={report:template.id,nameAr:template.name.ar,period,widgets:template.widgets.length,series:template.widgets.reduce((n,w)=>n+w.series.length,0),firstMs:runs.first.ms,repeatMs:runs.repeat.ms,baselineMs:runs.baseline.ms,sameCompleteResults:!firstDiff.length,sameNativeResults:!nativeDiff.length,stableRepeat:!repeatDiff.length,latencyPassed:latency,absoluteLatencyPassed:timing.absolute,regressionPassed:timing.noRegression,passed,
   runs:Object.fromEntries(Object.entries(runs).map(([mode,run])=>[mode,{...run.summary,repositoryCalls:run.calls,peakActive:run.peak}])),differences:firstDiff,nativeDifferences:nativeDiff,repeatDifferences:repeatDiff,
   widgetMetrics:template.widgets.map(w=>({widget:w.id,type:w.type,dimension:w.dimension??null,metrics:w.series.map(s=>s.metric)}))};
  reportResults.push(row);emit({stage:'Report comparison',...row});
 }
 const checks=[];
 async function boundary(name,operation){try{const details=await operation();checks.push({name,passed:true,...details});}catch{checks.push({name,passed:false});passing=false;}}
 await boundary('Explicit2024report request rejected',async()=>{
  await assert.rejects(prepared.execute({metric:'net_invoiced_revenue',dateRange:{from:'2024-12-01',to:'2024-12-31'}},context),/outside prepared reporting coverage/);return {};
 });
 await boundary('January2025opening and effective customer policy',async()=>{
  const metric='net_aged_receivable',dateRange={from:'2025-01-01',to:'2025-01-10'};
  const options=await prepared.searchDimensionOptions('customer',context,{metric,dateRange,limit:1});
  assert.ok(options.values.length>0,'No opening customer population');const id=options.values[0].id;
  const policy={...context,enforcedFilters:[{dimension:'customer',values:[id]}]};
  const scoped=await prepared.searchDimensionOptions('customer',policy,{metric,dateRange,limit:2});
  assert.ok(scoped.values.length>0&&scoped.values.every(value=>value.id===id));
  const total=await prepared.execute({metric,dateRange},policy),detail=await prepared.execute({metric,groupBy:'customer',dateRange},policy),old=await baseline.execute({metric,dateRange},policy);
  assert.ok(detail.rows.length===1&&detail.rows[0].key===id);
  assert.equal(total.rows[0]?.value,detail.rows[0].value);assert.deepEqual(total.rows,old.rows);
  assert.ok(total.metadata.snapshotAsOf&&total.metadata.snapshotAsOf<'2025-01-01');
  return {restrictedCustomerCount:detail.rows.length,snapshotAsOf:total.metadata.snapshotAsOf,baselineValuesMatch:true};
 });
 await boundary('Full2025through2026monthly history',async()=>{
  const candidates=published.releases.filter(r=>r.capabilities.some(c=>c.metric==='net_invoiced_revenue')&&r.period).map(r=>r.period);
  const through=candidates.map(p=>p.to).sort().at(-1);assert.ok(through&&through>='2026-01-01');
  const result=await prepared.execute({metric:'net_invoiced_revenue',groupBy:'month',dateRange:{from:'2025-01-01',to:through}},context);
  const months=(Number(through.slice(0,4))-2025)*12+Number(through.slice(5,7));
  assert.equal(result.rows.length,months);assert.equal(result.rows[0]?.key,'2025-01');assert.equal(result.rows.at(-1)?.key,through.slice(0,7));
  return {months:result.rows.length,from:'2025-01-01',through};
 });
 await boundary('Governed comparison operands:2024excluded,2025retained',async()=>{
  return read(async client=>{
   const publication=await preparedPublication(client,context,revision),release=publication.families.facts.releases.find(r=>r.capabilities.some(c=>c.metric==='net_invoiced_revenue'));
   assert.ok(release?.period);
   const coverage={...release.period,cutoff:publication.sourceCutoff,cutoffDay:publication.cutoffDay,months:await trustedMetricMonths(client,tenant,'net_invoiced_revenue')};
   async function selected(year,comparison){const range={from:year+'-01-01',to:year+'-01-31'},query={metric:'net_invoiced_revenue',groupBy:'month',dateRange:range,...(comparison?{analysis:{comparison:'year_over_year'}}:{})};return readPreparedSelection(client,{query,context,range,family:'facts',coverage,maxGroups:4000,timeBuckets:'complete'});}
   const previous=await selected('2025',false),excluded=await selected('2025',true),current=await selected('2026',true);
   assert.ok(excluded.rows.length&&excluded.rows.every(row=>row.comparisonValue===null));
   assert.ok(previous.rows[0]?.value!==null&&current.rows[0]?.comparisonValue!==null);
   assert.equal(current.rows[0].comparisonValue,previous.rows[0].value);
   return {layer:'governed prepared reader; does not extend public analysis certification',outsideWindowUnavailable:true,inWindowPriorMatches:true};
  });
 });
 emit({stage:'Prepared boundary and policy checks',checks});
 await checkState();
 const summary={stage:'Read-only report acceptance complete; NOT activated',revision,supportedReports:reports.length,comparedReports:comparisons,requiredReportsMissing:missing,passed:passing,failedReports:reportResults.filter(row=>!row.passed).map(row=>row.report),boundaryFailures:checks.filter(c=>!c.passed).map(c=>c.name),measurement:'server executor first/repeat; not browser load, cold-cache or multi-user load evidence',activationPerformed:false};
 emit(summary);return summary;
}


/** Derive expected reporting eligibility from the registered window, preserving source authority and all data. */
export function referenceAnalyticsResultForWindow(result,window){
 const expected=structuredClone(result);
 if(!window)return expected;
 const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value).toISOString().slice(0,10)===value;
 assert.ok(day(window.from)&&day(window.to)&&window.from<=window.to,'Valid registered reporting window required');
 const metadata=expected.metadata;
 if(metadata.coverage){
  const coverage=metadata.coverage;
  assert.ok(day(coverage.from)&&day(coverage.through),'Valid reference coverage required');
  coverage.from=coverage.from<window.from?window.from:coverage.from;
  coverage.through=coverage.through>window.to?window.to:coverage.through;
  assert.ok(coverage.from<=coverage.through,'Reference coverage has no reporting-window intersection');
 }
 if(metadata.release?.period){
  const release=metadata.release,period=release.period;
  assert.ok(day(period.from)&&day(period.to),'Valid reference release period required');
  if(release.selectionSemantics==='latest_snapshot'&&period.to<window.from)release.period={from:window.from,to:window.from};
  else{
   period.from=period.from<window.from?window.from:period.from;period.to=period.to>window.to?window.to:period.to;
   assert.ok(period.from<=period.to,'Reference release has no reporting-window intersection');
  }
 }
 return expected;
}
export function referenceExecutionForWindow(result,window){
 const expected=structuredClone(result);
 for(const widget of Object.values(expected.widgetResults))for(const series of Object.values(widget.seriesResults)){
  if(series.status==='success')series.result=referenceAnalyticsResultForWindow(series.result,window);
 }
 return expected;
}

function latencyGate(firstMs,repeatMs,baselineMs){
 assert.ok([firstMs,repeatMs,baselineMs].every(value=>Number.isFinite(value)&&value>=0),'Valid timings required');
 return {absolute:firstMs<=5000&&repeatMs<=3000,noRegression:firstMs<=baselineMs&&repeatMs<=baselineMs};
}

import {createRequire} from 'node:module';
const {Pool}=createRequire('/workspace/packages/data/package.json')('pg');
const app=await import('/workspace/packages/application/src/index.ts');
const {PreparedAnalyticsRepository}=await import('/workspace/packages/data/src/prepared/repository.ts');
const {TrustedAnalyticsRepository}=await import('/workspace/packages/data/src/operational/repository.ts');
const {verifyMartRuntimeRole,tenantTransaction}=await import('/workspace/packages/data/src/postgres/session.ts');
const {readPreparedSelection}=await import('/workspace/packages/data/src/prepared/selection.ts');
const {preparedPublication}=await import('/workspace/packages/data/src/prepared/publication-metadata.ts');
const {trustedMetricMonths}=await import('/workspace/packages/data/src/operational/trusted-capabilities.ts');
let lastProgress={stage:'initialization'};
const emit=record=>{lastProgress={stage:record.stage,...(record.report?{report:record.report}:{}),...(record.mode?{mode:record.mode}:{})};console.log(JSON.stringify(record));};
const target=new URL(process.env.MART_RUNTIME_URL);
assert.ok(target.hostname==='postgres'&&target.pathname==='/el_dabboos_analytics_staging','Unexpected protected database target');
const configuredMax=Number(process.env.MART_POOL_MAX??8),configuredTimeout=Number(process.env.MART_STATEMENT_TIMEOUT_MS??15000);
assert.ok(Number.isInteger(configuredMax)&&configuredMax>=1&&configuredMax<=64&&Number.isInteger(configuredTimeout)&&configuredTimeout>=1&&configuredTimeout<=120000,'Invalid runtime bounds');
const max=Math.min(configuredMax,8),timeout=Math.min(configuredTimeout,15000);
target.searchParams.set('application_name','el-dabboos-prepared-candidate-acceptance');
const poolOptions={connectionString:target.toString(),max,connectionTimeoutMillis:5000,options:`-c default_transaction_read_only=on -c statement_timeout=${timeout}`};
const preparedPool=new Pool(poolOptions),baselinePool=new Pool(poolOptions);
let historyAttempts=0,cellStatements=0;
preparedPool.on('connect',client=>{const query=client.query.bind(client);client.query=(...args)=>{
 const sql=typeof args[0]==='string'?args[0]:args[0]?.text??'';
 if(/\b(review_facts|review_controls|analytics_fact_heads|analytics_fact_revisions|finance_snapshot_customers|prepared_input_rows|prepared_expected_cells|prepared_work_[a-z_]+)\b/i.test(sql)){historyAttempts++;throw new Error('Prepared history access blocked');}
 if(/\bprepared_cells\b/.test(sql))cellStatements++;
 return query(...args);
};});
for(const pool of [preparedPool,baselinePool])pool.on('error',()=>{emit({stage:'readOnlyConnectionFailed',activationPerformed:false});process.exit(1);});
const deadline=setTimeout(()=>{emit({stage:'candidateAcceptanceDeadlineExceeded',lastProgress,historyAttempts,cellStatements,activationPerformed:false});process.exit(124);},600000);
try{
 emit({stage:'candidateAcceptanceStartup',version:'full-candidate-v1',max,statementTimeoutMs:timeout,workerDeadlineMs:600000,activationPerformed:false});
 await verifyMartRuntimeRole(preparedPool);await verifyMartRuntimeRole(baselinePool);
 const tenant='el-dabboos-iq',revision='6eb4a954-7437-4774-98f2-dae23d60bd81';
 const read=operation=>tenantTransaction(baselinePool,tenant,operation,true,timeout);
 const options={reportingCurrencies:{[tenant]:'IQD'},statementTimeoutMs:timeout,maxGroups:4000};
 const prepared=new PreparedAnalyticsRepository(preparedPool,options),baseline=new TrustedAnalyticsRepository(baselinePool,options);
 const summary=await runPreparedReportAcceptance({prepared,baseline,read,tenant,revision,emit,expectedBindings:154,expectedReports:27,expectedReportingWindow:{from:'2025-01-01',to:'2026-12-31'}},
  {...app,readPreparedSelection,preparedPublication,trustedMetricMonths});
 const passed=summary.passed&&historyAttempts===0;
 emit({stage:'candidateAcceptanceFinished',passed,comparedReports:summary.comparedReports,historyAttempts,cellStatements,activationPerformed:false});
 if(!passed)process.exitCode=1;
}catch(error){
 const code=typeof error?.code==='string'&&/^[A-Z0-9_]+$/.test(error.code)?error.code:'CANDIDATE_ACCEPTANCE_STOPPED';
 emit({stage:'candidateAcceptanceStopped',code,lastProgress,historyAttempts,cellStatements,activationPerformed:false});process.exitCode=1;
}finally{clearTimeout(deadline);await Promise.all([preparedPool.end(),baselinePool.end()]);}
PREPARED_CANDIDATE_ACCEPTANCE
