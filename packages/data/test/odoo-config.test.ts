import assert from 'node:assert/strict';
import test from 'node:test';
import { odooSourceConfig } from '../src/odoo/config.ts';

const scope={tenantId:'el-dabboos-iq',sourceId:'el-dabboos-odoo18-pg'};
const base={
  ODOO_SOURCE_PORT:'5432',
  ODOO_SOURCE_DATABASE:'accounting',
  ODOO_SOURCE_USER:'reader',
  ODOO_SOURCE_PASSWORD:'secret',
  ODOO_SOURCE_COMPANY_IDS:'1'
};

test('direct Odoo host is allowed only for the explicitly scoped hosted staging exception',()=>{
  const config=odooSourceConfig({...base,ENVIRONMENT:'staging',ODOO_SOURCE_STAGING_PILOT:'true',ODOO_SOURCE_HOST:'65.109.129.170'},scope);
  assert.equal(config.connection.host,'65.109.129.170');
  assert.equal(config.credentialPolicy,'staging_read_only');

  assert.throws(()=>odooSourceConfig({...base,ODOO_SOURCE_HOST:'65.109.129.170'},scope),/externally managed local tunnel/);
  assert.throws(()=>odooSourceConfig({...base,ENVIRONMENT:'production',ODOO_SOURCE_STAGING_PILOT:'true',ODOO_SOURCE_HOST:'65.109.129.170'},scope),/externally managed local tunnel/);
  assert.throws(()=>odooSourceConfig({...base,ENVIRONMENT:'staging',ODOO_SOURCE_STAGING_PILOT:'true',ODOO_SOURCE_HOST:'65.109.129.170'},{tenantId:'other',sourceId:'el-dabboos-odoo18-pg'}),/Unapproved staging pilot scope/);
});

test('loopback Odoo source remains the default path',()=>{
  const config=odooSourceConfig({...base,ODOO_SOURCE_HOST:'127.0.0.1'},scope);
  assert.equal(config.connection.host,'127.0.0.1');
  assert.equal(config.credentialPolicy,'least_privilege');
});

test('an explicit API source selection cannot fall back to PostgreSQL',()=>{
 assert.throws(()=>odooSourceConfig({...base,ODOO_SOURCE_HOST:'127.0.0.1',ANALYTICS_SOURCE_MODE:'odoo-orm-observed'},scope),/disabled by the selected transport/);
});
