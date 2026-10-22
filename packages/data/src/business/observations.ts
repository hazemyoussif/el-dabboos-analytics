import type {PoolClient} from 'pg';
import {requiredMeasures,preparedMetricBasis} from '@el-dabboos/domain';
import type {AnalyticsQuery,DateRange} from '@el-dabboos/domain';
import type {PublishedAnalyticsRelease,SourceMapping} from '@el-dabboos/domain';

export interface BusinessRecipeObservation {object:string;cutoff:string;day:string}

/** Capability periods belong to their operands, rather than the newest sibling recipe. */
export function observedBusinessReleases(release:PublishedAnalyticsRelease,mapping:SourceMapping,observations:readonly BusinessRecipeObservation[]):PublishedAnalyticsRelease[]{
 if(!release.period)throw new Error('Business release period required');
 const groups=new Map<string,PublishedAnalyticsRelease>();
 for(const capability of release.capabilities){
  const objects=requiredMeasures(capability.metric).map(measure=>mapping.measures.find(rule=>rule.measureId===measure)?.sourceObject);
  const selected=objects.map(object=>observations.find(observation=>observation.object===object));
  if(selected.some(observation=>!observation))throw new Error('Business capability observation missing');
  const through=selected.map(observation=>observation!.day).sort()[0]!;
  const previous=groups.get(through)??{...release,period:{...release.period,to:through},capabilities:[]};
  groups.set(through,{...previous,capabilities:[...previous.capabilities,capability]});
 }
 return [...groups.values()];
}

export async function readBusinessRecipeObservations(client:PoolClient,tenantId:string,partitionId:string):Promise<BusinessRecipeObservation[]>{
 const rows=(await client.query(`SELECT DISTINCT rule->>'sourceObject' object,
  observation.source_cutoff cutoff,observation.business_day::text AS "day"
  FROM mart.review_extractions extraction CROSS JOIN LATERAL jsonb_array_elements(extraction.mapping->'measures') rule
  CROSS JOIN LATERAL mart.business_measure_observation(extraction.tenant_id,extraction.partition_id,rule->>'measureId') observation
  WHERE extraction.tenant_id=$1 AND extraction.partition_id=$2`,[tenantId,partitionId])).rows;
 return rows.map(row=>({object:row.object,cutoff:row.cutoff.toISOString(),day:row.day}));
}

/** Provenance is selected for the requested operands, including independently empty recipes. */
export async function businessMetricObservation(client:PoolClient,scope:{tenantId:string;revision:string;query:AnalyticsQuery;range:DateRange}){
 const snapshot=preparedMetricBasis(scope.query.metric)==='snapshot';
 const rows=(await client.query(`WITH observations AS (
  SELECT required.measure,observation.* FROM mart.analytics_serving_members member
  CROSS JOIN unnest($3::text[]) required(measure)
  CROSS JOIN LATERAL mart.business_measure_observation(member.tenant_id,member.partition_id,required.measure) observation
  WHERE member.tenant_id=$1 AND member.revision_id=$2 AND member.family='business'
   AND member.month<=date_trunc('month',$5::date) AND ($6::boolean OR member.month>=date_trunc('month',$4::date))
   AND (NOT $6::boolean OR observation.business_day<=$5::date)
 ),selected AS (
  SELECT * FROM observations WHERE NOT $6::boolean
  UNION ALL (SELECT DISTINCT ON(measure) * FROM observations WHERE $6::boolean ORDER BY measure,business_day DESC)
 ) SELECT min(source_cutoff) cutoff,min(business_day)::text AS "day" FROM selected`,
 [scope.tenantId,scope.revision,requiredMeasures(scope.query.metric),scope.range.from,scope.range.to,snapshot])).rows[0];
 return {...(rows?.cutoff?{sourceAsOf:rows.cutoff.toISOString() as string}:{}),...(snapshot&&rows?.day?{snapshotAsOf:String(rows.day)}:{})};
}
