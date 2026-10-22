import {preparedMetricBasis,requiredMeasures} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,AnalyticsResult,DateRange} from '@el-dabboos/domain';
import type {PoolClient} from 'pg';
import {addDays} from '../calendar.ts';
import {salesCommandDefinitionVersion} from './sales-command-mapping.ts';

export interface CommandObservation {from:string;to:string;cutoff:string}
type Coverage=Pick<AnalyticsResult['metadata'],'coverage'|'availability'|'snapshotAsOf'|'sourceAsOf'>;
/** Actual accepted source observations or validated prepared segments, never eligibility bounds. */
export function salesCommandCoverage(query:AnalyticsQuery,range:DateRange,observations:readonly CommandObservation[]):Coverage {
 if(preparedMetricBasis(query.metric)==='snapshot'){
  const point=observations.filter(observation=>observation.to<=range.to).sort((left,right)=>right.to.localeCompare(left.to))[0];
  return point?{coverage:{status:'complete',from:point.to,through:point.to,cutoff:point.cutoff},snapshotAsOf:point.to,sourceAsOf:point.cutoff}:{coverage:{status:'unavailable',from:range.from,through:range.to},availability:{state:'DATA_NOT_READY',reason:'no_snapshot'}};
 }
 const intervals=observations.filter(observation=>observation.to>=range.from&&observation.from<=range.to).sort((left,right)=>left.from.localeCompare(right.from));
 let cursor=range.from;
 for(const interval of intervals){if(interval.from>cursor)break;if(interval.to>=cursor)cursor=addDays(interval.to,1);}
 const complete=cursor>range.to,status=complete?'complete':intervals.length?'partial':'unavailable';
 const cutoff=intervals.map(interval=>interval.cutoff).sort()[0];
 return {coverage:{status,from:range.from,through:range.to,...(cutoff?{cutoff}:{})},...(cutoff?{sourceAsOf:cutoff}:{}),...(!complete?{availability:{state:intervals.length?'PARTIAL_COVERAGE':'DATA_NOT_READY',reason:'missing_partition'}}:{})};
}
/** Native comparison reader proves coverage from completed immutable extraction metadata. */
export async function nativeSalesCommandCoverage(client:PoolClient,scope:{query:AnalyticsQuery;context:AnalyticsContext;range:DateRange;revision:string}):Promise<Coverage> {
 const snapshot=preparedMetricBasis(scope.query.metric)==='snapshot';
 const rows=(await client.query(`SELECT extraction.month::text "from",observed.business_day::text "to",
 observed.cutoff FROM mart.analytics_serving_members member
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 CROSS JOIN LATERAL (SELECT min(observation.business_day) business_day,min(observation.source_cutoff) cutoff,
  count(*) observations FROM unnest($4::text[]) required(measure)
  CROSS JOIN LATERAL mart.business_measure_observation(extraction.tenant_id,extraction.partition_id,required.measure) observation) observed
 WHERE member.tenant_id=$1 AND member.revision_id=$7 AND member.family='business' AND extraction.completed
 AND extraction.mapping->>'mappingId'='business-purpose-v1-sales-command' AND extraction.mapping->>'mappingVersion'=$5
 AND extraction.month<=date_trunc('month',$3::date) AND ($6::boolean OR extraction.month>=date_trunc('month',$2::date))
 AND observed.observations=cardinality($4::text[])
 AND NOT EXISTS(SELECT 1 FROM unnest($4::text[]) required(measure) WHERE NOT EXISTS(
 SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') mapped WHERE mapped->>'measureId'=required.measure))`,[scope.context.tenantId,scope.range.from,scope.range.to,requiredMeasures(scope.query.metric),salesCommandDefinitionVersion(),snapshot,scope.revision])).rows;
 return salesCommandCoverage(scope.query,scope.range,rows.map(row=>({from:row.from,to:row.to,cutoff:row.cutoff.toISOString()})));
}
