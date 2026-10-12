import { adoptCertifiedServing } from './adoption.ts';
import { randomUUID } from 'node:crypto';
import type { Pool,PoolClient } from 'pg';
import { operationalDefinitionVersion } from './definition-version.ts';
import { tenantTransaction } from '../postgres/session.ts';
import { recordOperationalRun,writeOperationalCursor } from '../postgres/operational-evidence.ts';
import type { OperationalBaseline } from './contracts.ts';
export async function readBaseline(client:PoolClient,tenantId:string):Promise<OperationalBaseline> {
 const row=(await client.query('SELECT *,period_from::text AS period_from,period_to::text AS period_to FROM mart.analytics_baselines WHERE tenant_id=$1',[tenantId])).rows[0];
 if(!row)throw new Error('Explicit certified operational bootstrap required');
 if(row.definition_version!==operationalDefinitionVersion())throw new Error('Explicit metric-definition migration required');
 return {tenantId,sourceId:row.source_id,reportingCurrency:row.reporting_currency,datasets:row.datasets,mappingVersion:row.mapping_version,definitionVersion:row.definition_version,mappings:row.specification,capabilities:row.capabilities,from:date(row.period_from),to:date(row.period_to)};
}
const date=(value:Date|string)=>value instanceof Date?value.toISOString().slice(0,10):value;
/** Initialize directly from certified mart evidence, with no historical activation or anchor. */
export async function bootstrapOperationalServing(pool:Pool,tenantId:string) {
 return tenantTransaction(pool,tenantId,async client=>{
  const result=await adoptCertifiedServing(client,tenantId);
  if(!result.alreadyBootstrapped)await bootstrapCursor(client,await readBaseline(client,tenantId),result.revisionId!,result.cutoff!);
  return result;
 },false,120000);
}
async function bootstrapCursor(client:PoolClient,baseline:OperationalBaseline,revisionId:string,cutoff:string) {
 const runId=`bootstrap:${randomUUID()}`,now=new Date().toISOString();
 await recordOperationalRun(client,{tenantId:baseline.tenantId,runId,kind:'sync',actorId:'publication-operator',trigger:'operator',sourceCutoff:cutoff,sourceRevision:'certified-baseline',mappingVersion:baseline.mappingVersion,definitionVersion:baseline.definitionVersion,startedAt:now,completedAt:now,status:'unchanged',recordsChanged:0,partitionsAffected:0,caseCount:0,mismatchCount:0,evidenceHash:'no-changes',servingRelease:revisionId},[]);
 await writeOperationalCursor(client,{tenantId:baseline.tenantId,runId,cursor:{cutoff,objects:{}}});
}
