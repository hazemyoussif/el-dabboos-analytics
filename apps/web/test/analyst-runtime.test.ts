import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { semanticCatalog, tenantProfiles } from '@el-dabboos/domain';
import { analystFixture, analystPeriod } from '../../api/test/analyst-fixture.ts';
import { parseWorkspaceRoute } from '../src/workspace-route.ts';
async function browserFixture() {
 const browser=new Window({url:'http://analytics.test/ask-business'}),previous=new Map<string,PropertyDescriptor|undefined>();
 const globals={window:browser,document:browser.document,HTMLElement:browser.HTMLElement,HTMLDialogElement:browser.HTMLDialogElement,Event:browser.Event,ResizeObserver:browser.ResizeObserver,requestAnimationFrame:browser.requestAnimationFrame.bind(browser),cancelAnimationFrame:browser.cancelAnimationFrame.bind(browser),IS_REACT_ACT_ENVIRONMENT:true};
 for(const [key,value] of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'}),container=browser.document.createElement('div');browser.document.body.append(container);const root=createRoot(container);
 return {browser,server,container,root,async close(){await act(async()=>root.unmount());await server.close();await browser.happyDOM.close();for(const [key,value] of previous){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}};
}
async function waitUntil(predicate:()=>boolean){
 const deadline=Date.now()+10000;while(!predicate()&&Date.now()<deadline)await settle();assert.ok(predicate(),'UI did not reach the expected state');
}
async function settle(){await act(async()=>{await new Promise<void>(resolve=>setTimeout(resolve,20));});}
for(const locale of ['en','ar'] as const)test(`Ask Business ${locale} complete DOM flow: clarification, provenance, stable detail selection, unsaved conversion, reopening`,async()=>{
 const browser=await browserFixture(),priorFetch=globalThis.fetch,fixture=await analystFixture([{status:'AMBIGUOUS',choices:['order_revenue','order_count']},{status:'SUPPORTED',intent:{context:{},analyses:[{dimension:'salesperson',series:[{metric:'order_revenue',topNDirection:'top',topNLimit:1}]}]}}]);
 globalThis.fetch=async(input,options)=>{const response=await fixture.app.inject({method:(options?.method??'GET') as 'GET'|'POST',url:String(input),headers:options?.headers as Record<string,string>,...(options?.body?{payload:String(options.body)}:{})});return new Response(response.body,{status:response.statusCode,headers:{'content-type':'application/json'}});};
 try {
  const {AskBusiness}=await browser.server.ssrLoadModule('/src/analyst/AskBusiness.tsx'),{analystCopy}=await browser.server.ssrLoadModule('/src/analyst/copy.ts');let converted=false;
  function Page(){const [id,setId]=useState<string|undefined>();return createElement(AskBusiness,{session:{userId:'demo-iq-admin',tenantId:'demo-iq',locale},profile:tenantProfiles['demo-iq'],id,defaultContext:analystPeriod,demo:false,canCreate:true,labels:{},onNavigate:setId,onDashboard:()=>{converted=true;}});}
  await act(async()=>browser.root.render(createElement(Page)));await settle();
  const question=browser.container.querySelector('textarea')!;await act(async()=>{question.value=locale==='en'?'Who is best?':'من أفضل مندوب؟';question.dispatchEvent(new browser.browser.Event('input',{bubbles:true}));});
  // Example buttons exercise controlled input without browser-specific synthetic input internals.
  await act(async()=>{const example=Array.from(browser.container.querySelectorAll('button')).find(button=>button.textContent===analystCopy[locale].examples[2]);example!.click();});
  await act(async()=>browser.container.querySelector('form')!.dispatchEvent(new browser.browser.Event('submit',{bubbles:true,cancelable:true})));await waitUntil(()=>browser.container.textContent!.includes(analystCopy[locale].clarify));
  assert.ok(browser.container.textContent!.includes(analystCopy[locale].clarify));
  const metric=Array.from(browser.container.querySelectorAll('button')).find(button=>button.textContent===semanticCatalog.order_revenue.labels[locale])!;assert.ok(metric);await act(async()=>metric.click());await waitUntil(()=>browser.container.textContent!.includes('Noor Hassan'));
  assert.equal(fixture.queries.length,1);assert.ok(browser.container.textContent!.includes('Noor Hassan'));assert.ok(!browser.container.textContent!.includes('rep:b'));assert.ok(browser.container.querySelector('.analyst-period'));
  const evidence=browser.container.querySelector('.analyst-evidence')!;assert.ok(evidence.textContent!.includes(analystCopy[locale].freshness));assert.ok(evidence.textContent!.includes(analystCopy[locale].reconciliation));
  const detail=Array.from(browser.container.querySelectorAll('button')).find(button=>button.textContent===analystCopy[locale].details)!;await act(async()=>detail.click());await settle();assert.ok(browser.container.querySelector('dialog'));
  await act(async()=>{browser.container.querySelector('dialog button')!.dispatchEvent(new browser.browser.MouseEvent('click',{bubbles:true}));});
  const dashboard=Array.from(browser.container.querySelectorAll('button')).find(button=>button.textContent===analystCopy[locale].dashboard)!;await act(async()=>dashboard.click());await settle();assert.equal(converted,true);assert.equal(fixture.provider.requests.length,2);
  assert.equal((await fixture.store.analyst.list({tenantId:'demo-iq',userId:'demo-iq-admin'},'2026-10-08T12:00:00.000Z')).length,1);
  assert.deepEqual(parseWorkspaceRoute('/ask-business'),{kind:'ask'});
 }finally{globalThis.fetch=priorFetch;await browser.close();await fixture.close();}
});
