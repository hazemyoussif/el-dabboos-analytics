import test from 'node:test';
import assert from 'node:assert/strict';
import { syntheticCapabilities, tenantProfiles } from '@el-dabboos/domain';
import type { AnalyticsQuery, AnalyticsResult, LLMProvider, StructuredOutputRequest } from '@el-dabboos/domain';
import { MockAnalyticsRepository } from '../../data/src/mock.ts';
import type { AnalyticsFact } from '../../data/src/facts.ts';
import { AnalyticsIntentExecutor, analyticsResultDrillRequest } from '../src/analytics-execution.ts';
import type { AnalyticsIntentResult } from '../src/analytics-execution.ts';
import { DemoIdentityProvider, DefaultAuthorizationPolicy } from '../src/security.ts';
import { analyticsEvaluationCases } from '../src/analytics-evaluations.ts';
import { StructuredAnalyticsPlanner } from '../src/analytics-planner.ts';
import type { DashboardGenerationPlan } from '../src/generation-plan.ts';
import { compileDashboardFromAnalyticsIntent, compileDashboardGenerationPlan } from '../src/generation-plan.ts';
import { analyticsIntentFromGenerationPlan, validateAnalyticsIntent, resolveAnalyticsIntent, analyticsPlanningSchema } from '../src/analytics-intent.ts';
import type { AnalyticsIntent } from '../src/analytics-intent.ts';
import { DashboardExecutor } from '../src/executor.ts';
import { analyticsConversationState, resolveAnalyticsFollowUp } from '../src/analytics-conversation.ts';
import { projectProviderSchema } from '../src/provider-schema.ts';
import { analyticsPlanningExamples } from '../src/analytics-planning-instructions.ts';
const clock=()=>new Date('2026-10-08T12:00:00Z'),profile=tenantProfiles['demo-iq'];
const identity=new DemoIdentityProvider().resolve('demo-iq-admin','demo-iq','en');
const policy=new DefaultAuthorizationPolicy();
const published=syntheticCapabilities({tenantId:profile.id,locale:'en'});
const capabilities={getPublishedCapabilities:async()=>published};
const period={dateRange:{from:'2026-09-01',to:'2026-09-30'}};
const facts:AnalyticsFact[]=[
  {tenantId:'demo-iq',measureId:'order_revenue',date:'2026-09-10',value:100,dimensions:{salesperson:'rep:a',branch:'baghdad',business_line:'general'}},
  {tenantId:'demo-iq',measureId:'order_revenue',date:'2026-09-10',value:250,dimensions:{salesperson:'rep:b',branch:'basra',business_line:'no_sugar'}},
  {tenantId:'demo-iq',measureId:'order_revenue',date:'2026-09-10',value:75,dimensions:{salesperson:'rep:c',branch:'baghdad',business_line:'general'}},
  {tenantId:'demo-eg',measureId:'order_revenue',date:'2026-09-10',value:9999,dimensions:{salesperson:'rep:egypt',branch:'baghdad'}},
];
const repository=new MockAnalyticsRepository([...facts,...facts.map(fact=>({...fact,measureId:'revenue' as const}))],{clock});
const executor=(repo=repository)=>new AnalyticsIntentExecutor(repo,capabilities,policy,{clock,timeZone:profile.timeZone});
const ranking:AnalyticsIntent={context:period,analyses:[{dimension:'salesperson',series:[{metric:'order_revenue',ranking:true,topNDirection:'top',topNLimit:2}]}]};
function result(output:unknown):asserts output is AnalyticsIntentResult {assert.ok(output && typeof output==='object' && 'analyses' in output);}
class Provider implements LLMProvider {
  requests:StructuredOutputRequest[]=[];
  constructor(readonly output:unknown){}
  async generateStructured(request:StructuredOutputRequest){this.requests.push(request);return {output:this.output,providerId:'bonsai-compatible-fixture',latencyMs:1,attempts:1};}
}
for(const item of analyticsEvaluationCases)test(`ground truth ${item.id}: bounded planner output and dashboard/direct parity`,async()=>{
  const provider=new Provider(item.expected),locale=item.language;
  const output=await new StructuredAnalyticsPlanner(provider,{clock,dimensionValues:repository}).plan({prompt:item.question,identity:{...identity,locale},profile,published});
  assert.deepEqual(output.outcome,item.expected);
  if(item.expected.status!=='SUPPORTED')return;
  const intent=item.expected.intent,spec=compileDashboardFromAnalyticsIntent(intent,{titleEn:'Analysis',titleAr:'تحليل'},profile,locale,clock());
  const direct=await executor().execute(intent,{...identity,locale}),dashboard=await new DashboardExecutor(repository,clock).execute(spec,{tenantId:profile.id,locale},{timeZone:profile.timeZone});
  result(direct);
  for(const [index,analysis] of direct.analyses.entries())for(const [seriesIndex,entry] of analysis.series.entries()){
    const widget=spec.widgets[index]!,existing=dashboard.widgetResults[widget.id]!.seriesResults[widget.series[seriesIndex]!.id]!;
    assert.notEqual(entry.status,'EXECUTION_FAILED');assert.equal(existing.status,'success');
    if(entry.status!=='EXECUTION_FAILED'&&existing.status==='success')assert.deepEqual(entry.result,existing.result);
  }
});
test('ranking applies tenant and branch scope before Top-N, and rejects cross-workspace capability evidence',async()=>{
  const manager=new DemoIdentityProvider().resolve('demo-iq-baghdad-manager','demo-iq','en');
  const scopedRanking:AnalyticsIntent={...ranking,analyses:[{dimension:'salesperson',series:[{metric:'revenue',ranking:true,topNDirection:'top',topNLimit:2}]}]};
  const output=await executor().execute(scopedRanking,manager);result(output);
  const entry=output.analyses[0]!.series[0]!;assert.notEqual(entry.status,'EXECUTION_FAILED');
  if(entry.status!=='EXECUTION_FAILED')assert.deepEqual(entry.result.rows.map(row=>row.key),['rep:a','rep:c']);
  assert.throws(()=>new DemoIdentityProvider().resolve('demo-iq-admin','demo-eg','en'),/membership/);
  const denied=await new AnalyticsIntentExecutor(repository,{getPublishedCapabilities:async()=>({...published,tenantId:'demo-eg'})},policy,{clock,timeZone:profile.timeZone}).execute(ranking,identity);
  assert.equal(denied.status,'UNAUTHORIZED');
});
test('ordinal and stable-entity follow-ups retain effective period and owner without guessed labels',async()=>{
  const output=await executor().execute(ranking,identity);result(output);
  const state=analyticsConversationState(output,identity),second=resolveAnalyticsFollowUp(state,identity,{rank:2});
  assert.deepEqual(second.context,period);assert.equal(second.analyses[0]!.rank,2);
  const ranked=await executor().execute(second,identity);result(ranked);
  const entry=ranked.analyses[0]!.series[0]!;
  if(entry.status!=='EXECUTION_FAILED')assert.deepEqual(entry.result.rows.map(row=>row.key),['rep:a']);
  const compare=resolveAnalyticsFollowUp(state,identity,{compareEntities:2,datePreset:'last_6_months'});
  assert.deepEqual(compare.context.dimensions,[{dimension:'salesperson',values:['rep:b','rep:a']}]);
  assert.throws(()=>resolveAnalyticsFollowUp(state,{...identity,principal:{...identity.principal,userId:'different'}},{rank:2}),/owner/);
});
test('invalid IDs, SQL, missing fields, extra presentation, malformed dates and non-anchor Top-N fail closed',async()=>{
  for(const invalid of ['not JSON',{}, {context:{},analyses:[{series:[{metric:'invented'}]}]}, {...ranking,sql:'SELECT 1'},
    {...ranking,context:{dateRange:{from:'2026-02-30',to:'2026-03-01'}}},
    {...ranking,analyses:[{dimension:'salesperson',series:[{metric:'order_revenue'},{metric:'order_revenue',topNDirection:'top',topNLimit:2}]}]}])assert.throws(()=>validateAnalyticsIntent(invalid));
  const output=await new StructuredAnalyticsPlanner(new Provider({status:'SUPPORTED',intent:{...ranking,sql:'SELECT 1'}}),{clock}).plan({prompt:'x',identity,profile,published});assert.equal(output.outcome.status,'INVALID_PLAN');
});
test('provider schema stays portable and compact while canonical validation rejects dropped constraints',()=>{
  const schema=projectProviderSchema(analyticsPlanningSchema),encoded=JSON.stringify(schema);
  assert.ok(encoded.length<16000);assert.ok(!encoded.includes('discriminator'));assert.ok(!encoded.includes('function_call'));assert.ok(encoded.includes('topNLimit'));
});
test('selection plans require grouping while multi-metric summaries and explicit false ranking remain valid',()=>{
  for (const series of [{metric:'order_revenue',topNDirection:'top',topNLimit:1},{metric:'order_revenue',ranking:true}])
    assert.throws(()=>validateAnalyticsIntent({context:period,analyses:[{series:[series]}]}));
  const summary={context:period,analyses:[{series:[{metric:'order_revenue',ranking:false},{metric:'refund_value'}]}]};
  validateAnalyticsIntent(summary);
  validateAnalyticsIntent({...ranking,analyses:[{dimension:'salesperson',series:[{metric:'order_revenue',topNDirection:'top',topNLimit:1}]}]});
});
test('invented entity filters fail closed and valid filters are checked within the current tenant scope',async()=>{
  const intent={...ranking,context:{...period,dimensions:[{dimension:'salesperson' as const,values:['salesperson']}]}};
  const request={prompt:'Show me the highest salesperson',identity,profile,published};
  const invalid=await new StructuredAnalyticsPlanner(new Provider({status:'SUPPORTED',intent}),{clock,dimensionValues:repository}).plan(request);
  assert.equal(invalid.outcome.status,'INVALID_PLAN');
  const valid={...intent,context:{...period,dimensions:[{dimension:'salesperson' as const,values:['rep:b']}]}};
  assert.equal((await new StructuredAnalyticsPlanner(new Provider({status:'SUPPORTED',intent:valid}),{clock,dimensionValues:repository}).plan(request)).outcome.status,'SUPPORTED');
  const absent={...valid,context:{...period,dimensions:[{dimension:'salesperson' as const,values:['rep:egypt']}]}};
  assert.equal((await new StructuredAnalyticsPlanner(new Provider({status:'SUPPORTED',intent:absent}),{clock,dimensionValues:repository}).plan(request)).outcome.status,'INVALID_PLAN');
  assert.equal((await new StructuredAnalyticsPlanner(new Provider({status:'SUPPORTED',intent:valid}),{clock}).plan(request)).outcome.status,'INVALID_PLAN');
});
test('all provider series definitions and contract examples respect the published metric and selection surface',async()=>{
  const limited={...published,releases:published.releases.map(release=>({...release,capabilities:release.capabilities.filter(capability=>capability.metric==='order_revenue')}))};
  const provider=new Provider({status:'SUPPORTED',intent:ranking});
  await new StructuredAnalyticsPlanner(provider,{clock}).plan({prompt:'Top order revenue',identity,profile,published:limited});
  const definitions=provider.requests[0]!.responseFormat.jsonSchema.$defs as Record<string,{properties:{metric:{enum:string[]}}}>;
  for(const definition of Object.values(definitions))assert.deepEqual(definition.properties.metric.enum,['order_revenue']);
  const options={metricIds:['order_revenue'] as const,templateIds:[],actions:['ai:generate'] as const,published:limited};
  for(const example of analyticsPlanningExamples(options)){
    validateAnalyticsIntent(example.outcome.intent);
    const output=await new StructuredAnalyticsPlanner(new Provider(example.outcome),{clock}).plan({prompt:example.question,identity,profile,published:limited});
    assert.equal(output.outcome.status,'SUPPORTED');
  }
  const withoutSelection={...options,published:{...limited,releases:limited.releases.map(release=>({...release,capabilities:release.capabilities.map(capability=>({...capability,analyses:[]}))}))}};
  assert.ok(analyticsPlanningExamples(withoutSelection).every(example=>example.outcome.intent.analyses.every(analysis=>analysis.series.every(series=>series.topNLimit===undefined))));
});
test('deduplicated scalar execution uses one call, isolates clones and records stages',async()=>{
  let calls=0;
  const tracked={execute:async(query:AnalyticsQuery)=>{calls++;return repository.execute(query,{tenantId:'demo-iq',locale:'en'});}};
  const output=await new AnalyticsIntentExecutor(tracked,capabilities,policy,{clock,timeZone:profile.timeZone}).execute({context:period,analyses:[{series:[{metric:'order_revenue'},{metric:'order_revenue'}]}]},identity);result(output);
  assert.equal(calls,1);assert.equal(output.status,'SUPPORTED');assert.ok(output.timing.capabilityMs>=0);assert.ok(output.timing.executionMs>=0);
  const first=output.analyses[0]!.series[0]!,second=output.analyses[0]!.series[1]!;
  if(first.status!=='EXECUTION_FAILED'&&second.status!=='EXECUTION_FAILED'){assert.equal(first.result.rows[0]!.value,425);first.result.rows[0]!.value=0;assert.equal(second.result.rows[0]!.value,425);}
});
test('unpublished metric, unsupported transformation and invalid policy dimension execute no queries',async()=>{
  let calls=0;const tracked={execute:async(query:AnalyticsQuery)=>{calls++;return repository.execute(query,{tenantId:'demo-iq',locale:'en'});}};
  const bounded={...published,releases:published.releases.map(release=>({...release,capabilities:release.capabilities.filter(item=>item.metric==='order_revenue').map(item=>({...item,dimensions:['salesperson'] as const,analyses:[] as const}))}))};
  const service=new AnalyticsIntentExecutor(tracked,{getPublishedCapabilities:async()=>bounded},policy,{clock,timeZone:profile.timeZone});
  assert.equal((await service.execute({context:period,analyses:[{series:[{metric:'refund_value'}]}]},identity)).status,'DATA_NOT_READY');
  assert.equal((await service.execute(ranking,identity)).status,'UNSUPPORTED_CAPABILITY');assert.equal(calls,0);
});
test('result provenance and drill request retain stable context and null behavior',()=>{
  const query:AnalyticsQuery={metric:'order_revenue',groupBy:'salesperson',...period};
  const value:AnalyticsResult={metric:'order_revenue',groupBy:'salesperson',rows:[{key:'rep:a',value:100}],metadata:{sourceId:'mart',sourceAsOf:'2026-10-08T00:00:00Z',executedAt:clock().toISOString(),metricType:'currency',semantics:'additive',release:{datasetId:'trusted',sourceId:'mart',mappingId:'governed',mappingVersion:'1',certificationReference:'exact'}}};
  const request=analyticsResultDrillRequest({status:'SUPPORTED',query,result:value,form:'ranked_list'},'rep:a');
  assert.equal(request?.release,'trusted');assert.deepEqual(request?.clicked,{dimension:'salesperson',values:['rep:a']});assert.deepEqual(request?.query.dateRange,period.dateRange);
  value.rows[0]!.value=null;assert.equal(analyticsResultDrillRequest({status:'SUPPORTED',query,result:value,form:'grouped'},'rep:a'),null);
});
test('generation extraction preserves every analytical field and ignores explicit presentation',()=>{
  const plan:DashboardGenerationPlan={titleEn:'Revenue',titleAr:'إيرادات',datePreset:'last_6_months' as const,widgets:[{dimension:'month' as const,series:[{metric:'order_revenue' as const,movingAverageWindow:3}],requestedPresentation:{type:'line' as const,palette:'blue' as const}}]};
  const intent=analyticsIntentFromGenerationPlan(plan),queries=resolveAnalyticsIntent(intent,{timeZone:profile.timeZone,now:clock()});
  assert.deepEqual(queries[0]![0]!.analysis,{movingAverage:{window:3}});
  const spec=compileDashboardGenerationPlan(plan,profile,'en',clock());assert.equal(spec.widgets[0]!.presentation?.palette,'blue');assert.ok(!JSON.stringify(intent).includes('palette'));
});

test('multi-series results use the dashboard alignment anchor and preserve missing values',async()=>{
 const output=await executor().execute({context:period,analyses:[{dimension:'salesperson',series:[{metric:'order_revenue',topNDirection:'top',topNLimit:1},{metric:'refund_value'}]}]},identity);
 result(output);assert.equal(output.analyses[0]!.alignedRows.length,1);assert.equal(output.analyses[0]!.alignedRows[0]!.key,'rep:b');assert.equal(output.analyses[0]!.alignedRows[0]!.series['1'],null);
});
test('partial and failed execution exposes safe states and never leaks repository errors',async()=>{
 const failing={execute:async(query:AnalyticsQuery)=>{if(query.metric==='order_revenue')throw new Error('SQL private secret');return repository.execute(query,{tenantId:profile.id,locale:'en'});}};
 const output=await new AnalyticsIntentExecutor(failing,capabilities,policy,{clock,timeZone:profile.timeZone}).execute({context:period,analyses:[{dimension:'salesperson',series:[{metric:'order_revenue',topNDirection:'top',topNLimit:1},{metric:'refund_value'}]}]},identity);result(output);
 assert.equal(output.status,'PARTIAL_COVERAGE');assert.deepEqual(output.analyses[0]!.alignedRows,[]);assert.ok(!JSON.stringify(output).includes('private secret'));
});

test('conversation references cannot cross a changed scope and policy details are excluded from model state',async()=>{
 const {analyticsConversationContext}=await import('../src/analytics-conversation.ts');
 const output=await executor().execute(ranking,identity);result(output);const state=analyticsConversationState(output,identity);
 assert.throws(()=>resolveAnalyticsFollowUp(state,{...identity,authorization:{...identity.authorization,enforcedFilters:[{dimension:'salesperson',values:['rep:a']}]}},{rank:2}),/owner/);
 const context=analyticsConversationContext(state);assert.ok(!Object.hasOwn(context,'scopeSignature'));assert.ok(!Object.hasOwn(context,'userId'));
});

test('follow-ups preserve the effective per-analysis business filters as well as its resolved period',async()=>{
 const intent:AnalyticsIntent={context:{datePreset:'current_year'},analyses:[{dimension:'salesperson',context:{...period,dimensions:[{dimension:'salesperson',values:['rep:a','rep:c']}]},series:[{metric:'order_revenue',ranking:true,topNDirection:'top',topNLimit:2}]}]};
 const output=await executor().execute(intent,identity);result(output);
 const state=analyticsConversationState(output,identity),followUp=resolveAnalyticsFollowUp(state,identity,{rank:2});
 assert.deepEqual(followUp.context,{...period,dimensions:[{dimension:'salesperson',values:['rep:a','rep:c']}]});
 const next=await executor().execute(followUp,identity);result(next);const entry=next.analyses[0]!.series[0]!;
 assert.notEqual(entry.status,'EXECUTION_FAILED');if(entry.status!=='EXECUTION_FAILED')assert.deepEqual(entry.result.rows.map(row=>row.key),['rep:c']);
});

test('a workspace without published metrics returns DATA_NOT_READY without an empty-enum provider call',async()=>{
 const provider=new Provider({status:'SUPPORTED',intent:ranking});
 const output=await new StructuredAnalyticsPlanner(provider,{clock}).plan({prompt:'Order revenue',identity,profile,published:{...published,releases:[]}});
 assert.equal(output.outcome.status,'DATA_NOT_READY');assert.equal(provider.requests.length,0);
});
