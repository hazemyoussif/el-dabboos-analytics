import type {Pool} from 'pg';
import type {AnalyticsRepository,DimensionValueRepository,AnalyticsContext,AnalyticsQuery,AnalyticsReadOptions,DimensionId,DimensionDiscoveryRequest} from '@el-dabboos/domain';
import type {HistoricalRepositoryOptions} from './postgres/historical-repository.ts';
import {tenantTransaction} from './postgres/session.ts';
import {TrustedAnalyticsRepository} from './operational/repository.ts';
import {PreparedAnalyticsRepository} from './prepared/repository.ts';
/** Explicit one-way cutover. Activated tenants never fall back when prepared coverage is missing. */
export class PublishedAnalyticsRepository implements AnalyticsRepository,DimensionValueRepository {
 readonly supportsResultWindows=true as const;
 private readonly existing:TrustedAnalyticsRepository;
 private readonly prepared:PreparedAnalyticsRepository;
 constructor(private readonly pool:Pool,private readonly options:HistoricalRepositoryOptions){this.existing=new TrustedAnalyticsRepository(pool,options);this.prepared=new PreparedAnalyticsRepository(pool,options);}
 private async reader(tenantId:string){
  const activated=await tenantTransaction(this.pool,tenantId,async client=>Boolean((await client.query('SELECT 1 FROM mart.prepared_activation WHERE tenant_id=$1',[tenantId])).rowCount),true,this.options.statementTimeoutMs);
  return activated?this.prepared:this.existing;
 }
 async createExecutionScope(context:AnalyticsContext){return (await this.reader(context.tenantId)).createExecutionScope(context);}
 async execute(query:AnalyticsQuery,context:AnalyticsContext,read?:AnalyticsReadOptions){return (await this.reader(context.tenantId)).execute(query,context,read);}
 async getPublishedCapabilities(context:AnalyticsContext){return (await this.reader(context.tenantId)).getPublishedCapabilities(context);}
 async isDataReady(tenantId:string){return (await this.reader(tenantId)).isDataReady(tenantId);}
 async listDimensionOptions(dimension:DimensionId,context:AnalyticsContext){return (await this.reader(context.tenantId)).listDimensionOptions(dimension,context);}
 async searchDimensionOptions(dimension:DimensionId,context:AnalyticsContext,request:DimensionDiscoveryRequest){return (await this.reader(context.tenantId)).searchDimensionOptions(dimension,context,request);}
 async listDimensionValues(dimension:DimensionId,context:AnalyticsContext){return (await this.reader(context.tenantId)).listDimensionValues(dimension,context);}
}
