import {categoricalDimensions,compareAnalyticsKeys,validateQuery,AnalyticsResultWindowError} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,AnalyticsRepository,AnalyticsResult,AnalyticsResultCursor,DashboardWidget} from '@el-dabboos/domain';
import type {WidgetExecution,SeriesExecution} from './executor.ts';
import type {EffectiveDashboardFilters} from './dashboard-filters.ts';
import {normalizeAnalyticsQuery,analyticsQueryIdentity} from './query-execution.ts';
import {alignAnalyticsSeries} from './analytics-alignment.ts';
import {seriesFailure} from './series-failure.ts';

export interface WidgetWindowRequest {limit?:number;cursor?:AnalyticsResultCursor;search?:string}
export interface WidgetResultWindow {limit:number;total?:number;nextCursor?:AnalyticsResultCursor;search?:string}
export function windowedWidget(widget:DashboardWidget){return Boolean(widget.dimension&&categoricalDimensions.includes(widget.dimension)&&['table','bar','line','area','combo'].includes(widget.type));}
export async function executeGroupedWidget(repository:AnalyticsRepository,widget:DashboardWidget,context:AnalyticsContext,filters:EffectiveDashboardFilters,request:WidgetWindowRequest={}):Promise<WidgetExecution>{
 const queries=widget.series.map(series=>normalizeAnalyticsQuery({metric:series.metric,groupBy:widget.dimension!,...(series.analysis?{analysis:series.analysis}:{}),...(filters.dateRange?{dateRange:filters.dateRange}:{}),...(filters.dimensions?{filters:filters.dimensions}:{})}));
 queries.forEach(query=>validateQuery(query,context));
 const limit=request.limit??(widget.type==='table'?100:25);
 const anchored=widget.series[0]?.analysis?.topN||widget.series[0]?.analysis?.pareto;
 const entries=anchored?await anchoredResults(repository,queries,context,{...request,limit}):await windowResults(repository,queries,context,{...request,limit});
 const seriesResults=Object.fromEntries(widget.series.map((series,index)=>[series.id,structuredClone(entries.results[index]!)]));
 const succeeded=Object.values(seriesResults).filter(result=>result.status==='success').length;
 const alignedRows=alignAnalyticsSeries(widget,seriesResults);
 if(!anchored)alignedRows.sort((left,right)=>compareAnalyticsKeys(left.key,right.key));
 return {status:succeeded===0?'error':succeeded===widget.series.length?'success':'partial',seriesResults,alignedRows,...(entries.window?{window:entries.window}:{})};
}
async function anchoredResults(repository:AnalyticsRepository,queries:AnalyticsQuery[],context:AnalyticsContext,request:WidgetWindowRequest&{limit:number}):Promise<{results:SeriesExecution[];window?:WidgetResultWindow}>{
 const paged=Boolean(queries[0]?.analysis?.pareto&&!queries[0]?.analysis?.topN);
 const anchor=await executeSeries(()=>repository.execute(queries[0]!,context,paged?{window:{...request,queries,order:'rank'}}:undefined));
 if(anchor.status==='error')return {results:queries.map(()=>anchor)};
 const keys=anchor.result.rows.map(row=>row.key).filter((key):key is string=>key!==null),results:SeriesExecution[]=[anchor];
 for(const query of queries.slice(1))results.push(await executeSeries(()=>repository.execute(query,context,{outputKeys:keys,...(anchor.result.metadata.servingRevision?{revision:anchor.result.metadata.servingRevision}:{})})));
 return {results,...(paged&&anchor.result.metadata.window?{window:{...anchor.result.metadata.window,limit:request.limit,...(request.search?{search:request.search}:{})}}:{})};
}
async function windowResults(repository:AnalyticsRepository,queries:AnalyticsQuery[],context:AnalyticsContext,request:WidgetWindowRequest&{limit:number}){
 const distinct=[...new Map(queries.map(query=>[analyticsQueryIdentity(query,context),query])).values()];
 const pages:SeriesExecution[]=[];
 for(const query of distinct)pages.push(await executeSeries(()=>repository.execute(query,context,{window:{...request,queries,order:'identity'}})));
 const successes=pages.flatMap(result=>result.status==='success'?[result.result]:[]);
 const scopes=new Set(successes.map(result=>result.metadata.window?.scope)),revisions=new Set(successes.map(result=>result.metadata.servingRevision));
 if(scopes.size>1||revisions.size>1)throw new AnalyticsResultWindowError();
 const population=[...new Set(successes.flatMap(result=>result.rows.flatMap(row=>row.key===null?[]:[row.key])))].sort(compareAnalyticsKeys);
 const keys=population.slice(0,request.limit),more=population.length>request.limit||successes.some(result=>result.metadata.window?.nextCursor);
 const scope=successes[0]?.metadata.window?.scope;
 const cache=new Map<string,SeriesExecution>();
 for(let index=0;index<distinct.length;index++){
  const query=distinct[index]!,page=pages[index]!;
  cache.set(analyticsQueryIdentity(query,context),page.status==='error'?page:await selectedResult(repository,query,context,page.result,keys));
 }
 const total=distinct.length===1?successes[0]?.metadata.window?.total:!more&&!request.cursor?population.length:undefined;
 return {results:queries.map(query=>cache.get(analyticsQueryIdentity(query,context))!),window:{limit:request.limit,...(total!==undefined?{total}:{}),...(more&&scope&&keys.length?{nextCursor:{scope,after:keys.at(-1)!}}:{}),...(request.search?{search:request.search}:{})}};
}
async function selectedResult(repository:AnalyticsRepository,query:AnalyticsQuery,context:AnalyticsContext,page:AnalyticsResult,keys:string[]):Promise<SeriesExecution>{
 if(keys.every(key=>page.rows.some(row=>row.key===key)))return {status:'success',result:{...page,rows:page.rows.filter(row=>keys.includes(row.key!))}};
 return executeSeries(()=>repository.execute(query,context,{outputKeys:keys,...(page.metadata.servingRevision?{revision:page.metadata.servingRevision}:{})}));
}
async function executeSeries(operation:()=>Promise<AnalyticsResult>):Promise<SeriesExecution>{try{return {status:'success',result:await operation()};}catch(error){return seriesFailure(error);}}
