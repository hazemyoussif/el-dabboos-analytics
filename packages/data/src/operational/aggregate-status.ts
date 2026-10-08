import type {PoolClient} from 'pg';
import type {AnalyticsOperationalStatus} from '@el-dabboos/domain';
export async function eventAggregateStatus(client:PoolClient,tenantId:string):Promise<NonNullable<AnalyticsOperationalStatus['eventAggregates']>> {
 const result=(await client.query(`SELECT min(member.month)::text first_month,max(member.month)::text last_month,
 count(*)::int daily_partitions,count(proof.partition_id)::int reconciled_partitions,
 count(*) FILTER(WHERE proof.definition_version=baseline.definition_version AND proof.mapping_version=baseline.mapping_version
 AND proof.business_timezone=baseline.specification->0->'measures'->0->>'timeZone')::int compatible_monthly_partitions,
 coalesce(sum(proof.daily_rows),0)::text daily_rows,coalesce(sum(proof.monthly_rows),0)::text monthly_rows,
 max(proof.reconciled_at) latest_refresh
 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_baselines baseline USING(tenant_id) LEFT JOIN mart.analytics_aggregate_proofs proof USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1`,[tenantId])).rows[0];
 return {from:result.first_month,throughMonth:result.last_month,dailyPartitions:result.daily_partitions,monthlyPartitions:result.compatible_monthly_partitions,pendingPartitions:result.daily_partitions-result.reconciled_partitions,dailyRows:Number(result.daily_rows),monthlyRows:Number(result.monthly_rows),latestRefresh:result.latest_refresh?.toISOString()??null};
}
