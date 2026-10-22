import type {PoolClient} from 'pg';
import type {DateRange} from '@el-dabboos/domain';
import {bind} from '../postgres/sql.ts';
import {reviewSnapshotBase} from './snapshot-selection.ts';
interface ReviewGroupedSourceScope {tenantId:string;family:'review'|'business';definitionVersion:string;range:DateRange;snapshot:boolean}
/** Build source-grain operands on the caller's repeatable-read transaction. */
export async function groupedReviewBase(client:PoolClient,scope:ReviewGroupedSourceScope,params:unknown[]){
 if(scope.snapshot)return reviewSnapshotBase;
 const from=bind(params,scope.range.from),partitions=bind(params,await publishedEventPartitions(client,scope));
 return `WITH facts AS (
 SELECT fact.measure_id,fact.amount value,fact.dimensions,fact.display_labels labels,fact.business_day business_date,fact.entity_id
 FROM mart.review_fact_population fact WHERE fact.tenant_id=$1 AND fact.partition_id=ANY(${partitions}::text[])
 AND fact.measure_id=ANY($2::text[]) AND fact.business_day<=$3::text AND fact.business_day>=${from}::text
 ),base AS (SELECT * FROM facts)`;
}
/** Resolve approved membership before planning the event scan; never cache across requests. */
async function publishedEventPartitions(client:PoolClient,scope:{tenantId:string;family:'review'|'business';definitionVersion:string;range:DateRange}):Promise<string[]>{
 const rows=(await client.query<{partition_id:string}>(`SELECT member.partition_id FROM mart.analytics_trusted_serving trusted
 JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family=$2 AND extraction.definition_version=$3
 AND member.month BETWEEN date_trunc('month',$4::date) AND date_trunc('month',$5::date)`,[scope.tenantId,scope.family,scope.definitionVersion,scope.range.from,scope.range.to])).rows;
 return rows.map(row=>row.partition_id);
}
