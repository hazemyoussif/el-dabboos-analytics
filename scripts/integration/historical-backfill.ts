import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createMartPool, tenantTransaction } from '../../packages/data/src/index.ts';
import { extractHistoricalEvents } from '../../apps/api/src/historical-events.ts';
import { verifyHistoricalCheckpoint } from '../../apps/api/src/historical-months.ts';
import { historicalJobOptions } from '../../apps/api/src/historical-job-options.ts';
import { writeHistoricalCheckpoint } from './historical-checkpoint.ts';
import { extractHistoricalAging } from './historical-aging.ts';
import type { HistoricalMonth } from '../../apps/api/src/historical-events.ts';

// Retain the initial acceptance invocation without restarting its running process.
const argumentsList = process.argv.slice(2);
const { outputDirectory,periods,tenantId,retryIncomplete } = historicalJobOptions(argumentsList.length===1 && argumentsList[0]!.startsWith('/tmp/') ? ['backfill','--tenant','el-dabboos-iq','--from','2025-10-01','--to','2026-09-30','--checkpoint-dir',argumentsList[0]!] : argumentsList);
if (!process.env.MART_MIGRATOR_URL) throw new Error('Existing local mart configuration required');
await mkdir(outputDirectory,{ recursive: true,mode: 0o700 });
const operator = createMartPool(process.env.MART_MIGRATOR_URL,2);
const environment = { ...process.env,ODOO_SOURCE_STAGING_PILOT:'true',ODOO_SOURCE_BATCH_SIZE:'1000',ODOO_SOURCE_SNAPSHOT_MAX_DURATION_MS:'600000' };

async function resume(path: string, period: HistoricalMonth, kind: 'events'|'aging') {
  let prior;
  try { prior = JSON.parse(await readFile(path,'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  if (prior.month !== period.month || !prior.datasetId?.startsWith(`el-dabboos-history-${period.month.replace('-','')}-${kind}-`) || !['reconciled','passed'].includes(prior.status) || !prior.cases?.length) throw new Error('Invalid historical checkpoint');
  const evidence = await tenantTransaction(operator,'el-dabboos-iq',async client => {
    const rows = (await client.query('SELECT specification,status,group_completeness FROM mart.reconciliation_evidence WHERE tenant_id=$1 AND dataset_id=$2',['el-dabboos-iq',prior.datasetId])).rows;
    const runs = (await client.query('SELECT status,specification FROM mart.extraction_runs WHERE tenant_id=$1 AND dataset_id=$2',['el-dabboos-iq',prior.datasetId])).rows;
    return {rows,runs};
  },true);
  if (evidence.rows.length !== prior.cases.length || !evidence.runs.length || evidence.runs.some(run=>run.status!=='complete' || run.specification.from!==period.from || run.specification.to!==period.to || run.specification.frozenRevision!==prior.snapshot.frozenRevision) || evidence.rows.some(row=>row.status!=='passed' || !row.group_completeness || row.specification.from!==period.from || row.specification.to!==period.to || row.specification.expectedValue!==row.specification.actualValue || row.specification.expectedCount!==row.specification.actualCount)) throw new Error('Historical checkpoint evidence conflict');
  verifyHistoricalCheckpoint(period,prior,evidence.rows);
  console.log(JSON.stringify({month:period.month,kind,status:'resumed-reconciled',datasetId:prior.datasetId}));
  return prior;
}
async function processMonth(period: HistoricalMonth, kind: 'events'|'aging') {
  const path = join(outputDirectory,`${period.month}.${kind}.json`);
  const prior = await resume(path,period,kind);
  if (prior) return prior.status;
  const lock = await operator.connect();
  const lockKey = JSON.stringify([tenantId,period.month,kind]);
  try {
    if (!(await lock.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) acquired',[lockKey])).rows[0].acquired) throw new Error('Historical period already executing');
    // Also protect the pre-command acceptance run, which began before job locks existed.
    const unfinished = await tenantTransaction(operator,tenantId,async client => (await client.query(`SELECT specification->>'sourceAsOf' source_as_of FROM mart.extraction_runs WHERE tenant_id=$1 AND dataset_id LIKE $2 AND status='running'`,[tenantId,`el-dabboos-history-${period.month.replace('-','')}-${kind}-%`])).rows,true);
    if (unfinished.length && (!retryIncomplete || unfinished.some(row=>Date.now()-Date.parse(row.source_as_of)<720000))) throw new Error('Incomplete historical attempt retained; wait for its lease to expire, then use --retry-incomplete for this period');
    // Another operator may have finished while this job waited for its connection.
    const completed = await resume(path,period,kind);
    if (completed) return completed.status;
    return await extractPeriod(period,kind,path);
  } finally {
    await lock.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[lockKey]);
    lock.release();
  }
}
async function extractPeriod(period: HistoricalMonth, kind: 'events'|'aging',path: string) {
  const version = randomUUID().slice(0,8);
  const datasetId = `el-dabboos-history-${period.month.replace('-','')}-${kind}-${version}`;
  console.log(JSON.stringify({month:period.month,kind,status:'started',datasetId}));
  try {
    const result = kind === 'events' ? await extractHistoricalEvents({mapping:{tenantId:'el-dabboos-iq',sourceId:'el-dabboos-odoo18-pg',datasetId,mappingId:'odoo18-history-events',mappingVersion:'1',businessOwner:'Finance standing metric-design approval 2026-10-07',reportingCurrency:'IQD',timeZone:'Asia/Baghdad'},extractionId:`${datasetId}-extract`},period,environment) : await extractHistoricalAging(period,datasetId,environment);
    if (!['reconciled','passed'].includes(result.status)) throw new Error('Monthly technical reconciliation failed');
    await writeHistoricalCheckpoint(path,result);
    console.log(JSON.stringify({month:period.month,kind,status:result.status,durationMs:result.durationMs}));
    return result.status;
  } catch (error) {
    const failure = {month:period.month,kind,datasetId,status:'failed',code:(error as NodeJS.ErrnoException).code ?? 'historical_reconciliation',reason:(error as Error).message,observedAt:new Date().toISOString(),certified:false,published:false};
    await writeFile(join(outputDirectory,`${period.month}.${kind}.${version}.failed.json`),JSON.stringify(failure,null,2)+'\n',{mode:0o600,flag:'wx'});
    console.log(JSON.stringify({month:period.month,kind,status:'failed',code:failure.code,reason:failure.code==='historical_reconciliation'?failure.reason:undefined}));
    return 'failed';
  }
}
try {
  let failed = false;
  for (const period of periods) {
    for (const kind of ['events','aging'] as const) {
      try { if (await processMonth(period,kind) === 'failed') failed=true; }
      catch (error) { failed=true; console.error(JSON.stringify({month:period.month,kind,status:'blocked',reason:(error as Error).message})); }
    }
  }
  if (failed) process.exitCode=1;
} finally { await operator.end(); }
