import {nativeSalesCommandCoverage} from '../business/sales-command-coverage.ts';
import {reviewPublication} from './publication.ts';
import {businessMetricObservation} from '../business/observations.ts';
import {snapshotReviewResult} from './snapshot-result.ts';
import {groupedReviewResult} from './grouped-result.ts';
import {categoricalDimensions} from '@el-dabboos/domain';
import type {AnalyticsReadOptions} from '@el-dabboos/domain';
import {readReviewFacts,reviewMembers as members} from './read-facts.ts';
import type {ReviewReadFact} from './event-rows.ts';
import {discoverReviewDimensions} from './discovery.ts';
import {sourceDisplayLabel,dimensionLabelField} from '../postgres/query-labels.ts';
import type {Pool} from 'pg';
import {validateQuery,publishedQueryIssues,requiredMeasures,semanticCatalog,AnalyticsResultLimitError} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,AnalyticsResult,PublishedAnalyticsCapabilities,DimensionId} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {requireServingRevision} from '../postgres/serving-revision.ts';
import {executeFacts} from '../engine.ts';
import {numericOutput} from '../postgres/sql.ts';
/** Reads the one trusted manifest. Business review state never authorizes a query. */
export class ReviewAnalyticsRepository {
 constructor(private readonly pool:Pool,private readonly timeout=15000,private readonly maxGroups=3000,private readonly family:'review'|'business'='review'){}
 async capabilities(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities> {
  return tenantTransaction(this.pool,context.tenantId,async client=>({tenantId:context.tenantId,mode:'certified',releases:(await reviewPublication(client,context,this.family)).releases}),true,this.timeout);
 }
 async execute(query:AnalyticsQuery,context:AnalyticsContext,read?:AnalyticsReadOptions):Promise<AnalyticsResult> {
  validateQuery(query,context);
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const publication=await reviewPublication(client,context,this.family);
   const revision=requireServingRevision(publication.revision,read?.revision);
   const published:PublishedAnalyticsCapabilities={tenantId:context.tenantId,mode:'certified',releases:publication.releases};
   const checked={...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]};
   if(publishedQueryIssues(checked,published).length)throw new Error('Unexposed review query');
   const release=published.releases.find(release=>!publishedQueryIssues(checked,{...published,releases:[release]}).length)!;
   const range=query.dateRange??release.period!;
   if(query.groupBy&&categoricalDimensions.includes(query.groupBy))return this.withCommandCoverage(client,{query,context,range},await groupedReviewResult(client,{query,context,range,family:this.family,release,maxGroups:this.maxGroups,...(read?{read}:{})}));
   if(snapshotQuery(query))return this.withCommandCoverage(client,{query,context,range},await snapshotReviewResult(client,{query,context,range,family:this.family,release,revision,maxGroups:this.maxGroups}));
   const result=await readReviewFacts(client,{query,context,range,family:this.family});
   if(result.rows.length>250000)throw new Error('Review fact query exceeds bounded execution');
   const facts=result.rows.map(row=>{const fact=row.payload;return {tenantId:fact.tenantId,measureId:fact.measureId,date:fact.businessDate,value:numericOutput(fact.value)!,dimensions:fact.dimensions,...fact.entityId?{entityId:fact.entityId}:{}};});
   const cutoff=reviewSourceCutoff(result);
   const executed=executeFacts(facts,{...query,dateRange:range},context,{sourceId:'postgres-review',executedAt:new Date().toISOString(),...(cutoff?{sourceAsOf:cutoff}:{})});
   if(executed.rows.length>this.maxGroups)throw new AnalyticsResultLimitError(query.groupBy??'customer');
   const dimensionLabels=reviewLabels(result.rows.map(row=>row.payload),query,context);
   return this.withCommandCoverage(client,{query,context,range},{...executed,metadata:{...executed.metadata,servingRevision:revision,release,...analysisMetadata(query),...(Object.keys(dimensionLabels).length?{dimensionLabels}:{})}});
  },true,this.timeout);
 }
 private async withCommandCoverage(client:import('pg').PoolClient,scope:{query:AnalyticsQuery;context:AnalyticsContext;range:NonNullable<AnalyticsQuery['dateRange']>},result:AnalyticsResult):Promise<AnalyticsResult>{
  if(this.family!=='business')return result;
  const revision=result.metadata.servingRevision;if(!revision)throw new Error('Command coverage requires a serving revision');
  const observed=await businessMetricObservation(client,{tenantId:scope.context.tenantId,revision,query:scope.query,range:scope.range});
  const command=scope.query.metric.startsWith('command_')?await nativeSalesCommandCoverage(client,{...scope,revision}):{};
  return {...result,metadata:{...result.metadata,...observed,...command}};
 }
 async searchDimensionOptions(dimension:DimensionId,context:AnalyticsContext,request:import('@el-dabboos/domain').DimensionDiscoveryRequest){
  return discoverReviewDimensions(this.pool,{dimension,context,request,capabilities:await this.capabilities(context),timeout:this.timeout,family:this.family});
 }
 async dimensionOptions(dimension:DimensionId,context:AnalyticsContext):Promise<Array<{id:string;label?:string}>> {
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const available=(await reviewPublication(client,context,this.family)).releases,metrics=available.flatMap(release=>release.capabilities).filter(capability=>capability.dimensions.includes(dimension)).map(capability=>capability.metric);
   if(!metrics.length)return [];
   const params:unknown[]=[context.tenantId,dimension,[...new Set(metrics.flatMap(requiredMeasures))],dimensionLabelField(dimension)];
   const filters=(context.enforcedFilters??[]).map(filter=>{params.push(filter.dimension,filter.values);return `fact.payload->'dimensions'->>$${params.length-1}=ANY($${params.length}::text[])`;});
   const rows=(await client.query(`SELECT fact.payload->'dimensions'->>$2 key,CASE WHEN count(DISTINCT fact.payload->'displayLabels'->>$4)=1 THEN min(fact.payload->'displayLabels'->>$4) END label FROM ${members} JOIN mart.review_fact_population fact USING(tenant_id,partition_id)
    WHERE trusted.tenant_id=$1 AND member.family='${this.family}' AND fact.payload->>'measureId'=ANY($3::text[])
    AND fact.payload->'dimensions'->>$2 IS NOT NULL ${filters.length?'AND '+filters.join(' AND '):''} GROUP BY fact.payload->'dimensions'->>$2 ORDER BY key LIMIT ${this.maxGroups+1}`,params)).rows;
   if(rows.length>this.maxGroups)throw new AnalyticsResultLimitError(dimension);
   return rows.map(row=>({id:String(row.key),...(row.label?{label:sourceDisplayLabel(row.label,context.locale)}:{})}));
  },true,this.timeout);
 }
}
export {reviewQuery} from './publication.ts';

function reviewLabels(facts:readonly ReviewReadFact[],query:AnalyticsQuery,context:AnalyticsContext){
 const dimension=query.groupBy,field=dimensionLabelField(dimension);if(!dimension||!field)return {};
 const labels=new Map<string,Set<string>>();
 for(const fact of facts){
  if(query.dateRange&&(fact.businessDate<query.dateRange.from||fact.businessDate>query.dateRange.to))continue;
  const id=fact.dimensions[dimension],label=fact.displayLabels?.[field as keyof NonNullable<ReviewReadFact['displayLabels']>];
  if(id&&label){const peers=labels.get(id)??new Set<string>();peers.add(label);labels.set(id,peers);}
 }
 return Object.fromEntries([...labels].filter(([,peers])=>peers.size===1).map(([id,peers])=>[id,sourceDisplayLabel([...peers][0]!,context.locale)]));
}

function analysisMetadata(query:AnalyticsQuery){return query.analysis?{analysis:query.analysis}:{};}

function snapshotQuery(query:AnalyticsQuery){const semantics=semanticCatalog[query.metric].semantics;return semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';}

/** Published cutoff remains available for an exactly empty event selection. */
function reviewSourceCutoff(result:{sourceCutoff:string|undefined;rows:readonly {source_cutoff:Date}[]}){
 return result.sourceCutoff??result.rows.map(row=>row.source_cutoff.toISOString()).sort().at(-1);
}
