import {createOdooSourcePool,OdooSnapshotLease} from '../../packages/data/src/index.ts';
import {readHistoricalSourceInventory} from '../../packages/data/src/odoo/history-inventory.ts';
import {resolveOdooSourceConfig} from '../../apps/api/src/source-connections.ts';
const config=await resolveOdooSourceConfig(process.env,{tenantId:'el-dabboos-iq',sourceId:'el-dabboos-odoo18-pg'});
const owner=createOdooSourcePool(config),reader=createOdooSourcePool(config);
try {
 const lease=await OdooSnapshotLease.open(owner,config,config.snapshotMaxDurationMs,config.credentialPolicy);
 try {console.log(JSON.stringify(await readHistoricalSourceInventory(reader,lease,config,'Asia/Baghdad')));}
 finally{await lease.close();}
}finally{await Promise.all([owner.end(),reader.end()]);}
