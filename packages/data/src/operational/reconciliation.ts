import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { AnalyticsPartition,OperationalReconciliation } from '@el-dabboos/domain';
import type { ExactControl,OperationalSnapshot } from './contracts.ts';
const exactCaseWriteLimit=1000;
export interface PersistedExactCase {id:string;control:ExactControl;actualValue:string;actualCount:string}
export async function compareCandidate(client:PoolClient,tenantId:string,controls:readonly ExactControl[],candidate=false):Promise<PersistedExactCase[]> {
 const groups=new Map<string,ExactControl[]>();
 for(const control of controls){const key=JSON.stringify([control.partition.month,control.partition.dimension,control.measure]);const group=groups.get(key)??[];group.push(control);groups.set(key,group);}
 const cases:PersistedExactCase[]=[];
 for(const group of groups.values())cases.push(...await compareGroup(client,tenantId,group,candidate));
 return cases;
}
async function compareGroup(client:PoolClient,tenantId:string,controls:ExactControl[],candidate:boolean):Promise<PersistedExactCase[]> {
 const {partition,measure}=controls[0]!;
 const grouping=partition.dimension?'payload->\'dimensions\'->>$4':'NULL::text';
 const group=partition.dimension?`AND ${grouping}=ANY($5::text[]) GROUP BY ${grouping}`:'AND $4::text IS NULL AND $5::text[] IS NULL';
 const rows=(await client.query(`SELECT ${grouping} key,coalesce(sum((payload->>'value')::numeric),0)::numeric(30,6)::text value,count(*)::text count
 FROM mart.${candidate?'analytics_working_heads':'analytics_fact_heads'} head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.status='active' AND head.measure_id=$2 AND head.business_month=$3 ${group}`,[tenantId,measure,partition.month,partition.dimension,partition.dimension?controls.map(control=>control.partition.identity):null])).rows;
 const values=new Map(rows.map(row=>[row.key,row]));
 return controls.map(control=>({id:randomUUID(),control,actualValue:values.get(control.partition.identity)?.value??'0.000000',actualCount:values.get(control.partition.identity)?.count??'0'}));
}

export async function persistExactCases(client:PoolClient,tenantId:string,source:Pick<OperationalSnapshot,'cutoff'|'revision'|'mappingVersion'|'definitionVersion'>,cases:readonly PersistedExactCase[]):Promise<OperationalReconciliation> {
 for(let offset=0;offset<cases.length;offset+=exactCaseWriteLimit) {
  const page=cases.slice(offset,offset+exactCaseWriteLimit).map(item=>({id:item.id,partition:item.control.partition,measure:item.control.measure,expectedValue:item.control.value,actualValue:item.actualValue,expectedCount:item.control.count,actualCount:item.actualCount}));
  await client.query(`INSERT INTO mart.analytics_exact_cases(tenant_id,case_id,source_cutoff,source_revision,mapping_version,definition_version,partition,measure_id,expected_value,actual_value,expected_count,actual_count)
   SELECT $1,record.id,$2::timestamptz,$3,$4,$5,record.partition,record.measure,record."expectedValue",record."actualValue",record."expectedCount",record."actualCount"
   FROM jsonb_to_recordset($6::jsonb) record(id text,partition jsonb,measure text,"expectedValue" numeric,"actualValue" numeric,"expectedCount" bigint,"actualCount" bigint)`,[tenantId,source.cutoff,source.revision,source.mappingVersion,source.definitionVersion,JSON.stringify(page)]);
 }
 return exactCaseEvidence(client,tenantId,cases.map(item=>item.id));
}
export async function exactCaseEvidence(client:PoolClient,tenantId:string,ids:readonly string[]):Promise<OperationalReconciliation> {
 const row=(await client.query(`SELECT count(*)::int count,count(*) FILTER(WHERE expected_value<>actual_value OR expected_count<>actual_count)::int failed,
 encode(sha256(convert_to(jsonb_agg(to_jsonb(evidence) ORDER BY case_id)::text,'UTF8')),'hex') hash FROM mart.analytics_exact_cases evidence WHERE tenant_id=$1 AND case_id=ANY($2::text[])`,[tenantId,ids])).rows[0];
 return {caseIds:ids,caseCount:row.count,mismatchCount:row.failed,evidenceHash:row.hash};
}
export function completeReconciliationPartitions(partitions:readonly AnalyticsPartition[],capabilities:readonly {metric:AnalyticsPartition['metric'];dimensions:readonly string[]}[]) {
 return partitions.filter(partition=>capabilities.some(capability=>capability.metric===partition.metric && (!partition.dimension||capability.dimensions.includes(partition.dimension))));
}
