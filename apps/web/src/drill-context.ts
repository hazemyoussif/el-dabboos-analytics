import { drillDimensions, drillMetrics, timeDimensions } from '@el-dabboos/domain';
import type { DashboardExecutionResult, WidgetExecution } from '@el-dabboos/application';
import type { AnalyticsResult, DashboardWidget, DateRange, DrillRequest } from '@el-dabboos/domain';
export function drillRequestFor(execution:DashboardExecutionResult,widget:DashboardWidget,entry:WidgetExecution,seriesId:string,key:string|null):DrillRequest|null {
  const series=widget.series.find(item=>item.id===seriesId),result=entry.seriesResults[seriesId];
  if(!traceableSeries(widget,series)||result?.status!=='success'||!result.result.metadata.release)return null;
  if(!result.result.metadata.sourceAsOf)return null;
  if(result.result.rows.find(row=>row.key===key)?.value==null)return null;
  const filters=execution.metadata.effectiveFilters;
  const range=clickedPeriod(widget,key,filters?.dateRange);
  if(range===null)return null;
  return {sourceAsOf:result.result.metadata.sourceAsOf,query:{metric:series.metric,...(range?{dateRange:range}:{}),...(filters?.dimensions?{filters:filters.dimensions}:{})},release:pointRelease(result.result,key),
    ...(widget.dimension&&key!==null&&!timeDimensions.includes(widget.dimension)?{clicked:{dimension:widget.dimension,values:[key]}}:{})};
}
function clickedPeriod(widget:DashboardWidget,key:string|null,range:DateRange|undefined):DateRange|undefined|null {
  if(!widget.dimension||!timeDimensions.includes(widget.dimension)||key===null)return range;
  let from=key,to=key;
  if(widget.dimension==='month'){from=`${key}-01`;to=new Date(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5,7)),0)).toISOString().slice(0,10);}
  if(widget.dimension==='year'){from=`${key}-01-01`;to=`${key}-12-31`;}
  if(widget.dimension==='quarter'){const month=(Number(key.at(-1))-1)*3;from=new Date(Date.UTC(Number(key.slice(0,4)),month,1)).toISOString().slice(0,10);to=new Date(Date.UTC(Number(key.slice(0,4)),month+3,0)).toISOString().slice(0,10);}
  if(range){from=from<range.from?range.from:from;to=to>range.to?range.to:to;}
  return from>to?null:{from,to};
}

/** Finance trends carry the publication for each point; event points share a manifest. */
function pointRelease(result:AnalyticsResult,key:string|null):string {
 return key===null?result.metadata.release!.datasetId:result.metadata.drillReleases?.[key]??result.metadata.release!.datasetId;
}

function traceableSeries(widget:DashboardWidget,series:DashboardWidget['series'][number]|undefined):series is DashboardWidget['series'][number] {
 if(!series||series.analysis||!drillMetrics.includes(series.metric))return false;
 return !widget.dimension||timeDimensions.includes(widget.dimension)||drillDimensions.includes(widget.dimension);
}
