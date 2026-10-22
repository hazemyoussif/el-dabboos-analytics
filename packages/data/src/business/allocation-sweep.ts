import type {Pool,PoolClient} from 'pg';
import type {OdooSourceConfig} from '../odoo/config.ts';
import type {OdooSnapshotLease} from '../odoo/snapshot.ts';
import type {RecordedAllocationDeletion} from '../operational/contracts.ts';

/** Separate presence checks over recorded IDs. Odoo and the polling cursor remain unchanged. */
export async function sweepBusinessAllocations(client:PoolClient,scope:{pool:Pool;config:OdooSourceConfig;lease:OdooSnapshotLease;partitionId:string;previousCutoff:string},consume:(records:readonly RecordedAllocationDeletion[])=>Promise<void>){
 const source=await scope.pool.connect();let broken=false,after='',checked=0,missing=0;
 const onError=()=>{broken=true;};source.on('error',onError);
 try{
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await scope.lease.importInto(source);
  await source.query("SELECT set_config('statement_timeout',$1,true)",[String(scope.config.statementTimeoutMs)]);
  for(;;){
   const rows=(await client.query(`SELECT id FROM (
    SELECT source_record_id id FROM mart.business_allocation_links WHERE tenant_id=$1 AND source_id=$2
    UNION SELECT payload->>'sourceRecordId' FROM mart.review_fact_population WHERE tenant_id=$1 AND partition_id=$3 AND payload->>'sourceObject'='command_allocation'
    UNION SELECT dependency.source_record_id FROM mart.analytics_receivable_dependencies dependency
     JOIN mart.analytics_baselines baseline USING(tenant_id,source_id,definition_version,mapping_version)
     WHERE dependency.tenant_id=$1 AND dependency.source_id=$2 AND dependency.source_object='account_partial_reconcile'
   ) recorded WHERE id>$4 ORDER BY id LIMIT 1000`,[scope.config.tenantId,scope.config.sourceId,scope.partitionId,after])).rows;
   if(!rows.length)break;
   const ids=rows.map(row=>String(row.id));after=ids[ids.length-1]!;
   const present=new Set((await source.query('SELECT id::text FROM account_partial_reconcile WHERE company_id=ANY($1::int[]) AND id=ANY($2::bigint[])',[scope.config.companyIds,ids])).rows.map(row=>String(row.id)));
   await scope.lease.assertAlive();checked+=ids.length;
   const removed=ids.filter(id=>!present.has(id));if(!removed.length)continue;
   await readDeletedLinks(client,{...scope,ids:removed},consume);missing+=removed.length;
  }
  return {checked,missing,coverage:'recorded-identities-only' as const};
 }finally{try{await source.query('ROLLBACK');}catch{broken=true;}finally{source.removeListener('error',onError);source.release(broken);}}
}

async function readDeletedLinks(client:PoolClient,scope:{config:OdooSourceConfig;lease:OdooSnapshotLease;previousCutoff:string;ids:readonly string[]},consume:(records:readonly RecordedAllocationDeletion[])=>Promise<void>){
 // The last observation before this member plus later accepted versions covers
 // both ends of a correction. No deleted graph is inferred from financial totals.
 await client.query(`DECLARE business_deleted_allocation_links NO SCROLL CURSOR FOR WITH previous AS (
  SELECT DISTINCT ON(source_record_id) source_record_id,effective_from,allocation_links,source_cutoff
  FROM mart.business_allocation_links WHERE tenant_id=$1 AND source_id=$2 AND source_record_id=ANY($3::text[])
   AND source_cutoff<=$4 ORDER BY source_record_id,source_cutoff DESC
 ),fallback AS (
  SELECT dependency.source_record_id,dependency.effective_from,dependency.allocation_links,dependency.allocation_links_cutoff source_cutoff
  FROM mart.analytics_receivable_dependencies dependency JOIN mart.analytics_baselines baseline USING(tenant_id,source_id,definition_version,mapping_version)
  WHERE dependency.tenant_id=$1 AND dependency.source_id=$2 AND dependency.source_object='account_partial_reconcile'
   AND dependency.source_record_id=ANY($3::text[]) AND dependency.allocation_links_cutoff<=$4
   AND NOT EXISTS(SELECT 1 FROM previous WHERE previous.source_record_id=dependency.source_record_id)
 ),roots AS (SELECT * FROM previous UNION ALL SELECT * FROM fallback),versions AS (
  SELECT * FROM roots UNION ALL SELECT source_record_id,effective_from,allocation_links,source_cutoff
  FROM mart.business_allocation_links WHERE tenant_id=$1 AND source_id=$2 AND source_record_id=ANY($3::text[])
   AND source_cutoff>$4 AND source_cutoff<=$5
 ) SELECT requested.id,evidence.effective_from::text "from",evidence.allocation_links links,evidence.source_cutoff,
  EXISTS(SELECT 1 FROM roots WHERE roots.source_record_id=requested.id) known_previous
 FROM unnest($3::text[]) requested(id) LEFT JOIN versions evidence ON evidence.source_record_id=requested.id`,
 [scope.config.tenantId,scope.config.sourceId,scope.ids,scope.previousCutoff,scope.lease.evidence.sourceAsOf]);
 try{
  for(;;){
   const rows=(await client.query('FETCH FORWARD 1000 FROM business_deleted_allocation_links')).rows;
   if(!rows.length)break;
   if(rows.some(row=>!row.known_previous||!row.links||!row.from))throw new Error('Deleted allocation lacks accepted prior links; explicit recovery required');
   await consume(rows.map(row=>({id:row.id,from:row.from,allocationLinks:row.links,
    dependencyCutoff:row.source_cutoff.toISOString(),linksCutoff:row.source_cutoff.toISOString()})));
  }
 }finally{await client.query('CLOSE business_deleted_allocation_links');}
}
