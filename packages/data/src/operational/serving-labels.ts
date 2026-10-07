import type { PoolClient } from 'pg';
import type { AnalyticsContext,AnalyticsQuery,DimensionId } from '@el-dabboos/domain';
import { requiredMeasures } from '@el-dabboos/domain';
import { dimensionLabelField,sourceDisplayLabel } from '../postgres/query-labels.ts';
import { operationalServingInput,servingFilters } from './serving-query.ts';
/** Labels come from the same trusted tuples and policy intersection as values. */
export async function servingLabels(client:PoolClient,dimension:DimensionId,context:AnalyticsContext,query:AnalyticsQuery,keys:readonly (string|null)[]) {
 const field=dimensionLabelField(dimension);if(!field)return {};
 const params:unknown[]=[context.tenantId,requiredMeasures(query.metric)];
 const filter=servingFilters(query,context,params);params.push(dimension);const group=`base.dimensions->>$${params.length}`;
 params.push(keys.filter(key=>key!==null));const selected=`${group}=ANY($${params.length}::text[])`;
 params.push(field);const label=`base.labels->>$${params.length}`;
 const result=await client.query(`SELECT ${group} key,(array_agg(${label} ORDER BY base.business_date DESC) FILTER(WHERE ${label} IS NOT NULL))[1] label FROM ${operationalServingInput}
  WHERE trusted.tenant_id=$1 AND base.measure_id=ANY($2::text[]) AND ${filter} AND ${selected} GROUP BY ${group}`,params);
 return Object.fromEntries(result.rows.filter(row=>row.key&&row.label).map(row=>[row.key,sourceDisplayLabel(row.label,context.locale)]));
}
