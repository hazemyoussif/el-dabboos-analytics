import type {Pool} from 'pg';
import type {OdooSnapshotLease} from './snapshot.ts';
import type {OdooSourceConfig} from './config.ts';
/** Company-scoped source history metadata only; no records, customer data or mart writes. */
export async function readHistoricalSourceInventory(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig,timeZone:string) {
 if(config.companyIds.join(',')!=='1'||timeZone!=='Asia/Baghdad')throw new Error('Approved company-1 inventory scope required');
 const client=await pool.connect();
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true)",[String(config.statementTimeoutMs)]);
  const rows=(await client.query(`WITH history AS (
   SELECT 'orders' family,((date_order AT TIME ZONE 'UTC') AT TIME ZONE $2)::date business_date,state IN ('sale','cancel') eligible
   FROM sale_order WHERE company_id=ANY($1::int[])
   UNION ALL
   SELECT 'invoices',invoice_date,state='posted' AND move_type IN ('out_invoice','out_refund')
   FROM account_move WHERE company_id=ANY($1::int[])
  ) SELECT family,to_char(business_date,'YYYY-MM') AS month,min(business_date)::text first_date,max(business_date)::text last_date,
   count(*)::text headers,count(*) FILTER(WHERE eligible)::text eligible_headers
   FROM history GROUP BY family,to_char(business_date,'YYYY-MM') ORDER BY month NULLS FIRST,family`,[config.companyIds,timeZone])).rows;
  await lease.assertAlive();await client.query('COMMIT');
  return {companyIds:config.companyIds,timeZone,sourceCutoff:lease.evidence.sourceAsOf,months:rows};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
