import {trustedMetricMonths} from '../operational/trusted-capabilities.ts';
import type {Pool} from 'pg';
import {validateQuery} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,AnalyticsReadOptions,AnalyticsRepository,DimensionValueRepository,DimensionId,DimensionDiscoveryRequest} from '@el-dabboos/domain';
import type {HistoricalRepositoryOptions} from '../postgres/historical-repository.ts';
import {tenantTransaction} from '../postgres/session.ts';
import {pinnedTrustedExecution} from '../operational/execution-scope.ts';
import {preparedPublication,preparedQueryRelease,preparedCapabilities} from './publication-metadata.ts';
import {PreparedExecutionReads} from './execution-reads.ts';
import {readPreparedSelection} from './selection.ts';
import {preparedResult} from './result.ts';
import {discoverPreparedDimensions} from './discovery.ts';
/** The activated runtime has no dependency on source readers or raw-history reconstruction. */
export class PreparedAnalyticsRepository implements AnalyticsRepository,DimensionValueRepository {
 readonly supportsResultWindows=true as const;
 constructor(private readonly pool:Pool,private readonly options:HistoricalRepositoryOptions){}
 async createExecutionScope(context:AnalyticsContext){
  const actor=structuredClone(context);
  const reads=new PreparedExecutionReads(actor);
  const repository:AnalyticsRepository={execute:(query,scope,read)=>this.executePublished(query,scope,read,reads)};
  return pinnedTrustedExecution(this.pool,repository,actor,this.options.statementTimeoutMs);
 }
 async isDataReady(tenantId:string){
  return tenantTransaction(this.pool,tenantId,async client=>Boolean((await client.query(`SELECT 1 FROM mart.prepared_activation activation
   JOIN mart.analytics_trusted_serving trusted USING(tenant_id) JOIN mart.prepared_revision_seals seal USING(tenant_id,revision_id)
   WHERE activation.tenant_id=$1`,[tenantId])).rowCount),true,this.options.statementTimeoutMs);
 }
 async getPublishedCapabilities(context:AnalyticsContext){
  return tenantTransaction(this.pool,context.tenantId,async client=>preparedCapabilities(context,await preparedPublication(client,context)),true,this.options.statementTimeoutMs);
 }
 execute(query:AnalyticsQuery,context:AnalyticsContext,read?:AnalyticsReadOptions){return this.executePublished(query,context,read,new PreparedExecutionReads(structuredClone(context)));}
 private async executePublished(query:AnalyticsQuery,context:AnalyticsContext,read:AnalyticsReadOptions|undefined,reads:PreparedExecutionReads){
  validateQuery(query,context);
  return tenantTransaction(this.pool,context.tenantId,async client=>{
   // Bounded prepared reads lose more to JIT compilation than it saves; reset automatically with this transaction.
   await client.query("SELECT set_config('jit','off',true)");
   const publication=await reads.publication(client,query,read?.revision),{family,release}=preparedQueryRelease(query,context,publication);
   const currency=this.options.reportingCurrency?await this.options.reportingCurrency(context.tenantId):this.options.reportingCurrencies[context.tenantId];
   if(currency!==publication.currency)throw new Error('Uncertified reporting currency mismatch');
   const range=query.dateRange??release.period!,effective={...query,dateRange:range};
   const coverage=family==='facts'?{from:release.period!.from,to:release.period!.to,cutoff:publication.sourceCutoff,cutoffDay:publication.cutoffDay,months:await trustedMetricMonths(client,context.tenantId,query.metric)}:undefined;
   // Selection rechecks the pinned revision in this same read-only transaction before reading cells.
   const selected=await readPreparedSelection(client,{query:effective,context,range,family,...(coverage?{coverage}:{}),maxGroups:this.options.maxGroups??4000,timeBuckets:family==='facts'?'complete':family==='receivables'?'closed-months':'observed',...(family==='receivables'?{emptySnapshotValue:0 as const}:{}),...(read?{read}:{})},reads.bindings.bind(reads));
   if(selected.currency&&selected.currency!==currency)throw new Error('Uncertified prepared reporting currency mismatch');
   return preparedResult(client,{query:effective,publication,family,release,selected,executedAt:(this.options.clock?.()??new Date()).toISOString()});
  },true,this.options.statementTimeoutMs);
 }
 async searchDimensionOptions(dimension:DimensionId,context:AnalyticsContext,request:DimensionDiscoveryRequest){
  return discoverPreparedDimensions(this.pool,{dimension,context,request,capabilities:await this.getPublishedCapabilities(context),timeout:this.options.statementTimeoutMs??15000});
 }
 async listDimensionOptions(dimension:DimensionId,context:AnalyticsContext){
  const values:Array<{id:string;label?:string}>=[];let cursor:string|undefined;
  do{const page=await this.searchDimensionOptions(dimension,context,{limit:100,...(cursor?{cursor}:{})});values.push(...page.values);cursor=page.nextCursor;
   if(values.length>(this.options.maxGroups??4000))throw new Error('Grouping exceeds technical bound');
  }while(cursor);
  return values;
 }
 async listDimensionValues(dimension:DimensionId,context:AnalyticsContext){return (await this.listDimensionOptions(dimension,context)).map(option=>option.id);}
}
