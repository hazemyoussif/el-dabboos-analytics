import type { Pool } from 'pg';
import type { AnalyticsContext,AnalyticsQuery,AnalyticsRepository,AnalyticsResult,DimensionId,DimensionValueRepository,PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { publishedQueryIssues,validateQuery,semanticCatalog } from '@el-dabboos/domain';
import { PostgresAnalyticsRepository } from './repository.ts';
import type { PostgresRepositoryOptions } from './repository.ts';
import { readHistoricalCollection } from './historical-collection.ts';
import type {HistoricalCollection} from './historical-collection.ts';
import { analyzeRows,compareValues } from './query-analysis.ts';
import {executeHistoricalSnapshot} from './historical-snapshot.ts';

export interface HistoricalRepositoryOptions extends PostgresRepositoryOptions { historicalMaxGroups?:number; historicalDiscoveryTimeoutMs?:number }
/** Existing September requests retain their binding; historical totals aggregate in PostgreSQL. */
export class HistoricalAnalyticsRepository implements AnalyticsRepository,DimensionValueRepository {
  private readonly anchor:PostgresAnalyticsRepository;
  private readonly historicalOptions:PostgresRepositoryOptions;
  private readonly discoveryOptions:PostgresRepositoryOptions;
  constructor(private readonly pool:Pool,private readonly options:HistoricalRepositoryOptions) {
    this.anchor=new PostgresAnalyticsRepository(pool,options);
    const maxGroups=options.historicalMaxGroups ?? 4000;
    if(!Number.isInteger(maxGroups) || maxGroups<1 || maxGroups>5000)throw new Error('Invalid historical group bound');
    this.historicalOptions={...options,maxGroups};
    const statementTimeoutMs=options.historicalDiscoveryTimeoutMs ?? 45000;
    if(!Number.isInteger(statementTimeoutMs) || statementTimeoutMs<1 || statementTimeoutMs>120000)throw new Error('Invalid historical discovery deadline');
    this.discoveryOptions={...this.historicalOptions,statementTimeoutMs};
  }
  isDataReady(tenantId:string) { return this.anchor.isDataReady(tenantId); }
  async getPublishedCapabilities(context:AnalyticsContext):Promise<PublishedAnalyticsCapabilities> {
    const baseline=await this.anchor.getPublishedCapabilities(context);
    const history=await readHistoricalCollection(this.pool,context);
    return history ? {...baseline,releases:[...baseline.releases,history.release,...history.members.map(member=>member.release)]} : baseline;
  }
  async execute(query:AnalyticsQuery,context:AnalyticsContext) {
    validateQuery(query,context);
    const baseline=await this.anchor.getPublishedCapabilities(context,query);
    if (!publishedQueryIssues(query,baseline).length) return this.anchor.execute(query,context);
    const history=await readHistoricalCollection(this.pool,context,[query.metric]);
    if (!history || publishedQueryIssues(query,{tenantId:context.tenantId,mode:'certified',releases:[history.release,...history.members.map(member=>member.release)]}).length) throw new Error('Uncertified historical query');
    const special=await executeNonAdditive(this.pool,this.historicalOptions,history,query,context);
    if (special) return special;
    validateHistoricalAnalyses(query);
    const events=history.members.filter(member=>member.kind==='events');
    const repository=new PostgresAnalyticsRepository(this.pool,{...this.historicalOptions,historicalDatasetId:events[0]!.datasetId,historicalEventDatasets:events.map(member=>member.datasetId)});
    const {analysis,...base}=query;
    // One extra prior month is fetched through the same canonical aggregation for MoM.
    const start=query.dateRange!.from;
    const previous=new Date(`${start}T00:00:00Z`); previous.setUTCMonth(previous.getUTCMonth()-1);
    const priorStart=previous.toISOString().slice(0,10);
    const result=await repository.execute({...base,dateRange:{from:analysis?.comparison && priorStart>=history.from ? priorStart:start,to:query.dateRange!.to}},context);
    let rows=result.rows;
    if (analysis?.comparison) rows=rows.map((row,index)=>({ ...row,...compareValues(row.value,index>0 && String(rows[index-1]!.key)===previousMonth(String(row.key)) ? rows[index-1]!.value:null) }));
    if (query.groupBy==='month') rows=rows.filter(row=>String(row.key)>=start.slice(0,7));
    if (analysis?.movingAverage && rows.length<analysis.movingAverage.window) throw new Error('Insufficient historical moving-average coverage');
    rows=analyzeRows(rows,query,!!analysis?.comparison);
    return {...result,rows,metadata:{...result.metadata,...(analysis?{analysis}:{}),release:{datasetId:history.reference,sourceId:history.release.sourceId,mappingId:history.release.mappingId,mappingVersion:history.release.mappingVersion,certificationReference:history.reference}}};
  }
  async listDimensionValues(dimension:DimensionId,context:AnalyticsContext) { return (await this.listDimensionOptions(dimension,context)).map(option=>option.id); }
  async listDimensionOptions(dimension:DimensionId,context:AnalyticsContext) {
    const history=await readHistoricalCollection(this.pool,context,[]);
    if (!history) return this.anchor.listDimensionOptions(dimension,context);
    const events=history.members.filter(member=>member.kind==='events');
    return new PostgresAnalyticsRepository(this.pool,{...this.discoveryOptions,historicalDatasetId:events[0]!.datasetId,historicalEventDatasets:events.map(member=>member.datasetId)}).listDimensionOptions(dimension,context);
  }
}
function previousMonth(month:string) { const date=new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth()-1); return date.toISOString().slice(0,7); }
function validateHistoricalAnalyses(query:AnalyticsQuery) {
  if (query.analysis?.comparison && query.groupBy!=='month') throw new Error('Historical MoM requires monthly buckets');
  if (query.analysis?.movingAverage && (query.groupBy!=='month' || ![3,6].includes(query.analysis.movingAverage.window))) throw new Error('Historical moving average requires three or six monthly buckets');
  if (!query.analysis?.comparison && !query.analysis?.movingAverage) return;
  const range=query.dateRange!;
  const end=new Date(`${range.to}T00:00:00Z`),last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).toISOString().slice(0,10);
  if (!range.from.endsWith('-01') || range.to!==last) throw new Error('Historical monthly analyses require complete months');
}
async function executeNonAdditive(pool:Pool,options:PostgresRepositoryOptions,history:HistoricalCollection,query:AnalyticsQuery,context:AnalyticsContext):Promise<AnalyticsResult|undefined> {
  const semantics=semanticCatalog[query.metric].semantics;
  if (semantics.kind==='snapshot' || semantics.kind==='ratio' && semantics.basis==='snapshot') return executeHistoricalSnapshot(pool,options,history,query,context);
  return undefined;
}
