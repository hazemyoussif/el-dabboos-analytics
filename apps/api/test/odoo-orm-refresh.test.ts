import test from 'node:test';
import assert from 'node:assert/strict';
import {executeOdooOrmRefresh} from '../src/odoo-orm-refresh.ts';

test('refresh uses the ordinary sync tenant validation before connecting',async()=>{
 await assert.rejects(executeOdooOrmRefresh(['--tenant','synthetic'],{}),/scope/);
 await assert.rejects(executeOdooOrmRefresh(['--tenant','synthetic','--accept-observed'],{ODOO_ORM_TENANT_ID:'foreign'}),/scope/);
});
