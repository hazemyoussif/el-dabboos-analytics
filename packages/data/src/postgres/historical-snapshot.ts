import type {Pool} from 'pg';
import type {AnalyticsContext,AnalyticsQuery,AnalyticsResult} from '@el-dabboos/domain';
import type {HistoricalCollection} from './historical-collection.ts';
import {PostgresAnalyticsRepository} from './repository.ts';
import type {PostgresRepositoryOptions} from './repository.ts';

/** A time series samples cutoffs; an ungrouped snapshot selects the latest state, never a sum. */
export async function executeHistoricalSnapshot(pool:Pool,options:PostgresRepositoryOptions,history:HistoricalCollection,query:AnalyticsQuery,context:AnalyticsContext):Promise<AnalyticsResult> {
  const range=query.dateRange!;
  const available=history.members.filter(member=>member.kind==='aging' && member.to<=range.to);
  const members=query.groupBy==='month'?available.filter(member=>member.to>=range.from):available.slice(-1);
  if (!members.length) throw new Error('No published historical cutoff in the requested scope');
  let metadata:AnalyticsResult['metadata']|undefined;
  const rows:AnalyticsResult['rows']=[];
  for (const member of members) {
    const repository=new PostgresAnalyticsRepository(pool,{...options,historicalDatasetId:member.datasetId});
    const result=await repository.execute({metric:query.metric,dateRange:{from:member.to,to:member.to},...(query.filters?{filters:query.filters}:{}),...(query.groupBy && query.groupBy!=='month'?{groupBy:query.groupBy}:{})},context);
    if ((!query.groupBy || query.groupBy==='month') && result.rows.length!==1) throw new Error('Historical company snapshot scope conflict');
    rows.push(...result.rows.map(row=>({...row,key:query.groupBy==='month'?member.from.slice(0,7):row.key})));metadata={...result.metadata,snapshotAsOf:member.to};
  }
  return {metric:query.metric,groupBy:query.groupBy ?? null,rows,metadata:{...metadata!,release:{...metadata!.release!,datasetId:history.reference,certificationReference:history.reference}}};
}
