import {dimensionLabelField} from '../postgres/query-labels.ts';
import {compatibleQuantityMetrics,requiredMeasures} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,ProductionFact,DateRange} from '@el-dabboos/domain';
import type {PoolClient} from 'pg';
import {businessDefinitionVersion} from '../business/definitions.ts';
import {reviewDefinitionVersion} from './definitions.ts';
/** Adapter projection: source envelopes stay in immutable storage, outside query results. */
export type ReviewReadFact=Pick<ProductionFact,'tenantId'|'measureId'|'businessDate'|'value'|'dimensions'|'entityId'>&{displayLabels?:NonNullable<ProductionFact['displayLabels']>|null};
/** Aggregate exact decimals in PostgreSQL before the bounded governed analysis engine. */
export async function reviewEventRows(client:PoolClient,scope:{query:AnalyticsQuery;context:AnalyticsContext;range:DateRange;family:'review'|'business'}){
 const {query,context,range,family}=scope,filters=[...(query.filters??[]),...(context.enforcedFilters??[])];
 const quantities=compatibleQuantityMetrics.includes(query.metric as import('@el-dabboos/domain').BusinessMetricId);
 const dimensions=[...new Set([...(quantities?['uom' as const]:[]),query.groupBy,...filters.map(filter=>filter.dimension)].filter(dimension=>dimension&&!['date','month','quarter','year'].includes(dimension)))];
 const params:unknown[]=[context.tenantId,requiredMeasures(query.metric),range.from,range.to,(family==='business'?businessDefinitionVersion:reviewDefinitionVersion)(),dimensions,dimensionLabelField(query.groupBy),family];
 const predicates=filters.map(filter=>{params.push(filter.dimension,filter.values);return `payload->'dimensions'->>$${params.length-1}=ANY($${params.length}::text[])`;});
 const rows=(await client.query(`WITH published_partitions AS MATERIALIZED (
  SELECT member.tenant_id,member.partition_id,extraction.source_cutoff
  FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  WHERE trusted.tenant_id=$1 AND member.family=$8 AND extraction.definition_version=$5
  AND member.month BETWEEN date_trunc('month',$3::date) AND date_trunc('month',$4::date)
 ),selected AS(
  SELECT fact.payload,partition.source_cutoff,(SELECT coalesce(jsonb_object_agg(dimension,fact.payload->'dimensions'->dimension),'{}'::jsonb) FROM unnest($6::text[]) dimension WHERE fact.payload->'dimensions'?dimension) dimensions
  FROM published_partitions partition JOIN mart.review_facts fact USING(tenant_id,partition_id)
  WHERE fact.tenant_id=$1 AND payload->>'measureId'=ANY($2::text[])
  AND payload->>'businessDate' BETWEEN $3::text AND $4::text ${predicates.length?'AND '+predicates.join(' AND '):''}
 ),grouped AS(
  SELECT payload->>'measureId' measure,${query.groupBy==='date'?"payload->>'businessDate'":"left(payload->>'businessDate',7)"} period,dimensions,
   min(payload->>'businessDate') business_date,sum((payload->>'value')::numeric)::numeric(30,6)::text amount,max(source_cutoff) source_cutoff,
   CASE WHEN count(DISTINCT payload->'displayLabels'->>$7)=1 THEN min(payload->'displayLabels'->>$7) END label
  FROM selected GROUP BY 1,2,3
 ),bounded AS (SELECT jsonb_build_object('tenantId',$1::text,'measureId',measure,'businessDate',business_date,'value',amount,'dimensions',dimensions,'displayLabels',CASE WHEN label IS NULL THEN NULL ELSE jsonb_build_object($7::text,label) END) payload,source_cutoff FROM grouped ORDER BY period,measure,dimensions::text LIMIT 250001)
 SELECT payload,source_cutoff FROM bounded UNION ALL SELECT NULL,max(source_cutoff) FROM published_partitions`,params)).rows;
 const sourceCutoff=(rows.find(row=>row.payload===null)?.source_cutoff as Date|null)?.toISOString();
 return {rows:rows.filter(row=>row.payload!==null) as Array<{payload:ReviewReadFact;source_cutoff:Date}>,sourceCutoff};
}
