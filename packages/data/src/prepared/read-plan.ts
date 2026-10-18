import {windowedPreparedSlots} from './reporting-window.ts';
import type {DateRange} from '@el-dabboos/domain';
import {coveredSlot} from '../operational/coverage.ts';
import type {ServingCoverage} from '../operational/coverage.ts';
import {preparedMetricBasis,requiredMeasures,selectPreparedGrain,timeDimensions} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,PreparedTimeGrain} from '@el-dabboos/domain';
import type {QuerySlot} from '../postgres/slot-plan.ts';
import {planTrustedRange} from '../operational/range-plan.ts';
import type {PreparedConfiguration} from './contracts.ts';
export interface PreparedBinding {
 data_id:string;period:string;configuration:PreparedConfiguration;statistics:Record<string,number>;source_cutoff:Date;
}
export interface PreparedSegment {key:string|null;data_id:string;grain_id:string;time_grain:PreparedTimeGrain;from:string;to:string}
/** Only declared, validated prepared grains may supply a read. No source-history fallback exists. */
export function planPreparedRead(bindings:readonly PreparedBinding[],query:AnalyticsQuery,context:AnalyticsContext,slots:readonly QuerySlot[],cutoffSelection:'latest'|'exact'='latest'):PreparedSegment[]{
 if(preparedMetricBasis(query.metric)==='snapshot')return slots.flatMap(slot=>{
  const selected=bindings.filter(binding=>slot.to!==null&&(cutoffSelection==='exact'?binding.configuration.through===slot.to:binding.configuration.through<=slot.to)).sort((left,right)=>right.configuration.through.localeCompare(left.configuration.through))[0];
  return selected?[segment(selected,query,context,{key:slot.key,grain:'cutoff',from:selected.configuration.through,to:selected.configuration.through})]:[];
 });
 const timeFilter=[...(query.filters??[]),...(context.enforcedFilters??[])].some(filter=>timeDimensions.includes(filter.dimension));
 const partitions=bindings.map(binding=>({month:binding.period.slice(0,7),partitionId:binding.data_id,monthly:!timeFilter,availableFrom:binding.configuration.from,availableThrough:binding.configuration.through}));
 return planTrustedRange(slots,partitions).map(plan=>segment(bindings.find(binding=>binding.data_id===plan.partition_id)!,query,context,plan));
}
function segment(binding:PreparedBinding,query:AnalyticsQuery,context:AnalyticsContext,plan:{key:string|null;grain:PreparedTimeGrain;from:string;to:string}):PreparedSegment{
 const {key,grain:timeGrain,from,to}=plan;
 const grains=binding.configuration.grains.map(grain=>({...grain,measures:binding.configuration.measures,timeGrain,rows:binding.statistics[timeGrain+':'+grain.id]??0}));
 const grain=selectPreparedGrain(grains,{query,context,timeGrain});
 if(!grain||requiredMeasures(query.metric).some(measure=>!binding.configuration.measures.includes(measure)))throw new Error('Prepared semantic or policy grain unavailable');
 return {key,data_id:binding.data_id,grain_id:grain.id,time_grain:timeGrain,from,to};
}

export function governedPreparedSlots(query:AnalyticsQuery,slots:readonly QuerySlot[],coverage?:ServingCoverage,reportingWindow?:DateRange):QuerySlot[]{
 slots=windowedPreparedSlots(slots,reportingWindow);
 if(!coverage||preparedMetricBasis(query.metric)==='snapshot')return [...slots];
 return slots.flatMap(slot=>{const eligible=coveredSlot(slot,coverage);return eligible?[eligible]:[];});
}
