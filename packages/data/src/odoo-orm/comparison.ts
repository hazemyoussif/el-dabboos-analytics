import { createHash } from 'node:crypto';
import type { OdooOrmClient, OrmDomain, OrmRow } from './client.ts';
import { ormDecimal, ormId } from './json.ts';
import { readOdooOrmPages } from './pages.ts';
import { odooOrmPeriod } from './period.ts';

export interface OdooOrmComparisonRequest { from: string; to: string; timeZone: string; currency: string }
interface ComparisonRule { name: string; model: 'sale.order' | 'account.move'; domain: OrmDomain; amount: string; currencyField: string }
export interface OdooOrmComparison {
  scope: OdooOrmComparisonRequest & { companyIds: readonly string[] };
  startedAt: string; completedAt: string;
  checks: { name: string; rows: string; value: string; aggregateValue: string; repeatedReadStable: boolean; matches: boolean }[];
  observedChecksPassed: boolean;
  consistency: 'independent_requests';
  monetaryPrecision: 'wire_preserved_storage_unproven';
  certifiedIngestion: false;
}
function rules(request: OdooOrmComparisonRequest): ComparisonRule[] {
  const period = odooOrmPeriod(request.from, request.to, request.timeZone);
  const orderDates = [['date_order', '>=', period.orderFrom], ['date_order', '<', period.orderBefore]];
  const invoiceDates = [['invoice_date', '>=', period.from], ['invoice_date', '<=', period.to], ['state', '=', 'posted']];
  return [
    { name: 'confirmed_orders', model: 'sale.order', domain: [...orderDates, ['state', '=', 'sale']], amount: 'amount_total', currencyField: 'currency_id' },
    { name: 'cancelled_orders', model: 'sale.order', domain: [...orderDates, ['state', '=', 'cancel']], amount: 'amount_total', currencyField: 'currency_id' },
    { name: 'customer_invoices', model: 'account.move', domain: [...invoiceDates, ['move_type', '=', 'out_invoice']], amount: 'amount_untaxed_signed', currencyField: 'company_currency_id' },
    { name: 'customer_refunds', model: 'account.move', domain: [...invoiceDates, ['move_type', '=', 'out_refund']], amount: 'amount_untaxed_signed', currencyField: 'company_currency_id' },
  ];
}
const units = (value: unknown) => BigInt(ormDecimal(value).replace('.', ''));
function decimal(value: bigint): string {
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${absolute / 1000000n}.${String(absolute % 1000000n).padStart(6, '0')}`;
}
function relationId(value: unknown): string {
  if (!Array.isArray(value) || value.length !== 2) throw new Error('Missing Odoo ORM currency');
  return ormId(value[0]);
}
async function scan(client: OdooOrmClient, rule: ComparisonRule, currencyId: string, deadline: number) {
  const hash = createHash('sha256');
  let value = 0n;
  let rows = 0n;
  const fields = [rule.amount, rule.currencyField, 'currency_id', 'company_id', 'write_date'];
  for await (const page of readOdooOrmPages(client, { ...rule, fields, deadline })) {
    for (const row of page) {
      if (!client.config.companyIds.includes(relationId(row.company_id))) throw new Error('Odoo ORM company isolation failure');
      if (relationId(row[rule.currencyField]) !== currencyId || relationId(row.currency_id) !== currencyId) throw new Error('Unsupported Odoo ORM currency');
      value += units(row[rule.amount]);
      rows++;
      hash.update(JSON.stringify(row));
    }
  }
  return { value: decimal(value), rows: String(rows), hash: hash.digest('hex') };
}
function groupedValue(groups: OrmRow[], field: string): string {
  if (!groups.length || groups[0]![field] === false) return '0.000000';
  return ormDecimal(groups[0]![field]);
}

/** Explicit, read-only acceptance probe. Never writes facts, certificates, cursors or serving bindings. */
export async function compareOdooOrm(client: OdooOrmClient, request: OdooOrmComparisonRequest): Promise<OdooOrmComparison> {
  if (!/^[A-Z]{3}$/.test(request.currency)) throw new Error('Explicit Odoo ORM currency required');
  const selected = rules(request);
  const startedAt = new Date().toISOString();
  const deadline = Date.now() + 120000;
  await client.authenticate();
  const currencies = await client.searchRead('res.currency', [['name', '=', request.currency]], ['name'], { limit: 2 });
  if (currencies.length !== 1) throw new Error('Unambiguous Odoo ORM currency required');
  const currencyId = ormId(currencies[0]!.id);
  const checks: OdooOrmComparison['checks'] = [];
  for (const rule of selected) {
    const first = await scan(client, rule, currencyId, deadline);
    const groups = await client.aggregate(rule.model, rule.domain, [`${rule.amount}:sum`]);
    const count = await client.count(rule.model, rule.domain);
    const second = await scan(client, rule, currencyId, deadline);
    const aggregateValue = groupedValue(groups, rule.amount);
    const repeatedReadStable = first.hash === second.hash && first.rows === second.rows;
    checks.push({ name: rule.name, rows: first.rows, value: first.value, aggregateValue, repeatedReadStable,
      matches: repeatedReadStable && first.rows === count && first.value === aggregateValue });
  }
  return { scope: { ...request, companyIds: client.config.companyIds }, startedAt, completedAt: new Date().toISOString(), checks,
    observedChecksPassed: checks.every(check => check.matches), consistency: 'independent_requests',
    monetaryPrecision: 'wire_preserved_storage_unproven', certifiedIngestion: false };
}
