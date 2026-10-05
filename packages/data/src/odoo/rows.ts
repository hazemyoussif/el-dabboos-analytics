/** Source transport DTOs stay in the Odoo adapter. Numeric and timestamp values remain exact text. */
export interface OdooTransactionRow {
  id: string; company_id: string; write_date: string; business_date: string | null;
  state: string; currency: string; currency_id: string;
  salesperson_id: string | null; salesperson_name: string | null;
  partner_id: string | null; partner_name: string | null;
  business_line_id: string | null; business_line_name: string | null;
  city: string | null; state_id: string | null; state_name: string | null; area: string | null;
  latitude?: string | null; longitude?: string | null; shop_gps?: string | null;
  amount_untaxed: string; amount_tax: string; amount_total: string;
}
export interface OdooSaleOrderSourceRow extends OdooTransactionRow { object: 'sale_order' }
export interface OdooAccountMoveSourceRow extends OdooTransactionRow {
  object: 'account_move'; move_type: string; payment_state: string | null;
  order_lineage: readonly { order_id: string; order_line_id: string; invoice_line_id: string }[];
}
export type OdooSourceRow = OdooSaleOrderSourceRow | OdooAccountMoveSourceRow;
