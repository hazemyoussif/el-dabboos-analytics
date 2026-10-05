import assert from 'node:assert/strict';
import test from 'node:test';
import { validateOdooPilotManifest, executeOdooPilot } from '../src/odoo-pilot.ts';
import type { OdooPilotManifest } from '../src/odoo-pilot.ts';

const manifest: OdooPilotManifest = {
  mapping: { tenantId: 'el-dabboos-iq',sourceId: 'el-dabboos-odoo18-pg',datasetId: 'synthetic-comparison',mappingId: 'odoo18',mappingVersion: '1',businessOwner: 'SYNTHETIC ONLY',reportingCurrency: 'IQD',timeZone: 'Asia/Baghdad' },
  extractionId: 'synthetic-pilot',
};
test('pilot manifest requires exact approved identity and rejects operator-supplied snapshot evidence',() => {
  assert.equal(validateOdooPilotManifest(manifest),manifest);
  assert.throws(() => validateOdooPilotManifest({ ...manifest,mapping: { ...manifest.mapping,tenantId: 'demo-iq' } }),/identity/);
  assert.throws(() => validateOdooPilotManifest({ ...manifest,frozenRevision: 'descriptive string' }),/manifest/);
  assert.throws(() => validateOdooPilotManifest({ ...manifest,sourceAsOf: '2026-10-01T00:00:00.000Z' }),/manifest/);
  assert.throws(() => validateOdooPilotManifest({ ...manifest,extractionId: '' }),/identity/);
});
test('pilot composition refuses approval/binding commands before opening any connection',async () => {
  await assert.rejects(executeOdooPilot('approve',manifest,{}),/Unknown pilot command/);
  await assert.rejects(executeOdooPilot('bind',manifest,{}),/Unknown pilot command/);
  await assert.rejects(executeOdooPilot('ingest',manifest,{}),/Unknown pilot command/);
  await assert.rejects(executeOdooPilot('reconcile-db',manifest,{}),/Unknown pilot command/);
  await assert.rejects(executeOdooPilot('register',manifest,{}),/Missing pilot mart configuration/);
});
