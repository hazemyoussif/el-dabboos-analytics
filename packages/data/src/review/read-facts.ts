import type {PoolClient} from 'pg';
import {requiredMeasures,semanticCatalog} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,DateRange} from '@el-dabboos/domain';
import {reviewEventRows} from './event-rows.ts';
import type {ReviewReadFact} from './event-rows.ts';
import {businessDefinitionVersion} from '../business/definitions.ts';
import {reviewDefinitionVersion} from './definitions.ts';
export const reviewMembers=`mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id) JOIN mart.review_extractions extraction USING(tenant_id,partition_id)`;
export async function readReviewFacts(client:PoolClient,scope:{query:AnalyticsQuery;context:AnalyticsContext;range:DateRange;family:'review'|'business'}){
 const {query,context,range,family}=scope;
 if(aggregatedEventRead(query))return reviewEventRows(client,scope);
 const params:unknown[]=[context.tenantId,requiredMeasures(query.metric),range.from,range.to];
 const filters=[...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>{
  params.push(filter.dimension,filter.values);return `fact.payload->'dimensions'->>$${params.length-1}=ANY($${params.length}::text[])`;
 });
 params.push(family==='business'?businessDefinitionVersion():reviewDefinitionVersion());
 const result=await client.query<{payload:ReviewReadFact;source_cutoff:Date}>(`SELECT fact.payload,extraction.source_cutoff FROM ${reviewMembers} JOIN mart.review_facts fact USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family='${family}' AND extraction.definition_version=$${params.length}
 AND fact.payload->>'measureId'=ANY($2::text[]) AND member.month BETWEEN date_trunc('month',$3::date) AND date_trunc('month',$4::date)
 ${filters.length?'AND '+filters.join(' AND '):''} ORDER BY member.month,fact.fact_key LIMIT 250001`,params);
 return {rows:result.rows,sourceCutoff:undefined};
}
function aggregatedEventRead(query:AnalyticsQuery){
 if(query.aggregation&&query.aggregation!=='sum')return false;
 const semantics=semanticCatalog[query.metric].semantics;
 return semantics.kind==='additive'||semantics.kind==='duration_derived'||semantics.kind==='ratio'&&semantics.basis!=='snapshot';
}
