import {validDateRange} from '@el-dabboos/domain';
import type {DateRange} from '@el-dabboos/domain';
import type {Pool,PoolClient} from 'pg';
import type {OdooSourceConfig} from './config.ts';
import type {OdooSnapshotLease} from './snapshot.ts';

const objects=['sale_order','account_move','account_move_line','account_payment','res_partner','account_partial_reconcile'];
const fields=['id','company_id','account_id','state','payment_state','move_type','user_id','invoice_user_id','salesperson_id','date_order','invoice_date','date','date_maturity','amount_total','amount_untaxed_signed','amount_residual','payment_type','partner_type','move_id','partner_id','currency_id','max_date','create_date','debit_move_id','credit_move_id'];
export interface SalesCommandSourceField {object:string;field:string;type:string;target_objects:string[]}
interface SourceStateCount {state:string|null;count:string}
export interface SalesCommandSourceInspection {
 sourceAsOf:string;frozenRevision:string;period:DateRange;fields:SalesCommandSourceField[];
 states:{orders:SourceStateCount[];invoice_documents:SourceStateCount[];invoice_payments:SourceStateCount[]|null;receipts:SourceStateCount[]};
 invoiceIdentity:{headers:string;multiple_receivable_lines:string;missing_residual:string;foreign_currency_headers:string};
}
/** Metadata and aggregate counts only. No source writes, customer rows or guessed custom-field values. */
export async function inspectSalesCommandSource(pool:Pool,config:OdooSourceConfig,lease:OdooSnapshotLease,period:DateRange,timeZone:string):Promise<SalesCommandSourceInspection>{
 if(!validDateRange(period))throw new Error('Explicit valid inspection period required');
 new Intl.DateTimeFormat('en',{timeZone}).format(new Date());
 lease.assertScope(lease.evidence,config);
 const client=await pool.connect();let broken=false;
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true),set_config('TimeZone','UTC',true)",[String(config.statementTimeoutMs)]);
  const columns=await readFields(client);
  requireFields(columns);
  const parameters=[config.companyIds,period.from,period.to];
  const orders=(await client.query(`SELECT state,count(*)::text count FROM sale_order WHERE company_id=ANY($1::int[])
   AND ((date_order AT TIME ZONE 'UTC') AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date GROUP BY state ORDER BY state NULLS FIRST`,[...parameters,timeZone])).rows;
  const documents=(await client.query(`SELECT state,count(*)::text count FROM account_move WHERE company_id=ANY($1::int[])
   AND move_type='out_invoice' AND invoice_date BETWEEN $2::date AND $3::date GROUP BY state ORDER BY state NULLS FIRST`,parameters)).rows;
  const payments=hasField(columns,'account_move','payment_state')?(await client.query(`SELECT payment_state state,count(*)::text count FROM account_move WHERE company_id=ANY($1::int[])
   AND move_type='out_invoice' AND invoice_date BETWEEN $2::date AND $3::date GROUP BY payment_state ORDER BY payment_state NULLS FIRST`,parameters)).rows:null;
  const receipts=(await client.query(`SELECT state,count(*)::text count FROM account_payment WHERE company_id=ANY($1::int[])
   AND partner_type='customer' AND date BETWEEN $2::date AND $3::date GROUP BY state ORDER BY state NULLS FIRST`,parameters)).rows;
  const identity=await invoiceIdentity(client,parameters);
  await lease.assertAlive();
  return {sourceAsOf:lease.evidence.sourceAsOf,frozenRevision:lease.evidence.frozenRevision,period:{...period},fields:columns,states:{orders,invoice_documents:documents,invoice_payments:payments,receipts},invoiceIdentity:identity};
 }finally{
  try{await client.query('ROLLBACK');}catch{broken=true;}finally{client.release(broken);}
 }
}
async function readFields(client:PoolClient):Promise<SalesCommandSourceField[]>{
 return (await client.query(`SELECT relation.relname object,attribute.attname field,format_type(attribute.atttypid,attribute.atttypmod) type,
  ARRAY(SELECT DISTINCT target.relname::text FROM pg_constraint constraint_row JOIN pg_class target ON target.oid=constraint_row.confrelid
   WHERE constraint_row.conrelid=relation.oid AND constraint_row.contype='f' AND constraint_row.conkey=ARRAY[attribute.attnum] ORDER BY target.relname::text) target_objects
  FROM pg_class relation JOIN pg_namespace namespace ON namespace.oid=relation.relnamespace
  JOIN pg_attribute attribute ON attribute.attrelid=relation.oid AND attribute.attnum>0 AND NOT attribute.attisdropped
  WHERE namespace.nspname='public' AND relation.relname=ANY($1::text[]) AND attribute.attname=ANY($2::text[])
  ORDER BY relation.relname,attribute.attname`,[objects,fields])).rows;
}
function hasField(columns:SalesCommandSourceField[],object:string,field:string){return columns.some(column=>column.object===object&&column.field===field);}
function requireFields(columns:SalesCommandSourceField[]){
 const requirements={sale_order:['company_id','date_order','state'],account_move:['id','company_id','state','move_type','invoice_date','amount_residual','currency_id'],account_move_line:['id','move_id','company_id','account_id'],account_payment:['company_id','date','partner_type','state']};
 for(const [object,names] of Object.entries(requirements))for(const field of names)if(!hasField(columns,object,field))throw new Error('Required source inspection field unavailable');
}
async function invoiceIdentity(client:PoolClient,parameters:unknown[]):Promise<SalesCommandSourceInspection['invoiceIdentity']>{
 return (await client.query(`SELECT count(*)::text headers,
  count(*) FILTER(WHERE (SELECT count(*) FROM account_move_line line JOIN account_account account ON account.id=line.account_id
   WHERE line.move_id=invoice.id AND line.company_id=invoice.company_id AND account.account_type='asset_receivable')>1)::text multiple_receivable_lines,
  count(*) FILTER(WHERE invoice.amount_residual IS NULL)::text missing_residual,
  count(*) FILTER(WHERE invoice.currency_id IS DISTINCT FROM company.currency_id)::text foreign_currency_headers
  FROM account_move invoice JOIN res_company company ON company.id=invoice.company_id WHERE invoice.company_id=ANY($1::int[])
  AND invoice.move_type='out_invoice' AND invoice.invoice_date BETWEEN $2::date AND $3::date`,parameters)).rows[0];
}
