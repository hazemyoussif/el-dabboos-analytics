import assert from 'node:assert/strict';
import test from 'node:test';
import { request,executeSavedDashboard,executeDashboard } from '../src/api/client.ts';
import { authenticationRequest } from '../src/auth/client.ts';
import type { DashboardSpec } from '@el-dabboos/domain';

test('bodyless execution, reads and deletes omit JSON headers; governed JSON requests preserve payloads',async()=>{
 const calls:RequestInit[]=[];
 const original=globalThis.fetch;
 globalThis.fetch=async(_url,options)=>{calls.push(options!);return new Response('{}',{status:200,headers:{'content-type':'application/json'}});};
 const session={userId:'test',tenantId:'demo-iq',locale:'en' as const};
 const dashboard:DashboardSpec={schemaVersion:2,id:'manual',title:{en:'Manual',ar:'يدوي'},locale:'en',widgets:[],filters:{},layout:{columns:12,rowHeight:72,gap:16}};
 try{
  await executeSavedDashboard(session,'saved');
  await request(session,'/api/read','GET');
  await request(session,'/api/delete','DELETE');
  await authenticationRequest('session');
  for(const call of calls){assert.equal(new Headers(call.headers).has('content-type'),false);assert.equal(Object.hasOwn(call,'body'),false);assert.equal(call.credentials,'include');}
  for(const id of ['manual','saved','ai-draft','template']){
   await executeDashboard(session,{...dashboard,id});
   const call=calls.at(-1)!;
   assert.equal(new Headers(call.headers).get('content-type'),'application/json');
   assert.deepEqual(JSON.parse(String(call.body)),{dashboard:{...dashboard,id}});
  }
  await request(session,'/api/required-empty-object','POST',{});
  assert.equal(calls.at(-1)?.body,'{}');
  await authenticationRequest('login',{email:'test@example.test',password:'fixture'});
  assert.equal(new Headers(calls.at(-1)?.headers).get('content-type'),'application/json');
  assert.deepEqual(JSON.parse(String(calls.at(-1)?.body)),{email:'test@example.test',password:'fixture'});
 }finally{globalThis.fetch=original;}
});
