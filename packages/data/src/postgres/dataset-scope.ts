import type {PoolClient} from 'pg';
import type { SourceMapping,MetricId } from '@el-dabboos/domain';
import { semanticCatalog } from '@el-dabboos/domain';
import type { PostgresRepositoryOptions } from './repository.ts';
/** Only trusted composition supplies this scope; runtime RLS still proves every dataset. */
export function datasetScope(mapping:SourceMapping,options:PostgresRepositoryOptions) {
  const members=options.historicalEventDatasets;
  if (members && (!members.length || members.length>24 || new Set(members).size!==members.length || !members.includes(mapping.datasetId))) throw new Error('Invalid historical event dataset scope');
  return {value:members ?? mapping.datasetId,predicate:members ? 'dataset_id=ANY($2::text[])' : 'dataset_id=$2',queryOptions:{completeEventPeriods:!!members,...(members?{labelStrategy:'latest_observed' as const}:{})}};
}
export function validateCollectionMetric(metric:MetricId,options:PostgresRepositoryOptions) {
  if (options.historicalEventDatasets && !historicalEventMetric(metric)) throw new Error('Historical event collection requires additive semantics');
}

/** Authorize and configure collection scans before selecting their immutable dataset scope. */
export async function prepareDatasetScope(client:PoolClient,metric:MetricId,mapping:SourceMapping,options:PostgresRepositoryOptions) {
 validateCollectionMetric(metric,options);
 if(options.historicalEventDatasets)await client.query('SET LOCAL jit=off');
 return datasetScope(mapping,options);
}

function historicalEventMetric(metric:MetricId) {
 const semantics=semanticCatalog[metric].semantics;
 return semantics.kind==='additive' || semantics.kind==='ratio' && semantics.basis!=='snapshot';
}
