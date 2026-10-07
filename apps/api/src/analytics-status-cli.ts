import type { AnalyticsPartition } from '@el-dabboos/domain';
import { executeAnalyticsJob } from './analytics-jobs.ts';
import { createMartPool, PostgresOperationalStatus, verifyMartRuntimeRole } from '@el-dabboos/data';

async function main() {
  const [command,flag,tenantId,...extra]=process.argv.slice(2);
  if(flag!=='--tenant'||!tenantId?.trim())throw new Error('Explicit tenant required');
  if(command!=='status'){
    if(extra.length && (extra.length!==2||extra[0]!=='--mode'))throw new Error('Invalid analytics job flags');
    const began=performance.now();const result=await executeAnalyticsJob(command??'',tenantId,extra[1],process.env);
    process.stdout.write(`${JSON.stringify({result:operatorResult(result),durationMs:performance.now()-began})}\n`);
    if('run' in result&&result.run.status==='failed')process.exitCode=1;return;
  }
  if(extra.length)throw new Error('Unexpected status flags');
  const connection=process.env.MART_RUNTIME_URL;
  if(!connection || !['localhost','127.0.0.1','[::1]'].includes(new URL(connection).hostname))throw new Error('Local read-only mart configuration required');
  const target=Number(process.env.ANALYTICS_FRESHNESS_TARGET_SECONDS ?? '600');
  const pool=createMartPool(connection,1);
  try {
    await verifyMartRuntimeRole(pool);
    process.stdout.write(`${JSON.stringify(await new PostgresOperationalStatus(pool,target).status(tenantId))}\n`);
  }finally{await pool.end();}
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
