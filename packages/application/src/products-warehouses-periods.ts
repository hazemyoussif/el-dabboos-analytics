import {publishedQueryIssues} from '@el-dabboos/domain';
import type {DateRange,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {productReportReadings} from './products-warehouses-definition.ts';
import type {ProductReportSection} from './products-warehouses-definition.ts';

/** Defaults select existing authorized coverage; explicit sales dates remain untouched. */
export function productReportDefaultPeriod(section:ProductReportSection,preferred:DateRange,published:PublishedAnalyticsCapabilities):DateRange {
 if(published.mode==='synthetic')return preferred;
 const metrics=productReportReadings.filter(reading=>reading.section===section).map(reading=>reading.widget.series[0]!.metric).filter(metric=>published.releases.some(release=>release.capabilities.some(capability=>capability.metric===metric&&capability.dimensions.includes('product'))));
 if(!metrics.length)return preferred;
 const supported=(dateRange:DateRange)=>metrics.every(metric=>!publishedQueryIssues({metric,groupBy:'product',dateRange},published).length);
 if(supported(preferred))return preferred;
 const candidates=published.releases.filter(release=>release.capabilities.some(capability=>metrics.includes(capability.metric))).flatMap(release=>{
  if(!release.period)return [];
  const to=release.period.to<preferred.to?release.period.to:preferred.to;
  const monthStart=to.slice(0,7)+'-01';
  const from=section==='inventory'?to:release.period.from>monthStart?release.period.from:monthStart;
  return from<=to?[{from,to}]:[];
 });
 candidates.sort((left,right)=>right.to.localeCompare(left.to)||left.from.localeCompare(right.from));
 return candidates.find(supported)??preferred;
}
