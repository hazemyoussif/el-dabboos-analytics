import type {PoolClient} from 'pg';
import {requiredMeasures} from '@el-dabboos/domain';
import type {PreparedResultScope} from './result.ts';

/** Publication metadata only: no source calls, fact scans or aggregation during serving. */
export async function preparedSourceConsistency(client:PoolClient,scope:PreparedResultScope):Promise<{sourceConsistency?:'api_observed'}>{
 const tenantId=scope.publication.families[scope.family].tenantId;
 if(scope.family==='receivables')return {};
 let revisions:string[];
 if(scope.family==='facts'){
  revisions=(await client.query(`SELECT source_revision FROM mart.analytics_operation_runs
   WHERE tenant_id=$1 AND source_cutoff=$2::timestamptz AND status IN ('passed','unchanged')`,[tenantId,scope.publication.sourceCutoff])).rows.map(row=>row.source_revision);
 }else{
  revisions=(await client.query(`SELECT DISTINCT observation.source_revision
   FROM mart.analytics_serving_members member JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
   CROSS JOIN LATERAL unnest($4::text[]) measure
   CROSS JOIN LATERAL mart.business_measure_observation(member.tenant_id,member.partition_id,measure) observation
   WHERE member.tenant_id=$1 AND member.revision_id=$2 AND member.family=$3
   AND ($5::date IS NULL OR member.month<=date_trunc('month',$5::date))`,
   [tenantId,scope.publication.revision,scope.family,requiredMeasures(scope.query.metric),scope.query.dateRange?.to??null])).rows.map(row=>row.source_revision);
 }
 return revisions.some(revision=>revision.startsWith('orm-observed-copy-v1:'))?{sourceConsistency:'api_observed'}:{};
}
