import type { AnalyticsQuery,AnalyticsResult } from '@el-dabboos/domain';
import { semanticCatalog } from '@el-dabboos/domain';
import type { QuerySlot } from '../postgres/query-slots.ts';
import { periodKeys } from '../calendar.ts';
export interface ServingCoverage {from:string;to:string;cutoff?:string;cutoffDay?:string;months?:readonly string[]}
export function isSnapshotQuery(query:AnalyticsQuery){const semantics=semanticCatalog[query.metric].semantics;return semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';}
/** Clip event slots only; uncovered slots stay absent, never zero-complete. */
export function coveredSlot(slot:QuerySlot,coverage:ServingCoverage):QuerySlot|null {
 if(!slot.from||!slot.to)return null;
 const from=slot.from<coverage.from?coverage.from:slot.from,to=slot.to>coverage.to?coverage.to:slot.to;
 if(from>to)return null;
 if(coverage.months&&periodKeys({from,to},'month').some(month=>!coverage.months!.includes(month)))return null;
 return {...slot,from,to};
}
export function coverageMetadata(query:AnalyticsQuery,coverage:ServingCoverage,dataThrough:string|null,missingPartition=false):Pick<AnalyticsResult['metadata'],'coverage'|'availability'> {
 const range=query.dateRange;if(!range)return {};
 const snapshot=isSnapshotQuery(query);
 const unavailable=snapshot?!dataThrough:range.to<coverage.from||range.from>coverage.to||missingPartition;
 const partial=!snapshot&&partialEventCoverage(range,coverage);
 const status=unavailable?'unavailable':partial?'partial':'complete';
 return {coverage:{status,from:coverage.from,through:coverage.to,...(coverage.cutoff?{cutoff:coverage.cutoff}:{})},...(unavailable?{availability:{state:'DATA_NOT_READY' as const,reason:snapshot?'no_snapshot' as const:missingPartition?'missing_partition' as const:'outside_coverage' as const}}:partial?{availability:{state:'PARTIAL_COVERAGE' as const,reason:'outside_coverage' as const}}:{})};
}

function partialEventCoverage(range:NonNullable<AnalyticsQuery['dateRange']>,coverage:ServingCoverage){
 const cutoffDay=coverage.cutoffDay??coverage.cutoff?.slice(0,10);
 return range.from<coverage.from||range.to>coverage.to||Boolean(cutoffDay&&range.to>=cutoffDay);
}
