import {dimensionLabelField} from '../postgres/query-labels.ts';
import {compatibleQuantityMetrics,requiredMeasures} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,ProductionFact,DateRange} from '@el-dabboos/domain';
import type {PoolClient} from 'pg';
import {businessDefinitionVersion} from './definitions.ts';
/** Aggregate exact decimals in PostgreSQL before the bounded governed analysis engine. */
export async function businessEventRows(client:PoolClient,scope:{query:AnalyticsQuery;context:AnalyticsContext;range:DateRange}){
 const {query,context,range}=scope,filters=[...(query.filters??[]),...(context.enforcedFilters??[])];
 const quantities=compatibleQuantityMetrics.includes(query.metric as import('@el-dabboos/domain').BusinessMetricId);
 const dimensions=[...new Set([...(quantities?['uom' as const]:[]),query.groupBy,...filters.map(filter=>filter.dimension)].filter(dimension=>dimension&&!['date','month','quarter','year'].includes(dimension)))];
 const params:unknown[]=[context.tenantId,requiredMeasures(query.metric),range.from,range.to,businessDefinitionVersion(),dimensions,dimensionLabelField(query.groupBy)];
 const predicates=filters.map(filter=>{params.push(filter.dimension,filter.values);return `payload->'dimensions'->>$${params.length-1}=ANY($${params.length}::text[])`;});
 const rows=(await client.query(`WITH selected AS(
  SELECT fact.payload,extraction.source_cutoff,(SELECT coalesce(jsonb_object_agg(dimension.key,dimension.value),'{}'::jsonb) FROM jsonb_each(fact.payload->'dimensions') dimension WHERE dimension.key=ANY($6::text[])) dimensions
  FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  JOIN mart.review_extractions extraction USING(tenant_id,partition_id) JOIN mart.review_facts fact USING(tenant_id,partition_id)
  WHERE trusted.tenant_id=$1 AND member.family='business' AND extraction.definition_version=$5 AND payload->>'measureId'=ANY($2::text[])
  AND payload->>'businessDate' BETWEEN $3::text AND $4::text ${predicates.length?'AND '+predicates.join(' AND '):''}
 ),grouped AS(
  SELECT payload->>'measureId' measure,${query.groupBy==='date'?"payload->>'businessDate'":"left(payload->>'businessDate',7)"} period,dimensions,
   min(payload->>'businessDate') business_date,sum((payload->>'value')::numeric)::numeric(30,6)::text amount,max(source_cutoff) source_cutoff,
   CASE WHEN count(DISTINCT payload->'displayLabels'->>$7)=1 THEN min(payload->'displayLabels'->>$7) END label
  FROM selected GROUP BY 1,2,3
 )SELECT jsonb_build_object('tenantId',$1::text,'measureId',measure,'businessDate',business_date,'value',amount,'dimensions',dimensions,'displayLabels',CASE WHEN label IS NULL THEN NULL ELSE jsonb_build_object($7::text,label) END) payload,source_cutoff FROM grouped ORDER BY period,measure,dimensions::text LIMIT 250001`,params)).rows;
 return rows as Array<{payload:ProductionFact;source_cutoff:Date}>;
}
