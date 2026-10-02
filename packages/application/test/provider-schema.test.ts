import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardPatchSchema, dashboardSpecSchema, validateDashboardPatch, validateDashboardSpec } from '@el-dabboos/domain';
import type { DashboardSpec } from '@el-dabboos/domain';
import { projectProviderSchema } from '../src/provider-schema.ts';

const forbidden = new Set(['$schema', '$id', 'const', 'pattern', 'minLength', 'maxLength', 'format']);
function assertPortable(node: unknown): void {
  if (Array.isArray(node)) { node.forEach(assertPortable); return; }
  if (node === null || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    assert.ok(!forbidden.has(key), `Unexpected provider keyword ${key}`);
    assertPortable(value);
  }
}
const spec: DashboardSpec = { schemaVersion: 2, id: 'sales', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: {}, layout: { columns: 1 }, widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };

test('provider projection whitelists supported structure and converts scalar and boolean const', () => {
  const specBefore = structuredClone(dashboardSpecSchema);
  const patchBefore = structuredClone(dashboardPatchSchema);
  const projectedSpec = projectProviderSchema(dashboardSpecSchema);
  const projectedPatch = projectProviderSchema(dashboardPatchSchema);
  assertPortable(projectedSpec);
  assertPortable(projectedPatch);
  assert.deepEqual(projectedSpec.properties, {
    schemaVersion: { enum: [2] }, id: { $ref: '#/$defs/id' }, title: { $ref: '#/$defs/text' }, locale: { enum: ['en', 'ar'] },
    filters: { $ref: '#/$defs/filters' }, layout: { $ref: '#/$defs/layout' },
    widgets: { type: 'array', minItems: 1, maxItems: 30, items: { $ref: '#/$defs/widget' } },
  });
  const specDefs = projectedSpec.$defs as Record<string, Record<string, unknown>>;
  assert.deepEqual(specDefs.id, { type: 'string' });
  assert.deepEqual((specDefs.analysis!.properties as Record<string, unknown>).runningTotal, { type: 'boolean' });
  assert.equal(specDefs.analysis!.additionalProperties, false);
  assert.deepEqual(projectedPatch.properties && (projectedPatch.properties as Record<string, unknown>).schemaVersion, { enum: [2] });
  const patchOperations = (projectedPatch.properties as Record<string, Record<string, unknown>>).operations;
  const addOperation = (patchOperations!.items as Record<string, unknown>).oneOf as Array<Record<string, unknown>>;
  assert.deepEqual((addOperation[0]!.properties as Record<string, unknown>).op, { enum: ['add'] });
  assert.deepEqual(dashboardSpecSchema, specBefore);
  assert.deepEqual(dashboardPatchSchema, patchBefore);
});

test('canonical validation still rejects values permitted by the relaxed provider shape', () => {
  const projectedSpec = projectProviderSchema(dashboardSpecSchema);
  const specDefs = projectedSpec.$defs as Record<string, Record<string, unknown>>;
  assert.deepEqual(specDefs.id, { type: 'string' });
  const invalidId = structuredClone(spec);
  invalidId.id = 'Invalid ID';
  assert.throws(() => validateDashboardSpec(invalidId), /Invalid DashboardSpec/);

  const invalidBoolean = structuredClone(spec);
  invalidBoolean.widgets[0]!.series[0]!.analysis = { runningTotal: false as true };
  assert.deepEqual((specDefs.analysis!.properties as Record<string, unknown>).runningTotal, { type: 'boolean' });
  assert.throws(() => validateDashboardSpec(invalidBoolean), /Invalid DashboardSpec/);

  const projectedPatch = projectProviderSchema(dashboardPatchSchema);
  const patchDefs = projectedPatch.$defs as Record<string, Record<string, unknown>>;
  assert.deepEqual((patchDefs.text!.properties as Record<string, unknown>).en, { type: 'string' });
  assert.throws(() => validateDashboardPatch({ schemaVersion: 2, operations: [{ op: 'set_title', title: { en: '', ar: 'عنوان' } }] }), /Invalid DashboardPatch/);
});
