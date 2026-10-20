import {salesCommandContributionInsight,salesCommandComparisonPeriods,salesCommandComparisonValue,salesCommandSixWeeks,publishedQueryIssues,validateDashboardSpec,validateQuery,AnalyticsPublicationChangedError} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsExecutionScope,AnalyticsFilter,AnalyticsQuery,AnalyticsRepository,AuthorizationPolicy,DashboardSpec,DateRange,PublishedAnalyticsCapabilities,RequestContext,TenantProfile} from '@el-dabboos/domain';
import {analyticsContext,AuthorizationError} from './security.ts';
import {publishedCatalog} from './published-analytics.ts';
import {validateDashboardFilterOverrides} from './dashboard-filters.ts';
import {resolveRelativeDatePreset} from './relative-date.ts';
import {consistentAnalyticsExecution} from './consistent-execution.ts';
import {DashboardExecutor} from './executor.ts';
import type {DashboardExecutionResult} from './executor.ts';
import type {DashboardExecutionOptions} from './query-execution.ts';
import {salesCommandSections,salesCommandWidgets} from './sales-command-center-definition.ts';
import type {SalesCommandWidget,SalesPeriodRule} from './sales-command-center-definition.ts';

export interface SalesCommandInput {dateRange?:DateRange;filters?:AnalyticsFilter[]}
export interface SalesCommandWidgetResult {
 definition:SalesCommandWidget;period:DateRange;appliedFilters:AnalyticsFilter[];unsupportedFilters:AnalyticsFilter['dimension'][];
 disposition:'usable_now'|'implemented_unproven'|'definition_needed';issues:string[];
 customerOwners?:Array<{customer:string;label?:string;owners:Array<{id:string;label?:string}>;complete:boolean}>;insight?:ReturnType<typeof salesCommandContributionInsight>;execution?:DashboardExecutionResult;comparison?:{kind:import('@el-dabboos/domain').SalesCommandComparison;periods:DateRange[];baseline:number|null;absoluteChange:number|null;percentageChange:number|null;complete:boolean;sourceAsOf?:string};
}
export interface SalesCommandResult {
 sections:Array<(typeof salesCommandSections)[number]&{widgets:SalesCommandWidgetResult[]}>;
 metadata:{executedAt:string;today:string;selectedRange:DateRange;servingRevision?:string;mode:PublishedAnalyticsCapabilities['mode'];refresh:'report_only'};
}
interface Dependencies {
 repository:AnalyticsRepository;policy:AuthorizationPolicy;
 published:(context:AnalyticsContext)=>Promise<PublishedAnalyticsCapabilities>;
 clock?:()=>Date;options?:DashboardExecutionOptions;
}
interface ReportScope {
 actor:RequestContext;context:AnalyticsContext;profile:TenantProfile;now:Date;
 periods:Record<SalesPeriodRule,DateRange>;filters:AnalyticsFilter[];published:PublishedAnalyticsCapabilities;reader:AnalyticsExecutionScope;
}
export function validateSalesCommandInput(value:unknown):asserts value is SalesCommandInput {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>key!=='dateRange'&&key!=='filters'))throw new Error('Invalid Sales Command Center request');
 const input=value as SalesCommandInput;
 validateDashboardFilterOverrides({...(input.dateRange!==undefined?{date:{mode:'absolute',range:input.dateRange}}:{}),...(input.filters!==undefined?{dimensions:input.filters}:{})});
 if(input.filters?.some(filter=>filter.dimension!=='customer'&&filter.dimension!=='salesperson'))throw new Error('Unsupported report filter');
}
/** One trusted clock, publication attempt, security context and read budget for every section. */
export class SalesCommandCenter {
 constructor(private readonly dependencies:Dependencies){}
 async execute(input:SalesCommandInput,actor:RequestContext,profile:TenantProfile):Promise<SalesCommandResult>{
  validateSalesCommandInput(input);
  const {policy,repository,options}=this.dependencies;
  policy.authorize('dashboard:view',actor);policy.authorize('analytics:query',actor);
  if(profile.id!==actor.tenant.tenantId)throw new AuthorizationError('TENANT_FORBIDDEN','Report profile belongs to another workspace.');
  const now=this.dependencies.clock?.()??new Date(),context=analyticsContext(actor);
  const periods=reportPeriods(input,profile,now);
  return consistentAnalyticsExecution(repository,context,options??{},async reader=>{
   const published=publishedCatalog(actor,await this.dependencies.published(context)).published;
   const scope:ReportScope={actor,context,profile,now,periods,filters:input.filters??[],published,reader};
   const widgets=await settledWidgets(salesCommandWidgets.map(definition=>this.executeWidget(definition,scope)));
   return {sections:salesCommandSections.map(section=>({...section,widgets:widgets.filter(widget=>widget.definition.section===section.id)})),metadata:{executedAt:now.toISOString(),today:periods.today.to,selectedRange:periods.selected_range,...(reader.servingRevision?{servingRevision:reader.servingRevision}:{}),mode:published.mode,refresh:'report_only'}};
  });
 }
 private async executeWidget(definition:SalesCommandWidget,scope:ReportScope):Promise<SalesCommandWidgetResult>{
  const selection=widgetFilters(definition,scope);
  const entry:SalesCommandWidgetResult={definition,period:scope.periods[definition.period],...selection,disposition:definition.widget?'implemented_unproven':'definition_needed',issues:[]};
  if(!definition.widget)return entry;
  const dashboard:DashboardSpec={schemaVersion:2,id:definition.id,title:definition.title,locale:scope.context.locale,filters:{dateRange:entry.period,dimensions:entry.appliedFilters},layout:{columns:1},widgets:[definition.widget]};
  try {
   validateDashboardSpec(dashboard);this.dependencies.policy.authorizeDashboard(dashboard,scope.actor);
   const issues=widgetIssues(dashboard,scope);
   if(issues.length)return {...entry,issues};
  }catch(error){if(error instanceof AuthorizationError)return {...entry,issues:[error.code]};throw error;}
  // Inner executors cannot open their own revision; their reads use the shared outer scheduler.
  const repository:AnalyticsRepository={...(scope.reader.supportsResultWindows?{supportsResultWindows:true as const}:{}),execute:(query,context,read)=>scope.reader.execute(query,context,read)};
  const execution=await new DashboardExecutor(repository,()=>scope.now,this.dependencies.options).execute(dashboard,scope.context,{timeZone:scope.profile.timeZone});
  assertRevision(execution,scope.reader.servingRevision);
  const result:SalesCommandWidgetResult={...entry,execution,disposition:completeExecution(execution,scope.published.mode)?'usable_now':'implemented_unproven'};
  if(definition.id==='overdue-customers'&&result.disposition==='usable_now')result.customerOwners=await this.executeCustomerOwners(result,scope);
  if(definition.insight){const series=Object.values(execution.widgetResults[definition.id]!.seriesResults)[0];if(series?.status==='success'&&result.disposition==='usable_now')result.insight=salesCommandContributionInsight(definition.insight,series.result);}
  if(definition.comparison)result.comparison=await this.executeComparison(definition,result,scope);
  return result;
 }
 private async executeCustomerOwners(parent:SalesCommandWidgetResult,scope:ReportScope){
  const primary=parent.execution!.widgetResults[parent.definition.id]!.seriesResults.command_overdue_balance;
  if(primary?.status!=='success')return [];
  const customers=primary.result.rows.flatMap(row=>row.key&&row.key!=='unassigned'?[row.key]:[]);
  const jobs=customers.map(customer=>{
   const definition:SalesCommandWidget={id:'customer-owner',section:'follow-up',title:{en:'Debtor account owner',ar:'مسؤول حساب العميل المدين'},period:'today',reference:'requires_reconciliation',widget:{id:'customer-owner',type:'table',dimension:'salesperson',series:[{id:'owner',metric:'command_customer_balance'}]}};
   return this.executeWidget(definition,{...scope,filters:[...scope.filters.filter(filter=>filter.dimension!=='customer'),{dimension:'customer',values:[customer]}]});
  });
  const entries=await settledWidgets(jobs);
  return entries.map((entry,index)=>{
   const customer=customers[index]!,label=primary.result.metadata.dimensionLabels?.[customer],series=entry.execution?.widgetResults['customer-owner']?.seriesResults.owner;
   const complete=entry.disposition==='usable_now'&&series?.status==='success'&&!series.result.metadata.window?.nextCursor;
   const owners=series?.status==='success'?series.result.rows.flatMap(row=>{if(!row.key)return [];const caption=series.result.metadata.dimensionLabels?.[row.key];return [{id:row.key,...(caption?{label:caption}:{})}];}):[];
   return {customer,...(label?{label}:{}),owners,complete};
  });
 }
 private async executeComparison(definition:SalesCommandWidget,current:SalesCommandWidgetResult,scope:ReportScope){
  const kind=definition.comparison!,periods=salesCommandComparisonPeriods(kind,scope.periods.today.to);
  const baselineDefinition={...definition};delete baselineDefinition.comparison;
  const baselines=await settledWidgets(periods.map(period=>this.executeWidget(baselineDefinition,{...scope,periods:{...scope.periods,[definition.period]:period}})));
  const complete=current.disposition==='usable_now'&&baselines.every(entry=>entry.disposition==='usable_now');
  const operands=baselines.map(entry=>complete?scalarValue(entry):null);
  const sourceAsOf=baselines.flatMap(entry=>Object.values(entry.execution?.widgetResults??{}).flatMap(widget=>Object.values(widget.seriesResults).flatMap(series=>series.status==='success'&&series.result.metadata.sourceAsOf?[series.result.metadata.sourceAsOf]:[]))).sort().at(0);
  return {kind,periods,...salesCommandComparisonValue(complete?scalarValue(current):null,operands,kind),complete,...(sourceAsOf?{sourceAsOf}:{})};
 }
}
function reportPeriods(input:SalesCommandInput,profile:TenantProfile,now:Date):Record<SalesPeriodRule,DateRange>{
 const today=resolveRelativeDatePreset('today',profile.timeZone,now),month=resolveRelativeDatePreset('current_month',profile.timeZone,now);
 return {today,current_month:month,selected_range:input.dateRange??month,six_weeks:salesCommandSixWeeks(today.to)};
}
function widgetFilters(definition:SalesCommandWidget,scope:ReportScope){
 if(!definition.widget)return {appliedFilters:[],unsupportedFilters:scope.filters.map(filter=>filter.dimension)};
 const supported=(dimension:AnalyticsFilter['dimension'])=>definition.widget!.series.every(series=>scope.published.releases.some(release=>release.capabilities.some(capability=>capability.metric===series.metric&&capability.dimensions.includes(dimension))));
 return {appliedFilters:scope.filters.filter(filter=>supported(filter.dimension)),unsupportedFilters:scope.filters.filter(filter=>!supported(filter.dimension)).map(filter=>filter.dimension)};
}
function widgetIssues(dashboard:DashboardSpec,scope:ReportScope):string[]{
 return dashboard.widgets.flatMap(widget=>widget.series.flatMap(series=>{
  const query:AnalyticsQuery={metric:series.metric,...(widget.dimension?{groupBy:widget.dimension}:{}),...(series.analysis?{analysis:series.analysis}:{}),dateRange:dashboard.filters.dateRange!,filters:dashboard.filters.dimensions??[]};
  validateQuery(query,scope.context);
  // Enforced dimensions must be supported by this exact capability, never a different release.
  return publishedQueryIssues({...query,filters:[...query.filters!,...(scope.context.enforcedFilters??[])]},scope.published);
 }));
}
function completeExecution(execution:DashboardExecutionResult,mode:PublishedAnalyticsCapabilities['mode']){
 return !execution.metadata.failedSeries&&Object.values(execution.widgetResults).every(widget=>Object.values(widget.seriesResults).every(series=>series.status==='success'&&!series.result.metadata.availability&&(series.result.metadata.coverage?.status==='complete'||mode==='synthetic'&&!series.result.metadata.coverage)));
}
async function settledWidgets(jobs:Promise<SalesCommandWidgetResult>[]):Promise<SalesCommandWidgetResult[]>{
 const settled=await Promise.allSettled(jobs),failure=settled.find(result=>result.status==='rejected');
 if(failure?.status==='rejected')throw failure.reason;
 return settled.flatMap(result=>result.status==='fulfilled'?[result.value]:[]);
}
function assertRevision(execution:DashboardExecutionResult,revision:string|undefined){
 if(!revision)return;
 for(const widget of Object.values(execution.widgetResults))for(const series of Object.values(widget.seriesResults))if(series.status==='success'&&series.result.metadata.servingRevision!==revision)throw new AnalyticsPublicationChangedError();
}

function scalarValue(entry:SalesCommandWidgetResult):number|null {
 const widget=Object.values(entry.execution?.widgetResults??{})[0],series=Object.values(widget?.seriesResults??{})[0];
 return series?.status==='success'?series.result.rows[0]?.value??null:null;
}
