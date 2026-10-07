import type { PoolClient } from 'pg';
import type { DimensionId, MetricId } from '@el-dabboos/domain';
import type { PublishedDerivedCoverage } from './published-capabilities.ts';
/** Same repeatable-read transaction and exact guard; unrelated certificates never consume a query's deadline. */
export async function readDerivedCoverage(client: PoolClient,tenantId: string,datasetId: string,scope: {metrics: readonly MetricId[]; groupings?: readonly (DimensionId|null)[]}): Promise<PublishedDerivedCoverage[]> {
 const coverage: PublishedDerivedCoverage[] = [];
 const groupings = scope.groupings ? [...new Set(scope.groupings)] : [undefined];
 for (const metric of new Set(scope.metrics)) for (const grouping of groupings) {
  const result = await client.query<PublishedDerivedCoverage>('SELECT * FROM mart.published_derived_coverage($1,$2,$3,$4,$5)',[tenantId,datasetId,metric,grouping ?? null,grouping === undefined]);
  coverage.push(...result.rows);
 }
 return coverage;
}
