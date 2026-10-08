import test from 'node:test';
import assert from 'node:assert/strict';
import { analystConversationEvaluationCases } from '../../../packages/application/src/analyst-conversation-evaluations.ts';
import { analystFixture, analystHeaders } from './analyst-fixture.ts';
for(const item of analystConversationEvaluationCases)test(`conversational evaluation ${item.id}`,async()=>{
 const fixture=await analystFixture(item.steps.map(step=>step.output)),headers={...analystHeaders,'x-locale':item.language};
 try {
  let conversation=await fixture.create(headers);
  for(const step of item.steps) {
   const response=await fixture.ask(conversation,step.question,{...(step.pageContext?{pageContext:step.pageContext}:{}),...(step.choice?{choice:step.choice}:{})},headers);assert.equal(response.statusCode,200,response.body);conversation=response.json();
  }
  const message=conversation.messages.at(-1)!,answer=message.answer,panel=answer.panels[0];
  assert.equal(answer.status,item.expected.status);
  if(item.expected.metric)assert.equal(panel!.query.metric,item.expected.metric);
  if(item.expected.rank)assert.equal(panel!.result.rows[0]!.rank,item.expected.rank);
  if(item.expected.entities)assert.deepEqual(conversation.state!.entities[0]!.ids,item.expected.entities);
  if(item.expected.period)assert.deepEqual(panel!.query.dateRange,item.expected.period);
  if(item.expected.conversion)assert.equal(answer.conversion,item.expected.conversion);
  const base=`/api/ai-analyst/conversations/${conversation.id}/messages/${message.id}`;
  if(item.category==='dashboard-action')assert.equal((await fixture.app.inject({method:'POST',url:base+'/dashboard',headers})).statusCode,200);
  if(item.expected.drill)assert.equal((await fixture.app.inject({method:'POST',url:base+'/details',headers,payload:{panel:0,key:panel!.result.rows[0]!.key}})).statusCode,200);
  assert.equal(fixture.provider.requests.length,item.steps.length);
 }finally{await fixture.close();}
});
