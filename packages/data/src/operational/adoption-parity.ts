import type {PoolClient} from 'pg';
/** Pending heads are not certification. Check every trusted month without a whole-history hash/sort. */
export async function assertAdoptionHeadParity(client:PoolClient,tenantId:string) {
 const members=await client.query(`SELECT member.month::text AS business_month FROM mart.analytics_trusted_serving trusted
 JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 WHERE trusted.tenant_id=$1 AND member.family='facts' ORDER BY member.month`,[tenantId]);
 for(const member of members.rows)await assertTrustedMonthHeadParity(client,tenantId,member.business_month);
}
async function assertTrustedMonthHeadParity(client:PoolClient,tenantId:string,month:string) {
 const result=await client.query(`WITH heads AS (
 SELECT head.measure_id,(payload->>'businessDate')::date business_date,payload->'dimensions' dimensions,sum((payload->>'value')::numeric) value,count(*) fact_count
 FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.status='active' AND head.business_month=to_char($2::date,'YYYY-MM') GROUP BY 1,2,3),
 trusted AS (
 SELECT base.measure_id,base.business_date,base.dimensions,base.value,base.fact_count
 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_aggregate_bases base USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family='facts' AND member.month=$2::date)
 SELECT * FROM ((SELECT * FROM heads EXCEPT SELECT * FROM trusted) UNION ALL (SELECT * FROM trusted EXCEPT SELECT * FROM heads)) difference LIMIT 1`,[tenantId,month]);
 if(result.rowCount)throw new Error('Adoption requires canonical heads to match the current trusted partitions');
}
