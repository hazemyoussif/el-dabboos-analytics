import type {PoolClient} from 'pg';
import {semanticCatalog} from '@el-dabboos/domain';
import type {AnalyticsResult,PublishedAnalyticsRelease} from '@el-dabboos/domain';
import {groupedReviewRows} from './grouped-query.ts';
import type {ReviewGroupedScope} from './grouped-query.ts';

export async function groupedReviewResult(client:PoolClient,scope:Omit<ReviewGroupedScope,'revision'>&{release:PublishedAnalyticsRelease}):Promise<AnalyticsResult>{
 const {query,context,range,family,release}=scope;
 const evidence=(await client.query(`SELECT trusted.revision_id,max(extraction.source_cutoff) source_cutoff
 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family=$2 AND member.month<=date_trunc('month',$3::date) GROUP BY trusted.revision_id`,[context.tenantId,family,range.to])).rows[0];
 if(!evidence)throw new Error('Trusted review evidence required');
 const revision=String(evidence.revision_id),selected=await groupedReviewRows(client,{...scope,revision});
 const metric=semanticCatalog[query.metric],percentage=Boolean(query.analysis?.percentageContribution||query.analysis?.pareto);
 const snapshot=metric.semantics.kind==='snapshot'||metric.semantics.kind==='ratio'&&metric.semantics.basis==='snapshot';
 return {metric:query.metric,groupBy:query.groupBy??null,rows:selected.rows,metadata:{
 sourceId:'postgres-review',executedAt:new Date().toISOString(),servingRevision:revision,sourceAsOf:evidence.source_cutoff.toISOString(),
 metricType:percentage?'percentage':metric.type,semantics:metric.semantics.kind,release,dimensionLabels:selected.labels,
 ...(selected.window?{window:selected.window}:{}),...(query.analysis?{analysis:query.analysis}:{}),
 ...(selected.dataThrough?{dataThrough:selected.dataThrough}:{}),...(snapshot&&selected.dataThrough?{snapshotAsOf:selected.dataThrough}:{}),
 ...(percentage?{unit:'%'}:metric.presentation.unit?{unit:metric.presentation.unit}:{})}};
}
