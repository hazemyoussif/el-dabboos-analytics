import type {PoolClient} from 'pg';
/** Pending heads are not certification. Refuse adoption unless trusted content is reproduced exactly. */
export async function assertAdoptionHeadParity(client:PoolClient,tenantId:string) {
 const result=await client.query(`WITH members AS (
 SELECT member.month,member.partition_id FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 WHERE trusted.tenant_id=$1 AND member.family='facts'),
 heads AS (SELECT head.measure_id,(payload->>'businessDate')::date business_date,payload->'dimensions' dimensions,sum((payload->>'value')::numeric) value,count(*) fact_count
 FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.status='active' AND head.business_month=ANY(ARRAY(SELECT to_char(month,'YYYY-MM') FROM members)) GROUP BY 1,2,3),
 trusted AS (SELECT measure_id,business_date,dimensions,value,fact_count FROM members JOIN mart.analytics_aggregate_bases base USING(partition_id) WHERE base.tenant_id=$1)
 SELECT * FROM ((SELECT * FROM heads EXCEPT SELECT * FROM trusted) UNION ALL (SELECT * FROM trusted EXCEPT SELECT * FROM heads)) difference LIMIT 1`,[tenantId]);
 if(result.rowCount)throw new Error('Adoption requires canonical heads to match the current trusted partitions');
}
