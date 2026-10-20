import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import {reconcileEventRollup} from './aggregate-rollups.ts';
import {measureOperationalWork} from './progress.ts';
import type {OperationalProgressObserver,OperationalStep} from './progress.ts';
import type { AnalyticsPartition,PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
/** Full dimension tuples preserve intersections of viewer policy and query filters. */
export async function refreshOperationalMonths(client:PoolClient,scope:{tenantId:string;revisionId:string;parent:string|null;runId:string|null;cutoff:string;days?:readonly string[];purpose?:'adoption';additionalAffectedMonths?:readonly string[];partitionCapabilities?:Record<string,PublishedAnalyticsCapabilities>;observeProgress?:OperationalProgressObserver|undefined},months:readonly string[]) {
 const unique=[...new Set(months)].sort();
 await measureOperationalWork(scope.observeProgress,'refresh_manifest',()=>client.query('INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,run_id,cutoff,affected_months,purpose) VALUES($1,$2,$3,$4,$5,$6,$7)',[scope.tenantId,scope.revisionId,scope.parent,scope.runId,scope.cutoff,[...new Set([...unique,...(scope.additionalAffectedMonths??[])])].map(month=>`${month}-01`),scope.purpose??'operational']));
 if(scope.parent)await measureOperationalWork(scope.observeProgress,'refresh_carry_manifest',()=>client.query(`INSERT INTO mart.analytics_serving_members SELECT tenant_id,$2,month,partition_id,family FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$3 AND (family<>'facts' OR NOT month=ANY($4::date[]))`,[scope.tenantId,scope.revisionId,scope.parent,unique.map(month=>`${month}-01`)]));
 for(const [index,month] of unique.entries())await measureOperationalWork(scope.observeProgress,'refresh_month',()=>refreshMonth(client,scope,month),{month,monthIndex:index+1,totalMonths:unique.length});
 return unique;
}
async function refreshMonth(client:PoolClient,scope:{tenantId:string;revisionId:string;parent:string|null;days?:readonly string[];partitionCapabilities?:Record<string,PublishedAnalyticsCapabilities>;observeProgress?:OperationalProgressObserver|undefined},month:string) {
 const {tenantId,revisionId}=scope;
 const measure=<T>(step:OperationalStep,operation:()=>Promise<T>)=>measureOperationalWork(scope.observeProgress,step,operation,{month});
 // Both proofs freeze their partition contents; missing proof requires a full rebuild.
 const prior=scope.parent?(await measure('refresh_prior_proofs',()=>client.query(`SELECT member.partition_id,EXISTS(
  SELECT 1 FROM mart.analytics_drill_partitions drill JOIN mart.analytics_aggregate_proofs rollup USING(tenant_id,partition_id)
  WHERE drill.tenant_id=member.tenant_id AND drill.partition_id=member.partition_id) exact
  FROM mart.analytics_serving_members member WHERE member.tenant_id=$1 AND member.revision_id=$2 AND member.month=$3 AND member.family='facts'`,[tenantId,scope.parent,`${month}-01`]))).rows[0]:null;
 const days=prior&&prior.exact&&scope.days?scope.days.filter(day=>day.startsWith(month)):null;
 const partitionId=randomUUID();
 await measure('refresh_partition',()=>client.query('INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,capabilities) VALUES($1,$2,$3,$4)',[tenantId,partitionId,`${month}-01`,scope.partitionCapabilities?.[month]?JSON.stringify(scope.partitionCapabilities[month]):null]));
 if(days)await measure('refresh_copy_daily',()=>client.query(`INSERT INTO mart.analytics_aggregate_bases SELECT tenant_id,$2,measure_id,kind,business_date,dimensions,value,fact_count,labels FROM mart.analytics_aggregate_bases WHERE tenant_id=$1 AND partition_id=$3 AND NOT business_date=ANY($4::date[])`,[tenantId,partitionId,prior.partition_id,days]));
 await measure('refresh_rebuild_daily',()=>client.query(`INSERT INTO mart.analytics_aggregate_bases
 SELECT head.tenant_id,$2,payload->>'measureId',payload->>'kind',(payload->>'businessDate')::date,payload->'dimensions',sum((payload->>'value')::numeric),count(*),
 (array_agg(coalesce(payload->'displayLabels',payload->'transaction'->'labels','{}'::jsonb) ORDER BY payload->>'sourceAsOf' DESC,head.fact_key))[1]
 FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.status='active' AND head.business_month=left($3,7) AND ($4::date[] IS NULL OR (payload->>'businessDate')::date=ANY($4::date[]))
 GROUP BY head.tenant_id,payload->>'measureId',payload->>'kind',payload->>'businessDate',payload->'dimensions'`,[tenantId,partitionId,`${month}-01`,days]));
 if(days)await measure('refresh_copy_membership',()=>client.query(`INSERT INTO mart.analytics_partition_facts SELECT link.tenant_id,$2,link.fact_key,link.revision_id FROM mart.analytics_partition_facts link JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id) WHERE link.tenant_id=$1 AND link.partition_id=$3 AND NOT (payload->>'businessDate')::date=ANY($4::date[])`,[tenantId,partitionId,prior.partition_id,days]));
 await measure('refresh_rebuild_membership',()=>client.query(`INSERT INTO mart.analytics_partition_facts SELECT tenant_id,$2,fact_key,revision_id FROM mart.analytics_fact_heads WHERE tenant_id=$1 AND status='active' AND business_month=$3 AND ($4::date[] IS NULL OR (SELECT (payload->>'businessDate')::date FROM mart.analytics_fact_revisions revision WHERE revision.tenant_id=analytics_fact_heads.tenant_id AND revision.fact_key=analytics_fact_heads.fact_key AND revision.revision_id=analytics_fact_heads.revision_id)=ANY($4::date[]))`,[tenantId,partitionId,month,days]));
 await reconcileEventRollup(client,tenantId,partitionId,scope.observeProgress,month);
 // The database proof-insertion guard performs exact reconciliation and freezes membership.
 await measure('refresh_drill_proof',()=>client.query('INSERT INTO mart.analytics_drill_partitions VALUES($1,$2)',[tenantId,partitionId]));
 await measure('refresh_membership_guard',()=>client.query('INSERT INTO mart.analytics_serving_members VALUES($1,$2,$3,$4)',[tenantId,revisionId,`${month}-01`,partitionId]));
}
export function affectedMonths(partitions:readonly AnalyticsPartition[]) {return [...new Set(partitions.map(partition=>partition.month))].sort();}
