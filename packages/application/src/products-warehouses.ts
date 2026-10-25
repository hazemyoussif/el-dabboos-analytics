import {AnalyticsPublicationChangedError,publishedQueryIssues,validateDashboardSpec,validateQuery} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsExecutionScope,AnalyticsFilter,AnalyticsQuery,AnalyticsRepository,AuthorizationPolicy,DashboardSpec,DateRange,PublishedAnalyticsCapabilities,RequestContext,TenantProfile} from '@el-dabboos/domain';
import {analyticsContext,AuthorizationError} from './security.ts';
import {validateDashboardFilterOverrides} from './dashboard-filters.ts';
import {consistentAnalyticsExecution} from './consistent-execution.ts';
import {DashboardExecutor} from './executor.ts';
import type {DashboardExecutionResult} from './executor.ts';
import type {DashboardExecutionOptions} from './query-execution.ts';
import {publishedCatalog} from './published-analytics.ts';
import {resolveRelativeDatePreset} from './relative-date.ts';
import {productReportProductDimensions,productReportReadings,productReportSalesDimensions} from './products-warehouses-definition.ts';
import {productReportDefaultPeriod} from './products-warehouses-periods.ts';
import type {ProductReportReading} from './products-warehouses-definition.ts';

export interface ProductsWarehousesInput {dateRange?:DateRange;productFilters?:AnalyticsFilter[];salesFilters?:AnalyticsFilter[];warehouse?:string}
export interface ProductReportResult extends ProductReportReading {period:DateRange;issues:string[];dashboard:DashboardSpec;complete:boolean;execution?:DashboardExecutionResult}
export interface ProductsWarehousesResult {
 readings:ProductReportResult[];
 metadata:{executedAt:string;selectedRange:DateRange;stockRequestedAsOf:string;mode:PublishedAnalyticsCapabilities['mode'];servingRevision?:string;refresh:'report_only'};
}
interface Dependencies {
 repository:AnalyticsRepository;policy:AuthorizationPolicy;published:(context:AnalyticsContext)=>Promise<PublishedAnalyticsCapabilities>;
 clock?:()=>Date;options?:DashboardExecutionOptions;
}
interface ReadingScope {
 actor:RequestContext;context:AnalyticsContext;profile:TenantProfile;now:Date;published:PublishedAnalyticsCapabilities;reader:AnalyticsExecutionScope;
}
export function validateProductsWarehousesInput(value:unknown):asserts value is ProductsWarehousesInput {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['dateRange','productFilters','salesFilters','warehouse'].includes(key)))throw new Error('Invalid product report input');
 const input=value as ProductsWarehousesInput;
 validateDashboardFilterOverrides({...(input.dateRange!==undefined?{date:{mode:'absolute',range:input.dateRange}}:{})});
 validateReportFilters(input.productFilters,productReportProductDimensions);
 validateReportFilters(input.salesFilters,productReportSalesDimensions);
 if(input.warehouse!==undefined&&(typeof input.warehouse!=='string'||!input.warehouse.trim()||input.warehouse.length>160))throw new Error('Invalid warehouse');
}
function validateReportFilters(filters:AnalyticsFilter[]|undefined,dimensions:readonly AnalyticsFilter['dimension'][]) {
 if(filters===undefined)return;
 validateDashboardFilterOverrides({dimensions:filters});
 if(filters.some(filter=>!dimensions.includes(filter.dimension))||new Set(filters.map(filter=>filter.dimension)).size!==filters.length)throw new Error('Unsupported product report filter');
}
/** Report composition reads only the existing repository's prepared serving boundary. */
export class ProductsWarehousesReport {
 constructor(private readonly dependencies:Dependencies){}
 async execute(input:ProductsWarehousesInput,actor:RequestContext,profile:TenantProfile):Promise<ProductsWarehousesResult>{
  validateProductsWarehousesInput(input);
  this.dependencies.policy.authorize('dashboard:view',actor);this.dependencies.policy.authorize('analytics:query',actor);
  if(profile.id!==actor.tenant.tenantId)throw new AuthorizationError('TENANT_FORBIDDEN','Report profile belongs to another workspace.');
  const now=this.dependencies.clock?.()??new Date(),context=analyticsContext(actor);
  return consistentAnalyticsExecution(this.dependencies.repository,context,this.dependencies.options??{},async reader=>{
   const published=publishedCatalog(actor,await this.dependencies.published(context)).published;
   const stock=resolveRelativeDatePreset('today',profile.timeZone,now);
   const sales=input.dateRange??productReportDefaultPeriod('sales',resolveRelativeDatePreset('current_month',profile.timeZone,now),published);
   const scope:ReadingScope={actor,context,profile,now,published,reader};
   const jobs=productReportReadings.map(definition=>this.executeReading(definition,input,definition.section==='inventory'?productReportDefaultPeriod('inventory',stock,published,definition.widget.series[0]!.metric):sales,scope));
   const settled=await Promise.allSettled(jobs),failure=settled.find(entry=>entry.status==='rejected');
   if(failure?.status==='rejected')throw failure.reason;
   return {readings:settled.flatMap(entry=>entry.status==='fulfilled'?[entry.value]:[]),metadata:{executedAt:now.toISOString(),selectedRange:sales,stockRequestedAsOf:stock.to,mode:published.mode,...(reader.servingRevision?{servingRevision:reader.servingRevision}:{}),refresh:'report_only'}};
  });
 }
 private async executeReading(definition:ProductReportReading,input:ProductsWarehousesInput,period:DateRange,scope:ReadingScope):Promise<ProductReportResult>{
  const filters=[...(input.productFilters??[]),...(definition.section==='sales'?input.salesFilters??[]:input.warehouse?[{dimension:'warehouse' as const,values:[input.warehouse]}]:[])];
  const dashboard:DashboardSpec={schemaVersion:2,id:'products-warehouses',title:{en:'Products & Warehouses',ar:'المنتجات والمخازن'},locale:scope.context.locale,layout:{columns:1},filters:{dateRange:period,dimensions:filters},widgets:[definition.widget]};
  const entry:ProductReportResult={...definition,period,issues:[],dashboard,complete:false};
  try {
   validateDashboardSpec(dashboard);this.dependencies.policy.authorizeDashboard(dashboard,scope.actor);
   const query:AnalyticsQuery={metric:definition.widget.series[0]!.metric,groupBy:'product',dateRange:period,filters};
   validateQuery(query,scope.context);
   entry.issues=publishedQueryIssues({...query,filters:[...filters,...(scope.context.enforcedFilters??[])]},scope.published);
  }catch(error){if(error instanceof AuthorizationError)return {...entry,issues:[error.code]};throw error;}
  if(entry.issues.length)return entry;
  const repository:AnalyticsRepository={...(scope.reader.supportsResultWindows?{supportsResultWindows:true as const}:{}),execute:(query,context,read)=>scope.reader.execute(query,context,read)};
  entry.execution=await new DashboardExecutor(repository,()=>scope.now,this.dependencies.options).execute(dashboard,scope.context,{timeZone:scope.profile.timeZone});
  assertProductReportRevision(entry.execution,scope.reader.servingRevision);
  entry.complete=completeProductReading(entry.execution,scope.published.mode);
  return entry;
 }
}
function assertProductReportRevision(execution:DashboardExecutionResult,revision:string|undefined){
 if(!revision)return;
 for(const widget of Object.values(execution.widgetResults))for(const series of Object.values(widget.seriesResults))if(series.status==='success'&&series.result.metadata.servingRevision!==revision)throw new AnalyticsPublicationChangedError();
}
function completeProductReading(execution:DashboardExecutionResult,mode:PublishedAnalyticsCapabilities['mode']):boolean {
 return Object.values(execution.widgetResults).every(widget=>Object.values(widget.seriesResults).every(series=>{
  if(series.status!=='success')return false;
  const {availability,coverage,servingRevision,release}=series.result.metadata;
  if(availability)return false;
  if(coverage)return coverage.status==='complete';
  return mode==='synthetic'||Boolean(servingRevision&&release?.certificationReference);
 }));
}
