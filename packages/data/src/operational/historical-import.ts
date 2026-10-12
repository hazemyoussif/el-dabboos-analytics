import {categoricalDimensions} from '@el-dabboos/domain';
import {assertPublicationOperator} from '../postgres/release-certification.ts';
import {randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {tenantTransaction} from '../postgres/session.ts';
import {certifiedBaseline} from './certified-baseline.ts';
import {certifiedMapping} from '../postgres/mapping-releases.ts';
import {readBaseline} from './baseline.ts';
import {copyBaselineFacts} from './baseline-facts.ts';
import {refreshOperationalMonths} from './aggregates.ts';
import {assertAdoptionHeadParity} from './adoption-parity.ts';
import {monthEnd} from './receivables.ts';
export interface HistoricalImportScope {tenantId:string;month:string;datasets:readonly string[];approvalReference:string}

/** Offline, bounded publication from exact certified mart datasets, under the tenant writer lock.
 * No source reads, legacy activation, baseline mutation or cursor movement.
 */
export async function importCertifiedHistoricalMonth(pool:Pool,scope:HistoricalImportScope) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(scope.month)||!scope.approvalReference.trim()||!scope.datasets.length||scope.datasets.length>2||new Set(scope.datasets).size!==scope.datasets.length)throw new Error('Explicit bounded historical import required');
 return tenantTransaction(pool,scope.tenantId,async client=>{
  await assertPublicationOperator(client);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`analytics:${scope.tenantId}`]);
  const datasets=[...scope.datasets].sort();
  const certified=await certifiedBaseline(client,scope.tenantId,datasets);
  if(certified.from!==`${scope.month}-01`||certified.to!==monthEnd(scope.month))throw new Error('Exact complete-month certification required');
  await assertHistoricalApproval(client,{...scope,datasets});
  await assertBoundedHistoricalFacts(client,scope);
  const prior=(await client.query('SELECT * FROM mart.analytics_historical_imports WHERE tenant_id=$1 AND month=$2',[scope.tenantId,`${scope.month}-01`])).rows[0];
  if(prior){
   if(JSON.stringify(prior.datasets)!==JSON.stringify(datasets)||prior.approval_reference!==scope.approvalReference)throw new Error('Immutable historical import conflict');
   return {alreadyImported:true,revisionId:String(prior.revision_id),details:prior.details};
  }
  const parent=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1 FOR UPDATE',[scope.tenantId])).rows[0]?.revision_id;
  if(!parent)throw new Error('Existing trusted baseline required');
  const existing=(await client.query("SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$2 AND month=$3 AND family='facts'",[scope.tenantId,parent,`${scope.month}-01`])).rowCount;
  if(existing)throw new Error('Covered historical month requires correction through operational reconciliation');
  const baseline=await readBaseline(client,scope.tenantId);
  if(certified.sourceId!==baseline.sourceId||certified.reportingCurrency!==baseline.reportingCurrency||certified.mappingVersion!==baseline.mappingVersion||certified.definitionVersion!==baseline.definitionVersion)throw new Error('Historical source/currency/definition conflict');
  await assertAdoptionHeadParity(client,scope.tenantId);
  const mappings=(await client.query('SELECT * FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=ANY($2::text[])',[scope.tenantId,datasets])).rows.map(certifiedMapping);
  const began=performance.now();
  const canonicalFacts=await copyBaselineFacts(client,{...baseline,datasets},mappings,{requireExactHeads:true});
  const ingestionMs=performance.now()-began;
  await assertHistoricalFactParity(client,scope);
  const cutoff=(await client.query("SELECT max(source_as_of) cutoff FROM mart.ingestion_batches WHERE tenant_id=$1 AND dataset_id=ANY($2::text[]) AND status='committed'",[scope.tenantId,datasets])).rows[0]?.cutoff?.toISOString();
  if(!cutoff)throw new Error('Certified source cutoff required');
  const revisionId=randomUUID(),refreshStart=performance.now();
  await refreshOperationalMonths(client,{tenantId:scope.tenantId,revisionId,parent,runId:null,cutoff,purpose:'adoption',partitionCapabilities:certified.partitionCapabilities},[scope.month]);
  const promoted=await client.query('UPDATE mart.analytics_trusted_serving SET revision_id=$2 WHERE tenant_id=$1 AND revision_id=$3',[scope.tenantId,revisionId,parent]);
  if(promoted.rowCount!==1)throw new Error('Historical trusted parent conflict');
  const details={canonicalFacts,ingestionMs,refreshMs:performance.now()-refreshStart,sourceCutoff:cutoff};
  await client.query('INSERT INTO mart.analytics_historical_imports VALUES($1,$2,$3,$4,$5,$6)',[scope.tenantId,`${scope.month}-01`,datasets,scope.approvalReference,revisionId,JSON.stringify(details)]);
  return {alreadyImported:false,revisionId,details};
 },false,120000);
}
async function assertHistoricalApproval(client:PoolClient,scope:HistoricalImportScope) {
 const rows=(await client.query(`SELECT dataset_id FROM mart.release_certifications WHERE tenant_id=$1 AND dataset_id=ANY($2::text[])
 AND (reference=$3 OR starts_with(reference,$3||':')) AND specification->>'evidenceKind'='authorized_business_approval'
 AND specification->>'from'=$4 AND specification->>'to'=$5`,[scope.tenantId,scope.datasets,scope.approvalReference,`${scope.month}-01`,monthEnd(scope.month)])).rows;
 if(new Set(rows.map(row=>row.dataset_id)).size!==scope.datasets.length)throw new Error('Matching explicit historical business approval required');
}
/** Exact full tuples detect extra/missing identities and conflicting current heads, not just totals. */
async function assertHistoricalFactParity(client:PoolClient,scope:HistoricalImportScope) {
 const mismatch=await client.query(`WITH expected AS (
 SELECT measure_id,kind,business_date,jsonb_strip_nulls(jsonb_build_object(${categoricalDimensions.map(dimension=>`'${dimension}',${dimension}`).join(',')})) dimensions,sum(value) value,count(*) fact_count
 FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=ANY($2::text[]) AND status='active'
 AND business_date>=$3::date AND business_date<=$4::date GROUP BY 1,2,3,4), actual AS (
 SELECT head.measure_id,payload->>'kind' kind,(payload->>'businessDate')::date business_date,payload->'dimensions' dimensions,sum((payload->>'value')::numeric) value,count(*) fact_count
 FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.status='active' AND head.business_month=left($3::text,7) GROUP BY 1,2,3,4)
 SELECT 1 FROM ((SELECT * FROM expected EXCEPT SELECT * FROM actual) UNION ALL (SELECT * FROM actual EXCEPT SELECT * FROM expected)) difference LIMIT 1`,[scope.tenantId,scope.datasets,`${scope.month}-01`,monthEnd(scope.month)]);
 if(mismatch.rowCount)throw new Error('Historical canonical heads differ from exact certified month');
}

async function assertBoundedHistoricalFacts(client:PoolClient,scope:HistoricalImportScope){
 const outside=await client.query('SELECT 1 FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=ANY($2::text[]) AND (business_date<$3::date OR business_date>$4::date) LIMIT 1',[scope.tenantId,scope.datasets,`${scope.month}-01`,monthEnd(scope.month)]);
 if(outside.rowCount)throw new Error('Historical dataset contains facts outside the certified month');
}
