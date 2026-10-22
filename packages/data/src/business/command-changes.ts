import type {Pool} from 'pg';
import type {OdooSourceConfig} from '../odoo/config.ts';
import type {OdooSnapshotLease} from '../odoo/snapshot.ts';
import {odooIncrementalWindow} from '../odoo/incremental-watermark.ts';
import {measureOperationalWork} from '../operational/progress.ts';
import type {OperationalProgressObserver} from '../operational/progress.ts';

export const commandObjects=['command_invoice','command_receipt','command_order','command_receivable','command_allocation'] as const;
type CommandObject=typeof commandObjects[number];

// These are dependency identities, not canonical financial rows. No source state
// filter may hide a root that has just left a recipe's eligible population.
const changedInputs=`WITH changed_company AS MATERIALIZED (
 SELECT company.id FROM res_company company JOIN res_currency currency ON currency.id=company.currency_id
 WHERE company.id=ANY($1::int[]) AND (company.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC'
 OR currency.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC')
),changed_partner AS MATERIALIZED (
 SELECT partner.id FROM res_partner partner LEFT JOIN res_country_state state ON state.id=partner.state_id
 WHERE partner.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC'
 OR state.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC'
),changed_user AS MATERIALIZED (
 SELECT users.id FROM res_users users WHERE users.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC'
 OR users.partner_id IN(SELECT id FROM changed_partner)
),changed_customer AS MATERIALIZED (
 SELECT partner.id FROM res_partner partner WHERE partner.id IN(SELECT id FROM changed_partner)
 OR partner.user_id IN(SELECT id FROM changed_user)
),changed_account AS MATERIALIZED (
 SELECT id FROM account_account WHERE write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC'
),changed_line AS MATERIALIZED (
 SELECT line.id,line.move_id FROM account_move_line line WHERE line.company_id=ANY($1::int[]) AND (
 line.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC'
 OR line.partner_id IN(SELECT id FROM changed_customer) OR line.salesperson_id IN(SELECT id FROM changed_user)
 OR line.account_id IN(SELECT id FROM changed_account))
),changed_partial AS MATERIALIZED (
 SELECT partial.* FROM account_partial_reconcile partial WHERE partial.company_id=ANY($1::int[])
 AND partial.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC'
),changed_move AS MATERIALIZED (
 SELECT move.id FROM account_move move WHERE move.company_id=ANY($1::int[]) AND (
 move.company_id IN(SELECT id FROM changed_company) OR move.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC'
 OR move.partner_id IN(SELECT id FROM changed_customer) OR move.id IN(SELECT move_id FROM changed_line)
 OR EXISTS(SELECT 1 FROM changed_partial partial JOIN account_move_line line
 ON line.id IN(partial.debit_move_id,partial.credit_move_id) WHERE line.move_id=move.id))
),changed_payment AS MATERIALIZED (
 SELECT payment.id,payment.move_id FROM account_payment payment WHERE payment.company_id=ANY($1::int[]) AND (
 payment.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC'
 OR payment.partner_id IN(SELECT id FROM changed_customer) OR payment.salesperson_id IN(SELECT id FROM changed_user)
 OR payment.move_id IN(SELECT id FROM changed_move))
)`;

function identitiesSql(object:CommandObject,completeSnapshot:boolean):string {
 switch(object){
  case 'command_invoice':return `${changedInputs} SELECT id::text FROM changed_move`;
  case 'command_receipt':return `${changedInputs} SELECT id::text FROM changed_payment`;
  case 'command_order':return `${changedInputs} SELECT record.id::text FROM sale_order record
   WHERE record.company_id=ANY($1::int[]) AND (record.company_id IN(SELECT id FROM changed_company) OR record.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC'
    OR record.partner_id IN(SELECT id FROM changed_customer) OR record.user_id IN(SELECT id FROM changed_user))`;
  case 'command_allocation':return `${changedInputs} SELECT partial.id::text FROM account_partial_reconcile partial
   JOIN account_move_line debit ON debit.id=partial.debit_move_id JOIN account_move_line credit ON credit.id=partial.credit_move_id
   WHERE partial.company_id=ANY($1::int[]) AND (partial.id IN(SELECT id FROM changed_partial)
    OR debit.move_id IN(SELECT id FROM changed_move) OR credit.move_id IN(SELECT id FROM changed_move)
    OR debit.move_id IN(SELECT move_id FROM changed_payment) OR credit.move_id IN(SELECT move_id FROM changed_payment))`;
  case 'command_receivable':return completeSnapshot
   ? `SELECT line.id::text FROM account_move_line line JOIN account_account account ON account.id=line.account_id
      WHERE line.company_id=ANY($1::int[]) AND account.account_type='asset_receivable'
      AND (line.amount_residual<>0 OR line.amount_residual IS NULL OR EXISTS(
       SELECT 1 FROM account_partial_reconcile partial WHERE partial.company_id=line.company_id
       AND line.id IN(partial.debit_move_id,partial.credit_move_id)
       AND partial.max_date>($3::timestamptz AT TIME ZONE $4)::date))
      AND $2::timestamp IS NOT NULL AND $3::timestamptz IS NOT NULL`
   : `${changedInputs} SELECT line.id::text FROM account_move_line line WHERE line.company_id=ANY($1::int[]) AND (
      line.id IN(SELECT id FROM changed_line) OR line.move_id IN(SELECT id FROM changed_move)
      OR line.partner_id IN(SELECT id FROM changed_customer)
      OR EXISTS(SELECT 1 FROM changed_partial partial WHERE line.id IN(partial.debit_move_id,partial.credit_move_id)))`;
 }
}

/** A future-dated header can enter the reporting window without another write. */
function recognizedIdentities(object:CommandObject):string {
 const predicate=(day:string)=>`${day}>($5::timestamptz AT TIME ZONE $4)::date
  AND ${day} BETWEEN $6::date AND $7::date AND ${day}<=($3::timestamptz AT TIME ZONE $4)::date`;
 switch(object){
  case 'command_invoice':return `SELECT record.id::text FROM account_move record WHERE record.company_id=ANY($1::int[]) AND ${predicate('record.invoice_date')}`;
  case 'command_receipt':return `SELECT record.id::text FROM account_payment record WHERE record.company_id=ANY($1::int[]) AND ${predicate('record.date')}`;
  case 'command_order':return `SELECT record.id::text FROM sale_order record WHERE record.company_id=ANY($1::int[]) AND ${predicate("((record.date_order AT TIME ZONE 'UTC') AT TIME ZONE $4)::date")}`;
  case 'command_allocation':return `SELECT partial.id::text FROM account_partial_reconcile partial JOIN account_move_line line ON line.id=partial.debit_move_id
   JOIN account_move record ON record.id=line.move_id WHERE partial.company_id=ANY($1::int[]) AND record.company_id=ANY($1::int[]) AND ${predicate('record.invoice_date')}`;
  case 'command_receivable':return 'SELECT NULL::text id WHERE false';
 }
}

/** One frozen snapshot and each recipe's own watermark; fetches only IDs in bounded pages. */
export async function discoverCommandChanges(scope:{pool:Pool;config:OdooSourceConfig;lease:OdooSnapshotLease;object:string;cutoff:string;month:string;timeZone:string;completeSnapshot:boolean;observe?:OperationalProgressObserver},consume:(ids:readonly string[])=>Promise<void>):Promise<void>{
 if(!commandObjects.some(object=>object===scope.object))throw new Error('Governed Command recipe required');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(scope.month))throw new Error('Explicit Command recognition month required');
 const lower=odooIncrementalWindow({cutoff:scope.cutoff,objects:{}},scope.lease.evidence.sourceAsOf).modificationFrom;
 const client=await scope.pool.connect();let broken=false;const onError=()=>{broken=true;};client.on('error',onError);
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await scope.lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true)",[String(scope.config.statementTimeoutMs)]);
  await client.query(`DECLARE command_changes NO SCROLL CURSOR FOR SELECT id FROM (
   SELECT id FROM (${identitiesSql(scope.object as CommandObject,scope.completeSnapshot)}) changed
   UNION ${recognizedIdentities(scope.object as CommandObject)}
  ) roots WHERE $4::text IS NOT NULL AND $5::timestamptz IS NOT NULL AND $6::date IS NOT NULL AND $7::date IS NOT NULL`,
   [scope.config.companyIds,lower,scope.lease.evidence.sourceAsOf,scope.timeZone,scope.cutoff,scope.month+'-01',
    new Date(Date.UTC(Number(scope.month.slice(0,4)),Number(scope.month.slice(5)),0)).toISOString().slice(0,10)]);
  for(;;){
   const rows=(await measureOperationalWork(scope.observe,'source_page',()=>client.query(`FETCH FORWARD ${scope.config.batchSize} FROM command_changes`))).rows;
   await scope.lease.assertAlive();if(!rows.length)break;
   await consume(rows.map(row=>String(row.id)));
  }
 }finally{try{await client.query('ROLLBACK');}catch{broken=true;}finally{client.removeListener('error',onError);client.release(broken);}}
}
