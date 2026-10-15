import {businessEventWindows} from '../business/history.ts';
import {reviewEventRows} from './event-rows.ts';
import type {ReviewReadFact} from './event-rows.ts';
import {businessDefinitionVersion} from '../business/definitions.ts';
import {discoverReviewDimensions} from './discovery.ts';
import {sourceDisplayLabel,dimensionLabelField} from '../postgres/query-labels.ts';
import type {Pool,PoolClient} from 'pg';
import {validateQuery,publishedQueryIssues,requiredMeasures,semanticCatalog,AnalyticsResultLimitError} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,AnalyticsResult,PublishedAnalyticsCapabilities,PublishedAnalyticsRelease,DimensionId} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {executeFacts} from '../engine.ts';
import {numericOutput} from '../postgres/sql.ts';
import {reviewDefinitionVersion,reviewMetrics,productReviewMetrics} from './definitions.ts';
const members=`mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id) JOIN mart.review_extractions extraction USING(tenant_id,partition_id)`;
/** Reads the one trusted manifest. Business review state never authorizes a query. */
export class ReviewAnalyticsRepository {
 constructor(private readonly pool:Pool,private readonly timeout=15000,private readonly maxGroups=3000,private readonly family:'review'|'business'='review'){}
 async capabilities(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities> {
  return tenantTransaction(this.pool,context.tenantId,async client=>({tenantId:context.tenantId,mode:'certified',releases:await releases(client,context,this.family)}),true,this.timeout);
 }
 async execute(query:AnalyticsQuery,context:AnalyticsContext):Promise<AnalyticsResult> {
  validateQuery(query,context);
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const published:PublishedAnalyticsCapabilities={tenantId:context.tenantId,mode:'certified',releases:await releases(client,context,this.family)};
   const checked={...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]};
   if(publishedQueryIssues(checked,published).length)throw new Error('Unexposed review query');
   const release=published.releases.find(release=>!publishedQueryIssues(checked,{...published,releases:[release]}).length)!;
   const range=query.dateRange??release.period!,params:unknown[]=[context.tenantId,requiredMeasures(query.metric),range.from,range.to];
   const filters=checked.filters.map(filter=>{params.push(filter.dimension,filter.values);return `fact.payload->'dimensions'->>$${params.length-1}=ANY($${params.length}::text[])`;});
   const event=aggregatedEventRead(query);
   const result=event?await reviewEventRows(client,{query,context,range,family:this.family}):{sourceCutoff:undefined,...await client.query<{payload:ReviewReadFact;source_cutoff:Date}>(`SELECT fact.payload,extraction.source_cutoff FROM ${members} JOIN mart.review_facts fact USING(tenant_id,partition_id)
    WHERE trusted.tenant_id=$1 AND member.family='${this.family}' AND extraction.definition_version=$${params.push((this.family==='business'?businessDefinitionVersion:reviewDefinitionVersion)())}
    AND fact.payload->>'measureId'=ANY($2::text[]) AND member.month BETWEEN date_trunc('month',$3::date) AND date_trunc('month',$4::date)
    ${filters.length?'AND '+filters.join(' AND '):''} ORDER BY member.month,fact.fact_key LIMIT 250001`,params)};
   if(result.rows.length>250000)throw new Error('Review fact query exceeds bounded execution');
   const facts=result.rows.map(row=>{const fact=row.payload;return {tenantId:fact.tenantId,measureId:fact.measureId,date:fact.businessDate,value:numericOutput(fact.value)!,dimensions:fact.dimensions,...fact.entityId?{entityId:fact.entityId}:{}};});
   const cutoff=reviewSourceCutoff(result);
   const executed=executeFacts(facts,{...query,dateRange:range},context,{sourceId:'postgres-review',executedAt:new Date().toISOString(),...(cutoff?{sourceAsOf:cutoff}:{})});
   if(executed.rows.length>this.maxGroups)throw new AnalyticsResultLimitError(query.groupBy??'customer');
   const snapshot=snapshotQuery(query)?facts.map(fact=>fact.date).filter(date=>date<=range.to).sort().at(-1):undefined;
   const dimensionLabels=reviewLabels(result.rows.map(row=>row.payload),query,context);
   return {...executed,metadata:{...executed.metadata,release,...analysisMetadata(query),...(Object.keys(dimensionLabels).length?{dimensionLabels}:{}),...(snapshot?{snapshotAsOf:snapshot}:{})}};
  },true,this.timeout);
 }
 async searchDimensionOptions(dimension:DimensionId,context:AnalyticsContext,request:import('@el-dabboos/domain').DimensionDiscoveryRequest){
  return discoverReviewDimensions(this.pool,{dimension,context,request,capabilities:await this.capabilities(context),timeout:this.timeout,family:this.family});
 }
 async dimensionOptions(dimension:DimensionId,context:AnalyticsContext):Promise<Array<{id:string;label?:string}>> {
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   const available=await releases(client,context,this.family),metrics=available.flatMap(release=>release.capabilities).filter(capability=>capability.dimensions.includes(dimension)).map(capability=>capability.metric);
   if(!metrics.length)return [];
   const params:unknown[]=[context.tenantId,dimension,[...new Set(metrics.flatMap(requiredMeasures))],dimensionLabelField(dimension)];
   const filters=(context.enforcedFilters??[]).map(filter=>{params.push(filter.dimension,filter.values);return `fact.payload->'dimensions'->>$${params.length-1}=ANY($${params.length}::text[])`;});
   const rows=(await client.query(`SELECT fact.payload->'dimensions'->>$2 key,CASE WHEN count(DISTINCT fact.payload->'displayLabels'->>$4)=1 THEN min(fact.payload->'displayLabels'->>$4) END label FROM ${members} JOIN mart.review_facts fact USING(tenant_id,partition_id)
    WHERE trusted.tenant_id=$1 AND member.family='${this.family}' AND fact.payload->>'measureId'=ANY($3::text[])
    AND fact.payload->'dimensions'->>$2 IS NOT NULL ${filters.length?'AND '+filters.join(' AND '):''} GROUP BY fact.payload->'dimensions'->>$2 ORDER BY key LIMIT ${this.maxGroups+1}`,params)).rows;
   if(rows.length>this.maxGroups)throw new AnalyticsResultLimitError(dimension);
   return rows.map(row=>({id:String(row.key),...(row.label?{label:sourceDisplayLabel(row.label,context.locale)}:{})}));
  },true,this.timeout);
 }
}
async function releases(client:PoolClient,context:AnalyticsContext,family:'review'|'business'):Promise<PublishedAnalyticsRelease[]> {
 const rows=(await client.query(`SELECT part.capabilities,extraction.definition_version FROM ${members}
 WHERE trusted.tenant_id=$1 AND member.family='${family}' ORDER BY member.month`,[context.tenantId])).rows;
 const exposed=rows.flatMap(row=>{
  if(row.definition_version!==(family==='business'?businessDefinitionVersion:reviewDefinitionVersion)())throw new Error('Explicit review definition migration required');
  return (row.capabilities as PublishedAnalyticsCapabilities).releases.map(release=>({...release,capabilities:release.capabilities.filter(capability=>(context.enforcedFilters??[]).every(filter=>capability.dimensions.includes(filter.dimension)))}));
 });
 return family==='business'?[...exposed,...businessEventWindows(exposed)]:exposed;
}
export function reviewQuery(query:AnalyticsQuery,context:AnalyticsContext) {
 return reviewMetrics.includes(query.metric)||productReviewMetrics.includes(query.metric)&&[query.groupBy,...(query.filters??[]).map(filter=>filter.dimension),...(context.enforcedFilters??[]).map(filter=>filter.dimension)].some(dimension=>dimension==='product'||dimension==='product_category');
}

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

function aggregatedEventRead(query:AnalyticsQuery){
 if(query.aggregation&&query.aggregation!=='sum')return false;
 const semantics=semanticCatalog[query.metric].semantics;
 return semantics.kind==='additive'||semantics.kind==='duration_derived'||semantics.kind==='ratio'&&semantics.basis!=='snapshot';
}
function analysisMetadata(query:AnalyticsQuery){return query.analysis?{analysis:query.analysis}:{};}

function snapshotQuery(query:AnalyticsQuery){const semantics=semanticCatalog[query.metric].semantics;return semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot';}

/** Published cutoff remains available for an exactly empty event selection. */
function reviewSourceCutoff(result:{sourceCutoff:string|undefined;rows:readonly {source_cutoff:Date}[]}){
 return result.sourceCutoff??result.rows.map(row=>row.source_cutoff.toISOString()).sort().at(-1);
}
