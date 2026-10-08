import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createMartPool,tenantTransaction} from '../../packages/data/src/index.ts';
import {PostgresHistoricalPublication} from '../../packages/data/src/postgres/historical-publication.ts';
import type {HistoricalServingManifest} from '../../packages/data/src/postgres/historical-publication.ts';
import {historicalJobOptions} from '../../apps/api/src/historical-job-options.ts';
import {writeHistoricalCheckpoint} from './historical-checkpoint.ts';
const {periods,tenantId,outputDirectory}=historicalJobOptions(process.argv.slice(2));
if (!process.env.MART_PUBLICATION_TARGET_URL) throw new Error('Existing local target mart configuration required');
const approval=JSON.parse(await readFile(join(outputDirectory,'business-approval.json'),'utf8'));
const members:HistoricalServingManifest['members'][number][]=[];
for (const period of periods) for (const kind of ['events','aging'] as const) {
  const checkpoint=JSON.parse(await readFile(join(outputDirectory,`${period.month}.${kind}.json`),'utf8'));
  const receipt=JSON.parse(await readFile(join(outputDirectory,`${period.month}.${kind}.publication.json`),'utf8'));
  if (receipt.datasetId!==checkpoint.datasetId || receipt.reference!==`${approval.reference}:${period.month}:${kind}`) throw new Error('Complete authorized monthly publication receipts required');
  members.push({datasetId:checkpoint.datasetId,from:period.from,to:period.to,kind,fingerprint:receipt.promotion.fingerprint});
}
const target=createMartPool(process.env.MART_PUBLICATION_TARGET_URL,1);
try {
  // Existing positive proof cache is transactional and invalidated by all mutable input writes.
  for (const member of members) await tenantTransaction(target,tenantId,client=>client.query('SELECT mart.refresh_proof_results($1,$2)',[tenantId,member.datasetId]),false,120000);
  const from=periods[0]!.from,to=periods.at(-1)!.to,reference=`el-dabboos-history-${from.slice(0,7).replace('-','')}-${to.slice(0,7).replace('-','')}-v1`;
  const result=await new PostgresHistoricalPublication(target).activate({tenantId,reference,anchorDatasetId:'el-dabboos-finance-202609-v6',from,to,approvalReference:approval.reference,members});
  console.log(JSON.stringify({status:'historical-serving-active',...result,months:periods.length}));
  if (!result.alreadyBound) await writeHistoricalCheckpoint(join(outputDirectory,'historical-serving.json'),{...result,from,to,months:periods.length,members,approvalReference:approval.reference});
} finally {await target.end();}
