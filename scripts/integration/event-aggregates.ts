import {validDateRange} from '../../packages/domain/src/index.ts';
import {createMartPool,migratePostgres,tenantTransaction} from '../../packages/data/src/index.ts';
import {verifyEventRange} from '../../packages/data/src/operational/aggregate-verification.ts';
import {backfillEventRollups} from '../../packages/data/src/operational/aggregate-rollups.ts';
import {planTrustedRange,trustedRangePartitions} from '../../packages/data/src/operational/range-plan.ts';
const [command,flag,tenantId,from,to,...extra]=process.argv.slice(2);
if(flag!=='--tenant'||!tenantId||extra.length||!['backfill','plan','verify'].includes(command??''))throw new Error('Use event:aggregates backfill|plan|verify --tenant TENANT [FROM TO]');
const connection=command!=='plan'?process.env.MART_MIGRATOR_URL:process.env.MART_RUNTIME_URL;
function localConnection(value:string|undefined){try{return !!value&&['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname);}catch{return false;}}
if(!localConnection(connection))throw new Error('Explicit local mart configuration required');
const pool=createMartPool(connection!,1);
try {
 if(command==='backfill'){
  if(from||to)throw new Error('Unexpected backfill range');
  await migratePostgres(pool);
  console.log(JSON.stringify(await backfillEventRollups(pool,tenantId)));
 }else{
  if(!from||!to||!validDateRange({from,to}))throw new Error('Explicit ordered dates required');
  if(command==='verify'){const proof=await verifyEventRange(pool,tenantId,{from,to});console.log(JSON.stringify(proof));if(proof.mismatches||proof.unprovedPartitions)process.exitCode=1;}
  else console.log(JSON.stringify(await tenantTransaction(pool,tenantId,async client=>planTrustedRange([{key:null,match_key:null,from,to}],await trustedRangePartitions(client,tenantId)),true)));
 }
}catch {console.error('Event aggregate operation failed; prior trusted state preserved.');process.exitCode=1;}finally{await pool.end();}
