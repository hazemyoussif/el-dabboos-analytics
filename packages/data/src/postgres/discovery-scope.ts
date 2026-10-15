import {publishedQueryIssues,validDateRange,UncertifiedDimensionError} from '@el-dabboos/domain';
import type {AnalyticsContext,DimensionId,DimensionDiscoveryRequest,PublishedAnalyticsCapabilities,PublishedAnalyticsRelease} from '@el-dabboos/domain';
/** Discovery authorizes the same metric, period and policy scope as report execution. */
export function dimensionDiscoveryScope(dimension:DimensionId,context:AnalyticsContext,request:DimensionDiscoveryRequest,published:PublishedAnalyticsCapabilities){
 const bounds=discoveryBounds(request);
 const releases=[...published.releases].sort((left,right)=>(right.period?.to??'').localeCompare(left.period?.to??''));
 for(const release of releases)for(const capability of release.capabilities){
  const candidate=discoveryCandidate({dimension,context,request,published,release},capability.metric);
  if(candidate)return {...bounds,...candidate};
 }
 throw new UncertifiedDimensionError(dimension);
}
function discoveryBounds(request:DimensionDiscoveryRequest){
 const limit=request.limit??50,search=request.search??'',selected=request.selectedIds??[];
 if(!Number.isInteger(limit)||limit<1||limit>100||search.length>100||selected.length>1000)throw new Error('Invalid dimension discovery bounds');
 if(request.dateRange&&!validDateRange(request.dateRange))throw new Error('Invalid dimension discovery period');
 if(request.asOf&&!validDateRange({from:request.asOf,to:request.asOf}))throw new Error('Invalid dimension discovery cutoff');
 return {limit,search,selected};
}
function discoveryCandidate(scope:{dimension:DimensionId;context:AnalyticsContext;request:DimensionDiscoveryRequest;published:PublishedAnalyticsCapabilities;release:PublishedAnalyticsRelease},metric:import('@el-dabboos/domain').MetricId){
 const {dimension,context,request,published,release}=scope;
 if(request.metric&&metric!==request.metric)return null;
 const to=request.dateRange?.to??request.asOf??release.period?.to;
 const range=request.dateRange??(to?{from:release.period?.from??to,to}:undefined);
 const query={metric,groupBy:dimension,...(range?{dateRange:range}:{}),filters:[...(context.enforcedFilters??[])]};
 if(publishedQueryIssues(query,{...published,releases:[release]}).length)return null;
 return {metric,range};
}
