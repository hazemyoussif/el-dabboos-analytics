import { createMartPool, PostgresOperationalStatus, verifyMartRuntimeRole } from '@el-dabboos/data';

async function main() {
  const [command,flag,tenantId,...extra]=process.argv.slice(2);
  if(command!=='status' || flag!=='--tenant' || !tenantId?.trim() || extra.length)throw new Error('Usage: analytics status --tenant tenant-id');
  const connection=process.env.MART_RUNTIME_URL;
  if(!connection || !['localhost','127.0.0.1','[::1]'].includes(new URL(connection).hostname))throw new Error('Local read-only mart configuration required');
  const target=Number(process.env.ANALYTICS_FRESHNESS_TARGET_SECONDS ?? '600');
  const pool=createMartPool(connection,1);
  try {
    await verifyMartRuntimeRole(pool);
    process.stdout.write(`${JSON.stringify(await new PostgresOperationalStatus(pool,target).status(tenantId))}\n`);
  }finally{await pool.end();}
}
try {await main();}catch {
  process.stderr.write('Analytics status unavailable. Check local runtime configuration and explicit mart migrations.\n');
  process.exitCode=1;
}
