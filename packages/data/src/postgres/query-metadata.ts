import type { PoolClient } from 'pg';
import { requiredMeasures,semanticCatalog } from '@el-dabboos/domain';
import type { AnalyticsContext,AnalyticsQuery,AnalyticsResult,DimensionId,SourceMapping } from '@el-dabboos/domain';
import { filterSql } from './sql.ts';
import type { PostgresRepositoryOptions } from './repository.ts';
import { datasetScope } from './dataset-scope.ts';
export async function queryMetadata(client: PoolClient,query: AnalyticsQuery,context: AnalyticsContext,mapping: SourceMapping,options: PostgresRepositoryOptions & {observedCoverage?:{dataThrough:string|null}|undefined;snapshotAsOf?:string|null}): Promise<AnalyticsResult['metadata']> {
  const metric = semanticCatalog[query.metric];
  const semantics = metric.semantics;
  const {value:dataset,predicate:datasetPredicate}=datasetScope(mapping,options);
  const sql = { scope: `f.tenant_id=$1 AND f.${datasetPredicate} AND f.measure_id=ANY($3::text[])`,certified: mapping.capabilities.find(capability => capability.metric===query.metric)!.dimensions as readonly DimensionId[] };
  const coverageParams: unknown[] = [context.tenantId,dataset,requiredMeasures(query.metric)];
  const policy = filterSql(context.enforcedFilters ?? [],coverageParams,sql.certified);
  const coverage = options.observedCoverage ? options.observedCoverage.dataThrough : (await client.query(`SELECT max(f.business_date)::text AS date FROM mart.canonical_facts f WHERE ${sql.scope} AND ${policy}`,coverageParams)).rows[0]?.date;
  const objects = [...new Set(mapping.measures.filter(mapping => requiredMeasures(query.metric).includes(mapping.measureId)).map(mapping => mapping.sourceObject))];
  const freshness = (await client.query(`SELECT min(latest) AS date, count(*) FILTER (WHERE latest IS NOT NULL)::int AS count FROM unnest($3::text[]) o(object) LEFT JOIN LATERAL (SELECT max(source_as_of) latest FROM mart.ingestion_batches WHERE tenant_id=$1 AND ${datasetPredicate} AND status='committed' AND pagination_complete AND o.object=ANY(source_objects)) freshness_values ON true`, [context.tenantId,dataset,objects])).rows[0];
  const output=await outputCertificationReference(client,{query,context,mapping});
  const percentage = !!query.analysis?.percentageContribution;

  return { ...(options.snapshotAsOf?{snapshotAsOf:options.snapshotAsOf}:{}),...(mapping.approval.status==='approved' ? { release: { datasetId: mapping.datasetId,sourceId: mapping.sourceId,mappingId: mapping.mappingId,mappingVersion: mapping.mappingVersion,certificationReference: mapping.approval.reference,...(output ? { outputCertificationReference: output } : {}) } } : {}),sourceId: 'postgres',executedAt: (options.clock?.() ?? new Date()).toISOString(),...(coverage ? { dataThrough: coverage } : {}),...(freshness?.date && freshness.count === objects.length ? { sourceAsOf: freshness.date.toISOString() } : {}),metricType: percentage ? 'percentage' : metric.type,...(percentage ? { unit: '%' } : metric.presentation.unit ? { unit: metric.presentation.unit } : {}),semantics: semantics.kind };
}

/** Output provenance is independently certified; approved operand mappings are insufficient. */
async function outputCertificationReference(client:PoolClient,scope:{query:AnalyticsQuery;context:AnalyticsContext;mapping:SourceMapping}):Promise<string|undefined> {
 const {query,context,mapping}=scope;
 if(semanticCatalog[query.metric].semantics.kind!=='ratio' || !['average_confirmed_order_value','average_invoice_value','overdue_receivable_percentage'].includes(query.metric))return undefined;
 return (await client.query('SELECT reference FROM mart.published_derived_coverage($1,$2,$3,$4,false) WHERE metric=$3 AND "grouping" IS NOT DISTINCT FROM $4::text AND period_from<=$5 AND period_to>=$6 LIMIT 1',[context.tenantId,mapping.datasetId,query.metric,query.groupBy ?? null,query.dateRange?.from,query.dateRange?.to])).rows[0]?.reference as string|undefined;
}
