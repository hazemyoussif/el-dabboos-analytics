import {businessMetricIds} from '@el-dabboos/domain';
import {productReviewMetrics} from '../review/definitions.ts';
import {ReviewAnalyticsRepository,reviewQuery} from '../review/repository.ts';
import { trustedDimensionOptions } from './dimension-options.ts';
import type { Pool,PoolClient } from 'pg';
import { validateQuery,publishedQueryIssues,semanticCatalog,categoricalDimensions,requiredMeasures } from '@el-dabboos/domain';
import type { AnalyticsContext,AnalyticsQuery,AnalyticsRepository,AnalyticsResult,DimensionId,DimensionValueRepository,PublishedAnalyticsCapabilities,AnalyticsReadOptions } from '@el-dabboos/domain';
import { compatibleOperationalDefinition } from './definition-version.ts';
import { tenantTransaction } from '../postgres/session.ts';
import type { HistoricalRepositoryOptions } from '../postgres/historical-repository.ts';
import { servingLabels } from './serving-labels.ts';
import {FinanceSnapshotRepository,financeMetric} from './finance-repository.ts';
import {discoverTrustedDimensions} from './dimension-discovery.ts';
import {dimensionDiscoveryScope} from '../postgres/discovery-scope.ts';
import {trustedFactCapabilities,trustedMetricMonths} from './trusted-capabilities.ts';
import { servingRows } from './serving-query.ts';
interface FactServingState {
 coverage_from:string;reporting_currency:string;revision_id:string;cutoff:Date;cutoff_day:string;months:string[];current_through:string;
}
/** Reads only a stored trusted manifest and approved capability projection. No source or proof port. */
export class TrustedAnalyticsRepository implements AnalyticsRepository,DimensionValueRepository {
 readonly supportsResultWindows=true as const;
 private readonly maxGroups:number;
 private readonly finance:FinanceSnapshotRepository;
 private readonly review:ReviewAnalyticsRepository;
 private readonly business:ReviewAnalyticsRepository;
 constructor(private readonly pool:Pool,private readonly options:HistoricalRepositoryOptions){this.maxGroups=options.historicalMaxGroups??options.maxGroups??4000;if(!Number.isInteger(this.maxGroups)||this.maxGroups<1||this.maxGroups>5000)throw new Error('Invalid trusted group bound');this.finance=new FinanceSnapshotRepository(pool,options.statementTimeoutMs,this.maxGroups);this.review=new ReviewAnalyticsRepository(pool,options.statementTimeoutMs,this.maxGroups);this.business=new ReviewAnalyticsRepository(pool,options.statementTimeoutMs,options.historicalMaxGroups??options.maxGroups??10000,'business');}
 async isDataReady(tenantId:string){return tenantTransaction(this.pool,tenantId,async client=>Boolean(await this.baseline(client,tenantId)),true,this.options.statementTimeoutMs??15000);}
 async getPublishedCapabilities(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities>{
  const stored=await this.stored(context.tenantId);
  if(!stored)return {tenantId:context.tenantId,mode:'certified',releases:[]};
  const [finance,review,business]=await Promise.all([this.finance.capabilities(context),this.review.capabilities(context),this.business.capabilities(context)]);
  return policyCapabilities({...stored.capabilities,releases:[...stored.capabilities.releases,...(finance?.releases??[]),...review.releases,...business.releases]},context);
 }
 async execute(query:AnalyticsQuery,context:AnalyticsContext,read?:AnalyticsReadOptions):Promise<AnalyticsResult> {
  validateQuery(query,context);
  const reviewed=this.reviewReader(query,context);
  if(reviewed){if(!await this.isDataReady(context.tenantId))throw new Error('Trusted serving revision required');return reviewed.execute(query,context,read);}
  if(financeMetric(query.metric)){if(!await this.isDataReady(context.tenantId))throw new Error('Trusted serving revision required');const capabilities=await this.finance.capabilities(context);if(capabilities)return this.finance.execute(query,context,capabilities,read);}
  const result=await this.executeLegacy(query,context,read);
  return result??this.review.execute(query,context,read);
 }
 private executeLegacy(query:AnalyticsQuery,context:AnalyticsContext,read?:AnalyticsReadOptions):Promise<AnalyticsResult|null>{
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   if(!await this.baseline(client,context.tenantId))throw new Error('Trusted serving revision required');
   const baseline=(await client.query<FactServingState>(`SELECT baseline.period_from::text coverage_from,baseline.reporting_currency,trusted.revision_id,coalesce(cursor.cutoff,revision.cutoff) cutoff,(coalesce(cursor.cutoff,revision.cutoff) AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text cutoff_day,ARRAY(SELECT month::text FROM mart.analytics_serving_members WHERE tenant_id=baseline.tenant_id AND revision_id=trusted.revision_id AND family='facts') months,CASE WHEN EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=baseline.tenant_id AND revision_id=trusted.revision_id AND family='facts' AND month>baseline.period_to) THEN (coalesce(cursor.cutoff,revision.cutoff) AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text ELSE baseline.period_to::text END current_through FROM mart.analytics_baselines baseline JOIN mart.analytics_trusted_serving trusted USING(tenant_id) JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id) LEFT JOIN mart.analytics_source_cursors cursor USING(tenant_id) WHERE baseline.tenant_id=$1`,[context.tenantId])).rows[0];
   if(!baseline)throw new Error('Trusted serving revision required');
   const stored={...baseline,capabilities:await trustedFactCapabilities(client,context.tenantId,baseline.current_through)};
   if(productReviewMetrics.includes(query.metric)&&publishedQueryIssues({...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]},stored.capabilities).length)return null;
   authorizeStored(query,context,stored.capabilities);
   const metricRelease=stored.capabilities.releases.find((release:import('@el-dabboos/domain').PublishedAnalyticsRelease)=>release.capabilities.some(capability=>capability.metric===query.metric))!;
   if(!metricRelease?.period)throw new Error('Uncertified trusted period');
   const months=await trustedMetricMonths(client,context.tenantId,query.metric);
   const selected=await servingRows(client,query,context,{from:metricRelease.period.from,to:metricRelease.period.to,cutoff:stored.cutoff.toISOString(),cutoffDay:stored.cutoff_day,months},{maxGroups:this.maxGroups,revision:stored.revision_id,...(read?{read}:{})});
   const dimensionLabels=query.groupBy?await servingLabels(client,query.groupBy,context,query,selected.rows.map(row=>row.key)):{};
   return trustedFactResult(query,stored,selected,dimensionLabels,(this.options.clock?.()??new Date()).toISOString());
  },true,this.options.statementTimeoutMs??15000);
 }
 async listDimensionValues(dimension:DimensionId,context:AnalyticsContext){return (await this.listDimensionOptions(dimension,context)).map(option=>option.id);}
 async searchDimensionOptions(dimension:DimensionId,context:AnalyticsContext,request:import('@el-dabboos/domain').DimensionDiscoveryRequest){
  const published=await this.getPublishedCapabilities(context);
  const selected=dimensionDiscoveryScope(dimension,context,request,published),scoped={...request,metric:selected.metric,...(selected.range?{dateRange:selected.range}:{})};
  if(businessMetricIds.includes(selected.metric as import('@el-dabboos/domain').BusinessMetricId))return this.business.searchDimensionOptions(dimension,context,scoped);
  if(reviewQuery({metric:selected.metric,groupBy:dimension},context))return this.review.searchDimensionOptions(dimension,context,scoped);
  return discoverTrustedDimensions(this.pool,{dimension,context,request:scoped,capabilities:published,timeout:this.options.statementTimeoutMs??15000});
 }
 async listDimensionOptions(dimension:DimensionId,context:AnalyticsContext) {
  const stored=await this.stored(context.tenantId);if(!stored)throw new Error('Trusted serving revision required');
  if(!categoricalDimensions.includes(dimension))throw new Error('Unsupported discovery dimension');
  const capabilities=await this.getPublishedCapabilities(context);
  const eligible=capabilities.releases.flatMap(release=>release.capabilities).filter(capability=>capability.dimensions.includes(dimension)&&(context.enforcedFilters??[]).every(filter=>capability.dimensions.includes(filter.dimension)));
  if(!eligible.length)throw new Error('Uncertified discovery/policy dimension');
  const businessOptions=dimension==='customer'?[]:await this.business.dimensionOptions(dimension,context);
  if(['brand','customer_segment','customer_class','uom','journal','supplier','warehouse'].includes(dimension))return businessOptions;
  const reviewOptions=[...await this.review.dimensionOptions(dimension,context),...businessOptions];
  if(dimension==='product'||dimension==='product_category')return reviewOptions;
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const options=await trustedDimensionOptions(client,{dimension,context,metric:eligible[0]!.metric,measures:[...new Set(eligible.flatMap(capability=>requiredMeasures(capability.metric)))],maxGroups:this.maxGroups});
   const combined=[...new Map([...options,...reviewOptions].map(option=>[option.id,option])).values()];
   if(combined.length>this.maxGroups)throw new Error('Combined dimension limit exceeded');return combined;
  },true,this.options.statementTimeoutMs??15000);
 }
 private reviewReader(query:AnalyticsQuery,context:AnalyticsContext){
  if(businessMetricIds.includes(query.metric as import('@el-dabboos/domain').BusinessMetricId))return this.business;
  return reviewQuery(query,context)?this.review:null;
 }
 private async baseline(client:PoolClient,tenantId:string){
   const row=(await client.query<{current_through:string;reporting_currency:string;definition_version:string;}>(`SELECT baseline.reporting_currency,baseline.definition_version,CASE WHEN EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=baseline.tenant_id AND revision_id=trusted.revision_id AND family='facts' AND month>baseline.period_to) THEN (coalesce(cursor.cutoff,revision.cutoff) AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text ELSE baseline.period_to::text END current_through FROM mart.analytics_baselines baseline JOIN mart.analytics_trusted_serving trusted USING(tenant_id) JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id) LEFT JOIN mart.analytics_source_cursors cursor USING(tenant_id) WHERE tenant_id=$1`,[tenantId])).rows[0];
   if(row){
    if(!compatibleOperationalDefinition(row.definition_version))throw new Error('Explicit metric-definition migration required');
    const currency=this.options.reportingCurrency?await this.options.reportingCurrency(tenantId):this.options.reportingCurrencies[tenantId];
    if(currency!==row.reporting_currency)throw new Error('Uncertified reporting currency mismatch');
   }
   return row;
 }
 private stored(tenantId:string) {
  return tenantTransaction(this.pool,tenantId,async client=>{
   const row=await this.baseline(client,tenantId);
   return row?{capabilities:await trustedFactCapabilities(client,tenantId,row.current_through)}:null;
  },true,this.options.statementTimeoutMs??15000);
 }

}

function authorizeStored(query:AnalyticsQuery,context:AnalyticsContext,capabilities:PublishedAnalyticsCapabilities) {
 if(publishedQueryIssues({...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]},capabilities).length)throw new Error('Uncertified trusted query');
}

function policyCapabilities(capabilities:PublishedAnalyticsCapabilities,context:AnalyticsContext):PublishedAnalyticsCapabilities {
 return {...capabilities,releases:capabilities.releases.map(release=>({...release,capabilities:release.capabilities.filter(capability=>(context.enforcedFilters??[]).every(filter=>capability.dimensions.includes(filter.dimension)))}))};
}

function metricPresentation(query:AnalyticsQuery):Pick<AnalyticsResult['metadata'],'metricType'|'semantics'|'unit'> {
 const metric=semanticCatalog[query.metric];
 if(query.analysis?.percentageContribution)return {metricType:'percentage',semantics:metric.semantics.kind,unit:'%'};
 return {metricType:metric.type,semantics:metric.semantics.kind,...(metric.presentation.unit?{unit:metric.presentation.unit}:{})};
}

/** Project governed values and provenance after transaction-local authorization. */
function trustedFactResult(query:AnalyticsQuery,stored:FactServingState&{capabilities:PublishedAnalyticsCapabilities},selected:Awaited<ReturnType<typeof servingRows>>,dimensionLabels:Record<string,string>,executedAt:string):AnalyticsResult{
 const metric=semanticCatalog[query.metric],snapshot=metric.semantics.kind==='snapshot'||metric.semantics.kind==='ratio'&&metric.semantics.basis==='snapshot';
 const release=stored.capabilities.releases[0]!;
 return {metric:query.metric,groupBy:query.groupBy??null,rows:selected.rows,metadata:{servingRevision:stored.revision_id,...('window' in selected&&selected.window?{window:selected.window}:{}),...(selected.coverage?{coverage:selected.coverage}:{}),...(selected.availability?{availability:selected.availability}:{}),...(query.analysis?{analysis:query.analysis}:{}),...(Object.keys(dimensionLabels).length?{dimensionLabels}:{}),sourceId:'postgres',executedAt,sourceAsOf:stored.cutoff.toISOString(),...metricPresentation(query),...(selected.dataThrough?{dataThrough:selected.dataThrough}:{}),...(snapshot&&selected.dataThrough?{snapshotAsOf:selected.dataThrough}:{}),release:{datasetId:stored.revision_id,sourceId:release.sourceId,mappingId:release.mappingId,mappingVersion:release.mappingVersion,certificationReference:release.certificationReference,outputCertificationReference:stored.revision_id}}};
}
