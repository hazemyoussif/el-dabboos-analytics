import type {AnalyticsQuery,AnalyticsContext} from '@el-dabboos/domain';
export const operationalServingInput=`mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member ON member.tenant_id=trusted.tenant_id AND member.revision_id=trusted.revision_id JOIN mart.analytics_aggregate_bases base ON base.tenant_id=member.tenant_id AND base.partition_id=member.partition_id`;
/** Business and enforced filters remain independent AND predicates. */
export function servingFilters(query:AnalyticsQuery,context:AnalyticsContext,params:unknown[]){
 return [...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>{
  params.push(filter.dimension);const dimension=`base.dimensions->>$${params.length}`;
  params.push(filter.values);return `${dimension}=ANY($${params.length}::text[])`;
 }).join(' AND ')||'true';
}
