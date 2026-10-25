import type { OdooOrmModel, OrmRow } from './client.ts';

/** Closed source vocabulary used by the existing event, Business, review and Finance recipes. */
export const stageModels: readonly { model: OdooOrmModel; table: string }[] = [
  {model:'res.company',table:'res_company'}, {model:'res.currency',table:'res_currency'},
  {model:'business.line',table:'business_line'}, {model:'res.country.state',table:'res_country_state'},
  {model:'res.partner',table:'res_partner'}, {model:'res.users',table:'res_users'},
  {model:'res.partner.category',table:'res_partner_category'},
  {model:'product.category',table:'product_category'}, {model:'product.brand',table:'product_brand'},
  {model:'uom.uom',table:'uom_uom'}, {model:'product.template',table:'product_template'},
  {model:'product.product',table:'product_product'}, {model:'account.account',table:'account_account'},
  {model:'account.journal',table:'account_journal'}, {model:'sale.order',table:'sale_order'},
  {model:'sale.order.line',table:'sale_order_line'}, {model:'purchase.order',table:'purchase_order'},
  {model:'purchase.order.line',table:'purchase_order_line'}, {model:'account.move',table:'account_move'},
  {model:'account.move.line',table:'account_move_line'}, {model:'account.payment',table:'account_payment'},
  {model:'account.partial.reconcile',table:'account_partial_reconcile'},
  {model:'stock.location',table:'stock_location'}, {model:'stock.warehouse',table:'stock_warehouse'},
  {model:'stock.lot',table:'stock_lot'}, {model:'stock.quant',table:'stock_quant'},
  {model:'stock.move',table:'stock_move'}, {model:'stock.move.line',table:'stock_move_line'},
];
const recipeFields = new Set([
  'id','name','active','company_id','company_ids','currency_id','company_currency_id','rounding','write_date','create_date',
  'account_id','account_type','amount','amount_currency','amount_residual','amount_residual_signed','amount_total','amount_total_signed',
  'amount_tax','amount_tax_signed','amount_untaxed','amount_untaxed_signed','balance','business_line_id','categ_id','category_id',
  'commercial_partner_id','credit_move_id','date','date_maturity','date_order','debit_move_id','display_type','expiration_date',
  'factor','invoice_date','invoice_user_id','journal_id','location_dest_id','location_id','lot_id','margin','max_date',
  'move_id','move_type','order_id','owner_id','parent_path','parent_id','partner_id','partner_type','payment_state','payment_type',
  'price_subtotal','product_brand_id','product_id','product_tmpl_id','product_uom','product_uom_id','product_uom_qty','product_qty',
  'qty_delivered','qty_received','qty_invoiced','quantity','quantity_product_uom','salesperson_id','state','state_id','type',
  'uom_id','usage','user_id','view_location_id','city','area','latitude','partner_latitude','longitude','partner_longitude',
  'gps_shop_location','shop_gps_location','sale_line_ids','invoice_lines',
]);
export const stageBridges = [
  {model:'res.partner',field:'category_id',table:'res_partner_res_partner_category_rel',left:'partner_id',right:'category_id'},
  {model:'sale.order.line',field:'invoice_lines',table:'sale_order_line_invoice_rel',left:'order_line_id',right:'invoice_line_id'},
] as const;
export interface StageColumn {name:string;type:'bigint'|'numeric'|'boolean'|'text'|'date'|'timestamp'|'jsonb';ormType:string;translated:boolean;companyDependent:boolean}
export interface StageModel {model:OdooOrmModel;table:string;columns:StageColumn[];fields:string[];domain:unknown[]}

export function stageIdentifier(value:string):string {
  if(!/^[a-z_][a-z0-9_]{0,62}$/.test(value))throw new Error('Invalid owned staging identifier');
  return `"${value}"`;
}
function column(name:string,metadata:OrmRow):StageColumn|null {
  if(!recipeFields.has(name)||metadata.store===false)return null;
  const ormType=String(metadata.type);
  const translated=metadata.translate===true,companyDependent=metadata.company_dependent===true;
  const types:Record<string,StageColumn['type']>={integer:'bigint',many2one:'bigint',float:'numeric',monetary:'numeric',boolean:'boolean',
    char:'text',selection:'text',text:'text',date:'date',datetime:'timestamp',json:'jsonb'};
  const type=translated||companyDependent?'jsonb':types[ormType];
  return type?{name,type,ormType,translated,companyDependent}:null;
}
export function stageModel(descriptor:typeof stageModels[number],fields:Record<string,OrmRow>):StageModel {
  const columns=Object.entries(fields).flatMap(([name,metadata])=>{const selected=column(name,metadata);return selected?[selected]:[];});
  if(!columns.some(field=>field.name==='id'))throw new Error('Owned staging requires stable model identities');
  for(const field of columns)stageIdentifier(field.name);
  const bridgeFields=stageBridges.filter(bridge=>bridge.model===descriptor.model).map(bridge=>bridge.field);
  if(bridgeFields.some(field=>!fields[field]))throw new Error('Required Odoo relationship unavailable');
  const domain:unknown[]=descriptor.model==='res.company'?[['id','=',1]]:[];
  if(descriptor.model==='res.users'&&fields.company_ids)domain.push(['company_ids','in',[1]]);
  else if(fields.company_id)domain.push('|',['company_id','=',false],['company_id','=',1]);
  else if(fields.company_ids)domain.push(['company_ids','in',[1]]);
  return {...descriptor,columns,fields:[...new Set([...columns.map(field=>field.name),...bridgeFields])],domain};
}
