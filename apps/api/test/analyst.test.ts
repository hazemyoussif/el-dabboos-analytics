import test from 'node:test';
import assert from 'node:assert/strict';
import { analystFixture, analystHeaders, analystPeriod, scalarIntent } from './analyst-fixture.ts';
import type { AnalystConversation } from '@el-dabboos/domain';
const highest={status:'SUPPORTED',intent:{context:{},analyses:[{dimension:'salesperson',series:[{metric:'order_revenue',topNDirection:'top',topNLimit:1}]}]}};
test('an ordinal cannot reuse a scalar answer or an older answer past an unresolved turn',async()=>{
 const followUp={status:'FOLLOW_UP',operation:'rank',rank:2};
 for(const preceding of [[scalarIntent],[highest,{status:'AMBIGUOUS',choices:['order_revenue','order_count']}],[highest,{status:'SUPPORTED',sql:'SELECT private'}]]) {
  const fixture=await analystFixture([...preceding,followUp]);
  try {
   let conversation=await fixture.create();
   conversation=(await fixture.ask(conversation,'Initial question',{pageContext:analystPeriod})).json();
   if(preceding.length>1)conversation=(await fixture.ask(conversation,'An unresolved question')).json();
   const response=await fixture.ask(conversation,'Ordinal follow-up');
   assert.equal(response.statusCode,200,response.body);
   assert.equal(response.json().messages.at(-1).answer.status,'INVALID_PLAN');
   assert.equal(fixture.queries.length,1);
   if(preceding.length>1)assert.equal(JSON.parse(fixture.provider.requests.at(-1)!.messages[1]!.content).state,undefined);
  }finally{await fixture.close();}
 }
});
for(const locale of ['en','ar'])test(`conversation ${locale}: inherits context, follows ordinal and two stable identities, persists audit and rejects lossy conversion`,async()=>{
 const fixture=await analystFixture([highest,{status:'FOLLOW_UP',operation:'rank',rank:2},{status:'FOLLOW_UP',operation:'compare_entities',count:2,datePreset:'last_6_months'}]),headers={...analystHeaders,'x-locale':locale};
 try {
  let conversation=await fixture.create(headers);assert.match(conversation.id,/^[a-f0-9-]{36}$/);
  for(const [index,question] of (locale==='en'?['Who had the highest order revenue?','What about second place?','Compare those two over the last six months.']:['من حقق أعلى إيرادات طلبات؟','وماذا عن المركز الثاني؟','قارن هذين المندوبين لآخر ستة أشهر.']).entries()) {
   const response=await fixture.ask(conversation,question,index===0?{pageContext:analystPeriod}:{},headers);assert.equal(response.statusCode,200,response.body);conversation=response.json();
  }
  assert.equal(conversation.messages[0]!.answer.panels[0]!.result.rows[0]!.value,250);assert.equal(conversation.messages[1]!.answer.panels[0]!.result.rows[0]!.value,100);
  assert.deepEqual(conversation.state!.entities[0]!.ids,['rep:b','rep:a']);assert.deepEqual(fixture.queries.at(-1)!.filters,[{dimension:'salesperson',values:['rep:a','rep:b']}]);
  assert.deepEqual(fixture.queries.at(-1)!.dateRange,{from:'2026-05-01',to:'2026-10-08'});
  const stored=await fixture.app.inject({method:'GET',url:`/api/ai-analyst/conversations/${conversation.id}`,headers});assert.deepEqual(stored.json(),conversation);
  assert.equal(fixture.database.prepare('SELECT COUNT(*) AS count FROM analyst_question_audit').get()!.count,3);
  const audit=JSON.parse(String(fixture.database.prepare('SELECT document FROM analyst_question_audit LIMIT 1').get()!.document));assert.equal(audit.tenantId,'demo-iq');assert.match(audit.intentHash,/^[a-f0-9]{64}$/);assert.deepEqual(audit.effectivePeriods,[analystPeriod.dateRange]);assert.equal(audit.references[0].release,'test-release');
  const second=conversation.messages[1]!,converted=await fixture.app.inject({method:'POST',url:`/api/ai-analyst/conversations/${conversation.id}/messages/${second.id}/dashboard`,headers});assert.equal(converted.statusCode,409);assert.equal(fixture.provider.requests.length,3);
  const body=fixture.provider.requests[2]!.messages[1]!.content;assert.ok(!body.includes('Who had'));assert.ok(body.includes('rep:b'));assert.ok(!body.includes('scopeSignature'));
 }finally{await fixture.close();}
});
test('question authentication, tenant/private isolation, scoped ranking, and CAS enforce the governed boundary',async()=>{
 const scopedHighest=structuredClone(highest);scopedHighest.intent.analyses[0]!.series[0]!.metric='revenue';
 const fixture=await analystFixture([scopedHighest]);
 try{
  assert.equal((await fixture.app.inject({method:'POST',url:'/api/ai-analyst/conversations'})).statusCode,401);
  assert.equal((await fixture.app.inject({method:'POST',url:'/api/ai-analyst/conversations',headers:{...analystHeaders,'x-tenant-id':'demo-eg'}})).statusCode,403);
  const conversation=await fixture.create();
  assert.equal((await fixture.app.inject({method:'GET',url:`/api/ai-analyst/conversations/${conversation.id}`,headers:{...analystHeaders,'x-demo-user-id':'demo-iq-analyst'}})).statusCode,404);
  assert.equal((await fixture.app.inject({method:'GET',url:`/api/ai-analyst/conversations/${conversation.id}`,headers:{...analystHeaders,'x-demo-user-id':'demo-regional-analyst','x-tenant-id':'demo-eg'}})).statusCode,404);
  const manager={...analystHeaders,'x-demo-user-id':'demo-iq-baghdad-manager'},scoped=await fixture.create(manager);
  const response=await fixture.ask(scoped,'Who had the highest order revenue?',{pageContext:analystPeriod},manager);assert.equal(response.statusCode,200,response.body);assert.equal(response.json().messages[0].answer.panels[0].result.rows[0].key,'rep:a');assert.deepEqual(fixture.contexts[0]!.enforcedFilters,[{dimension:'branch',values:['baghdad']}]);
  assert.equal((await fixture.ask(scoped,'Again',{},manager)).statusCode,409);assert.equal(fixture.provider.requests.length,1);
 }finally{await fixture.close();}
});
test('canonical clarification uses its original page context; unsupported, malformed and unavailable provider states are safe',async()=>{
 const fixture=await analystFixture([{status:'AMBIGUOUS',choices:['order_revenue','order_count']},highest,{status:'UNSUPPORTED_CAPABILITY'},{status:'SUPPORTED',sql:'SELECT private'},new Error('credential=secret provider body')]);
 try{
  let conversation=await fixture.create();let response=await fixture.ask(conversation,'Who is best?',{pageContext:analystPeriod});assert.equal(response.statusCode,200,response.body);conversation=response.json();
  assert.equal((await fixture.ask(conversation,'',{choice:'net_aged_receivable'})).statusCode,400);assert.equal(fixture.provider.requests.length,1);
  response=await fixture.ask(conversation,'',{choice:'order_revenue',pageContext:{dateRange:{from:'2026-08-01',to:'2026-08-31'}}});assert.equal(response.statusCode,200,response.body);conversation=response.json();assert.deepEqual(conversation.state!.resolvedAmbiguities,['order_revenue']);assert.deepEqual(fixture.queries[0]!.dateRange,analystPeriod.dateRange);
  for(const status of ['UNSUPPORTED_CAPABILITY','INVALID_PLAN','AI_UNAVAILABLE']){response=await fixture.ask(conversation,'Next question');assert.equal(response.statusCode,200,response.body);conversation=response.json();assert.equal(conversation.messages.at(-1)!.answer.status,status);assert.ok(!response.body.includes('credential='));}
  assert.equal(fixture.queries.length,1);assert.equal(fixture.database.prepare('SELECT COUNT(*) AS count FROM analyst_question_audit').get()!.count,5);
  assert.equal((await fixture.app.inject({method:'POST',url:'/api/analytics/query',headers:analystHeaders,payload:{metric:'order_revenue',...analystPeriod}})).statusCode,200);
 }finally{await fixture.close();}
});
test('dashboard conversion uses validated intent without planning again; drill context retains exact release and key',async()=>{
 const fixture=await analystFixture([highest]);
 try{
  const opened=await fixture.create(),response=await fixture.ask(opened,'Highest?',{pageContext:analystPeriod}),conversation=response.json() as AnalystConversation,message=conversation.messages[0]!;
  const base=`/api/ai-analyst/conversations/${conversation.id}/messages/${message.id}`;
  const converted=await fixture.app.inject({method:'POST',url:base+'/dashboard',headers:analystHeaders});assert.equal(converted.statusCode,200,converted.body);assert.deepEqual(converted.json().dashboard.filters,analystPeriod);assert.equal(fixture.provider.requests.length,1);assert.equal(fixture.database.prepare('SELECT COUNT(*) AS count FROM dashboard_records').get()!.count,0);
  const details=await fixture.app.inject({method:'POST',url:base+'/details',headers:analystHeaders,payload:{panel:0,key:'rep:b'}});assert.equal(details.statusCode,200,details.body);const selection=details.json().selection;assert.deepEqual(selection.clicked,{dimension:'salesperson',values:['rep:b']});assert.equal(selection.release,'test-release');assert.equal(selection.query.analysis,undefined);
  assert.equal((await fixture.app.inject({method:'POST',url:'/api/analytics/drill-through',headers:analystHeaders,payload:selection})).statusCode,200);
  assert.equal((await fixture.app.inject({method:'POST',url:base+'/details',headers:analystHeaders,payload:{panel:0,key:'rep:guessed'}})).statusCode,409);
 }finally{await fixture.close();}
});
test('explicit question period overrides page; changed membership while planning prevents execution and save',async()=>{
 const output=structuredClone(scalarIntent);Object.assign(output.intent.context,{dateRange:{from:'2026-08-01',to:'2026-08-31'}});
 const fixture=await analystFixture([output,scalarIntent]);
 try{
  let conversation=await fixture.create(),response=await fixture.ask(conversation,'Revenue in August?',{pageContext:analystPeriod});assert.equal(response.statusCode,200);conversation=response.json();assert.deepEqual(fixture.queries[0]!.dateRange,{from:'2026-08-01',to:'2026-08-31'});
  const generate=fixture.provider.generateStructured.bind(fixture.provider);fixture.provider.generateStructured=async request=>{const result=await generate(request);fixture.database.prepare("UPDATE memberships SET status='suspended' WHERE id='iq-admin'").run();return result;};
  response=await fixture.ask(conversation,'Revenue?',{pageContext:analystPeriod});assert.equal(response.statusCode,403,response.body);assert.equal(fixture.queries.length,1);assert.equal(fixture.database.prepare('SELECT COUNT(*) AS count FROM analyst_question_audit').get()!.count,1);
 }finally{await fixture.close();}
});
test('a new ranking question resets prior entity references instead of mixing unrelated selections',async()=>{
 const lowest=structuredClone(highest);lowest.intent.analyses[0]!.series[0]!.topNDirection='bottom';
 const fixture=await analystFixture([highest,{status:'FOLLOW_UP',operation:'rank',rank:2},lowest]);
 try {
  let conversation=await fixture.create();
  for(const question of ['Highest?','Second?','Lowest?']){const response=await fixture.ask(conversation,question,{pageContext:analystPeriod});assert.equal(response.statusCode,200,response.body);conversation=response.json();}
  assert.deepEqual(conversation.state!.entities[0]!.ids,['rep:c']);
 }finally{await fixture.close();}
});
