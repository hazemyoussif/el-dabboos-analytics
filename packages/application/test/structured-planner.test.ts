import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch, dashboardPatchSchema, dashboardSpecSchema, tenantProfiles } from '@el-dabbous/domain';
import type { DashboardSpec, LLMProvider, PlannerCapabilities, StructuredOutputRequest } from '@el-dabbous/domain';
import { StructuredDashboardPlanner } from '../src/structured-planner.ts';

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
  assert.deepEqual(sent.responseFormat.jsonSchema, dashboardSpecSchema);
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
  assert.deepEqual(provider.requests[0]!.responseFormat.jsonSchema, dashboardPatchSchema);
  assert.ok(provider.requests[0]!.messages[1]!.content.includes('Current DashboardSpec v2'));
  const forbiddenPatch = { schemaVersion: 2 as const, operations: [{ op: 'replace' as const, widgetId: 'revenue', widget: { id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'outstanding_amount' }] } }] };
  const badProvider = new SequenceProvider([forbiddenPatch]);
  const guarded = new StructuredDashboardPlanner(badProvider, { maxRepairAttempts: 0 });
  await assert.rejects(guarded.edit(spec, 'Show finance', profile, capabilities), { code: 'METRIC_FORBIDDEN' });
});
