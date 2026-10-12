import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticCatalog} from '@el-dabboos/domain';
import type {DashboardSpec} from '@el-dabboos/domain';
import {loadWorkspaceReport} from '../src/workspace-bootstrap.ts';
import {getFilterOptions} from '../src/api/client.ts';
const session={userId:'synthetic',tenantId:'demo-iq',locale:'en' as const};
const dashboard:DashboardSpec={schemaVersion:2,id:'report',locale:'en',title:{en:'Report',ar:'تقرير'},filters:{},layout:{columns:1},widgets:[{id:'orders',type:'kpi',series:[{id:'orders',metric:'order_count'}]}]};
const execution={dashboard,widgetResults:{},metadata:{executedAt:'2026-10-12',succeeded:1,failed:0,succeededSeries:1,failedSeries:0}};
const templates={templates:[]};
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status});
test('a failed optional filter request cannot discard a successful report or become its loading dependency',async()=>{
 const original=globalThis.fetch,calls:string[]=[];
 let finishFilter!:(value:Response)=>void;
 let filterFailed!:()=>void;
 const failed=new Promise<void>(resolve=>{filterFailed=resolve;});
 globalThis.fetch=async input=>{
  calls.push(String(input));
  if(String(input).includes('/instantiate'))return response({dashboard,execution});
  return new Promise(resolve=>{finishFilter=resolve;});
 };
 try {
  const result=await loadWorkspaceReport(session,{kind:'report',id:'receivables-aging'},[semanticCatalog.order_count],templates,{onOptionsError:filterFailed});
  assert.deepEqual(result.opened?.spec,dashboard);assert.deepEqual(result.openedExecution,execution);
  assert.ok(calls[0]?.endsWith('/receivables-aging/instantiate'));
  finishFilter(response({error:{code:'INTERNAL_ERROR',message:'Internal server error'}},500));
  await failed;
  assert.deepEqual(result.openedExecution,execution);
 }finally{globalThis.fetch=original;}
});
test('report failure remains visible and does not start unrelated filter discovery',async()=>{
 const original=globalThis.fetch,calls:string[]=[];
 globalThis.fetch=async input=>{calls.push(String(input));return response({error:{code:'INTERNAL_ERROR',message:'Internal server error'}},500);};
 try {
  await assert.rejects(loadWorkspaceReport(session,{kind:'report',id:'receivables-aging'},[semanticCatalog.order_count],templates),/Internal server error/);
  assert.equal(calls.length,1);assert.ok(calls[0]?.endsWith('/instantiate'));
 }finally{globalThis.fetch=original;}
});
test('filter discovery preserves choices while issuing only one metadata request at a time',async()=>{
 const original=globalThis.fetch;let active=0,peak=0;const calls:string[]=[];
 globalThis.fetch=async input=>{
  active++;peak=Math.max(peak,active);calls.push(String(input));
  await new Promise<void>(resolve=>setImmediate(resolve));active--;
  return response({values:[{id:'synthetic',label:'Synthetic'}]});
 };
 try {
  const options=await getFilterOptions(session,['business_line','salesperson','customer','month']);
  assert.equal(peak,1);assert.equal(calls.length,2);
  assert.deepEqual(options,{business_line:[{id:'synthetic',label:'Synthetic'}],salesperson:[{id:'synthetic',label:'Synthetic'}]});
 }finally{globalThis.fetch=original;}
});

test('one unavailable filter retains successful choices and reports the missing dimension',async()=>{
 const original=globalThis.fetch,missing:string[]=[];
 globalThis.fetch=async input=>String(input).includes('/salesperson/')?response({error:{message:'Internal server error'}},500):response({values:[{id:'synthetic',label:'Synthetic'}]});
 try {
  const options=await getFilterOptions(session,['business_line','salesperson','branch'],dimension=>missing.push(dimension));
  assert.deepEqual(missing,['salesperson']);
  assert.deepEqual(Object.keys(options),['business_line','branch']);
  await assert.rejects(getFilterOptions(session,['salesperson']),/Internal server error/);
 }finally{globalThis.fetch=original;}
});
