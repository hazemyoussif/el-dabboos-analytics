import {AnalyticsPublicationChangedError} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsExecutionScope,AnalyticsRepository} from '@el-dabboos/domain';
import {requestScopedAnalytics} from './query-execution.ts';
import type {DashboardExecutionOptions} from './query-execution.ts';
import {seriesFailure} from './series-failure.ts';

/** Each retry owns fresh deduplication and adapter operands; no failed attempt escapes. */
export async function consistentAnalyticsExecution<T>(repository:AnalyticsRepository,context:AnalyticsContext,options:DashboardExecutionOptions,execute:(scope:AnalyticsExecutionScope)=>Promise<T>):Promise<T>{
 for(let attempt=0;attempt<2;attempt++){
  try{
   const scoped=await repository.createExecutionScope?.(context)??repository;
   const reader=requestScopedAnalytics(scoped,options.onSeriesFailure? (query,error)=>options.onSeriesFailure!({metric:query.metric,category:error instanceof Error&&/Unsafe SQL numeric output/.test(error.message)?'unsafe_numeric':'execution_failure',code:seriesFailure(error).error.code}):undefined,options.maxConcurrency);
   const result=await execute(reader);
   await reader.verifyExecution?.();
   return result;
  }catch(error){if(!(error instanceof AnalyticsPublicationChangedError)||attempt===1)throw error;}
 }
 throw new AnalyticsPublicationChangedError();
}
