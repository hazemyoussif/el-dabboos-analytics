import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultTenantSourceSettings } from '@el-dabboos/domain';
import { sourceSchemaIssues, sourceSchemaRequirements } from '../src/odoo/settings-schema.ts';
const settings = () => ({ ...defaultTenantSourceSettings(), sourceId: 'synthetic-source', connectionRef: 'synthetic-connection' });
function fixture() {
  const configuration = settings();
  const columns = sourceSchemaRequirements(configuration).map(required => ({ table_name: required.table, column_name: required.field, data_type: required.types[0]! }));
  const relations = [
    { table_name: 'sale_order', column_name: 'business_line_id', target_table: 'business_line', target_column: 'id' },
    { table_name: 'account_move', column_name: 'business_line_id', target_table: 'business_line', target_column: 'id' },
    { table_name: 'sale_order', column_name: 'user_id', target_table: 'res_users', target_column: 'id' },
    { table_name: 'account_move', column_name: 'invoice_user_id', target_table: 'res_users', target_column: 'id' },
  ];
  return { configuration, columns, relations };
}
test('physical checks reject missing Business Line, imprecise money and unrelated relations', () => {
  const { configuration, columns, relations } = fixture();
  assert.deepEqual(sourceSchemaIssues(configuration, columns, relations), []);
  const missing = sourceSchemaIssues(configuration, columns.filter(column => column.table_name !== 'business_line'), relations);
  assert.ok(missing.some(issue => issue.field === 'business_line.id' && issue.code === 'missing_field'));
  columns.find(column => column.column_name === 'amount_untaxed')!.data_type = 'double precision';
  relations[0]!.target_table = 'crm_team';
  const issues = sourceSchemaIssues(configuration, columns, relations);
  assert.ok(issues.some(issue => issue.code === 'field_type' && issue.field === 'sale_order.amount_untaxed'));
  assert.ok(issues.some(issue => issue.code === 'missing_relation' && issue.field === 'sale_order.business_line_id'));
});
test('custom physical bindings are evaluated without mutating legacy mappings or executing SQL', () => {
  const { configuration, columns, relations } = fixture();
  configuration.mapping.businessLine.table = 'x_branch';
  configuration.mapping.businessLine.orderField = 'x_branch_id';
  configuration.mapping.businessLine.invoiceField = 'x_branch_id';
  for (const column of columns) {
    if (column.table_name === 'business_line') column.table_name = 'x_branch';
    if (column.column_name === 'business_line_id') column.column_name = 'x_branch_id';
  }
  for (const relation of relations) if (relation.target_table === 'business_line') { relation.target_table = 'x_branch'; relation.column_name = 'x_branch_id'; }
  assert.deepEqual(sourceSchemaIssues(configuration, columns, relations), []);
  assert.equal(settings().mapping.businessLine.table, 'business_line');
});
