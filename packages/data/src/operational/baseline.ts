import { randomUUID } from 'node:crypto';
import type { Pool,PoolClient } from 'pg';
import type { SourceMapping,PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { operationalDefinitionVersion } from './definition-version.ts';
import { tenantTransaction } from '../postgres/session.ts';
import { readHistoricalCollection } from '../postgres/historical-collection.ts';
import { storeAnchorCapabilities } from './anchor.ts';
import { certifiedMapping } from '../postgres/mapping-releases.ts';
import { recordOperationalRun,writeOperationalCursor } from '../postgres/operational-evidence.ts';
import { copyBaselineFacts } from './baseline-facts.ts';
import { refreshOperationalMonths } from './aggregates.ts';
import type { OperationalBaseline } from './contracts.ts';
export async function readBaseline(client:PoolClient,tenantId:string):Promise<OperationalBaseline> {
 const row=(await client.query('SELECT *,period_from::text AS period_from,period_to::text AS period_to FROM mart.analytics_baselines WHERE tenant_id=$1',[tenantId])).rows[0];
 if(!row)throw new Error('Explicit certified operational bootstrap required');
 if(row.definition_version!==operationalDefinitionVersion())throw new Error('Explicit metric-definition migration required');
 return {tenantId,sourceId:row.source_id,reportingCurrency:row.reporting_currency,datasets:row.datasets,mappingVersion:row.mapping_version,definitionVersion:row.definition_version,mappings:row.specification,capabilities:row.capabilities,from:date(row.period_from),to:date(row.period_to)};
}
const date=(value:Date|string)=>value instanceof Date?value.toISOString().slice(0,10):value;
/** Publication-operator bootstrap validates existing proof once, before installing stored serving. */
export async function bootstrapOperationalServing(pool:Pool,tenantId:string) {
 const anchor=await storeAnchorCapabilities(pool,tenantId);
 if(await tenantTransaction(pool,tenantId,async client=>(await client.query('SELECT 1 FROM mart.analytics_baselines WHERE tenant_id=$1',[tenantId])).rowCount!==0,true))return {alreadyBootstrapped:true};
 const context={tenantId,locale:'en' as const};
 const history=await readHistoricalCollection(pool,context);
 const capabilities:PublishedAnalyticsCapabilities=history?{tenantId,mode:'certified',releases:[history.release]}:anchor;
 const datasets=[...new Set(history?history.members.map(member=>member.datasetId):anchor.releases.map(release=>release.datasetId))];
 return tenantTransaction(pool,tenantId,async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`analytics:${tenantId}`]);
  if((await client.query('SELECT 1 FROM mart.analytics_baselines WHERE tenant_id=$1',[tenantId])).rowCount)return {alreadyBootstrapped:true};
  const mappings=(await client.query('SELECT * FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=ANY($2::text[]) ORDER BY dataset_id',[tenantId,datasets])).rows.map(certifiedMapping);
  const baseline=createBaseline(tenantId,datasets,mappings,capabilities);
  await client.query('INSERT INTO mart.analytics_baselines VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[tenantId,baseline.sourceId,baseline.reportingCurrency,datasets,baseline.definitionVersion,baseline.mappingVersion,JSON.stringify(baseline.mappings),JSON.stringify(capabilities),baseline.from,baseline.to]);
  const canonicalFacts=await copyBaselineFacts(client,baseline,mappings);
  const cutoff=(await client.query("SELECT min(source_as_of) cutoff FROM mart.ingestion_batches WHERE tenant_id=$1 AND dataset_id=ANY($2::text[]) AND status='committed'",[tenantId,datasets])).rows[0].cutoff?.toISOString();
  if(!cutoff)throw new Error('Certified baseline cutoff required');
  const months=(await client.query("SELECT to_char(period_start,'YYYY-MM') AS period FROM generate_series($1::date,$2::date,interval '1 month') AS period_start",[baseline.from,baseline.to])).rows.map(row=>String(row.period));
  const revisionId=randomUUID();await refreshOperationalMonths(client,{tenantId,revisionId,parent:null,runId:null,cutoff},months);
  await client.query('INSERT INTO mart.analytics_trusted_serving VALUES($1,$2)',[tenantId,revisionId]);
  await bootstrapCursor(client,baseline,revisionId,cutoff);
  return {alreadyBootstrapped:false,revisionId,cutoff,canonicalFacts,months};
 });
}
function createBaseline(tenantId:string,datasets:string[],mappings:SourceMapping[],capabilities:PublishedAnalyticsCapabilities):OperationalBaseline {
 const first=mappings[0]!;if(!first||mappings.some(mapping=>mapping.sourceId!==first.sourceId||mapping.reportingCurrency!==first.reportingCurrency))throw new Error('Single approved source/currency required');
 const unique=[...new Map(mappings.map(mapping=>[JSON.stringify(mapping.measures),mapping])).values()];
 const versions=[...new Set(unique.map(mapping=>mapping.mappingVersion))];if(versions.length!==1)throw new Error('One operational mapping version required');
 const period=capabilities.releases[0]?.period;if(!period)throw new Error('Explicit certified coverage required');
 return {tenantId,datasets,sourceId:first.sourceId,reportingCurrency:first.reportingCurrency,mappingVersion:versions[0]!,definitionVersion:operationalDefinitionVersion(),mappings:unique,capabilities,from:period.from,to:period.to};
}
async function bootstrapCursor(client:PoolClient,baseline:OperationalBaseline,revisionId:string,cutoff:string) {
 const runId=`bootstrap:${randomUUID()}`,now=new Date().toISOString();
 await recordOperationalRun(client,{tenantId:baseline.tenantId,runId,kind:'sync',actorId:'publication-operator',trigger:'operator',sourceCutoff:cutoff,sourceRevision:'certified-baseline',mappingVersion:baseline.mappingVersion,definitionVersion:baseline.definitionVersion,startedAt:now,completedAt:now,status:'unchanged',recordsChanged:0,partitionsAffected:0,caseCount:0,mismatchCount:0,evidenceHash:'no-changes',servingRelease:revisionId},[]);
 await writeOperationalCursor(client,{tenantId:baseline.tenantId,runId,cursor:{cutoff,objects:{}}});
}
