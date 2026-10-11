import { trustedDimensionOptions } from './dimension-options.ts';
import type { Pool } from 'pg';
import { validateQuery,publishedQueryIssues,semanticCatalog,categoricalDimensions,requiredMeasures,timeDimensions } from '@el-dabboos/domain';
import type { AnalyticsContext,AnalyticsQuery,AnalyticsRepository,AnalyticsResult,DimensionId,DimensionValueRepository,PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { operationalDefinitionVersion } from './definition-version.ts';
import { tenantTransaction } from '../postgres/session.ts';
import { PostgresAnalyticsRepository } from '../postgres/repository.ts';
import { HistoricalAnalyticsRepository } from '../postgres/historical-repository.ts';
import type { HistoricalRepositoryOptions } from '../postgres/historical-repository.ts';
import { servingLabels } from './serving-labels.ts';
import {FinanceSnapshotRepository,financeMetric} from './finance-repository.ts';
import {discoverCustomers} from './customer-discovery.ts';
import {dailyEventCapabilities} from './daily-capabilities.ts';
import { servingRows } from './serving-query.ts';
/** Reads only a stored trusted manifest and approved capability projection. No source or proof port. */
export class TrustedAnalyticsRepository implements AnalyticsRepository,DimensionValueRepository {
 private readonly fallback:HistoricalAnalyticsRepository;
 private readonly maxGroups:number;
 private readonly finance:FinanceSnapshotRepository;
 constructor(private readonly pool:Pool,private readonly options:HistoricalRepositoryOptions){this.maxGroups=options.historicalMaxGroups??options.maxGroups??4000;if(!Number.isInteger(this.maxGroups)||this.maxGroups<1||this.maxGroups>5000)throw new Error('Invalid trusted group bound');this.fallback=new HistoricalAnalyticsRepository(pool,options);this.finance=new FinanceSnapshotRepository(pool,options.statementTimeoutMs,this.maxGroups);}
 async isDataReady(tenantId:string){return await this.stored(tenantId)!==null||this.fallback.isDataReady(tenantId);}
 async getPublishedCapabilities(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities>{
  const stored=await this.stored(context.tenantId);if(!stored)return this.fallback.getPublishedCapabilities(context);
  const [finance,anchor]=await Promise.all([this.finance.capabilities(context),stored.anchorDatasetId?this.anchorRepository(stored.anchorDatasetId).getPublishedCapabilities(context):Promise.resolve(null)]);
  return policyCapabilities({...stored.capabilities,releases:[...stored.capabilities.releases,...(anchor?.releases??[]),...(finance?.releases??[])]},context);
 }
 async execute(query:AnalyticsQuery,context:AnalyticsContext):Promise<AnalyticsResult> {
  validateQuery(query,context);
  const stored=await this.stored(context.tenantId);if(!stored)return this.fallback.execute(query,context);
  if(financeMetric(query.metric)){const capabilities=await this.finance.capabilities(context);if(capabilities)return this.finance.execute(query,context,capabilities);}
  const authorizedQuery={...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]};
  if(publishedQueryIssues(authorizedQuery,stored.capabilities).length&&stored.anchorDatasetId){const repository=this.anchorRepository(stored.anchorDatasetId),anchor=await repository.getPublishedCapabilities(context,query);if(!publishedQueryIssues(authorizedQuery,anchor).length)return this.anchorResult(query,context,anchor,repository);}
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const stored=(await client.query(`SELECT baseline.capabilities,baseline.period_from::text coverage_from,baseline.reporting_currency,trusted.revision_id,coalesce(cursor.cutoff,revision.cutoff) cutoff,(coalesce(cursor.cutoff,revision.cutoff) AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text cutoff_day,ARRAY(SELECT month::text FROM mart.analytics_serving_members WHERE tenant_id=baseline.tenant_id AND revision_id=trusted.revision_id) months,CASE WHEN EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=baseline.tenant_id AND revision_id=trusted.revision_id AND month>baseline.period_to) THEN (coalesce(cursor.cutoff,revision.cutoff) AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text ELSE baseline.period_to::text END current_through FROM mart.analytics_baselines baseline JOIN mart.analytics_trusted_serving trusted USING(tenant_id) JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id) LEFT JOIN mart.analytics_source_cursors cursor USING(tenant_id) WHERE baseline.tenant_id=$1`,[context.tenantId])).rows[0];
   stored.capabilities=await dailyEventCapabilities(client,context.tenantId,extendCapabilities(stored.capabilities,stored.current_through));
   authorizeStored(query,context,stored.capabilities);
   const selected=await servingRows(client,query,context,{from:stored.coverage_from,to:stored.current_through,cutoff:stored.cutoff.toISOString(),cutoffDay:stored.cutoff_day,months:stored.months.map((month:string)=>month.slice(0,7))},this.maxGroups),metric=semanticCatalog[query.metric];
   const dimensionLabels=query.groupBy?await servingLabels(client,query.groupBy,context,query,selected.rows.map(row=>row.key)):{};
   const snapshot=metric.semantics.kind==='snapshot'||metric.semantics.kind==='ratio'&&metric.semantics.basis==='snapshot';
   const release=stored.capabilities.releases[0];
   return {metric:query.metric,groupBy:query.groupBy??null,rows:selected.rows,metadata:{...(selected.coverage?{coverage:selected.coverage}:{}),...(selected.availability?{availability:selected.availability}:{}),...(query.analysis?{analysis:query.analysis}:{}),...(Object.keys(dimensionLabels).length?{dimensionLabels}:{}),sourceId:'postgres',executedAt:(this.options.clock?.()??new Date()).toISOString(),sourceAsOf:stored.cutoff.toISOString(),...metricPresentation(query),...(selected.dataThrough?{dataThrough:selected.dataThrough}:{}),...(snapshot&&selected.dataThrough?{snapshotAsOf:selected.dataThrough}:{}),release:{datasetId:stored.revision_id,sourceId:release.sourceId,mappingId:release.mappingId,mappingVersion:release.mappingVersion,certificationReference:release.certificationReference,outputCertificationReference:stored.revision_id}}};
  },true,this.options.statementTimeoutMs??15000);
 }
 private async anchorResult(query:AnalyticsQuery,context:AnalyticsContext,capabilities:PublishedAnalyticsCapabilities,repository:PostgresAnalyticsRepository):Promise<AnalyticsResult> {
  const snapshot=isSnapshotMetric(query.metric),release=capabilities.releases.find(release=>release.capabilities.some(capability=>capability.metric===query.metric));
  if(!snapshot||!query.dateRange||!release?.period)return repository.execute(query,context);
  if(query.dateRange.to<release.period.to)return {metric:query.metric,groupBy:query.groupBy??null,rows:[{key:null,value:null}],metadata:{sourceId:'postgres',executedAt:new Date().toISOString(),metricType:semanticCatalog[query.metric].type,semantics:semanticCatalog[query.metric].semantics.kind,availability:{state:'DATA_NOT_READY',reason:'no_snapshot'}}};
  return repository.execute(anchorQuery({...query,dateRange:{from:release.period.to,to:release.period.to}}),context);
 }
 private anchorRepository(datasetId:string){return new PostgresAnalyticsRepository(this.pool,{...this.options,storedProofsOnly:true,historicalDatasetId:datasetId});}
 async listDimensionValues(dimension:DimensionId,context:AnalyticsContext){return (await this.listDimensionOptions(dimension,context)).map(option=>option.id);}
 async searchDimensionOptions(dimension:DimensionId,context:AnalyticsContext,request:import('@el-dabboos/domain').DimensionDiscoveryRequest){
  if(dimension!=='customer')return boundedDimensionPage(await this.listDimensionOptions(dimension,context),request);
  return discoverCustomers(this.pool,context,request,await this.getPublishedCapabilities(context),this.options.statementTimeoutMs??15000);
 }
 async listDimensionOptions(dimension:DimensionId,context:AnalyticsContext) {
  const stored=await this.stored(context.tenantId);if(!stored)return this.fallback.listDimensionOptions(dimension,context);
  if(!categoricalDimensions.includes(dimension))throw new Error('Unsupported discovery dimension');
  const eligible=stored.capabilities.releases.flatMap(release=>release.capabilities).filter(capability=>capability.dimensions.includes(dimension)&&(context.enforcedFilters??[]).every(filter=>capability.dimensions.includes(filter.dimension)));
  if(!eligible.length)throw new Error('Uncertified discovery/policy dimension');
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   return trustedDimensionOptions(client,{dimension,context,metric:eligible[0]!.metric,measures:[...new Set(eligible.flatMap(capability=>requiredMeasures(capability.metric)))],maxGroups:this.maxGroups});
  },true,this.options.statementTimeoutMs??15000);
 }
 private stored(tenantId:string) {
  return tenantTransaction(this.pool,tenantId,async client=>{
   const row=(await client.query<{capabilities:PublishedAnalyticsCapabilities;current_through:string;reporting_currency:string;definition_version:string;anchor_caps:PublishedAnalyticsCapabilities|null;anchor_dataset_id:string|null}>(`SELECT baseline.capabilities,baseline.reporting_currency,baseline.definition_version,ancillary.capabilities anchor_caps,ancillary.dataset_id anchor_dataset_id,CASE WHEN EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=baseline.tenant_id AND revision_id=trusted.revision_id AND month>baseline.period_to) THEN (coalesce(cursor.cutoff,revision.cutoff) AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text ELSE baseline.period_to::text END current_through FROM mart.analytics_baselines baseline JOIN mart.analytics_trusted_serving trusted USING(tenant_id) JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id) LEFT JOIN mart.analytics_source_cursors cursor USING(tenant_id) LEFT JOIN mart.analytics_anchor_capabilities ancillary USING(tenant_id) WHERE tenant_id=$1`,[tenantId])).rows[0];
   if(row){
    if(row.definition_version!==operationalDefinitionVersion())throw new Error('Explicit metric-definition migration required');
    const currency=this.options.reportingCurrency?await this.options.reportingCurrency(tenantId):this.options.reportingCurrencies[tenantId];
    if(currency!==row.reporting_currency)throw new Error('Uncertified reporting currency mismatch');
   }
   return row?{capabilities:await dailyEventCapabilities(client,tenantId,extendCapabilities(row.capabilities,row.current_through)),anchorCapabilities:row.anchor_caps?anchorSnapshotPeriods(row.anchor_caps):null,anchorDatasetId:row.anchor_dataset_id}:null;
  },true,this.options.statementTimeoutMs??15000);
 }
}
function authorizeStored(query:AnalyticsQuery,context:AnalyticsContext,capabilities:PublishedAnalyticsCapabilities) {
 if(publishedQueryIssues({...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]},capabilities).length)throw new Error('Uncertified trusted query');
}

function extendCapabilities(capabilities:PublishedAnalyticsCapabilities,through:string):PublishedAnalyticsCapabilities {
 return {...capabilities,releases:capabilities.releases.flatMap(release=>{
  const snapshot=release.capabilities.filter(capability=>isSnapshotMetric(capability.metric)),events=release.capabilities.filter(capability=>!isSnapshotMetric(capability.metric));
  return [...(events.length?[{...release,capabilities:events,selectionSemantics:'event_intersection' as const,...(release.period?{period:{...release.period,to:through}}:{})}]:[]),...(snapshot.length?[{...release,capabilities:snapshot,selectionSemantics:'latest_snapshot' as const}]:[])];
 })};
}
function isSnapshotMetric(metric:AnalyticsQuery['metric']){const semantics=semanticCatalog[metric].semantics;return semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';}
function anchorSnapshotPeriods(capabilities:PublishedAnalyticsCapabilities):PublishedAnalyticsCapabilities {
 return {...capabilities,releases:capabilities.releases.map(release=>release.capabilities.every(capability=>isSnapshotMetric(capability.metric))?{...release,selectionSemantics:'latest_snapshot' as const}:release)};
}
function anchorQuery(query:AnalyticsQuery):AnalyticsQuery {
 const semantics=semanticCatalog[query.metric].semantics,snapshot=semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';
 return snapshot&&query.dateRange&&(!query.groupBy||!timeDimensions.includes(query.groupBy))?{...query,dateRange:{from:query.dateRange.to,to:query.dateRange.to}}:query;
}

function policyCapabilities(capabilities:PublishedAnalyticsCapabilities,context:AnalyticsContext):PublishedAnalyticsCapabilities {
 return {...capabilities,releases:capabilities.releases.map(release=>({...release,capabilities:release.capabilities.filter(capability=>(context.enforcedFilters??[]).every(filter=>capability.dimensions.includes(filter.dimension)))}))};
}

function metricPresentation(query:AnalyticsQuery):Pick<AnalyticsResult['metadata'],'metricType'|'semantics'|'unit'> {
 const metric=semanticCatalog[query.metric];
 if(query.analysis?.percentageContribution)return {metricType:'percentage',semantics:metric.semantics.kind,unit:'%'};
 return {metricType:metric.type,semantics:metric.semantics.kind,...(metric.presentation.unit?{unit:metric.presentation.unit}:{})};
}

/** Low-cardinality governed lists reuse their existing bound, not a second pagination system. */
function boundedDimensionPage(options:Array<{id:string;label?:string}>,request:import('@el-dabboos/domain').DimensionDiscoveryRequest):import('@el-dabboos/domain').DimensionDiscoveryPage {
 const limit=request.limit??50,search=request.search?.toLocaleLowerCase()??'',selected=request.selectedIds??[];
 if(request.cursor||!Number.isInteger(limit)||limit<1||limit>100||search.length>100||selected.length>1000)throw new Error('Invalid bounded dimension discovery');
 return {values:options.filter(option=>!search||option.label?.toLocaleLowerCase().includes(search)).slice(0,limit),selected:options.filter(option=>selected.includes(option.id))};
}
