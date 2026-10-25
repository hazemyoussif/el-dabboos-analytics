import type { SourceCompatibilityIssue, SourceHeaderMapping, TenantSourceSettings } from '@el-dabboos/domain';
import { validateTenantSourceSettings } from '@el-dabboos/domain';

export interface SourceSchemaColumn { table_name: string; column_name: string; data_type: string }
export interface SourceSchemaRelation { table_name: string; column_name: string; target_table: string; target_column: string }
interface Requirement { table: string; field: string; types: readonly string[] }
const integer = ['integer', 'bigint', 'smallint'];
const timestamp = ['timestamp without time zone'];
const text = ['text', 'character varying'];
const field = (table: string, name: string, types: readonly string[]): Requirement => ({ table, field: name, types });
function headerRequirements(table: string, mapping: SourceHeaderMapping): Requirement[] {
  return [field(table, 'id', integer), field(table, 'company_id', integer), field(table, 'partner_id', integer), field(table, 'currency_id', integer), field(table, 'state', text),
    field(table, mapping.date, table === 'sale_order' ? timestamp : ['date']), field(table, mapping.salesperson, integer), field(table, mapping.updatedAt, timestamp),
    ...[mapping.untaxed, mapping.tax, mapping.total].map(name => field(table, name, ['numeric']))];
}
export function sourceSchemaRequirements(settings: TenantSourceSettings): Requirement[] {
  validateTenantSourceSettings(settings);
  const business = settings.mapping.businessLine;
  return [...headerRequirements('sale_order', settings.mapping.orders), ...headerRequirements('account_move', settings.mapping.invoices),
    field('sale_order', business.orderField, integer), field('account_move', business.invoiceField, integer), field('account_move', 'move_type', text), field('account_move', 'payment_state', text),
    field(business.table, business.id, integer), field(business.table, business.label, [...text, 'jsonb']), field(business.table, business.updatedAt, timestamp),
    field('res_users', 'id', integer), field('res_users', 'partner_id', integer), field('res_users', 'write_date', timestamp),
    field('res_partner', 'id', integer), field('res_partner', 'name', text), field('res_partner', 'city', text), field('res_partner', 'state_id', integer), field('res_partner', 'write_date', timestamp),
    field('res_country_state', 'id', integer), field('res_country_state', 'name', [...text, 'jsonb']), field('res_country_state', 'write_date', timestamp),
    field('res_currency', 'id', integer), field('res_currency', 'name', text),
    field('sale_order_line', 'id', integer), field('sale_order_line', 'order_id', integer), field('account_move_line', 'id', integer), field('account_move_line', 'move_id', integer),
    field('sale_order_line_invoice_rel', 'order_line_id', integer), field('sale_order_line_invoice_rel', 'invoice_line_id', integer)];
}
/** Physical compatibility only: a foreign key proves structure, never business meaning. */
export function sourceSchemaIssues(settings: TenantSourceSettings, columns: readonly SourceSchemaColumn[], relations: readonly SourceSchemaRelation[]): SourceCompatibilityIssue[] {
  const issues: SourceCompatibilityIssue[] = [];
  for (const required of sourceSchemaRequirements(settings)) {
    const observed = columns.find(column => column.table_name === required.table && column.column_name === required.field);
    if (!observed) issues.push({ code: 'missing_field', field: `${required.table}.${required.field}` });
    else if (!required.types.includes(observed.data_type)) issues.push({ code: 'field_type', field: `${required.table}.${required.field}` });
  }
  const business = settings.mapping.businessLine;
  const expectedRelations = [['sale_order', business.orderField, business.table, business.id], ['account_move', business.invoiceField, business.table, business.id],
    ['sale_order', settings.mapping.orders.salesperson, 'res_users', 'id'], ['account_move', settings.mapping.invoices.salesperson, 'res_users', 'id']];
  for (const [table, column, target, id] of expectedRelations) {
    if (!relations.some(relation => relation.table_name === table && relation.column_name === column && relation.target_table === target && relation.target_column === id)) issues.push({ code: 'missing_relation', field: `${table}.${column}` });
  }
  return issues;
}
