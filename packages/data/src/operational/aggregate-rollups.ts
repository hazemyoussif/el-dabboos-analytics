import type {Pool,PoolClient} from 'pg';
import {tenantTransaction} from '../postgres/session.ts';
import {readBaseline} from './baseline.ts';
/** Append exact proof last: its database guard reconciles and freezes both grains. */
export async function reconcileEventRollup(client:PoolClient,tenantId:string,partitionId:string) {
 const existing=await client.query('SELECT 1 FROM mart.analytics_aggregate_proofs WHERE tenant_id=$1 AND partition_id=$2',[tenantId,partitionId]);
 if(existing.rowCount)return 'already-proved';
 await client.query(`INSERT INTO mart.analytics_monthly_bases
 SELECT tenant_id,partition_id,measure_id,dimensions,sum(value),sum(fact_count),max(business_date)
 FROM mart.analytics_aggregate_bases WHERE tenant_id=$1 AND partition_id=$2 AND kind='event' GROUP BY 1,2,3,4`,[tenantId,partitionId]);
 await client.query(`INSERT INTO mart.analytics_aggregate_proofs(tenant_id,partition_id,definition_version,mapping_version,business_timezone,daily_rows,monthly_rows)
 SELECT tenant_id,$2,definition_version,mapping_version,specification->0->'measures'->0->>'timeZone',
 (SELECT count(*) FROM mart.analytics_aggregate_bases WHERE tenant_id=$1 AND partition_id=$2 AND kind='event'),
 (SELECT count(*) FROM mart.analytics_monthly_bases WHERE tenant_id=$1 AND partition_id=$2)
 FROM mart.analytics_baselines WHERE tenant_id=$1`,[tenantId,partitionId]);
 return 'proved';
}
/** Each month commits atomically. Retry proves or resumes the current manifest under its writer lock. */
export async function backfillEventRollups(pool:Pool,tenantId:string) {
 const months=await tenantTransaction(pool,tenantId,async client=>{
  await readBaseline(client,tenantId);
  return (await client.query(`SELECT member.month::text AS month FROM mart.analytics_trusted_serving trusted JOIN (SELECT * FROM mart.analytics_serving_members WHERE family='facts') member USING(tenant_id,revision_id) WHERE trusted.tenant_id=$1 ORDER BY month`,[tenantId])).rows.map(row=>String(row.month));
 },true);
 const results=[];
 for(const month of months)results.push(await tenantTransaction(pool,tenantId,async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`analytics:${tenantId}`]);
  await readBaseline(client,tenantId);
  const member=(await client.query(`SELECT member.partition_id FROM mart.analytics_trusted_serving trusted JOIN (SELECT * FROM mart.analytics_serving_members WHERE family='facts') member USING(tenant_id,revision_id) WHERE trusted.tenant_id=$1 AND member.month=$2`,[tenantId,month])).rows[0];
  if(!member)throw new Error('Trusted backfill partition disappeared');
  return {month,status:await reconcileEventRollup(client,tenantId,member.partition_id)};
 }));
 return results;
}
