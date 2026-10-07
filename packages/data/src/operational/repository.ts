import type { Pool } from 'pg';
import { validateQuery,publishedQueryIssues,semanticCatalog,categoricalDimensions,requiredMeasures,timeDimensions } from '@el-dabboos/domain';
import type { AnalyticsContext,AnalyticsQuery,AnalyticsRepository,AnalyticsResult,DimensionId,DimensionValueRepository,PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { operationalDefinitionVersion } from './definition-version.ts';
import { tenantTransaction } from '../postgres/session.ts';
import { PostgresAnalyticsRepository } from '../postgres/repository.ts';
import { HistoricalAnalyticsRepository } from '../postgres/historical-repository.ts';
import type { HistoricalRepositoryOptions } from '../postgres/historical-repository.ts';
import { servingLabels } from './serving-labels.ts';
import { servingRows,operationalServingInput,servingFilters } from './serving-query.ts';
/** Reads only a stored trusted manifest and approved capability projection. No source or proof port. */
export class TrustedAnalyticsRepository implements AnalyticsRepository,DimensionValueRepository {
 private readonly fallback:HistoricalAnalyticsRepository;
 private readonly anchor:PostgresAnalyticsRepository;
 private readonly maxGroups:number;
 constructor(private readonly pool:Pool,private readonly options:HistoricalRepositoryOptions){this.maxGroups=options.historicalMaxGroups??options.maxGroups??4000;if(!Number.isInteger(this.maxGroups)||this.maxGroups<1||this.maxGroups>5000)throw new Error('Invalid trusted group bound');this.fallback=new HistoricalAnalyticsRepository(pool,options);this.anchor=new PostgresAnalyticsRepository(pool,{...options,storedProofsOnly:true});}
 async isDataReady(tenantId:string){return await this.stored(tenantId)!==null||this.fallback.isDataReady(tenantId);}
 async getPublishedCapabilities(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities>{const stored=await this.stored(context.tenantId);return stored?policyCapabilities({...stored.capabilities,releases:[...stored.capabilities.releases,...(stored.anchorCapabilities?.releases??[])]},context):this.fallback.getPublishedCapabilities(context);}
 async execute(query:AnalyticsQuery,context:AnalyticsContext):Promise<AnalyticsResult> {
  validateQuery(query,context);
  const stored=await this.stored(context.tenantId);if(!stored)return this.fallback.execute(query,context);
  const authorizedQuery={...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]};
  if(publishedQueryIssues(authorizedQuery,stored.capabilities).length&&stored.anchorCapabilities&&!publishedQueryIssues(authorizedQuery,stored.anchorCapabilities).length)return this.anchor.execute(anchorQuery(query),context);
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const stored=(await client.query(`SELECT baseline.capabilities,baseline.period_from::text coverage_from,baseline.reporting_currency,trusted.revision_id,revision.cutoff,CASE WHEN EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=baseline.tenant_id AND revision_id=trusted.revision_id AND month>baseline.period_to) THEN (revision.cutoff AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text ELSE baseline.period_to::text END current_through FROM mart.analytics_baselines baseline JOIN mart.analytics_trusted_serving trusted USING(tenant_id) JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id) WHERE baseline.tenant_id=$1`,[context.tenantId])).rows[0];
   stored.capabilities=extendCapabilities(stored.capabilities,stored.current_through);
   authorizeStored(query,context,stored.capabilities);
   const selected=await servingRows(client,query,context,{from:stored.coverage_from,to:stored.current_through},this.maxGroups),metric=semanticCatalog[query.metric];
   const dimensionLabels=query.groupBy?await servingLabels(client,query.groupBy,context,query,selected.rows.map(row=>row.key)):{};
   const snapshot=metric.semantics.kind==='snapshot'||metric.semantics.kind==='ratio'&&metric.semantics.basis==='snapshot';
   const release=stored.capabilities.releases[0];
   return {metric:query.metric,groupBy:query.groupBy??null,rows:selected.rows,metadata:{...(query.analysis?{analysis:query.analysis}:{}),...(Object.keys(dimensionLabels).length?{dimensionLabels}:{}),sourceId:'postgres',executedAt:(this.options.clock?.()??new Date()).toISOString(),sourceAsOf:stored.cutoff.toISOString(),metricType:query.analysis?.percentageContribution?'percentage':metric.type,semantics:metric.semantics.kind,...(query.analysis?.percentageContribution?{unit:'%'}:metric.presentation.unit?{unit:metric.presentation.unit}:{}),...(selected.dataThrough?{dataThrough:selected.dataThrough}:{}),...(snapshot&&selected.dataThrough?{snapshotAsOf:selected.dataThrough}:{}),release:{datasetId:stored.revision_id,sourceId:release.sourceId,mappingId:release.mappingId,mappingVersion:release.mappingVersion,certificationReference:release.certificationReference,outputCertificationReference:stored.revision_id}}};
  },true,this.options.statementTimeoutMs??15000);
 }
 async listDimensionValues(dimension:DimensionId,context:AnalyticsContext){return (await this.listDimensionOptions(dimension,context)).map(option=>option.id);}
 async listDimensionOptions(dimension:DimensionId,context:AnalyticsContext) {
  const stored=await this.stored(context.tenantId);if(!stored)return this.fallback.listDimensionOptions(dimension,context);
  if(!categoricalDimensions.includes(dimension))throw new Error('Unsupported discovery dimension');
  const eligible=stored.capabilities.releases.flatMap(release=>release.capabilities).filter(capability=>capability.dimensions.includes(dimension)&&(context.enforcedFilters??[]).every(filter=>capability.dimensions.includes(filter.dimension)));
  if(!eligible.length)throw new Error('Uncertified discovery/policy dimension');
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const params:unknown[]=[context.tenantId,[...new Set(eligible.flatMap(capability=>requiredMeasures(capability.metric)))]];
   const filters=servingFilters({metric:eligible[0]!.metric},context,params);params.push(dimension);
   const result=await client.query(`SELECT DISTINCT base.dimensions->>$${params.length} id FROM ${operationalServingInput} WHERE trusted.tenant_id=$1 AND base.measure_id=ANY($2::text[]) AND ${filters} AND base.dimensions->>$${params.length} IS NOT NULL ORDER BY id LIMIT ${this.maxGroups+1}`,params);
   if(result.rows.length>this.maxGroups)throw new Error('Dimension discovery bound exceeded');return result.rows.map(row=>({id:String(row.id)}));
  },true,this.options.statementTimeoutMs??15000);
 }
 private stored(tenantId:string) {
  return tenantTransaction(this.pool,tenantId,async client=>{
   const row=(await client.query<{capabilities:PublishedAnalyticsCapabilities;current_through:string;reporting_currency:string;definition_version:string;anchor_caps:PublishedAnalyticsCapabilities|null}>(`SELECT baseline.capabilities,baseline.reporting_currency,baseline.definition_version,ancillary.capabilities anchor_caps,CASE WHEN EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=baseline.tenant_id AND revision_id=trusted.revision_id AND month>baseline.period_to) THEN (revision.cutoff AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text ELSE baseline.period_to::text END current_through FROM mart.analytics_baselines baseline JOIN mart.analytics_trusted_serving trusted USING(tenant_id) JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id) LEFT JOIN mart.analytics_anchor_capabilities ancillary USING(tenant_id) WHERE tenant_id=$1`,[tenantId])).rows[0];
   if(row){
    if(row.definition_version!==operationalDefinitionVersion())throw new Error('Explicit metric-definition migration required');
    const currency=this.options.reportingCurrency?await this.options.reportingCurrency(tenantId):this.options.reportingCurrencies[tenantId];
    if(currency!==row.reporting_currency)throw new Error('Uncertified reporting currency mismatch');
   }
   return row?{capabilities:extendCapabilities(row.capabilities,row.current_through),anchorCapabilities:row.anchor_caps?anchorSnapshotPeriods(row.anchor_caps):null}:null;
  },true,this.options.statementTimeoutMs??15000);
 }
}
function authorizeStored(query:AnalyticsQuery,context:AnalyticsContext,capabilities:PublishedAnalyticsCapabilities) {
 if(publishedQueryIssues({...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]},capabilities).length)throw new Error('Uncertified trusted query');
}

function extendCapabilities(capabilities:PublishedAnalyticsCapabilities,through:string):PublishedAnalyticsCapabilities {return {...capabilities,releases:capabilities.releases.map(release=>({...release,...(release.period?{period:{...release.period,to:through}}:{})}))};}

function anchorSnapshotPeriods(capabilities:PublishedAnalyticsCapabilities):PublishedAnalyticsCapabilities {
 return {...capabilities,releases:capabilities.releases.map(release=>{
  const snapshot=release.capabilities.every(capability=>{const semantics=semanticCatalog[capability.metric].semantics;return semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';});
  if(!snapshot||!release.period)return release;
  const first=capabilities.releases.filter(other=>other.datasetId===release.datasetId&&other.mappingVersion===release.mappingVersion&&other.period&&other.period.from<=release.period!.to&&other.period.to>=release.period!.to).map(other=>other.period!.from).sort()[0];
  return {...release,...(release.period&&first?{period:{...release.period,from:first}}:{})};
 })};
}
function anchorQuery(query:AnalyticsQuery):AnalyticsQuery {
 const semantics=semanticCatalog[query.metric].semantics,snapshot=semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';
 return snapshot&&query.dateRange&&(!query.groupBy||!timeDimensions.includes(query.groupBy))?{...query,dateRange:{from:query.dateRange.to,to:query.dateRange.to}}:query;
}

function policyCapabilities(capabilities:PublishedAnalyticsCapabilities,context:AnalyticsContext):PublishedAnalyticsCapabilities {
 return {...capabilities,releases:capabilities.releases.map(release=>({...release,capabilities:release.capabilities.filter(capability=>(context.enforcedFilters??[]).every(filter=>capability.dimensions.includes(filter.dimension)))}))};
}
