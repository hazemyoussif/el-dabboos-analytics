import type {PoolClient} from 'pg';
import {DimensionDiscoveryLimitError} from '@el-dabboos/domain';
import type {AnalyticsContext,DimensionId,MetricId} from '@el-dabboos/domain';
import {dimensionLabelField,sourceDisplayLabel} from '../postgres/query-labels.ts';
import {servingFilters} from './serving-query.ts';
import {publishedDiscoveryInput} from './discovery-input.ts';
/** Stable IDs and display evidence share the exact trusted tenant/metric/policy tuples. */
export async function trustedDimensionOptions(client:PoolClient,scope:{dimension:DimensionId;context:AnalyticsContext;metric:MetricId;measures:string[];maxGroups:number}) {
 const {dimension,context,metric,measures,maxGroups}=scope;
 const params:unknown[]=[context.tenantId,measures];
 const filters=servingFilters({metric},context,params);params.push(dimension);
 const identity=`base.dimensions->>$${params.length}`;
 const field=dimensionLabelField(dimension);params.push(field);
 const label=field?`nullif(base.labels->>$${params.length},'')`:'NULL::text';
 const result=await client.query(`SELECT ${identity} id,(array_agg(${label} ORDER BY base.business_date DESC,${label} COLLATE "C") FILTER(WHERE ${label} IS NOT NULL))[1] label
 FROM ${publishedDiscoveryInput} WHERE trusted.tenant_id=$1 AND base.measure_id=ANY($2::text[]) AND ${filters} AND ${identity} IS NOT NULL GROUP BY ${identity} ORDER BY id LIMIT ${maxGroups+1}`,params);
 if(result.rows.length>maxGroups)throw new DimensionDiscoveryLimitError(dimension);
 return result.rows.map(row=>({id:String(row.id),...(row.label?{label:sourceDisplayLabel(row.label,context.locale)}:{})}));
}
