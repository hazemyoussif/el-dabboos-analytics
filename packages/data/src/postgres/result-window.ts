import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import {AnalyticsResultLimitError,AnalyticsResultWindowError,semanticCatalog,categoricalDimensions} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,AnalyticsReadOptions,AnalyticsRow,AnalyticsResultWindow,AnalyticsResultCursor} from '@el-dabboos/domain';
import {numericOutput,bind} from './sql.ts';

export interface GroupedSql {text:string;params:unknown[]}
export interface GroupedRead {query:AnalyticsQuery;context:AnalyticsContext;input:GroupedSql;revision:string;maxGroups:number;read?:AnalyticsReadOptions}
export interface GroupedSelection {rows:AnalyticsRow[];labels:Record<string,string>;dataThrough:string|null;window?:AnalyticsResultWindow}
interface ResultRow {key:string|null;value:string|null;rank:string|null;label:string|null;total:string;through:string|null;invalid:boolean|null;unsafe:boolean|null}
/** Source SQL supplies key, numeric value, label, through and invalid. Analysis precedes selection. */
export async function readGroupedSql(client:PoolClient,request:GroupedRead):Promise<GroupedSelection>{
 validateGroupedRead(request.query,request.read);
 if(request.read?.revision&&request.read.revision!==request.revision)throw new AnalyticsResultWindowError();
 const scope=windowScope(request),plan=groupedPlan(request,scope);
 const result=await client.query<ResultRow>(plan.text,plan.params);
 if(result.rows[0]?.unsafe)throw new Error('Unsafe SQL numeric output');
 if(result.rows[0]?.invalid)throw new Error('Compatible base UOM required');
 const present=result.rows.filter(row=>row.key!==null);
 if(!request.read?.window&&!request.read?.outputKeys&&present.length>request.maxGroups)throw new AnalyticsResultLimitError(request.query.groupBy!);
 return projectSelection(result.rows,present,request,plan.limit,scope);
}
function groupedPlan(request:GroupedRead,scope:string){
 const {query,input,read,maxGroups}=request,params=[...input.params];
 const search=read?.window?.search?.trim(),eligible=search?`WHERE position(lower(${bind(params,search)}) in lower(coalesce(label,'')))>0`:'';
 const selection=selectionSql(request,scope,params),limit=read?.window?.limit??read?.outputKeys?.length??maxGroups;
 const orderedWindow=Boolean(read?.window&&!query.analysis?.pareto);
 const order=orderedWindow?'key COLLATE "C"':analysisOrder(query);
 return {limit,params,text:`WITH original AS MATERIALIZED (${input.text}),${groupedAnalysisSql(query)},eligible AS (SELECT * FROM analyzed ${eligible}),
 totals AS (SELECT count(*)::text total FROM eligible),provenance AS (SELECT max(through)::text through,bool_or(invalid) invalid,bool_or(unsafe) unsafe FROM original),page AS (
 SELECT * FROM eligible ${selection} ORDER BY ${order} LIMIT ${bind(params,limit+1)})
 SELECT page.key,page.value::text value,page.rank::text rank,page.label,totals.total,provenance.through,provenance.invalid,provenance.unsafe
 FROM totals CROSS JOIN provenance LEFT JOIN page ON true ORDER BY ${orderedWindow?'page.key COLLATE "C"':analysisOrder(query,'page.')}`};
}
function selectionSql({read,query}:GroupedRead,scope:string,params:unknown[]){
 const conditions:string[]=[];
 if(read?.window?.cursor){
  const cursor=decodeCursor(read.window.cursor,scope);
  if(query.analysis?.pareto){if(!Number.isSafeInteger(cursor.position)||cursor.position!<1)throw new AnalyticsResultWindowError();conditions.push(`rank>${bind(params,cursor.position)}::bigint`);}
  else conditions.push(`key COLLATE "C">${bind(params,cursor.after)}::text COLLATE "C"`);
 }
 if(read?.outputKeys)conditions.push(`key=ANY(${bind(params,read.outputKeys)}::text[])`);
 return conditions.length?'WHERE '+conditions.join(' AND '):'';
}
function analysisOrder(query:AnalyticsQuery,prefix=''){
 if(query.analysis?.topN)return `${prefix}value ${query.analysis.topN.direction==='top'?'DESC':'ASC'} NULLS LAST,${prefix}key COLLATE "C"`;
 return query.analysis?.pareto?`${prefix}rank`:`${prefix}key COLLATE "C"`;
}
function projectSelection(all:ResultRow[],present:ResultRow[],request:GroupedRead,limit:number,scope:string):GroupedSelection{
 const selected=present.slice(0,limit),semantics=semanticCatalog[request.query.metric].semantics;
 const derived=Boolean(request.query.analysis?.percentageContribution||request.query.analysis?.pareto)||['ratio','duration_derived'].includes(semantics.kind);
 const rows=selected.map(row=>projectRow(row,derived)),labels=Object.fromEntries(selected.filter(row=>row.label).map(row=>[row.key!,row.label!]));
 const last=selected.at(-1);
 const cursor=last?{after:last.key!,scope,...(request.query.analysis?.pareto?{position:Number(last.rank)}:{})}:undefined;
 const window=request.read?.window?{total:Number(all[0]?.total??0),scope,...(present.length>limit&&cursor?{nextCursor:cursor}:{})}:undefined;
 return {rows,labels,dataThrough:all[0]?.through??null,...(window?{window}:{})};
}
function projectRow(row:ResultRow,derived:boolean):AnalyticsRow{return {key:row.key,value:derived?derivedNumber(row.value):numericOutput(row.value),...(row.rank!==null?{rank:Number(row.rank)}:{})};}
function groupedAnalysisSql(query:AnalyticsQuery){
 const analysis=query.analysis;
 const percent=analysis?.percentageContribution?'coalesce(value,0)/nullif(sum(coalesce(value,0)) OVER (),0)*100':'value';
 const share=analysis?.pareto?'sum(value) OVER (ORDER BY value DESC,key COLLATE "C" ROWS UNBOUNDED PRECEDING)/nullif(sum(value) OVER (),0)*100':'value';
 const rank=analysis?.pareto||analysis?.ranking?'row_number() OVER (ORDER BY value DESC NULLS LAST,key COLLATE "C")':'NULL::bigint';
 const limit=analysis?.topN?`ORDER BY value ${analysis.topN.direction==='top'?'DESC':'ASC'} NULLS LAST,key COLLATE "C" LIMIT ${analysis.topN.limit}`:'';
 return `contributions AS (SELECT key,${percent} value,label,through FROM original),positive AS (SELECT * FROM contributions ${analysis?.pareto?'WHERE value>0':''}),
 ranked AS (SELECT key,${share} value,${rank} rank,label,through FROM positive),analyzed AS (SELECT * FROM ranked ${limit})`;
}
export function validateGroupedRead(query:AnalyticsQuery,read?:AnalyticsReadOptions){
 if(!query.groupBy||!categoricalDimensions.includes(query.groupBy))throw new Error('Categorical output selection required');
 if(query.analysis?.comparison||query.analysis?.movingAverage||query.analysis?.runningTotal)throw new Error('Unsupported categorical analysis');
 if(read?.window&&read.outputKeys)throw new Error('Choose one output selection');
 if(read?.window)validateWindow(read.window);
 if(read?.outputKeys)validateKeys(read.outputKeys);
}
function validateWindow(window:NonNullable<AnalyticsReadOptions['window']>){
 if(!Number.isInteger(window.limit)||window.limit<1||window.limit>1000)throw new Error('Invalid result window');
 if(typeof(window.search??'')!=='string'||(window.search?.length??0)>200)throw new Error('Invalid result search');
}
function validateKeys(keys:readonly string[]){
 if(keys.length>1000||new Set(keys).size!==keys.length||keys.some(key=>typeof key!=='string'||!key.trim()||key.length>200))throw new Error('Invalid output identities');
}
function derivedNumber(value:string|null){
 if(value===null)return null;
 const parsed=Number(value);
 if(!Number.isFinite(parsed)||Math.abs(parsed)>Number.MAX_SAFE_INTEGER)throw new Error('Unsafe derived result');
 return parsed;
}
function windowScope({query,context,revision,read}:GroupedRead){return createHash('sha256').update(JSON.stringify([read?.window?.queries??[query],context.tenantId,context.locale,context.enforcedFilters??[],revision,read?.window?.search?.trim()??''])).digest('hex');}
function decodeCursor(cursor:AnalyticsResultCursor,scope:string):AnalyticsResultCursor{
 if(cursor.scope!==scope||typeof cursor.after!=='string'||!cursor.after||cursor.after.length>200)throw new AnalyticsResultWindowError();
 return cursor;
}
