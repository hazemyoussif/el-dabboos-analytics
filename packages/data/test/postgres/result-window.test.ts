import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {AnalyticsResultLimitError,AnalyticsResultWindowError} from '@el-dabboos/domain';
import type {AnalyticsResultCursor,AnalyticsQuery} from '@el-dabboos/domain';
import {readGroupedSql as readSql} from '../../src/postgres/result-window.ts';
const readGroupedSql=(client:Parameters<typeof readSql>[0],query:AnalyticsQuery,context:Parameters<typeof readSql>[1]['context'],input:Parameters<typeof readSql>[1]['input'],revision:string,maxGroups:number,read?:Parameters<typeof readSql>[1]['read'])=>readSql(client,{query,context,input,revision,maxGroups,...(read?{read}:{})});
const context={tenantId:'synthetic',locale:'en' as const};
const query:AnalyticsQuery={metric:'invoiced_revenue',groupBy:'customer'};
const population={text:`SELECT lpad(id::text,5,'0') key,id::numeric value,'Customer '||id label,'2026-09-30'::date through,false invalid,false unsafe FROM generate_series(1,5001) id`,params:[]};
test('SQL result windows traverse a population beyond the response cap with complete global analysis',{skip:!enabled},async()=>{
 const db=await database(false),client=await db.runtime.connect();
 try{
  await assert.rejects(readGroupedSql(client,query,context,population,'r1',3),AnalyticsResultLimitError);
  await assert.rejects(readGroupedSql(client,query,context,population,'r1',3,{revision:'r1'}),AnalyticsResultLimitError);
  const seen:string[]=[];let cursor:AnalyticsResultCursor|undefined;
  do{
   const result=await readGroupedSql(client,query,context,population,'r1',3,{window:{limit:1000,...(cursor?{cursor}:{})}});
   assert.equal(result.window?.total,5001);assert.ok(result.rows.length<=1000);seen.push(...result.rows.map(row=>row.key!));cursor=result.window?.nextCursor;
  }while(cursor);
  assert.equal(seen.length,5001);assert.equal(new Set(seen).size,5001);assert.equal(seen[0],'00001');assert.equal(seen.at(-1),'05001');
  const top=await readGroupedSql(client,{...query,analysis:{ranking:true,topN:{direction:'top',limit:1}}},context,population,'r1',3);
  assert.deepEqual(top.rows,[{key:'05001',value:5001,rank:1}]);
  const percent=await readGroupedSql(client,{...query,analysis:{percentageContribution:true}},context,population,'r1',3,{outputKeys:['05001']});
  assert.equal(percent.rows[0]?.value,5001/(5001*5002/2)*100);
  const pareto=await readGroupedSql(client,{...query,analysis:{pareto:true}},context,population,'r1',3,{outputKeys:['05001']});
  const curve=await readGroupedSql(client,{...query,analysis:{pareto:true}},context,population,'r1',3,{window:{limit:2}});assert.deepEqual(curve.rows.map(row=>row.key),['05001','05000']);
  await assert.rejects(readGroupedSql(client,{...query,analysis:{pareto:true}},context,population,'r1',3,{window:{limit:2,cursor:{scope:curve.window!.scope,after:'05000'}}}),AnalyticsResultWindowError);
  const nextCurve=await readGroupedSql(client,{...query,analysis:{pareto:true}},context,population,'r1',3,{window:{limit:2,cursor:curve.window!.nextCursor!}});assert.deepEqual(nextCurve.rows.map(row=>row.rank),[3,4]);
  assert.equal(pareto.rows[0]?.rank,1);assert.equal(pareto.rows[0]?.value,percent.rows[0]?.value);
 }finally{client.release();await db.close();}
});
test('continuations bind query population, policy, locale, search and trusted revision',{skip:!enabled},async()=>{
 const db=await database(false),client=await db.runtime.connect();
 try{
  const first=await readGroupedSql(client,query,context,population,'r1',3,{window:{limit:2}}),cursor=first.window!.nextCursor!;
  for(const [changedContext,revision,changedQuery] of [[{...context,tenantId:'other'},'r1',query],[{...context,locale:'ar' as const},'r1',query],[{...context,enforcedFilters:[{dimension:'customer' as const,values:['00001'] as string[]}]},'r1',query],[context,'r2',query],[context,'r1',{...query,metric:'refund_value' as const}]] as const){
   await assert.rejects(readGroupedSql(client,changedQuery,changedContext,population,revision,3,{window:{limit:2,cursor}}),AnalyticsResultWindowError);
  }
  await assert.rejects(readGroupedSql(client,query,context,population,'r1',3,{window:{limit:2,cursor,search:'Customer'}}),AnalyticsResultWindowError);
  const search=await readGroupedSql(client,query,context,population,'r1',3,{window:{limit:2,search:'Customer 5001'}});
  assert.equal(search.window?.total,1);assert.equal(search.rows[0]?.key,'05001');
  const empty=await readGroupedSql(client,query,context,population,'r1',3,{outputKeys:[]});assert.deepEqual(empty.rows,[]);assert.equal(empty.dataThrough,'2026-09-30');
  await assert.rejects(readGroupedSql(client,query,context,population,'r2',3,{outputKeys:['00001'],revision:'r1'}),AnalyticsResultWindowError);
 }finally{client.release();await db.close();}
});

test('stable Unicode tie order matches the reference engine and result continuation', {skip:!enabled},async()=>{
 const db=await database(false),client=await db.runtime.connect();
 try{
  const keys=['a','A','B','é','العربية','\uE000','😀'];
  const input={text:`SELECT key,1::numeric value,key label,'2026-09-30'::date through,false invalid,false unsafe FROM unnest($1::text[]) key`,params:[keys]};
  const {executeFacts}=await import('../../src/engine.ts');
  const expected=executeFacts(keys.map(key=>({tenantId:context.tenantId,measureId:'invoiced_revenue' as const,date:'2026-09-30',value:1,dimensions:{customer:key}})),{...query,analysis:{ranking:true,topN:{direction:'top',limit:7}}},context,{sourceId:'synthetic',executedAt:'2026-10-01T00:00:00Z'});
  const actual=await readGroupedSql(client,{...query,analysis:{ranking:true,topN:{direction:'top',limit:7}}},context,input,'r1',10);assert.deepEqual(actual.rows,expected.rows);
 }finally{client.release();await db.close();}
});


test('delivery order preserves global Pareto values and binds continuation to identity or rank',{skip:!enabled},async()=>{
 const db=await database(false),client=await db.runtime.connect();
 try{
  const paretoQuery:AnalyticsQuery={...query,analysis:{pareto:true}};
  const first=await readGroupedSql(client,paretoQuery,context,population,'r1',3,{window:{limit:2,order:'identity'}});
  assert.deepEqual(first.rows.map(row=>row.key),['00001','00002']);assert.deepEqual(first.rows.map(row=>row.rank),[5001,5000]);
  assert.equal(first.window?.nextCursor?.position,undefined);assert.equal(first.rows[0]?.value,100);
  const next=await readGroupedSql(client,paretoQuery,context,population,'r1',3,{window:{limit:2,order:'identity',cursor:first.window!.nextCursor!}});
  assert.deepEqual(next.rows.map(row=>row.key),['00003','00004']);assert.deepEqual(next.rows.map(row=>row.rank),[4999,4998]);
  await assert.rejects(readGroupedSql(client,paretoQuery,context,population,'r1',3,{window:{limit:2,order:'rank',cursor:first.window!.nextCursor!}}),AnalyticsResultWindowError);
  await assert.rejects(readGroupedSql(client,query,context,population,'r1',3,{window:{limit:2,order:'rank'}}),AnalyticsResultWindowError);
 }finally{client.release();await db.close();}
});
