import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultTenantSourceSettings } from '@el-dabboos/domain';
import { inspectOdooSourceSettings } from '../../src/odoo/settings-inspector.ts';
import { sourceSchemaRequirements } from '../../src/odoo/settings-schema.ts';
import { database, enabled } from './support.ts';

test('source inspector reads a real synthetic schema, verifies FK/version/scope and rolls back failures', { skip: !enabled }, async () => {
  const db = await database(false);
  const settings = { ...defaultTenantSourceSettings(), sourceId: 'synthetic-source', connectionRef: 'synthetic-connection' };
  try {
    const tables = new Map<string, Map<string, string>>();
    for (const required of sourceSchemaRequirements(settings)) {
      if (!tables.has(required.table)) tables.set(required.table, new Map());
      tables.get(required.table)!.set(required.field, required.types[0]!);
    }
    for (const [table, columns] of tables) {
      const fields = [...columns].map(([name, type]) => `"${name}" ${type}${name === 'id' ? ' PRIMARY KEY' : ''}`);
      await db.admin.query(`CREATE TABLE public."${table}" (${fields.join(',')})`);
    }
    await db.admin.query(`ALTER TABLE sale_order ADD FOREIGN KEY (business_line_id) REFERENCES business_line(id),ADD FOREIGN KEY (user_id) REFERENCES res_users(id);
      ALTER TABLE account_move ADD FOREIGN KEY (business_line_id) REFERENCES business_line(id),ADD FOREIGN KEY (invoice_user_id) REFERENCES res_users(id);
      CREATE TABLE ir_module_module(name text,state text,latest_version text);
      INSERT INTO ir_module_module VALUES ('base','installed','18.0.1.3');
      CREATE TABLE res_company(id integer PRIMARY KEY); INSERT INTO res_company VALUES(1);
      CREATE TABLE ir_config_parameter(key text,value text); INSERT INTO ir_config_parameter VALUES ('database.uuid','synthetic-instance-identity');`);
    const result = await inspectOdooSourceSettings(db.admin, settings);
    assert.equal(result.compatible, true); assert.equal(result.observedMajor, 18);
    assert.match(result.instanceFingerprint!, /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(result).includes('synthetic-instance-identity'));
    assert.equal((await inspectOdooSourceSettings(db.admin, { ...settings, companyIds: ['2'] })).issues[0]?.code, 'company_scope');
    await db.admin.query('ALTER TABLE sale_order DROP COLUMN business_line_id');
    const missing = await inspectOdooSourceSettings(db.admin, settings);
    assert.equal(missing.compatible, false);
    assert.ok(missing.issues.some(issue => issue.field === 'sale_order.business_line_id'));
    await db.admin.query('DROP TABLE ir_module_module');
    await assert.rejects(inspectOdooSourceSettings(db.admin, settings));
    assert.equal((await db.admin.query("SELECT current_setting('transaction_read_only') read_only")).rows[0].read_only, 'off');
    assert.equal((await db.admin.query('SELECT count(*)::int rows FROM sale_order')).rows[0].rows, 0);
  } finally { await db.close(); }
});
