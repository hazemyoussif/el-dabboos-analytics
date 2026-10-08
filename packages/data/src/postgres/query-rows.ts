import type {PoolClient} from 'pg';
import type {AnalyticsQuery,AnalyticsRow,Locale} from '@el-dabboos/domain';
import {semanticCatalog} from '@el-dabboos/domain';
import {selectQueryKeys,querySlots} from './query-slots.ts';
import type {QuerySqlScope} from './query-slots.ts';
import {aggregateQuerySlots,selectGroupedEventRows} from './query-aggregate.ts';
import {queryDimensionLabels} from './query-labels.ts';
import {prepareSnapshotScope} from './snapshot-query.ts';
import {compareValues} from './query-analysis.ts';
/** Row selection and label projection share one authorized scope and numeric conversion. */
export async function queryRows(client:PoolClient,query:AnalyticsQuery,scope:QuerySqlScope,locale:Locale) {
 const prepared=await prepareSnapshotScope(client,query,scope);
 const grouped=await selectGroupedEventRows(client,query,prepared,locale);
 if(grouped)return grouped;
 const keys=await selectQueryKeys(client,query,prepared);
 const {current,prior,comparison}=querySlots(query,keys);
 const values=await aggregateQuerySlots(client,query,prepared,current),priors=await aggregateQuerySlots(client,query,{...prepared,observeDataThrough:()=>{}},prior);
 const derived=semanticCatalog[query.metric].semantics.kind==='comparison_derived';
 const rows:AnalyticsRow[]=keys.map((key,index)=>{
  const value=values[index] ?? null;
  if(!comparison)return {key,value};
  const changes=compareValues(value,priors[index] ?? null);
  return derived?{key,value:changes.percentageChange}:{key,value,...changes};
 });
 return {rows,comparison:!!comparison,dimensionLabels:await queryDimensionLabels(client,query,prepared,keys,locale)};
}
