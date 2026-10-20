import {semanticCatalog} from '@el-dabboos/domain';
import type {PublishedAnalyticsRelease,PublishedMetricCapability} from '@el-dabboos/domain';
interface EventWindow {release:PublishedAnalyticsRelease;months:number}
/** Stitch compatible event capabilities independently; current-only operands cannot hide other history. */
export function businessEventWindows(releases:readonly PublishedAnalyticsRelease[]):PublishedAnalyticsRelease[]{
 const ordered=[...releases].sort((left,right)=>left.period!.from.localeCompare(right.period!.from));
 const active=new Map<string,EventWindow>(),windows:EventWindow[]=[];
 for(const release of ordered)for(const capability of release.capabilities){
  if(!eventCapability(capability))continue;
  const signature=JSON.stringify([release.sourceId,capability,capability.metric.startsWith('command_')?release.mappingVersion:null]);
  const previous=active.get(signature);
  const adjacent=previous&&new Date(Date.parse(previous.release.period!.to+'T00:00:00Z')+86400000).toISOString().slice(0,10)===release.period!.from;
  if(adjacent){
   previous.release={...previous.release,datasetId:`${previous.release.datasetId}|${release.datasetId}`,certificationReference:`${previous.release.certificationReference}|${release.certificationReference}`,period:{from:previous.release.period!.from,to:release.period!.to}};
   previous.months++;
  }else{
   const window={release:{...release,capabilities:[capability]},months:1};
   active.set(signature,window);windows.push(window);
  }
 }
 return windows.filter(window=>window.months>1).map(window=>window.release);
}
function eventCapability(capability:PublishedMetricCapability):boolean {
 const semantics=semanticCatalog[capability.metric].semantics;
 return semantics.kind==='additive'||semantics.kind==='distinct_count'||semantics.kind==='ratio'&&semantics.basis!=='snapshot';
}
