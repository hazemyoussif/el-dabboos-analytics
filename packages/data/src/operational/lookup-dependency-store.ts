import type {PoolClient} from 'pg';
import type {AnalyticsCursor} from '@el-dabboos/domain';
import type {OdooLookupDependency} from '../odoo/lookup-types.ts';
import type {OperationalBaseline,LookupDependencyContext,LookupDependencyUpdate} from './contracts.ts';
const namespace=(baseline:OperationalBaseline)=>[baseline.tenantId,baseline.sourceId,baseline.definitionVersion,baseline.mappingVersion];
export async function readLookupDependencyContext(client:PoolClient,baseline:OperationalBaseline,cursor:AnalyticsCursor|null):Promise<LookupDependencyContext|undefined> {
 if(!baseline.mappings.some(mapping=>mapping.measures.some(rule=>rule.sourceObject==='sale_order'||rule.sourceObject==='account_move')))return;
 const checkpoint=(await client.query(`SELECT cutoff,projection_version FROM mart.analytics_lookup_dependency_checkpoints
 WHERE tenant_id=$1 AND source_id=$2 AND definition_version=$3 AND mapping_version=$4`,namespace(baseline))).rows[0];
 if(checkpoint&&(!cursor||checkpoint.cutoff.toISOString()!==cursor.cutoff))throw new Error('Lookup checkpoint conflicts with accepted cursor');
 return {initialized:!!cursor&&checkpoint?.cutoff.toISOString()===cursor.cutoff,projectionVersion:checkpoint?.projection_version??null,
  changed:dependencies=>changedLookupDependencies(client,baseline,dependencies)};
}
async function changedLookupDependencies(client:PoolClient,baseline:OperationalBaseline,dependencies:readonly OdooLookupDependency[]):Promise<readonly OdooLookupDependency[]> {
 if(!dependencies.length)return [];
 const result=await client.query(`SELECT incoming.object,incoming.id,incoming.fingerprint
 FROM jsonb_to_recordset($5::jsonb) incoming(object text,id text,fingerprint text)
 LEFT JOIN mart.analytics_lookup_dependencies previous ON previous.tenant_id=$1 AND previous.source_id=$2
 AND previous.definition_version=$3 AND previous.mapping_version=$4 AND previous.source_object=incoming.object AND previous.source_record_id=incoming.id
 WHERE previous.fingerprint IS DISTINCT FROM incoming.fingerprint`,[...namespace(baseline),JSON.stringify(dependencies)]);
 return result.rows as OdooLookupDependency[];
}
/** Same audit/cursor transaction as facts and receivables; metadata stays ingestor-only. */
export async function writeLookupDependencies(client:PoolClient,scope:{baseline:OperationalBaseline;runId:string;cutoff:string},update:LookupDependencyUpdate) {
 const values=[...namespace(scope.baseline),scope.runId,scope.cutoff];
 for(let offset=0;offset<update.dependencies.length;offset+=1000) {
  await client.query(`INSERT INTO mart.analytics_lookup_dependencies
   (tenant_id,source_id,definition_version,mapping_version,run_id,cutoff,source_object,source_record_id,fingerprint)
   SELECT $1,$2,$3,$4,$5,$6,record.object,record.id,record.fingerprint
   FROM jsonb_to_recordset($7::jsonb) record(object text,id text,fingerprint text)
   ON CONFLICT(tenant_id,source_id,definition_version,mapping_version,source_object,source_record_id)
   DO UPDATE SET run_id=EXCLUDED.run_id,cutoff=EXCLUDED.cutoff,fingerprint=EXCLUDED.fingerprint`,[...values,JSON.stringify(update.dependencies.slice(offset,offset+1000))]);
 }
 await client.query(`INSERT INTO mart.analytics_lookup_dependency_checkpoints
  (tenant_id,source_id,definition_version,mapping_version,run_id,cutoff,projection_version) VALUES($1,$2,$3,$4,$5,$6,$7)
  ON CONFLICT(tenant_id,source_id,definition_version,mapping_version)
  DO UPDATE SET run_id=EXCLUDED.run_id,cutoff=EXCLUDED.cutoff,projection_version=EXCLUDED.projection_version`,[...values,update.projectionVersion]);
}
