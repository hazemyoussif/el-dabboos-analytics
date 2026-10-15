import {dimensionLabelField} from '../postgres/query-labels.ts';
import {compatibleQuantityMetrics,requiredMeasures} from '@el-dabboos/domain';
import type {AnalyticsQuery,AnalyticsContext,ProductionFact,DateRange} from '@el-dabboos/domain';
import type {PoolClient} from 'pg';
import {businessDefinitionVersion} from '../business/definitions.ts';
import {reviewDefinitionVersion} from './definitions.ts';
import {bind} from '../postgres/sql.ts';
/** Adapter projection: source envelopes stay in immutable storage, outside query results. */
export type ReviewReadFact=Pick<ProductionFact,'tenantId'|'measureId'|'businessDate'|'value'|'dimensions'|'entityId'>&{displayLabels?:NonNullable<ProductionFact['displayLabels']>|null};
/** Reduce typed exact operands before transfer; raw source envelopes never enter event execution. */
export async function reviewEventRows(client:PoolClient,scope:{query:AnalyticsQuery;context:AnalyticsContext;range:DateRange;family:'review'|'business'}){
 const {query,context,range,family}=scope,filters=[...(query.filters??[]),...(context.enforcedFilters??[])];
 const quantities=compatibleQuantityMetrics.includes(query.metric as import('@el-dabboos/domain').BusinessMetricId);
 const dimensions=[...new Set([...(quantities?['uom' as const]:[]),query.groupBy,...filters.map(filter=>filter.dimension)].filter(dimension=>dimension&&!['date','month','quarter','year'].includes(dimension)))];
 const params:unknown[]=[context.tenantId,requiredMeasures(query.metric),range.from,range.to,(family==='business'?businessDefinitionVersion:reviewDefinitionVersion)()];
 const familyParam=bind(params,family),field=dimensionLabelField(query.groupBy),labelParam=field?bind(params,field):null;
 const dimensionParams=dimensions.map(dimension=>bind(params,dimension));
 const projection=dimensionParams.length?`jsonb_strip_nulls(jsonb_build_object(${dimensionParams.map(parameter=>`${parameter}::text,fact.dimensions->${parameter}::text`).join(',')}))`:"'{}'::jsonb";
 const predicates=filters.map(filter=>`fact.dimensions->>${bind(params,filter.dimension)}=ANY(${bind(params,filter.values)}::text[])`);
 const period=eventPeriod(query);
 const label=labelParam?`CASE WHEN count(DISTINCT display_labels->>${labelParam})=1 THEN min(display_labels->>${labelParam}) END`:'NULL::text';
 const rows=(await client.query(`WITH published_partitions AS MATERIALIZED (
 SELECT member.tenant_id,member.partition_id,extraction.source_cutoff FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family=${familyParam} AND extraction.definition_version=$5
 AND member.month BETWEEN date_trunc('month',$3::date) AND date_trunc('month',$4::date)
 ),selected AS (SELECT fact.measure_id,fact.business_day,fact.amount,fact.display_labels,partition.source_cutoff,${projection} dimensions
 FROM published_partitions partition JOIN mart.review_facts fact USING(tenant_id,partition_id)
 WHERE fact.tenant_id=$1 AND fact.measure_id=ANY($2::text[]) AND fact.business_day BETWEEN $3::text AND $4::text ${predicates.length?'AND '+predicates.join(' AND '):''}
 ),grouped AS (SELECT measure_id measure,${period} period,dimensions,
 max(business_day) business_date,sum(amount)::text amount,max(source_cutoff) source_cutoff,${label} label FROM selected GROUP BY 1,2,3
 ),bounded AS (SELECT jsonb_build_object('tenantId',$1::text,'measureId',measure,'businessDate',business_date,'value',amount,'dimensions',dimensions,'displayLabels',${labelParam?`CASE WHEN label IS NULL THEN NULL ELSE jsonb_build_object(${labelParam}::text,label) END`:'NULL'}) payload,source_cutoff FROM grouped ORDER BY period,measure,dimensions::text LIMIT 250001)
 SELECT payload,source_cutoff FROM bounded UNION ALL SELECT NULL,max(source_cutoff) FROM published_partitions`,params)).rows;
 const sourceCutoff=(rows.find(row=>row.payload===null)?.source_cutoff as Date|null)?.toISOString();
 return {rows:rows.filter(row=>row.payload!==null) as Array<{payload:ReviewReadFact;source_cutoff:Date}>,sourceCutoff};
}

function eventPeriod(query:AnalyticsQuery){
 if(query.groupBy==='date')return 'business_day';
 if(query.groupBy==='month')return 'left(business_day,7)';
 if(query.groupBy==='year')return 'left(business_day,4)';
 if(query.groupBy==='quarter')return `to_char(business_day::date,'YYYY-"Q"Q')`;
 return 'NULL::text';
}
