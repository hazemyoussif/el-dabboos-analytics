import type {Pool} from 'pg';
import type {DateRange} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
/** Operator proof compares identities/values/counts, returning only counts, never customer rows. */
export async function verifyEventRange(pool:Pool,tenantId:string,range:DateRange) {
 return tenantTransaction(pool,tenantId,async client=>{
  const result=(await client.query(`WITH members AS (
   SELECT member.month,member.partition_id FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) WHERE trusted.tenant_id=$1
  ), daily_rows AS (
   SELECT base.measure_id,base.dimensions,base.value,base.fact_count,base.business_date FROM members JOIN mart.analytics_aggregate_bases base USING(partition_id)
   WHERE base.tenant_id=$1 AND base.kind='event' AND base.business_date BETWEEN $2::date AND $3::date
  ), daily AS (SELECT measure_id,dimensions,sum(value) value,sum(fact_count)::bigint fact_count,max(business_date) through FROM daily_rows GROUP BY 1,2),
  canonical AS (
   SELECT payload->>'measureId' measure_id,payload->'dimensions' dimensions,sum((payload->>'value')::numeric) value,count(*) fact_count,max((payload->>'businessDate')::date) through
   FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
   WHERE head.tenant_id=$1 AND head.status='active' AND payload->>'kind'='event' AND (payload->>'businessDate')::date BETWEEN $2::date AND $3::date GROUP BY 1,2
  ), complete AS (SELECT * FROM members WHERE month>=$2::date AND (month+interval '1 month'-interval '1 day')::date<=$3::date),
  hybrid_rows AS (
   SELECT base.measure_id,base.dimensions,base.value,base.fact_count,base.data_through business_date FROM complete JOIN mart.analytics_monthly_bases base USING(partition_id) WHERE base.tenant_id=$1
   UNION ALL SELECT * FROM daily_rows WHERE NOT EXISTS(SELECT 1 FROM complete WHERE complete.month=date_trunc('month',daily_rows.business_date)::date)
  ), hybrid AS (SELECT measure_id,dimensions,sum(value) value,sum(fact_count)::bigint fact_count,max(business_date) through FROM hybrid_rows GROUP BY 1,2),
  delta AS ((SELECT * FROM daily EXCEPT SELECT * FROM canonical) UNION ALL (SELECT * FROM canonical EXCEPT SELECT * FROM daily)
   UNION ALL (SELECT * FROM daily EXCEPT SELECT * FROM hybrid) UNION ALL (SELECT * FROM hybrid EXCEPT SELECT * FROM daily))
  SELECT (SELECT count(*) FROM daily)::int cases,count(*)::int mismatches,
  (SELECT count(*) FROM members WHERE NOT EXISTS(SELECT 1 FROM mart.analytics_aggregate_proofs proof WHERE proof.tenant_id=$1 AND proof.partition_id=members.partition_id))::int unproved_partitions FROM delta`,[tenantId,range.from,range.to])).rows[0];
  return {range,cases:Number(result.cases),mismatches:Number(result.mismatches),unprovedPartitions:Number(result.unproved_partitions)};
 },true,120000);
}
