import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch, dashboardPatchSchema, dashboardSpecSchema, tenantProfiles } from '@el-dabbous/domain';
import type { DashboardSpec, LLMProvider, PlannerCapabilities, StructuredOutputRequest } from '@el-dabbous/domain';
import { StructuredDashboardPlanner } from '../src/structured-planner.ts';
import { projectProviderSchema } from '../src/provider-schema.ts';

const profile = tenantProfiles['demo-iq'];
const capabilities: PlannerCapabilities = { metricIds: ['revenue'], templateIds: ['sales-team', 'sales-performance'], actions: ['ai:generate', 'ai:edit'] };
const spec: DashboardSpec = { schemaVersion: 2, id: 'generated-sales', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: { dateRange: { from: '2026-01-01', to: '2026-01-31' } }, layout: { columns: 1 },
  widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
const request = { prompt: 'Show revenue', locale: 'en' as const, context: { tenantId: profile.id, locale: 'en' as const }, tenantProfile: profile, capabilities };
class SequenceProvider implements LLMProvider {
  readonly requests: StructuredOutputRequest[] = [];
  constructor(private readonly outputs: unknown[]) {}
  async generateStructured(input: StructuredOutputRequest) {
    this.requests.push(input);
    return { output: this.outputs.shift(), providerId: 'fake', latencyMs: 1, attempts: 1 };
  }
}
test('generation sends only authorized metrics and compatible template metadata with the governed v2 schema', async () => {
  const provider = new SequenceProvider([spec]);
  const planner = new StructuredDashboardPlanner(provider, { clock: () => new Date('2026-10-01T00:00:00Z') });
  assert.deepEqual(await planner.generate(request), spec);
  const sent = provider.requests[0]!;
  assert.equal(sent.responseFormat.name, 'dashboard_spec_v2');
  assert.deepEqual(sent.responseFormat.jsonSchema, projectProviderSchema(dashboardSpecSchema));
  const system = sent.messages[0]!.content;
  assert.ok(system.includes('"id":"revenue"'));
  assert.ok(!system.includes('outstanding_amount'));
  assert.ok(!system.includes('sales-performance'));
  assert.ok(!system.includes('branchLabels'));
  assert.ok(system.includes('"tenantId":"demo-iq"'));
});
test('invalid generation is repaired once and unauthorized metrics never return', async () => {
  const forbidden = structuredClone(spec); forbidden.widgets[0]!.series[0]!.metric = 'outstanding_amount';
  const provider = new SequenceProvider([forbidden, spec]);
  const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 1 });
  assert.deepEqual(await planner.generate(request), spec);
  assert.equal(provider.requests.length, 2);
  assert.equal(provider.requests[1]!.messages.length, 3);
  assert.ok(provider.requests[1]!.messages[2]!.content.includes('authorized planner capabilities'));
});
test('bounded repair rejects persistently malformed output and missing capabilities', async () => {
  const provider = new SequenceProvider(['not JSON', { schemaVersion: 2 }]);
  const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 1 });
  await assert.rejects(planner.generate(request), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.equal(provider.requests.length, 2);
  const missingCapabilities = { prompt: request.prompt, locale: request.locale, context: request.context, tenantProfile: request.tenantProfile };
  await assert.rejects(planner.generate(missingCapabilities), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.equal(provider.requests.length, 2);
});
test('patch editing uses patch schema and validates the resulting dashboard authorization', async () => {
  const patch = { schemaVersion: 2 as const, operations: [{ op: 'set_title' as const, title: { en: 'Updated', ar: 'محدّث' } }] };
  const provider = new SequenceProvider([patch]);
  const planner = new StructuredDashboardPlanner(provider);
  assert.deepEqual(await planner.edit(spec, 'Rename', profile, capabilities), patch);
  assert.equal(applyDashboardPatch(spec, patch).title.en, 'Updated');
  assert.deepEqual(provider.requests[0]!.responseFormat.jsonSchema, projectProviderSchema(dashboardPatchSchema));
  assert.ok(provider.requests[0]!.messages[1]!.content.includes('Current DashboardSpec v2'));
  const forbiddenPatch = { schemaVersion: 2 as const, operations: [{ op: 'replace' as const, widgetId: 'revenue', widget: { id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'outstanding_amount' }] } }] };
  const badProvider = new SequenceProvider([forbiddenPatch]);
  const guarded = new StructuredDashboardPlanner(badProvider, { maxRepairAttempts: 0 });
  await assert.rejects(guarded.edit(spec, 'Show finance', profile, capabilities), { code: 'METRIC_FORBIDDEN' });
});
test('planner rejects projected-schema output that violates canonical string and boolean constraints', async () => {
  const invalidId = structuredClone(spec);
  invalidId.id = 'Invalid ID';
  const generationProvider = new SequenceProvider([invalidId]);
  const planner = new StructuredDashboardPlanner(generationProvider, { maxRepairAttempts: 0 });
  await assert.rejects(planner.generate(request), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.deepEqual(generationProvider.requests[0]!.responseFormat.jsonSchema, projectProviderSchema(dashboardSpecSchema));

  const invalidPatch = { schemaVersion: 2, operations: [{ op: 'set_title', title: { en: '', ar: 'عنوان' } }] };
  const editProvider = new SequenceProvider([invalidPatch]);
  const editPlanner = new StructuredDashboardPlanner(editProvider, { maxRepairAttempts: 0 });
  await assert.rejects(editPlanner.edit(spec, 'Rename', profile, capabilities), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.deepEqual(editProvider.requests[0]!.responseFormat.jsonSchema, projectProviderSchema(dashboardPatchSchema));
});
test('diagnostics report schema failures on each repair attempt without echoing prompt text', async () => {
  const invalid = structuredClone(spec);
  invalid.id = 'Invalid ID';
  invalid.title.en = 'prompt-secret-phrase';
  const events: import('../src/structured-diagnostics.ts').StructuredPlannerDiagnostic[] = [];
  const provider = new SequenceProvider([invalid, invalid]);
  const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 1, diagnostics: event => events.push(event) });
  await assert.rejects(planner.generate({ ...request, prompt: 'prompt-secret-phrase' }), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.equal(events.length, 2);
  assert.deepEqual(events.map(event => event.attempt), [1, 2]);
  assert.equal(events[0]!.operation, 'generation');
  assert.equal(events[0]!.schemaName, 'dashboard_spec_v2');
  assert.equal(events[0]!.providerId, 'fake');
  assert.equal(events[0]!.stage, 'schema');
  assert.ok(events[0]!.details.some(issue => issue.instancePath === '/id' && issue.keyword === 'pattern'));
  assert.ok(!events[0]!.outputPreview.includes('prompt-secret-phrase'));
});

test('diagnostics identify semantic widget failures and patch schema failures', async () => {
  const incompatible = structuredClone(spec);
  incompatible.widgets[0] = { id: 'mixed', type: 'line', dimension: 'month', series: [
    { id: 'revenue', metric: 'revenue' }, { id: 'margin', metric: 'gross_margin' },
  ] };
  const events: import('../src/structured-diagnostics.ts').StructuredPlannerDiagnostic[] = [];
  const planner = new StructuredDashboardPlanner(new SequenceProvider([incompatible]), { maxRepairAttempts: 0, diagnostics: event => events.push(event) });
  await assert.rejects(planner.generate(request), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.equal(events[0]!.stage, 'semantic');
  assert.match(events[0]!.details[0]!.message, /incompatible series/);

  const patch = { schemaVersion: 2, operations: [{ op: 'set_title', title: { en: '', ar: 'عنوان' } }] };
  const editor = new StructuredDashboardPlanner(new SequenceProvider([patch]), { maxRepairAttempts: 0, diagnostics: event => events.push(event) });
  await assert.rejects(editor.edit(spec, 'Rename', profile, capabilities), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.equal(events[1]!.operation, 'edit');
  assert.equal(events[1]!.schemaName, 'dashboard_patch_v2');
  assert.equal(events[1]!.stage, 'schema');
  assert.ok(events[1]!.details.some(issue => issue.keyword === 'minLength'));
});
