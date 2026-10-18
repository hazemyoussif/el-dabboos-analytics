import type {PoolClient} from 'pg';
import type {AnalyticsContext,DateRange,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import type {QuerySlot} from '../postgres/slot-plan.ts';

/** Reporting eligibility is separate from older snapshot bindings needed as opening anchors. */
export async function readPreparedReportingWindow(client:PoolClient,tenantId:string):Promise<DateRange|undefined>{
 return (await client.query<DateRange>('SELECT from_day::text AS "from",through_day::text AS "to" FROM mart.prepared_reporting_windows WHERE tenant_id=$1',[tenantId])).rows[0];
}
export function requirePreparedReportingRange(range:DateRange|undefined,window:DateRange|undefined){
 if(window&&range&&(range.from<window.from||range.to>window.to))throw new Error('Requested period is outside prepared reporting coverage');
}
export function windowedPreparedCapabilities(published:PublishedAnalyticsCapabilities,window:DateRange|undefined):PublishedAnalyticsCapabilities{
 if(!window)return published;
 return {...published,releases:published.releases.flatMap(release=>{
  if(!release.period)return [];
  if(release.selectionSemantics==='latest_snapshot'&&release.period.to<window.from)return [{...release,period:{from:window.from,to:window.from}}];
  const from=release.period.from>window.from?release.period.from:window.from,to=release.period.to<window.to?release.period.to:window.to;
  return from<=to?[{...release,period:{from,to}}]:[];
 })};
}
export function windowedPreparedSlots(slots:readonly QuerySlot[],window:DateRange|undefined):QuerySlot[]{
 return slots.filter(slot=>!window||slot.from!==null&&slot.to!==null&&slot.from>=window.from&&slot.to<=window.to);
}
export async function governedPreparedRead<Scope extends {context:AnalyticsContext;range:DateRange}>(client:PoolClient,scope:Scope):Promise<Scope&{reportingWindow?:DateRange}>{
 const reportingWindow=await readPreparedReportingWindow(client,scope.context.tenantId);
 requirePreparedReportingRange(scope.range,reportingWindow);
 return {...scope,...(reportingWindow?{reportingWindow}:{})};
}
