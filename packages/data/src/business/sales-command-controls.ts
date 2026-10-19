import type {FactMeasureId} from '@el-dabboos/domain';
import type {PoolClient} from 'pg';
import type {ReviewControl} from '../review/source.ts';

/** Independent header aggregates catch source-vector fanout before immutable publication. */
export async function assertSalesCommandHeaders(client:PoolClient,controls:readonly ReviewControl[],scope:{companyId:number;from:string;to:string;timeZone:string;measures:readonly FactMeasureId[]}):Promise<void> {
 const checks=(await client.query(`WITH invoices AS (
 SELECT coalesce(sum(amount_total) FILTER(WHERE state='posted' AND move_type='out_invoice'),0) invoices,
 count(*) FILTER(WHERE state='posted' AND move_type='out_invoice') invoice_count,
 coalesce(sum(amount_total) FILTER(WHERE state='posted' AND move_type='out_refund'),0) refunds,
 count(*) FILTER(WHERE move_type='out_invoice') documents,
 coalesce(sum(amount_total) FILTER(WHERE move_type='out_invoice'),0) document_value
 FROM account_move WHERE company_id=$1::int AND move_type IN('out_invoice','out_refund') AND invoice_date BETWEEN $2::date AND $3::date
 ),orders AS (
 SELECT count(*) FILTER(WHERE state IN('sale','done')) confirmed_count,
 coalesce(sum(amount_total) FILTER(WHERE state IN('sale','done')),0) confirmed_value,
 count(*) FILTER(WHERE state='cancel') cancelled_count,coalesce(sum(amount_total) FILTER(WHERE state='cancel'),0) cancelled_value,
 count(*) all_count,coalesce(sum(amount_total),0) all_value
 FROM sale_order WHERE company_id=$1::int AND ((date_order AT TIME ZONE 'UTC') AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date
 ),receipts AS (
 SELECT count(*) all_count,coalesce(sum(amount*CASE WHEN payment_type='outbound' THEN -1 ELSE 1 END),0) all_value,
 coalesce(sum(amount*CASE WHEN payment_type='outbound' THEN -1 ELSE 1 END) FILTER(WHERE state IN('paid','in_process')),0) cash
 FROM account_payment WHERE company_id=$1::int AND partner_type='customer' AND (partner_id IS NOT NULL OR amount=0) AND date BETWEEN $2::date AND $3::date
 ) SELECT value.measure,value.amount::numeric(30,6)::text amount FROM invoices,orders,receipts CROSS JOIN LATERAL(VALUES
 ('command_invoice_count',invoices.invoice_count),('command_invoice_total',invoices.invoices),('command_invoice_refunds',invoices.refunds),
 ('command_net_invoices',invoices.invoices-invoices.refunds),('command_document_count',invoices.documents),('command_document_value',invoices.document_value),
 ('command_order_count',orders.confirmed_count),('command_order_value',orders.confirmed_value),('command_cancelled_count',orders.cancelled_count),
 ('command_cancelled_value',orders.cancelled_value),('command_decided_orders',orders.confirmed_count+orders.cancelled_count),
 ('command_order_status_count',orders.all_count),('command_order_status_value',orders.all_value),
 ('command_receipt_count',receipts.all_count),('command_receipt_value',receipts.all_value),('command_cash_received',receipts.cash)) value(measure,amount)`,[scope.companyId,scope.from,scope.to,scope.timeZone])).rows;
 for(const check of checks){
  const actual=controls.find(control=>control.measure===check.measure&&control.dimensions===null);
  if(scope.measures.includes(check.measure)&&(actual?.value??'0.000000')!==check.amount)throw new Error('Independent Sales Command Center header reconciliation failed');
 }
}
