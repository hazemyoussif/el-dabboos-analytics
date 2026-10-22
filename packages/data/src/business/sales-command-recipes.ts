import {receivablesControlBaseForIdentities} from '../operational/receivable-control-sql.ts';
import {reviewAllocationPrecision} from '../review/allocation-precision.ts';

const companyJoin=`JOIN res_company company ON company.id=record.company_id JOIN res_currency currency ON currency.id=company.currency_id`;
const invoiceAttributionJoin=`LEFT JOIN LATERAL (
 SELECT CASE WHEN count(DISTINCT line.salesperson_id)=1 AND count(*) FILTER(WHERE line.salesperson_id IS NULL)=0 THEN min(line.salesperson_id) END salesperson_id,
 (count(DISTINCT line.salesperson_id)>1 OR (count(DISTINCT line.salesperson_id)>0 AND count(*) FILTER(WHERE line.salesperson_id IS NULL)>0)) ambiguous
 FROM account_move_line line JOIN account_account account ON account.id=line.account_id AND account.account_type='asset_receivable'
 WHERE line.move_id=record.id AND line.company_id=record.company_id
 ) invoice_owner ON true`;
const invoiceDimensions=`jsonb_build_object('customer',record.partner_id::text,'salesperson',invoice_owner.salesperson_id::text,'state',partner.state_id::text,'invoice_document_state',record.state,'invoice_payment_state',record.payment_state)`;
/** Invoice headers stay independent of receivable/product lines. Status values are never renamed. */
function invoiceSql(selected=false){return `SELECT record.id::text id,record.invoice_date business_date,record.company_id,currency.name currency,
 ${invoiceDimensions} dimensions,value.measure_id,value.amount,
 (invoice_owner.ambiguous OR record.currency_id<>company.currency_id OR record.amount_total IS NULL OR record.amount_residual IS NULL
 OR record.amount_total<>round(record.amount_total,6) OR record.amount_residual<>round(record.amount_residual,6)) invalid
 FROM account_move record ${companyJoin} LEFT JOIN res_partner partner ON partner.id=record.partner_id ${invoiceAttributionJoin}
 CROSS JOIN LATERAL(VALUES
 ('command_document_count',CASE WHEN record.move_type='out_invoice' THEN 1 END),
 ('command_document_value',CASE WHEN record.move_type='out_invoice' THEN record.amount_total END),
 ('command_invoice_total',CASE WHEN record.state='posted' AND record.move_type='out_invoice' THEN record.amount_total END),
 ('command_invoice_count',CASE WHEN record.state='posted' AND record.move_type='out_invoice' THEN 1 END),
 ('command_invoice_residual',CASE WHEN record.state='posted' AND record.move_type='out_invoice' THEN record.amount_residual END),
 ('command_invoice_settled',CASE WHEN record.state='posted' AND record.move_type='out_invoice' THEN record.amount_total-record.amount_residual END),
 ('command_invoice_refunds',CASE WHEN record.state='posted' AND record.move_type='out_refund' THEN record.amount_total END),
 ('command_net_invoices',CASE WHEN record.state='posted' THEN record.amount_total*CASE WHEN record.move_type='out_refund' THEN -1 ELSE 1 END END)
 ) value(measure_id,amount)
 WHERE record.company_id=$1::int AND record.move_type IN('out_invoice','out_refund') AND record.invoice_date BETWEEN $2::date AND $3::date
 AND $4::text IS NOT NULL AND $5::date IS NOT NULL AND value.amount IS NOT NULL${selected?' AND record.id=ANY($10::bigint[])':''}`;}
export const commandInvoiceRecipe=invoiceSql();

/** Header counts include voids; the cash measure alone applies the eligible cash-state rule. */
function receiptSql(selected=false){return `SELECT record.id::text id,record.date business_date,record.company_id,currency.name currency,
 jsonb_build_object('customer',record.partner_id::text,'salesperson',record.salesperson_id::text,'state',partner.state_id::text,'receipt_state',record.state) dimensions,
 value.measure_id,value.amount,(record.amount IS NULL OR record.amount<>round(record.amount,6)
 OR record.payment_type NOT IN('inbound','outbound') OR record.currency_id IS NULL
 OR (record.currency_id<>company.currency_id AND record.amount<>0)) invalid
 FROM account_payment record ${companyJoin} LEFT JOIN res_partner partner ON partner.id=record.partner_id
 CROSS JOIN LATERAL(SELECT record.amount*CASE WHEN record.payment_type='outbound' THEN -1 ELSE 1 END amount) signed
 CROSS JOIN LATERAL(VALUES ('command_receipt_count',1::numeric),('command_receipt_value',signed.amount),
 ('command_cash_received',CASE WHEN record.state IN('paid','in_process') THEN signed.amount END)) value(measure_id,amount)
 WHERE record.company_id=$1::int AND record.partner_type='customer' AND (record.partner_id IS NOT NULL OR record.amount=0)
 AND record.date BETWEEN $2::date AND $3::date AND $4::text IS NOT NULL AND $5::date IS NOT NULL AND value.amount IS NOT NULL${selected?' AND record.id=ANY($10::bigint[])':''}`;}
export const commandReceiptRecipe=receiptSql();

function orderSql(selected=false){return `SELECT record.id::text id,((record.date_order AT TIME ZONE 'UTC') AT TIME ZONE $4)::date business_date,
 record.company_id,currency.name currency,jsonb_build_object('customer',record.partner_id::text,'salesperson',record.user_id::text,
 'state',partner.state_id::text,'order_state',record.state) dimensions,value.measure_id,value.amount,
 (record.currency_id<>company.currency_id OR record.amount_total IS NULL OR record.amount_total<>round(record.amount_total,6)) invalid
 FROM sale_order record ${companyJoin} LEFT JOIN res_partner partner ON partner.id=record.partner_id
 CROSS JOIN LATERAL(VALUES ('command_order_status_count',1::numeric),('command_order_status_value',record.amount_total),
 ('command_order_count',CASE WHEN record.state IN('sale','done') THEN 1 END),
 ('command_order_value',CASE WHEN record.state IN('sale','done') THEN record.amount_total END),
 ('command_cancelled_count',CASE WHEN record.state='cancel' THEN 1 END),
 ('command_cancelled_value',CASE WHEN record.state='cancel' THEN record.amount_total END),
 ('command_decided_orders',CASE WHEN record.state IN('sale','done','cancel') THEN 1 END)) value(measure_id,amount)
 WHERE record.company_id=$1::int AND ((record.date_order AT TIME ZONE 'UTC') AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date
 AND $5::date IS NOT NULL AND value.amount IS NOT NULL${selected?' AND record.id=ANY($10::bigint[])':''}`;}
export const commandOrderRecipe=orderSql();

/** Accepted receivable reconstruction preserves signed credits and checks stored-current equality. */
function debtSql(selected=false){return receivablesControlBaseForIdentities(selected).replaceAll('$2::date','$3::date')+` SELECT reconstructed.id::text id,
 $3::date business_date,$1::int company_id,company_currency currency,
 jsonb_build_object('customer',reconstructed.partner_id::text,'salesperson',coalesce(partner.user_id,line.salesperson_id)::text,'state',partner.state_id::text) dimensions,
 value.measure_id,value.amount,(invalid_links>0 OR reconstructed_current<>stored_current) invalid
 FROM reconstructed JOIN account_move_line line ON line.id=reconstructed.id
 LEFT JOIN res_partner partner ON partner.id=reconstructed.partner_id
 CROSS JOIN LATERAL(VALUES ('command_customer_balance',residual),
 ('command_overdue_balance',CASE WHEN reconstructed.date_maturity<$3::date THEN residual ELSE 0 END),
 ('command_future_balance',CASE WHEN reconstructed.date_maturity>=$3::date THEN residual ELSE 0 END),
 ('command_unknown_maturity',CASE WHEN reconstructed.date_maturity IS NULL THEN residual ELSE 0 END),
 ('command_overdue_days',CASE WHEN residual>0 AND reconstructed.date_maturity<$3::date THEN ($3::date-reconstructed.date_maturity)::numeric END)) value(measure_id,amount)
 WHERE $2::date IS NOT NULL AND $4::text IS NOT NULL AND $5::date IS NOT NULL AND residual<>0 AND value.amount IS NOT NULL`;}
export const commandDebtRecipe=debtSql();

/** Only cash-payment legs qualify; invoice credits cannot enter this cohort. */
function sameDaySql(selected=false){return `SELECT partial.id::text id,record.invoice_date business_date,record.company_id,currency.name currency,
 ${invoiceDimensions} dimensions,'command_same_day_cash' measure_id,round(partial.amount,${reviewAllocationPrecision.decimalPlaces}) amount,
 (invoice_owner.ambiguous OR partial.create_date IS NULL OR record.currency_id<>company.currency_id OR partial.company_id<>record.company_id OR credit.company_id<>record.company_id OR debit.company_id<>record.company_id
 OR payment.currency_id<>company.currency_id OR payment.partner_id IS DISTINCT FROM record.partner_id
 OR partial.amount<=0 OR abs(partial.amount-round(partial.amount,${reviewAllocationPrecision.decimalPlaces}))>
 least(${reviewAllocationPrecision.maxResidue}::numeric,currency.rounding/${reviewAllocationPrecision.currencyQuantumDivisor}::numeric)
 OR EXISTS(SELECT 1 FROM account_payment peer WHERE peer.move_id=payment.move_id AND peer.id<>payment.id)) invalid
 FROM account_partial_reconcile partial JOIN account_move_line debit ON debit.id=partial.debit_move_id
 JOIN account_move record ON record.id=debit.move_id ${companyJoin}
 JOIN account_account debit_account ON debit_account.id=debit.account_id AND debit_account.account_type='asset_receivable'
 JOIN account_move_line credit ON credit.id=partial.credit_move_id
 JOIN account_account credit_account ON credit_account.id=credit.account_id AND credit_account.account_type='asset_receivable'
 JOIN account_payment payment ON payment.move_id=credit.move_id AND payment.company_id=record.company_id
 JOIN account_move payment_move ON payment_move.id=payment.move_id AND payment_move.state='posted'
 LEFT JOIN res_partner partner ON partner.id=record.partner_id ${invoiceAttributionJoin}
 WHERE record.company_id=$1::int AND record.state='posted' AND record.move_type='out_invoice'
 AND payment.partner_type='customer' AND payment.payment_type='inbound' AND payment.state IN('paid','in_process')
 AND record.invoice_date BETWEEN $2::date AND $3::date AND payment.date=record.invoice_date AND partial.max_date=record.invoice_date
 AND partial.max_date<=$5::date AND (partial.create_date IS NULL OR ((partial.create_date AT TIME ZONE 'UTC') AT TIME ZONE $4)::date=record.invoice_date)${selected?' AND partial.id=ANY($10::bigint[])':''}`;}
export const commandSameDayRecipe=sameDaySql();

/** Fixed recipe builders add identity predicates at source roots, before aggregation. */
export function commandIdentityRecipe(object:string):string {
 switch(object){
  case 'command_invoice':return invoiceSql(true);
  case 'command_receipt':return receiptSql(true);
  case 'command_order':return orderSql(true);
  case 'command_receivable':return debtSql(true);
  case 'command_allocation':return sameDaySql(true);
  default:throw new Error('Governed command identity recipe required');
 }
}
