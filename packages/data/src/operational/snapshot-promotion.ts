import {prepareActivatedPublication} from '../prepared/publication.ts';
import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
export async function attachFinancePartition(client:PoolClient,scope:{tenantId:string;revisionId:string;snapshotId:string;date:string}) {
 const partitionId=randomUUID(),month=scope.date.slice(0,7)+'-01';
 await client.query("INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,family,snapshot_id) VALUES($1,$2,$3,'receivables',$4)",[scope.tenantId,partitionId,month,scope.snapshotId]);
 await client.query("INSERT INTO mart.analytics_serving_members(tenant_id,revision_id,month,partition_id,family) VALUES($1,$2,$3,$4,'receivables')",[scope.tenantId,scope.revisionId,month,partitionId]);
}
/** Shares the operational tenant lock, parent CAS and atomic trusted pointer. */
export async function promoteFinancePartition(client:PoolClient,scope:{tenantId:string;snapshotId:string;date:string;cutoff:string}) {
 const parent=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1 FOR UPDATE',[scope.tenantId])).rows[0]?.revision_id;
 if(!parent)throw new Error('Trusted baseline required for snapshot promotion');
 const revisionId=randomUUID(),month=scope.date.slice(0,7)+'-01';
 await client.query("INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose) VALUES($1,$2,$3,$4,$5,'snapshot')",[scope.tenantId,revisionId,parent,scope.cutoff,[month]]);
 await client.query("INSERT INTO mart.analytics_serving_members SELECT tenant_id,$2,month,partition_id,family FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$3 AND NOT(family='receivables' AND month=$4)",[scope.tenantId,revisionId,parent,month]);
 await attachFinancePartition(client,{...scope,revisionId});
 await prepareActivatedPublication(client,{tenantId:scope.tenantId,revisionId});
 const promoted=await client.query('UPDATE mart.analytics_trusted_serving SET revision_id=$2 WHERE tenant_id=$1 AND revision_id=$3',[scope.tenantId,revisionId,parent]);
 if(promoted.rowCount!==1)throw new Error('Trusted snapshot parent conflict');
 return revisionId;
}
