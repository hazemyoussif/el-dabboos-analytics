import type { Pool } from 'pg';
import type { OdooSnapshotLease } from './snapshot.ts';
export async function readHistoricalSourceQuality(pool: Pool, period: { from: string; to: string }, snapshot: OdooSnapshotLease) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await snapshot.importInto(client);
    const results = [];
    for (const object of ['sale_order','account_move']) {
      const date = object === 'sale_order' ? "((record.date_order AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date" : 'record.invoice_date';
      const salesperson = object === 'sale_order' ? 'user_id' : 'invoice_user_id';
      const states = object === 'sale_order' ? ['draft','sent','sale','done','cancel'] : ['draft','posted','cancel'];
      const row = (await client.query(`SELECT count(*)::text records,
        count(*) FILTER(WHERE record.business_line_id IS NULL)::text missing_business_line,
        count(*) FILTER(WHERE record.${salesperson} IS NULL)::text missing_salesperson,
        count(*) FILTER(WHERE record.partner_id IS NULL)::text missing_customer,
        count(*) FILTER(WHERE record.state IS NULL OR NOT(record.state=ANY($3::text[])))::text unexpected_state,
        count(*) FILTER(WHERE currency.name IS DISTINCT FROM 'IQD')::text currency_anomalies,
        (count(*)-count(DISTINCT record.id))::text duplicate_identities
        FROM ${object} record LEFT JOIN res_currency currency ON currency.id=record.currency_id
        WHERE record.company_id=1 AND ${date} BETWEEN $1::date AND $2::date`,[period.from,period.to,states])).rows[0];
      const undated = (await client.query(`SELECT count(*)::text records FROM ${object} record WHERE company_id=1 AND ${date} IS NULL`)).rows[0].records;
      results.push({object,...row,nullDatesOutsideAssignablePeriods:undated,uom:'irrelevant'});
    }
    await snapshot.assertAlive(); await client.query('ROLLBACK'); return results;
  } finally { await client.query('ROLLBACK').catch(()=>{});client.release(); }
}
