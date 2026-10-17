import {executeAnalyticsPreparation,isAnalyticsPreparationCommand} from './analytics-preparation.ts';
import {assertAnalyticsScheduleReady} from './analytics-schedule-status.ts';
import {exposeAnalyticsReview} from './analytics-review-exposure.ts';
import type { AnalyticsPartition } from '@el-dabboos/domain';
import { executeAnalyticsJob } from './analytics-jobs.ts';
import { createMartPool, PostgresOperationalStatus, verifyMartRuntimeRole } from '@el-dabboos/data';
import { assertHostedMartUrl } from './hosted-mart-url.ts';

async function main() {
  const [command,flag,tenantId,...extra]=process.argv.slice(2);
  if(flag!=='--tenant'||!tenantId?.trim())throw new Error('Explicit tenant required');
  if(isAnalyticsPreparationCommand(command)){process.stdout.write(JSON.stringify(await executeAnalyticsPreparation(command,tenantId,extra,process.env))+'\n');return;}
  if(command==='expose'||command==='expose-business'){await exposeCommand(tenantId,extra,command==='expose-business'?'business':'review');return;}
  if(command==='status'||command==='verify-schedule'){await readAnalyticsStatus(command,tenantId,extra);return;}
  if(extra.length && (extra.length!==2||extra[0]!=='--mode'))throw new Error('Invalid analytics job flags');
  const began=performance.now();const result=await executeAnalyticsJob(command??'',tenantId,extra[1],process.env);
  process.stdout.write(`${JSON.stringify({result:operatorResult(result),durationMs:performance.now()-began})}\n`);
  if('run' in result&&result.run.status==='failed')process.exitCode=1;
}
async function readAnalyticsStatus(command:string,tenantId:string,extra:string[]) {
  if(extra.length&&(command!=='verify-schedule'||extra.length!==1||extra[0]!=='--require-fresh'))throw new Error('Unexpected status flags');
  const connection=assertHostedMartUrl(process.env.MART_RUNTIME_URL,process.env,'Local read-only mart configuration required');
  const target=Number(process.env.ANALYTICS_FRESHNESS_TARGET_SECONDS ?? '600');
  const pool=createMartPool(connection,1);
  try {
    await verifyMartRuntimeRole(pool);
    const status=await new PostgresOperationalStatus(pool,target).status(tenantId);
    if(command==='verify-schedule')assertAnalyticsScheduleReady(status,extra[0]==='--require-fresh');
    process.stdout.write(`${JSON.stringify(status)}\n`);
  }finally{await pool.end();}
}
async function exposeCommand(tenantId:string,extra:string[],family:'review'|'business'){
 if(extra.length!==2||extra[0]!=='--month'||!extra[1])throw new Error('Usage: analytics expose --tenant ID --month YYYY-MM');
 process.stdout.write(`${JSON.stringify(await exposeAnalyticsReview(tenantId,extra[1],process.env,family))}\n`);
}
function operatorResult(result:Awaited<ReturnType<typeof executeAnalyticsJob>>) {
  if(!('run' in result))return result;
  const {partitions,...details}=result.details,scope=partitions as AnalyticsPartition[];
  return {...result,details:{...details,affectedPartitionCount:scope.length,affectedMonths:[...new Set(scope.map(partition=>partition.month))].sort(),affectedMetrics:[...new Set(scope.map(partition=>partition.metric))].sort(),affectedDimensions:[...new Set(scope.flatMap(partition=>partition.dimension?[partition.dimension]:[]))].sort()}};
}
try {await main();}catch {
  process.stderr.write('Analytics operation unavailable. Check local runtime configuration and explicit mart migrations.\n');
  process.exitCode=1;
}
