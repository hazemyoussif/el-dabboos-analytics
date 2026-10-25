import { OdooOrmClient } from './client.ts';
import type { OdooOrmModel } from './client.ts';
import { ormId } from './json.ts';

const requirements: Partial<Record<OdooOrmModel, Record<string, string>>> = {
  'res.company': { currency_id: 'many2one' },
  'sale.order': { company_id: 'many2one', currency_id: 'many2one', date_order: 'datetime', state: 'selection',
    user_id: 'many2one', partner_id: 'many2one', business_line_id: 'many2one', amount_total: 'monetary', write_date: 'datetime' },
  'account.move': { company_id: 'many2one', company_currency_id: 'many2one', currency_id: 'many2one', invoice_date: 'date',
    state: 'selection', move_type: 'selection', invoice_user_id: 'many2one', partner_id: 'many2one', business_line_id: 'many2one',
    amount_untaxed_signed: 'monetary', amount_tax_signed: 'monetary', amount_total_signed: 'monetary', write_date: 'datetime' },
  'business.line': { name: 'char', write_date: 'datetime' },
  'sale.order.line': { order_id: 'many2one', invoice_lines: 'many2many' },
  'account.move.line': { move_id: 'many2one', account_id: 'many2one', balance: 'monetary', amount_residual: 'monetary', date: 'date' },
  'res.partner': { name: 'char', city: 'char', state_id: 'many2one', write_date: 'datetime' },
  'res.users': { partner_id: 'many2one', write_date: 'datetime' },
  'res.currency': { name: 'char', rounding: 'float' },
  'account.account': { account_type: 'selection' },
  'account.payment': { move_id: 'many2one', payment_type: 'selection', partner_type: 'selection' },
  'account.partial.reconcile': { debit_move_id: 'many2one', credit_move_id: 'many2one', amount: 'monetary', max_date: 'date' },
  'account.full.reconcile': {},
};
export interface OdooOrmDiscovery {
  version: 18;
  companyIds: string[];
  models: { model: OdooOrmModel; readable: boolean; issues: string[] }[];
  schemaCompatible: boolean;
  consistency: 'independent_requests';
  certifiedIngestion: false;
}

/** Metadata and company IDs only. Never emits customer records or destinations. */
export async function discoverOdooOrm(client: OdooOrmClient): Promise<OdooOrmDiscovery> {
  await client.authenticate();
  const companies = await client.searchRead('res.company', [], [], { limit: Math.min(client.config.batchSize, 64) });
  const companyIds = companies.map(company => ormId(company.id)).sort();
  if (companyIds.join(',') !== [...client.config.companyIds].sort().join(',')) throw new Error('Odoo ORM company scope unavailable');
  const models: OdooOrmDiscovery['models'] = [];
  for (const [name, required] of Object.entries(requirements)) {
    const model = name as OdooOrmModel;
    const readable = await client.readable(model);
    const fields = readable ? await client.fields(model) : {};
    const issues = Object.entries(required).filter(([field, type]) => fields[field]?.type !== type).map(([field]) => field);
    if ((model === 'sale.order' || model === 'account.move') && fields.business_line_id?.relation !== 'business.line') issues.push('business_line_relation');
    models.push({ model, readable, issues });
  }
  return { version: 18, companyIds, models, schemaCompatible: models.every(model => model.readable && !model.issues.length),
    consistency: 'independent_requests', certifiedIngestion: false };
}
