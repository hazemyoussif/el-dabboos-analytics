import {createMartPool,createOdooSourcePool,OdooSnapshotLease,migratePostgres,tenantTransaction} from '../../packages/data/src/index.ts';
import {resolveOdooSourceConfig} from '../../apps/api/src/source-connections.ts';
import {historicalJobOptions} from '../../apps/api/src/historical-job-options.ts';
const {tenantId,periods}=historicalJobOptions(process.argv.slice(2));
import {readFinanceCustomers} from '../../packages/data/src/operational/finance-source.ts';
import {publishFinanceSnapshot} from '../../packages/data/src/operational/finance-publication.ts';
import {readFinanceCompanySummary} from '../../packages/data/src/operational/finance-source.ts';
if(!process.env.MART_MIGRATOR_URL)throw new Error('Protected publication operator configuration required');
const mart=createMartPool(process.env.MART_MIGRATOR_URL,1);
const config=await resolveOdooSourceConfig(process.env,{tenantId,sourceId:'el-dabboos-odoo18-pg'});
const owner=createOdooSourcePool(config),source=createOdooSourcePool(config);
try {
 await migratePostgres(mart);
 for(const period of periods){
  const existing=await tenantTransaction(mart,tenantId,async client=>(await client.query('SELECT snapshot_id FROM mart.trusted_finance_snapshots WHERE tenant_id=$1 AND snapshot_date=$2',[tenantId,period.to])).rows[0],true);
  if(existing){console.log(JSON.stringify({date:period.to,status:'already-published',snapshotId:existing.snapshot_id}));continue;}
  const lease=await OdooSnapshotLease.open(owner,config,config.snapshotMaxDurationMs,config.credentialPolicy);
  const started=performance.now();
  try {
   const customers=await readFinanceCustomers(source,lease,config,period.to);
   const totals=await readFinanceCompanySummary(source,lease,config,period.to);
   await lease.assertAlive();
   const result=await publishFinanceSnapshot(mart,{tenantId,date:period.to,currency:'IQD',sourceCutoff:lease.evidence.sourceAsOf,sourceRevision:lease.evidence.frozenRevision,totals,customers},()=>lease.assertAlive());
   console.log(JSON.stringify({date:period.to,status:'published',customers:customers.length,snapshotId:result.snapshotId,sourceCutoff:lease.evidence.sourceAsOf,elapsedMs:Math.round(performance.now()-started)}));
  }finally{await lease.close();}
 }
}finally{await Promise.all([mart.end(),owner.end(),source.end()]);}
