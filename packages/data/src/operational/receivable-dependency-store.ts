import type {PoolClient} from 'pg';
import type {AnalyticsCursor} from '@el-dabboos/domain';
import type {OperationalBaseline,ReceivableDependency,ReceivableDependencyContext} from './contracts.ts';
const namespace=(baseline:OperationalBaseline)=>[baseline.tenantId,baseline.sourceId,baseline.definitionVersion,baseline.mappingVersion];
/** Dependency state is usable only at the successful cursor and approved definition. */
export async function readReceivableDependencyContext(client:PoolClient,baseline:OperationalBaseline,cursor:AnalyticsCursor|null):Promise<ReceivableDependencyContext|undefined> {
 if(!baseline.mappings.some(mapping=>mapping.measures.some(rule=>rule.measureId==='net_aged_receivable')))return;
 const checkpoint=(await client.query(`SELECT cutoff FROM mart.analytics_receivable_dependency_checkpoints
 WHERE tenant_id=$1 AND source_id=$2 AND definition_version=$3 AND mapping_version=$4`,namespace(baseline))).rows[0];
 return {initialized:!!cursor&&checkpoint?.cutoff.toISOString()===cursor.cutoff,
  previousFrom:dependencies=>previousDependencyFrom(client,baseline,dependencies)};
}
async function previousDependencyFrom(client:PoolClient,baseline:OperationalBaseline,dependencies:readonly ReceivableDependency[]):Promise<string|null> {
 if(!dependencies.length)return null;
 const result=(await client.query(`SELECT min(previous.effective_from)::text earliest,
 count(*) FILTER(WHERE previous.effective_from IS NULL)::int unknown
 FROM jsonb_to_recordset($5::jsonb) changed(object text,id text)
 JOIN mart.analytics_receivable_dependencies previous ON previous.source_object=changed.object AND previous.source_record_id=changed.id
 WHERE previous.tenant_id=$1 AND previous.source_id=$2 AND previous.definition_version=$3 AND previous.mapping_version=$4`,
 [...namespace(baseline),JSON.stringify(dependencies.map(({object,id})=>({object,id})))])).rows[0];
 return result.unknown?baseline.from:result.earliest;
}
/** Called after audit and guarded cursor update, in their existing owner transaction. */
export async function writeReceivableDependencies(client:PoolClient,scope:{baseline:OperationalBaseline;runId:string;cutoff:string},dependencies:readonly ReceivableDependency[]) {
 const values=[...namespace(scope.baseline),scope.runId,scope.cutoff];
 for(let offset=0;offset<dependencies.length;offset+=1000) {
  await client.query(`INSERT INTO mart.analytics_receivable_dependencies
   (tenant_id,source_id,definition_version,mapping_version,run_id,cutoff,source_object,source_record_id,effective_from)
   SELECT $1,$2,$3,$4,$5,$6,record.object,record.id,record."from"
   FROM jsonb_to_recordset($7::jsonb) record(object text,id text,"from" date)
   ON CONFLICT(tenant_id,source_id,definition_version,mapping_version,source_object,source_record_id)
   DO UPDATE SET run_id=EXCLUDED.run_id,cutoff=EXCLUDED.cutoff,effective_from=EXCLUDED.effective_from`,
   [...values,JSON.stringify(dependencies.slice(offset,offset+1000))]);
 }
 await client.query(`INSERT INTO mart.analytics_receivable_dependency_checkpoints
  (tenant_id,source_id,definition_version,mapping_version,run_id,cutoff) VALUES($1,$2,$3,$4,$5,$6)
  ON CONFLICT(tenant_id,source_id,definition_version,mapping_version)
  DO UPDATE SET run_id=EXCLUDED.run_id,cutoff=EXCLUDED.cutoff`,values);
}
