import assert from 'node:assert/strict';
import test from 'node:test';
import { validateOdooPilotManifest, executeOdooPilot } from '../src/odoo-pilot.ts';
import type { OdooPilotManifest } from '../src/odoo-pilot.ts';

const manifest: OdooPilotManifest = {
  mapping: { tenantId: 'el-dabboos-iq',sourceId: 'el-dabboos-odoo18-pg',datasetId: 'synthetic-comparison',mappingId: 'odoo18',mappingVersion: '1',businessOwner: 'SYNTHETIC ONLY',reportingCurrency: 'IQD',timeZone: 'Asia/Baghdad' },
  run: { tenantId: 'el-dabboos-iq',sourceId: 'el-dabboos-odoo18-pg',companyIds: ['1'],datasetId: 'synthetic-comparison',mappingId: 'odoo18',mappingVersion: '1',extractionId: 'synthetic-orders',sourceObjects: ['sale_order'],from: '2026-09-01',to: '2026-09-30',sourceAsOf: '2026-10-01T00:00:00.000Z',frozenRevision: 'synthetic-freeze',freezeReference: 'IMMUTABLE SYNTHETIC SNAPSHOT',completeness: 'complete_scope' },
};
test('pilot manifest requires exact approved tenant/company, registered mapping scope and certified September freeze',() => {
  assert.equal(validateOdooPilotManifest(manifest),manifest);
  assert.throws(() => validateOdooPilotManifest({ ...manifest,run: { ...manifest.run,companyIds: ['2'] } }),/identity/);
  assert.throws(() => validateOdooPilotManifest({ ...manifest,run: { ...manifest.run,mappingVersion: '2' } }),/scope conflict/);
  assert.throws(() => validateOdooPilotManifest({ ...manifest,run: { ...manifest.run,freezeReference: '' } }),/identity/);
  assert.throws(() => validateOdooPilotManifest({ ...manifest,run: { ...manifest.run,to: '2026-10-31' } }),/scope/);
});
test('pilot composition refuses approval/binding commands before opening any connection',async () => {
  await assert.rejects(executeOdooPilot('approve',manifest,{}),/Unknown pilot command/);
  await assert.rejects(executeOdooPilot('bind',manifest,{}),/Unknown pilot command/);
  await assert.rejects(executeOdooPilot('register',manifest,{}),/Missing pilot mart configuration/);
});
