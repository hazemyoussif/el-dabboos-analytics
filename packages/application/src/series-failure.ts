import {AnalyticsResultLimitError,AnalyticsQueryTimeoutError,AnalyticsResultWindowError} from '@el-dabboos/domain';
import type {SeriesExecution} from './executor.ts';
export function seriesFailure(error:unknown):Extract<SeriesExecution,{status:'error'}> {
 if(error instanceof AnalyticsResultWindowError)return {status:'error',error:{code:'RESULT_WINDOW_INVALID',message:'This result window changed. Refresh the report.'}};
 if(error instanceof AnalyticsResultLimitError)return {status:'error',error:{code:'RESULT_LIMIT_EXCEEDED',message:'Narrow the selection to view this result within the query limit.'}};
 if(error instanceof AnalyticsQueryTimeoutError)return {status:'error',error:{code:'QUERY_TIMEOUT',message:'This selection could not be loaded within the query time limit.'}};
 return {status:'error',error:{code:'SERIES_EXECUTION_FAILED',message:'This metric is temporarily unavailable.'}};
}
