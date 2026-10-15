import test from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {validateQuery} from '@el-dabboos/domain';
import type {AnalyticsRepository,DashboardSpec,AnalyticsResultCursor} from '@el-dabboos/domain';
import {DashboardExecutor} from '../../../application/src/executor.ts';
import {database,enabled} from './support.ts';
import {readGroupedSql} from '../../src/postgres/result-window.ts';

const context={tenantId:'synthetic',locale:'en' as const};
const sourceRows={
 period_invoice_sales:[['c',30],['d',40],['e',50]],
 period_net_sales:[['a',1],['b',2],['c',30],['d',40],['e',50],['f',100]],
};
function repository(client:PoolClient):AnalyticsRepository{
 return {supportsResultWindows:true,async execute(query,scope,read){
  validateQuery(query,scope);
  const source=sourceRows[query.metric as keyof typeof sourceRows];assert.ok(source);
  const input={text:`SELECT key,amount::numeric value,key label,'2026-09-30'::date through,false invalid,false unsafe
   FROM jsonb_to_recordset($1::jsonb) item(key text,amount text)`,params:[JSON.stringify(source.map(([key,amount])=>({key,amount:String(amount)})))]};
  const selected=await readGroupedSql(client,{query,context:scope,input,revision:'synthetic-r1',maxGroups:2,...(read?{read}:{})});
  return {metric:query.metric,groupBy:query.groupBy??null,rows:selected.rows,metadata:{sourceId:'SYNTHETIC ONLY',executedAt:'2026-10-16T00:00:00Z',metricType:query.analysis?.pareto?'percentage':'currency',semantics:'additive',servingRevision:'synthetic-r1',...(selected.window?{window:selected.window}:{})}};
 }};
}
function dashboard(anchor=false):DashboardSpec{
 const series:DashboardSpec['widgets'][number]['series']=[{id:'sales',metric:'period_invoice_sales'},{id:'share',metric:'period_net_sales',analysis:{pareto:true}}];
 return {schemaVersion:2,id:'synthetic-window-review',locale:'en',title:{en:'Synthetic detail',ar:'تفاصيل تجريبية'},filters:{dateRange:{from:'2026-09-01',to:'2026-09-30'}},layout:{columns:12},widgets:[{id:'detail',type:'table',dimension:'customer',series:anchor?[series[1]!,series[0]!]:series}]};
}

test('a secondary Pareto series traverses the complete widget identity population without rank-cursor failures',{skip:!enabled},async()=>{
 const db=await database(false),client=await db.runtime.connect();
 try{
  const executor=new DashboardExecutor(repository(client)),spec=dashboard(),keys:string[]=[],ranks:number[]=[],shares:number[]=[];
  let cursor:AnalyticsResultCursor|undefined;
  do{
   const result=await executor.executeWidget(spec,'detail',context,{timeZone:'Asia/Baghdad',windows:{detail:{limit:2,...(cursor?{cursor}:{})}}});
   assert.equal(result.status,'success');assert.ok(result.alignedRows.length<=2);
   for(const row of result.alignedRows){keys.push(row.key!);ranks.push(row.series.share!.rank!);shares.push(row.series.share!.value!);}
   if(!cursor){assert.deepEqual(result.alignedRows.map(row=>row.key),['a','b']);assert.equal(result.alignedRows[0]?.series.sales,null);}
   cursor=result.window?.nextCursor;
  }while(cursor);
  assert.deepEqual(keys,['a','b','c','d','e','f']);assert.deepEqual(ranks,[6,5,4,3,2,1]);
  assert.deepEqual(shares,[223,222,220,190,150,100].map(numerator=>numerator*100/223));
 }finally{client.release();await db.close();}
});

test('a first-series Pareto anchor retains global rank continuation and missing peer cells',{skip:!enabled},async()=>{
 const db=await database(false),client=await db.runtime.connect();
 try{
  const executor=new DashboardExecutor(repository(client)),spec=dashboard(true);
  const first=await executor.executeWidget(spec,'detail',context,{timeZone:'Asia/Baghdad',windows:{detail:{limit:2}}});
  assert.equal(first.status,'success');assert.deepEqual(first.alignedRows.map(row=>row.key),['f','e']);assert.equal(first.alignedRows[0]?.series.sales,null);assert.equal(first.window?.nextCursor?.position,2);
  const second=await executor.executeWidget(spec,'detail',context,{timeZone:'Asia/Baghdad',windows:{detail:{limit:2,cursor:first.window!.nextCursor!}}});
  assert.equal(second.status,'success');assert.deepEqual(second.alignedRows.map(row=>row.key),['d','c']);assert.deepEqual(second.alignedRows.map(row=>row.series.share?.rank),[3,4]);
 }finally{client.release();await db.close();}
});
