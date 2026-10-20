import {referenceExecutionForWindow} from './prepared-report-reference-2026-10-19.mjs';
import {latencyGate} from './prepared-acceptance-diagnosis-2026-10-19.mjs';
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
