import type {PoolClient} from 'pg';
import type {AnalyticsQuery,AnalyticsContext} from '@el-dabboos/domain';
import {requiredMeasures} from '@el-dabboos/domain';
import {bind} from '../postgres/sql.ts';
import {sourceDisplayLabel,dimensionLabelField} from '../postgres/query-labels.ts';
import {groupedValueExpression,groupedUnsafeExpression} from '../postgres/grouped-value.ts';
import {readGroupedSql} from '../postgres/result-window.ts';
import {planTrustedRange,trustedRangePartitions} from './range-plan.ts';
import {coveredSlot,coverageMetadata,isSnapshotQuery} from './coverage.ts';
import type {ServingCoverage} from './coverage.ts';
import {operationalServingInput,servingFilters} from './serving-scope.ts';
import type {ServingReadBounds} from './serving-query.ts';

export async function groupedServingRows(client:PoolClient,scope:{query:AnalyticsQuery;context:AnalyticsContext;coverage:ServingCoverage;options:ServingReadBounds}){
 const {query,context,coverage,options:{maxGroups,revision,read}}=scope;
 const params:unknown[]=[context.tenantId,requiredMeasures(query.metric)],predicates=servingFilters(query,context,params);
 const group=bind(params,query.groupBy),label=bind(params,dimensionLabelField(query.groupBy));
 const value=groupedValueExpression(query,params),unsafe=groupedUnsafeExpression(query,params);
 const slot=coveredSlot({key:null,match_key:null,from:query.dateRange?.from??coverage.from,to:query.dateRange?.to??coverage.to},coverage);
 const source=isSnapshotQuery(query)?snapshotSource(query,coverage,params):await eventSource(client,context,slot,params);
 const input={params,text:`WITH selected AS (${source}),grouped AS (
 SELECT base.dimensions->>${group} key,${value} value,${unsafe} unsafe,false invalid,max(base.data_through) through
 FROM selected base WHERE ${predicates} AND base.dimensions->>${group} IS NOT NULL GROUP BY 1),labels AS (
 SELECT base.dimensions->>${group} key,(array_agg(base.labels->>${label} ORDER BY base.business_date DESC) FILTER(WHERE base.labels->>${label} IS NOT NULL))[1] label
 FROM ${operationalServingInput} WHERE trusted.tenant_id=$1 AND base.measure_id=ANY($2::text[]) AND ${predicates} GROUP BY 1)
 SELECT grouped.*,labels.label FROM grouped LEFT JOIN labels USING(key)`};
 const result=await readGroupedSql(client,{query,context,input,revision,maxGroups,...(read?{read}:{})});
 return {...result,labels:Object.fromEntries(Object.entries(result.labels).map(([key,label])=>[key,sourceDisplayLabel(label,context.locale)])),...coverageMetadata(query,coverage,result.dataThrough,!isSnapshotQuery(query)&&!slot)};
}
async function eventSource(client:PoolClient,context:AnalyticsContext,slot:Parameters<typeof planTrustedRange>[0][number]|null,params:unknown[]){
 const plans=planTrustedRange(slot?[slot]:[],await trustedRangePartitions(client,context.tenantId));
 const selected=bind(params,JSON.stringify(plans));
 return `WITH plan AS (SELECT * FROM jsonb_to_recordset(${selected}::jsonb) p("from" date,"to" date,partition_id text,grain text))
 SELECT base.measure_id,base.value,base.dimensions,base.business_date data_through FROM plan
 JOIN mart.analytics_aggregate_bases base ON base.tenant_id=$1 AND base.partition_id=plan.partition_id AND base.business_date BETWEEN plan."from" AND plan."to"
 WHERE plan.grain='daily' AND base.kind='event' AND base.measure_id=ANY($2::text[])
 UNION ALL SELECT base.measure_id,base.value,base.dimensions,base.data_through FROM plan
 JOIN mart.analytics_monthly_bases base ON base.tenant_id=$1 AND base.partition_id=plan.partition_id
 WHERE plan.grain='monthly' AND base.measure_id=ANY($2::text[])`;
}
function snapshotSource(query:AnalyticsQuery,coverage:ServingCoverage,params:unknown[]){
 const cutoff=bind(params,query.dateRange?.to??coverage.to);
 return `SELECT base.*,base.business_date data_through FROM ${operationalServingInput} WHERE trusted.tenant_id=$1 AND base.measure_id=ANY($2::text[])
 AND base.business_date=(SELECT max(selected.business_date) FROM ${operationalServingInput.replace(/\bbase\b/g,'selected')} WHERE trusted.tenant_id=$1 AND selected.measure_id=ANY($2::text[]) AND selected.business_date<=${cutoff}::date)`;
}
