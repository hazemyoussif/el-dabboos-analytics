import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createMartPool} from '../../packages/data/src/postgres/session.ts';
import {importCertifiedHistoricalMonth} from '../../packages/data/src/operational/historical-import.ts';
import {historicalJobOptions} from '../../apps/api/src/historical-job-options.ts';
import {assertHostedMartUrl} from '../../apps/api/src/hosted-mart-url.ts';
const {periods,tenantId,outputDirectory}=historicalJobOptions(process.argv.slice(2));
const approval=JSON.parse(await readFile(join(outputDirectory,'business-approval.json'),'utf8')) as {reference:string};
if(!approval.reference?.trim())throw new Error('Existing explicit business approval required');
const mart=createMartPool(assertHostedMartUrl(process.env.MART_MIGRATOR_URL,process.env,'Protected publication configuration required'),1);
try {
 for(const period of periods){
  const datasets:string[]=[];
  for(const kind of ['events','aging']){
   const checkpoint=JSON.parse(await readFile(join(outputDirectory,`${period.month}.${kind}.json`),'utf8'));
   if(checkpoint.month!==period.month||!['passed','reconciled'].includes(checkpoint.status)||!checkpoint.datasetId?.startsWith(`el-dabboos-history-${period.month.replace('-','')}-${kind}-`))throw new Error('Exact monthly checkpoint required');
   datasets.push(checkpoint.datasetId);
  }
  const start=performance.now();
  console.log(JSON.stringify({month:period.month,stage:'certified-import',status:'started'}));
  const result=await importCertifiedHistoricalMonth(mart,{tenantId,month:period.month,datasets,approvalReference:approval.reference});
  console.log(JSON.stringify({month:period.month,status:result.alreadyImported?'resumed-imported':'trusted',...result,durationMs:performance.now()-start}));
 }
}finally{await mart.end();}
