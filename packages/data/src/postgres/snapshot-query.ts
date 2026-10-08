import type {PoolClient} from 'pg';
import type {AnalyticsQuery} from '@el-dabboos/domain';
import {semanticCatalog} from '@el-dabboos/domain';
import type {QuerySqlScope} from './query-slots.ts';
/** Avoid sorting a point-in-time release only after proving its eligible entity set is unique. */
export async function prepareSnapshotScope(client:PoolClient,query:AnalyticsQuery,scope:QuerySqlScope) {
 const semantics=semanticCatalog[query.metric].semantics;
 const snapshot=semantics.kind==='snapshot' || semantics.kind==='ratio' && semantics.basis==='snapshot';
 if(!snapshot || !query.dateRange)return scope;
 // Inspect before policy filtering: moved attribution must still select latest state first.
 const result=await client.query(`SELECT min(f.business_date)::text earliest,max(f.business_date)::text latest,
  count(*)=count(DISTINCT (f.measure_id,f.entity_id)) unique_entities
  FROM mart.canonical_facts f WHERE ${scope.scope} AND f.business_date<=$4::date`,[...scope.params.slice(0,3),query.dateRange.to]);
 const row=result.rows[0];
 return row?.earliest===query.dateRange.to && row.latest===query.dateRange.to && row.unique_entities
  ? {...scope,uniformSnapshotCutoff:true}:scope;
}
export function snapshotInput(scope:QuerySqlScope,cutoff:string) {
 const projection=scope.uniformSnapshotCutoff?'*':'DISTINCT ON (measure_id,entity_id) *';
 const order=scope.uniformSnapshotCutoff?'':'ORDER BY measure_id,entity_id,business_date DESC';
 const bounded=scope.uniformSnapshotCutoff?cutoff.replaceAll('business_date<=','business_date='):cutoff;
 return `(SELECT ${projection} FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=ANY($3::text[]) ${bounded} ${order})`;
}
