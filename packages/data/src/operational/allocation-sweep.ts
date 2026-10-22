import type {PoolClient} from 'pg';
import type {OperationalBaseline,OperationalSnapshot,RecordedAllocationDeletion} from './contracts.ts';

/** Separate presence sweep. No source audit assumptions and no historical import.
 * The existing tenant transaction/analytics lock owns this read. Dependency dates
 * are retained even when their source allocation no longer exists.
 */
export async function sweepRecordedAllocations(client:PoolClient,baseline:OperationalBaseline,source:OperationalSnapshot,onMissing?:(records:readonly RecordedAllocationDeletion[])=>Promise<void>){
 const evidence={checked:0,missing:0,affectedFrom:null as string|null,coverage:'recorded-identities-only' as const};
 for await(const page of source.presence('account_partial_reconcile',allocationIdentityPages(client,baseline))){
  const present=new Set(page.present),requested=new Set(page.ids);
  if(page.present.some(id=>!requested.has(id)))throw new Error('Allocation presence response outside requested scope');
  evidence.checked+=page.ids.length;
  const missing=page.ids.filter(id=>!present.has(id));
  if(!missing.length)continue;
  const records=(await client.query(`SELECT source_record_id id,effective_from::text "from",
   allocation_links "allocationLinks",cutoff,allocation_links_cutoff
   FROM mart.analytics_receivable_dependencies
   WHERE tenant_id=$1 AND source_id=$2 AND definition_version=$3 AND mapping_version=$4
   AND source_object='account_partial_reconcile' AND source_record_id=ANY($5::text[])`,[...namespace(baseline),missing])).rows;
  if(records.length!==missing.length||records.some(record=>!record.from))throw new Error('Deleted allocation lacks a retained footprint; explicit recovery required');
  const deletions:RecordedAllocationDeletion[]=records.map(record=>({id:record.id,from:record.from,allocationLinks:record.allocationLinks,
   dependencyCutoff:record.cutoff.toISOString(),linksCutoff:record.allocation_links_cutoff?.toISOString()??null}));
  if(onMissing)await onMissing(deletions);
  evidence.missing+=missing.length;
  for(const record of deletions)if(!evidence.affectedFrom||record.from<evidence.affectedFrom)evidence.affectedFrom=record.from;
 }
 return evidence;
}
async function* allocationIdentityPages(client:PoolClient,baseline:OperationalBaseline){
 let after='';
 for(;;){
  const rows=(await client.query(`SELECT source_record_id FROM mart.analytics_receivable_dependencies
   WHERE tenant_id=$1 AND source_id=$2 AND definition_version=$3 AND mapping_version=$4
   AND source_object='account_partial_reconcile' AND source_record_id>$5
   ORDER BY source_record_id LIMIT 1000`,[...namespace(baseline),after])).rows;
  if(!rows.length)return;
  const ids=rows.map(row=>String(row.source_record_id));after=ids[ids.length-1]!;yield ids;
 }
}
function namespace(baseline:OperationalBaseline){return [baseline.tenantId,baseline.sourceId,baseline.definitionVersion,baseline.mappingVersion];}
