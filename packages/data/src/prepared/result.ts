import type {PoolClient} from 'pg';
import {semanticCatalog,preparedMetricBasis,categoricalDimensions} from '@el-dabboos/domain';
import type {AnalyticsResult,AnalyticsQuery,PublishedAnalyticsRelease} from '@el-dabboos/domain';
import type {PreparedPublication} from './publication-metadata.ts';
import type {PreparedFamily} from './contracts.ts';
import type {readPreparedSelection} from './selection.ts';
export interface PreparedResultScope {
 query:AnalyticsQuery;family:PreparedFamily;release:PublishedAnalyticsRelease;publication:PreparedPublication;
 selected:Awaited<ReturnType<typeof readPreparedSelection>>;executedAt:string;
}
/** Values come exclusively from prepared cells; lineage remains the accepted source publication. */
export async function preparedResult(client:PoolClient,scope:PreparedResultScope):Promise<AnalyticsResult>{
 const {query,selected,publication,family}=scope,metric=semanticCatalog[query.metric];
 const snapshot=preparedMetricBasis(query.metric)==='snapshot',finance=family==='receivables'?await financeLineage(client,scope):{};
 if(finance.availability)return unavailableFinanceResult(scope,finance.availability);
 const metadata:AnalyticsResult['metadata']={...preparedProvenance(scope),executedAt:scope.executedAt,
 servingRevision:publication.revision,...presentation(query),semantics:metric.semantics.kind,
 ...labelMetadata(scope),
 ...(selected.dataThrough?{dataThrough:selected.dataThrough}:{}),...(snapshot&&(selected.snapshotAsOf||selected.dataThrough||selected.coverage?.status==='complete')?{snapshotAsOf:selected.snapshotAsOf??selected.dataThrough??selected.preparedThrough!}:{}),
 ...(selected.window?{window:selected.window}:{}),...(query.analysis?{analysis:query.analysis}:{})};
 Object.assign(metadata,finance);
 return {metric:query.metric,groupBy:query.groupBy??null,rows:selected.rows,metadata};
}
async function financeLineage(client:PoolClient,scope:PreparedResultScope):Promise<Partial<AnalyticsResult['metadata']>>{
 const {query,publication,release,selected}=scope;
 if(!selected.preparedThrough)return {availability:{state:'DATA_NOT_READY',reason:'no_snapshot'}};
 const cutoffs=(await client.query<{snapshot_day:string;snapshot_id:string;definition_version:string;source_cutoff:Date}>(`SELECT evidence.snapshot_date::text snapshot_day,evidence.snapshot_id,evidence.definition_version,evidence.source_cutoff
 FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 JOIN mart.finance_snapshot_evidence evidence ON evidence.tenant_id=part.tenant_id AND evidence.snapshot_id=part.snapshot_id
 WHERE member.tenant_id=$1 AND member.revision_id=$2 AND member.family='receivables' ORDER BY evidence.snapshot_date`,[scope.publication.families.receivables.tenantId,publication.revision])).rows;
 const evidence=cutoffs.find(snapshot=>snapshot.snapshot_day===selected.preparedThrough);
 if(!evidence)return {availability:{state:'DATA_NOT_READY',reason:'no_snapshot'}};
 const drillReleases=Object.fromEntries(selected.rows.flatMap(row=>{
  if(row.key===null)return [];
  const snapshot=query.groupBy==='month'?cutoffs.filter(snapshot=>snapshot.snapshot_day.slice(0,7)<=row.key!).at(-1):evidence;
  return snapshot?[[row.key,snapshot.snapshot_id]]:[];
 }));
 return {drillReleases,snapshotAsOf:evidence.snapshot_day,dataThrough:evidence.snapshot_day,sourceAsOf:evidence.source_cutoff.toISOString(),
 reconciliation:{status:'exact',reference:evidence.snapshot_id,definitionReference:release.certificationReference},
 release:{datasetId:evidence.snapshot_id,sourceId:release.sourceId,mappingId:'trusted-finance-customer-snapshot',mappingVersion:'1',certificationReference:evidence.definition_version,outputCertificationReference:`Exact historical snapshot: ${evidence.snapshot_id}`}};
}

function presentation(query:AnalyticsQuery):Pick<AnalyticsResult['metadata'],'metricType'|'unit'>{
 const metric=semanticCatalog[query.metric],percentage=Boolean(query.analysis?.percentageContribution||query.analysis?.pareto);
 return {metricType:percentage?'percentage':metric.type,...(percentage?{unit:'%'}:metric.presentation.unit?{unit:metric.presentation.unit}:{})};
}

function unavailableFinanceResult(scope:PreparedResultScope,availability:NonNullable<AnalyticsResult['metadata']['availability']>):AnalyticsResult{
 const {query,publication}=scope;
 return {metric:query.metric,groupBy:query.groupBy??null,rows:query.groupBy==='customer'?[]:[{key:null,value:null}],metadata:{sourceId:'postgres',executedAt:scope.executedAt,servingRevision:publication.revision,...presentation(query),semantics:semanticCatalog[query.metric].semantics.kind,...(query.analysis?{analysis:query.analysis}:{}),availability}};
}

function factRelease(scope:PreparedResultScope){
 const release=scope.publication.families.facts.releases[0]!;
 return {datasetId:scope.publication.revision,sourceId:release.sourceId,mappingId:release.mappingId,mappingVersion:release.mappingVersion,certificationReference:release.certificationReference,outputCertificationReference:scope.publication.revision};
}

function labelMetadata(scope:PreparedResultScope):Pick<AnalyticsResult['metadata'],'dimensionLabels'>{
 const grouped=scope.query.groupBy&&categoricalDimensions.includes(scope.query.groupBy),labels=scope.selected.labels;
 return Object.keys(labels).length||scope.family==='receivables'||grouped&&scope.family!=='facts'?{dimensionLabels:labels}:{};
}

function preparedProvenance(scope:PreparedResultScope):Pick<AnalyticsResult['metadata'],'sourceId'|'sourceAsOf'|'release'|'coverage'|'availability'>{
 const {family,publication,selected,release}=scope;
 if(family==='facts')return {sourceId:'postgres',sourceAsOf:publication.sourceCutoff,release:factRelease(scope),...(selected.coverage?{coverage:selected.coverage}:{}),...(selected.availability?{availability:selected.availability}:{})};
 const sourceAsOf=selected.sourceAsOf??(scope.query.metric.startsWith('command_')?undefined:publication.sourceCutoff);
 return {sourceId:family==='receivables'?'postgres':'postgres-review',...(sourceAsOf?{sourceAsOf}:{}),release:structuredClone(release),...(selected.coverage?{coverage:selected.coverage}:{}),...(selected.availability?{availability:selected.availability}:{})};
}
