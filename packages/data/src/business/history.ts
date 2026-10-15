import {businessCatalog} from '@el-dabboos/domain';
import type {PublishedAnalyticsRelease,BusinessMetricId} from '@el-dabboos/domain';
/** Event windows stitch only adjacent trusted publications. Snapshot metrics never stitch/sum. */
export function businessEventWindows(releases:readonly PublishedAnalyticsRelease[]):PublishedAnalyticsRelease[]{
 const ordered=[...releases].sort((left,right)=>left.period!.from.localeCompare(right.period!.from)),windows:PublishedAnalyticsRelease[]=[];
 for(const release of ordered){
  const capabilities=release.capabilities.filter(capability=>{
   const semantics=businessCatalog[capability.metric as BusinessMetricId]?.semantics;
   return semantics?.kind==='additive'||semantics?.kind==='ratio'&&semantics.basis!=='snapshot';
  });
  const previous=windows.at(-1),adjacent=previous&&new Date(Date.parse(previous.period!.to+'T00:00:00Z')+86400000).toISOString().slice(0,10)===release.period!.from;
  if(adjacent&&JSON.stringify(previous.capabilities)===JSON.stringify(capabilities)){
   windows[windows.length-1]={...previous,datasetId:`${previous.datasetId}|${release.datasetId}`,certificationReference:`${previous.certificationReference}|${release.certificationReference}`,period:{from:previous.period!.from,to:release.period!.to}};
  }else windows.push({...release,capabilities});
 }
 return windows.filter(release=>release.datasetId.includes('|'));
}
