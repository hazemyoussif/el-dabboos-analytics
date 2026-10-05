const updated = "greatest(transaction.write_date,(to_jsonb(partner)->>'write_date')::timestamp,(to_jsonb(rep)->>'write_date')::timestamp,(to_jsonb(rep_partner)->>'write_date')::timestamp,(to_jsonb(business)->>'write_date')::timestamp,(to_jsonb(state)->>'write_date')::timestamp)";
const dimensions = `partner.id::text partner_id,partner.name partner_name,rep.id::text salesperson_id,rep_partner.name salesperson_name,
 business.id::text business_line_id,business.name::text business_line_name,partner.city,state.id::text state_id,state.name state_name,to_jsonb(partner)->>'area' area,
 coalesce(to_jsonb(partner)->>'latitude',to_jsonb(partner)->>'partner_latitude') latitude,
 coalesce(to_jsonb(partner)->>'longitude',to_jsonb(partner)->>'partner_longitude') longitude,
 coalesce(to_jsonb(partner)->>'gps_shop_location',to_jsonb(partner)->>'shop_gps_location') shop_gps`;
const joins = (salesperson: string) => `LEFT JOIN res_partner partner ON partner.id=transaction.partner_id
 LEFT JOIN res_users rep ON rep.id=transaction.${salesperson} LEFT JOIN res_partner rep_partner ON rep_partner.id=rep.partner_id
 LEFT JOIN business_line business ON business.id=transaction.business_line_id LEFT JOIN res_country_state state ON state.id=partner.state_id
 JOIN res_currency currency ON currency.id=transaction.currency_id`;
const lineage = `coalesce((SELECT jsonb_agg(DISTINCT jsonb_build_object('order_id',order_line.order_id::text,'order_line_id',order_line.id::text,'invoice_line_id',invoice_line.id::text))
 FROM account_move_line invoice_line JOIN sale_order_line_invoice_rel bridge ON bridge.invoice_line_id=invoice_line.id
 JOIN sale_order_line order_line ON order_line.id=bridge.order_line_id JOIN sale_order linked_order ON linked_order.id=order_line.order_id
 WHERE invoice_line.move_id=transaction.id AND linked_order.company_id=transaction.company_id),'[]'::jsonb) order_lineage`;
/** Closed source object vocabulary, parameterized scope/date/cursor/limit; no report view or creator attribution. */
export function odooTransactionSql(object: 'sale_order'|'account_move'): string {
  const date = object==='sale_order' ? "((transaction.date_order AT TIME ZONE 'UTC') AT TIME ZONE $7)::date" : 'transaction.invoice_date';
  const amounts = object==='sale_order'
    ? 'transaction.amount_untaxed::text amount_untaxed,transaction.amount_tax::text amount_tax,transaction.amount_total::text amount_total'
    : 'transaction.amount_untaxed_signed::text amount_untaxed,transaction.amount_tax_signed::text amount_tax,transaction.amount_total_signed::text amount_total';
  const accounting = object==='account_move' ? `,transaction.move_type,transaction.payment_state,${lineage}` : '';
  const accountingScope = object==='account_move' ? "AND ($8::boolean OR (transaction.state='posted' AND transaction.move_type IN ('out_invoice','out_refund')))" : '';
  return `SELECT transaction.id::text id,transaction.company_id::text company_id,
 to_char(${updated},'YYYY-MM-DD HH24:MI:SS.US') write_date,${date}::date::text business_date,
 transaction.state,currency.name currency,transaction.currency_id::text currency_id,${amounts},${dimensions}${accounting}
 FROM ${object} transaction ${joins(object==='sale_order' ? 'user_id' : 'invoice_user_id')}
 WHERE $7::text IS NOT NULL AND transaction.company_id=ANY($1::int[]) AND ($8::boolean OR (${date}>=$2::date AND ${date}<$3::date+INTERVAL '1 day'))
 ${accountingScope}
 AND (${updated},transaction.id)>($4::timestamp,$5::bigint)
 ORDER BY ${updated},transaction.id LIMIT $6`;
}
