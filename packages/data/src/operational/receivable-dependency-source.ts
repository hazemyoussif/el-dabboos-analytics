import type {Pool} from 'pg';
import type {AnalyticsCursor} from '@el-dabboos/domain';
import type {OdooSourceConfig} from '../odoo/config.ts';
import type {OdooSnapshotLease} from '../odoo/snapshot.ts';
import {odooIncrementalWindow} from '../odoo/incremental-watermark.ts';
import type {ReceivableDependency} from './contracts.ts';

/** Initial imports capture dates; incremental reads poll the same four input models.
 * Nonreceivable changed lines remain discoverable so an eligibility change can retire
 * a previously tracked receivable footprint. Move dates include their line dates.
 */
const dependencySql=`SELECT 'account_move_line'::text object,line.id::text id,line.date::text "from",line.create_date::text "createdAt"
 FROM account_move_line line JOIN account_account account ON account.id=line.account_id
 WHERE line.company_id=ANY($1::int[]) AND ($2::timestamp IS NOT NULL OR account.account_type='asset_receivable')
 AND ($2::timestamp IS NULL OR line.write_date>=$2::timestamp)
 AND ($2::timestamp IS NULL OR line.write_date<=$3::timestamptz AT TIME ZONE 'UTC')
 UNION ALL SELECT 'account_partial_reconcile',partial.id::text,least(partial.max_date,debit.date,credit.date)::text,partial.create_date::text
 FROM account_partial_reconcile partial LEFT JOIN account_move_line debit ON debit.id=partial.debit_move_id
 LEFT JOIN account_move_line credit ON credit.id=partial.credit_move_id
 WHERE partial.company_id=ANY($1::int[]) AND ($2::timestamp IS NULL OR partial.write_date>=$2::timestamp)
 AND ($2::timestamp IS NULL OR partial.write_date<=$3::timestamptz AT TIME ZONE 'UTC')
 UNION ALL SELECT 'account_move',move.id::text,least(move.date,(SELECT min(line.date) FROM account_move_line line WHERE line.move_id=move.id AND line.company_id=move.company_id))::text,move.create_date::text
 FROM account_move move WHERE move.company_id=ANY($1::int[]) AND ($2::timestamp IS NULL OR move.write_date>=$2::timestamp)
 AND ($2::timestamp IS NULL OR move.write_date<=$3::timestamptz AT TIME ZONE 'UTC')
 UNION ALL SELECT 'account_payment',payment.id::text,least(move.date,(SELECT min(line.date) FROM account_move_line line WHERE line.move_id=move.id AND line.company_id=move.company_id))::text,payment.create_date::text
 FROM account_payment payment LEFT JOIN account_move move ON move.id=payment.move_id AND move.company_id=payment.company_id
 WHERE payment.company_id=ANY($1::int[]) AND ($2::timestamp IS NULL OR payment.write_date>=$2::timestamp)
 AND ($2::timestamp IS NULL OR payment.write_date<=$3::timestamptz AT TIME ZONE 'UTC')`;

export async function* readReceivableDependencies(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig,scope:{cursor:AnalyticsCursor|null;initialize:boolean}):AsyncGenerator<ReceivableDependency[]> {
 const lower=scope.initialize?null:odooIncrementalWindow(scope.cursor,lease.evidence.sourceAsOf).modificationFrom;
 const client=await pool.connect();let committed=false;
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true)",[String(config.statementTimeoutMs)]);
  await client.query(`DECLARE odoo_receivable_dependencies NO SCROLL CURSOR WITHOUT HOLD FOR ${dependencySql}`,[config.companyIds,lower,lease.evidence.sourceAsOf]);
  while(true) {
   await lease.assertAlive();
   // The source configuration already restricts batchSize to 1..1000.
   const result=await client.query(`FETCH FORWARD ${config.batchSize} FROM odoo_receivable_dependencies`);
   await lease.assertAlive();
   if(!result.rows.length)break;
   yield result.rows as ReceivableDependency[];
  }
  await lease.assertAlive();await client.query('COMMIT');committed=true;
 }finally{try{if(!committed)await client.query('ROLLBACK');}finally{client.release();}}
}
