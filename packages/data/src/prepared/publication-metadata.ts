import type {PoolClient} from 'pg';
import {businessMetricIds,publishedQueryIssues} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,BusinessMetricId,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {compatibleOperationalDefinition} from '../operational/definition-version.ts';
import {trustedFactCapabilities} from '../operational/trusted-capabilities.ts';
import {financeCapabilities,financeMetric} from '../operational/finance-capabilities.ts';
import {reviewPublication,reviewQuery} from '../review/publication.ts';
import {productReviewMetrics} from '../review/definitions.ts';
import {readServingRevision} from '../postgres/serving-revision.ts';
import {readPreparedReportingWindow,requirePreparedReportingRange,windowedPreparedCapabilities} from './reporting-window.ts';
import type {DateRange} from '@el-dabboos/domain';
import type {PreparedFamily} from './contracts.ts';
export interface PreparedPublication {
 revision:string;currency:string;sourceCutoff:string;cutoffDay:string;
 families:Record<PreparedFamily,PublishedAnalyticsCapabilities>;reportingWindow?:DateRange;
}
/** Metadata projection reuses existing certified definitions. It cannot reconstruct data. */
export async function preparedPublication(client:PoolClient,context:AnalyticsContext,expectedRevision?:string,families:readonly PreparedFamily[]=['facts','receivables','review','business']):Promise<PreparedPublication>{
 const revision=await readServingRevision(client,context.tenantId,expectedRevision);
 const baseline=(await client.query(`SELECT baseline.reporting_currency,baseline.definition_version,
 coalesce(cursor.cutoff,revision.cutoff) cutoff,(coalesce(cursor.cutoff,revision.cutoff) AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text cutoff_day,
 CASE WHEN EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=baseline.tenant_id AND revision_id=trusted.revision_id AND family='facts' AND month>baseline.period_to)
 THEN (coalesce(cursor.cutoff,revision.cutoff) AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text ELSE baseline.period_to::text END current_through
 FROM mart.analytics_baselines baseline JOIN mart.analytics_trusted_serving trusted USING(tenant_id)
 JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id) LEFT JOIN mart.analytics_source_cursors cursor USING(tenant_id)
 WHERE baseline.tenant_id=$1`,[context.tenantId])).rows[0];
 if(!baseline||!compatibleOperationalDefinition(baseline.definition_version))throw new Error('Compatible trusted baseline required');
 const reportingWindow=await readPreparedReportingWindow(client,context.tenantId);
 const empty:PublishedAnalyticsCapabilities={tenantId:context.tenantId,mode:'certified',releases:[]};
 const facts=families.includes('facts')?await trustedFactCapabilities(client,context.tenantId,baseline.current_through):empty;
 const receivables=families.includes('receivables')?await financeCapabilities(client,context):empty;
 const review=families.includes('review')?{...empty,releases:(await reviewPublication(client,context,'review')).releases}:empty;
 const business=families.includes('business')?{...empty,releases:(await reviewPublication(client,context,'business')).releases}:empty;
 return {revision,currency:baseline.reporting_currency,sourceCutoff:baseline.cutoff.toISOString(),cutoffDay:baseline.cutoff_day,...(reportingWindow?{reportingWindow}:{}),families:{facts:windowedPreparedCapabilities(facts,reportingWindow),receivables:windowedPreparedCapabilities(receivables??empty,reportingWindow),review:windowedPreparedCapabilities(review,reportingWindow),business:windowedPreparedCapabilities(business,reportingWindow)}};
}
/** Resolve semantic source priority once, before prepared-cell selection. Missing cells never change it. */
export function preparedQueryRelease(query:AnalyticsQuery,context:AnalyticsContext,publication:PreparedPublication){
 requirePreparedReportingRange(query.dateRange,publication.reportingWindow);
 let family:PreparedFamily=businessMetricIds.includes(query.metric as BusinessMetricId)?'business':reviewQuery(query,context)?'review':financeMetric(query.metric)&&publication.families.receivables.releases.length?'receivables':'facts';
 const checked={...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]};
 if(family==='facts'&&productReviewMetrics.includes(query.metric)&&publishedQueryIssues(checked,publication.families.facts).length)family='review';
 const published=publication.families[family],release=published.releases.find(release=>!publishedQueryIssues(release.period?{...checked,dateRange:checked.dateRange??release.period}:checked,{...published,releases:[release]}).length);
 if(!release?.period)throw new Error('Uncertified prepared query');
 return {family,release};
}
export function preparedCapabilities(context:AnalyticsContext,publication:PreparedPublication):PublishedAnalyticsCapabilities{
 return {tenantId:context.tenantId,mode:'certified',releases:Object.values(publication.families).flatMap(published=>published.releases).map(release=>({...release,capabilities:release.capabilities.filter(capability=>(context.enforcedFilters??[]).every(filter=>capability.dimensions.includes(filter.dimension)))}))};
}

/** Include every family needed to preserve source priority and certified fallbacks. */
export function preparedQueryFamilies(query:AnalyticsQuery,context:AnalyticsContext):readonly PreparedFamily[]{
 if(businessMetricIds.includes(query.metric as BusinessMetricId))return ['business'];
 if(reviewQuery(query,context))return ['review'];
 if(financeMetric(query.metric))return ['receivables','facts'];
 return productReviewMetrics.includes(query.metric)?['facts','review']:['facts'];
}
