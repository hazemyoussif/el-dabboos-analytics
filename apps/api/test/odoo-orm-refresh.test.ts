import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshObservedReportFamilies,executeOdooOrmRefresh} from '../src/odoo-orm-refresh.ts';

test('API refresh prepares both priority report periods before review, core and Finance',async()=>{
 const calls:string[]=[];
 const result=await refreshObservedReportFamilies('2026-10-25',{
  business:async month=>{calls.push('business:'+month);},review:async month=>{calls.push('review:'+month);},
  sync:async()=>{calls.push('sync');return {status:'passed'};},finance:async day=>{calls.push('finance:'+day);},
  observe:phase=>calls.push(phase),
 });
 assert.deepEqual(calls,['business:2026-10','business:2026-09','priority_publications_prepared','review:2026-10','sync','finance:2026-10-25','all_family_publications_prepared']);
 assert.equal(result.consistency,'api_observed');
});

test('priority or core failure stops dependent publication and never claims all families prepared',async()=>{
 for(const failure of ['priority','sync']){
  const calls:string[]=[];
  await assert.rejects(refreshObservedReportFamilies('2026-01-05',{
   business:async month=>{calls.push(month);if(failure==='priority')throw new Error('synthetic priority failure');},
   review:async()=>{calls.push('review');},sync:async()=>({status:'failed'}),
   finance:async()=>{assert.fail('Finance must not publish after core failure');},observe:phase=>calls.push(phase),
  }));
  assert.ok(!calls.includes('all_family_publications_prepared'));
  if(failure==='sync')assert.deepEqual(calls.slice(0,2),['2026-01','2025-12']);
 }
});

test('refresh requires explicit tenant and observed-mode acceptance before connecting',async()=>{
 await assert.rejects(executeOdooOrmRefresh(['--tenant','synthetic'],{}),/Usage/);
 await assert.rejects(executeOdooOrmRefresh(['--tenant','synthetic','--accept-observed'],{ODOO_ORM_TENANT_ID:'foreign'}),/Usage/);
});
