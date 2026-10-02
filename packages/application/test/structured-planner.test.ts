import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch, dashboardPatchSchema, tenantProfiles, validateDashboardSpec } from '@el-dabboos/domain';
import type { DashboardSpec, LLMProvider, PlannerCapabilities, StructuredOutputRequest } from '@el-dabboos/domain';
import { StructuredDashboardPlanner } from '../src/structured-planner.ts';
import { compileDashboardGenerationPlan, dashboardGenerationPlanSchema } from '../src/generation-plan.ts';
import type { DashboardGenerationPlan } from '../src/generation-plan.ts';
import { projectProviderSchema } from '../src/provider-schema.ts';

const profile = tenantProfiles['demo-iq'];
const capabilities: PlannerCapabilities = { metricIds: ['revenue'], templateIds: ['sales-team', 'sales-performance'], actions: ['ai:generate', 'ai:edit'] };
const spec: DashboardSpec = { schemaVersion: 2, id: 'generated-sales', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: { dateRange: { from: '2026-01-01', to: '2026-01-31' } }, layout: { columns: 1 },
  widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
const now = new Date('2026-10-01T00:00:00Z');
const toPlan = (value: DashboardSpec): DashboardGenerationPlan => ({ titleEn: value.title.en, titleAr: value.title.ar,
  ...(value.filters.dateRange ? { dateFrom: value.filters.dateRange.from, dateTo: value.filters.dateRange.to } : {}),
  widgets: value.widgets.map(w => ({ type: w.type, ...(w.dimension ? { dimension: w.dimension } : {}), ...w.presentation,
    series: w.series.map(s => ({ metric: s.metric, ...s.presentation })) })) });
const plan = toPlan(spec);
const compiled = (p = plan) => compileDashboardGenerationPlan(p, profile, 'en', now);
const expectedSchema = structuredClone(dashboardGenerationPlanSchema);
expectedSchema.properties.widgets.items.properties.series.items.properties.metric.enum = ['revenue'];
const request = { prompt: 'Show revenue', locale: 'en' as const, context: { tenantId: profile.id, locale: 'en' as const }, tenantProfile: profile, capabilities };
class SequenceProvider implements LLMProvider {
  readonly requests: StructuredOutputRequest[] = [];
  constructor(private readonly outputs: unknown[]) {}
  async generateStructured(input: StructuredOutputRequest) {
    this.requests.push(input);
    return { output: this.outputs.shift(), providerId: 'fake', latencyMs: 1, attempts: 1 };
  }
}
test('generation sends authorized metadata and compact plan schema, returning a compiled canonical spec', async () => {
  const provider = new SequenceProvider([plan]);
  const planner = new StructuredDashboardPlanner(provider, { clock: () => new Date('2026-10-01T00:00:00Z') });
  assert.deepEqual(await planner.generate(request), compiled());
  const sent = provider.requests[0]!;
  assert.equal(sent.responseFormat.name, 'dashboard_generation_plan');
  assert.deepEqual(sent.responseFormat.jsonSchema, projectProviderSchema(expectedSchema));
  const system = sent.messages[0]!.content;
  assert.ok(system.includes('"id":"revenue"'));
  assert.ok(!system.includes('outstanding_amount'));
  assert.ok(!system.includes('sales-performance'));
  assert.ok(!system.includes('branchLabels'));
  assert.ok(system.includes('"tenantId":"demo-iq"'));
});
test('invalid generation is repaired once and unauthorized metrics never return', async () => {
  const forbidden = structuredClone(spec); forbidden.widgets[0]!.series[0]!.metric = 'outstanding_amount';
  const provider = new SequenceProvider([toPlan(forbidden), plan]);
  const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 1 });
  assert.deepEqual(await planner.generate(request), compiled());
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
  invalidId.title.en = '';
  const generationProvider = new SequenceProvider([toPlan(invalidId)]);
  const planner = new StructuredDashboardPlanner(generationProvider, { maxRepairAttempts: 0 });
  await assert.rejects(planner.generate(request), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.deepEqual(generationProvider.requests[0]!.responseFormat.jsonSchema, projectProviderSchema(expectedSchema));

  const invalidPatch = { schemaVersion: 2, operations: [{ op: 'set_title', title: { en: '', ar: 'عنوان' } }] };
  const editProvider = new SequenceProvider([invalidPatch]);
  const editPlanner = new StructuredDashboardPlanner(editProvider, { maxRepairAttempts: 0 });
  await assert.rejects(editPlanner.edit(spec, 'Rename', profile, capabilities), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.deepEqual(editProvider.requests[0]!.responseFormat.jsonSchema, projectProviderSchema(dashboardPatchSchema));
});
test('diagnostics report schema failures on each repair attempt without echoing prompt text', async () => {
  const invalid = structuredClone(spec);
  invalid.title.ar = '';
  invalid.title.en = 'prompt-secret-phrase';
  const events: import('../src/structured-diagnostics.ts').StructuredPlannerDiagnostic[] = [];
  const provider = new SequenceProvider([toPlan(invalid), toPlan(invalid)]);
  const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 1, diagnostics: event => events.push(event) });
  await assert.rejects(planner.generate({ ...request, prompt: 'prompt-secret-phrase' }), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.equal(events.length, 2);
  assert.deepEqual(events.map(event => event.attempt), [1, 2]);
  assert.equal(events[0]!.operation, 'generation');
  assert.equal(events[0]!.schemaName, 'dashboard_generation_plan');
  assert.equal(events[0]!.providerId, 'fake');
  assert.equal(events[0]!.stage, 'schema');
  assert.ok(events[0]!.details.some(issue => issue.instancePath === '/titleAr' && issue.keyword === 'minLength'));
  assert.ok(!events[0]!.outputPreview.includes('prompt-secret-phrase'));
});

test('diagnostics identify semantic widget failures and patch schema failures', async () => {
  const incompatible = structuredClone(spec);
  incompatible.widgets[0] = { id: 'mixed', type: 'line', dimension: 'month', series: [
    { id: 'revenue', metric: 'revenue' }, { id: 'margin', metric: 'gross_margin' },
  ] };
  const events: import('../src/structured-diagnostics.ts').StructuredPlannerDiagnostic[] = [];
  const planner = new StructuredDashboardPlanner(new SequenceProvider([toPlan(incompatible)]), { maxRepairAttempts: 0, diagnostics: event => events.push(event) });
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

test('structured editing of manual widget IDs preserves custom layout for replace, remove, add and filters', async () => {
  const custom: DashboardSpec = { ...structuredClone(spec), id: 'manual-dashboard', layout: { columns: 12, items: [
    { widgetId: 'widget-1', x: 3, y: 2, w: 5, h: 3 }, { widgetId: 'widget-2', x: 0, y: 7, w: 8, h: 5 },
  ] }, widgets: [ { id: 'widget-1', type: 'kpi', series: [{ id: 'series-1', metric: 'revenue' }] },
    { id: 'widget-2', type: 'table', dimension: 'customer', series: [{ id: 'series-1', metric: 'revenue' }] } ] };
  const patches: import('@el-dabboos/domain').DashboardPatch[] = [
    { schemaVersion: 2, operations: [{ op: 'replace', widgetId: 'widget-1', widget: { id: 'widget-1-renamed', type: 'kpi', series: [{ id: 'series-1', metric: 'gross_profit' }] } }] },
    { schemaVersion: 2, operations: [{ op: 'remove', widgetId: 'widget-2' }] },
    { schemaVersion: 2, operations: [{ op: 'add', widget: { id: 'widget-3', type: 'kpi', series: [{ id: 'series-1', metric: 'revenue' }] } }] },
    { schemaVersion: 2, operations: [{ op: 'set_filters', filters: { dateRange: { from: '2026-01-01', to: '2026-02-28' } } }] },
  ];
  const provider = new SequenceProvider(patches);
  const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 0 });
  const allowed = { ...capabilities, metricIds: ['revenue', 'gross_profit'] as const };
  let current = custom;
  for (let index = 0; index < patches.length; index++) {
    const prior = structuredClone(current.layout.items!);
    const patch = await planner.edit(current, ['Change KPI', 'Remove table', 'Add revenue', 'Change date filters'][index]!, profile, allowed);
    current = applyDashboardPatch(current, patch);
    if (index === 0) assert.deepEqual(current.layout.items, [{ ...prior[0], widgetId: 'widget-1-renamed' }, prior[1]]);
    else if (index === 1) assert.deepEqual(current.layout.items, [prior[0]]);
    else if (index === 2) {
      assert.deepEqual(current.layout.items![0], prior[0]);
      assert.deepEqual(current.layout.items![1], { widgetId: 'widget-3', x: 0, y: 0, w: 4, h: 2 });
    } else assert.deepEqual(current.layout.items, prior);
  }
  assert.ok(provider.requests[0]!.messages[1]!.content.includes('"x":3,"y":2,"w":5,"h":3'));
});
test('structured generation accepts governed chart types and rejects misleading composition without weakening repair', async () => {
  for (const type of ['area', 'pie', 'treemap', 'combo'] as const) {
    const next = structuredClone(spec);
    next.widgets = [{ id: 'chart', type, dimension: ['area', 'combo'].includes(type) ? 'month' : 'branch', series: [{ id: 'revenue', metric: 'revenue' }], ...(type === 'pie' ? { presentation: { pieVariant: 'donut' as const } } : {}) }];
    if (type === 'combo') next.widgets[0]!.series.push({ id: 'revenue-2', metric: 'revenue', presentation: { mark: 'line' } });
    const provider = new SequenceProvider([toPlan(next)]);
    assert.deepEqual(await new StructuredDashboardPlanner(provider, { clock: () => now }).generate(request), compiled(toPlan(next)));
    assert.ok(provider.requests[0]!.messages[0]!.content.includes('visualizations'));
    assert.ok(provider.requests[0]!.messages[0]!.content.includes('no ratio'));
  }
  const invalid = structuredClone(spec); invalid.widgets = [{ id: 'bad', type: 'pie', dimension: 'branch', series: [{ id: 'margin', metric: 'gross_margin' }] }];
  await assert.rejects(new StructuredDashboardPlanner(new SequenceProvider([toPlan(invalid)]), { maxRepairAttempts: 0 }).generate({ ...request, capabilities: { ...capabilities, metricIds: ['revenue', 'gross_margin'] } }), { code: 'INVALID_STRUCTURED_OUTPUT' });
});
test('AI visualization patches preserve the latest layout and query intent; invalid conversions fail safely', async () => {
  const current = structuredClone(spec); current.widgets = [{ id: 'chart', type: 'bar', dimension: 'branch', series: [{ id: 'revenue', metric: 'revenue' }] }];
  current.layout = { columns: 12, items: [{ widgetId: 'chart', x: 3, y: 4, w: 6, h: 4 }] };
  for (const presentation of [{ orientation: 'horizontal' as const }, { pieVariant: 'donut' as const }]) {
    const widget = { ...current.widgets[0]!, type: ('pieVariant' in presentation ? 'pie' : 'bar') as 'pie' | 'bar', presentation };
    const patch = { schemaVersion: 2, operations: [{ op: 'replace', widgetId: 'chart', widget }] };
    const planner = new StructuredDashboardPlanner(new SequenceProvider([patch]));
    const returned = await planner.edit(current, 'Change visualization', profile, capabilities);
    const next = applyDashboardPatch(current, returned);
    assert.deepEqual(next.layout, current.layout); assert.deepEqual(next.filters, current.filters); assert.deepEqual(next.widgets[0]!.series, current.widgets[0]!.series);
  }
  const margin = { ...current, widgets: [{ ...current.widgets[0]!, series: [{ id: 'margin', metric: 'gross_margin' as const }] }] };
  const invalidPatch = { schemaVersion: 2, operations: [{ op: 'replace', widgetId: 'chart', widget: { ...margin.widgets[0], type: 'pie' } }] };
  await assert.rejects(new StructuredDashboardPlanner(new SequenceProvider([invalidPatch]), { maxRepairAttempts: 0 }).edit(margin, 'Turn margin into a pie', profile, { ...capabilities, metricIds: ['gross_margin'] }), { code: 'INVALID_STRUCTURED_OUTPUT' });
});
test('Arabic sales, branch performance and profitability intent compiles governed metrics without a fixed arrangement', async () => {
  const prompt = 'اريد ان ارى المبيعات و اداء الفروع مع الارباح';
  const output: DashboardGenerationPlan = { titleEn: 'Sales and profitability', titleAr: 'المبيعات والربحية', widgets: [
    { type: 'line', dimension: 'month', series: [{ metric: 'revenue' }, { metric: 'gross_profit' }] },
    { type: 'table', dimension: 'branch', series: [{ metric: 'revenue' }, { metric: 'gross_profit' }, { metric: 'gross_margin' }] },
  ] };
  const provider = new SequenceProvider([output]);
  const result = await new StructuredDashboardPlanner(provider, { clock: () => now }).generate({ ...request, prompt, locale: 'ar', context: { tenantId: profile.id, locale: 'ar' }, capabilities: { ...capabilities, metricIds: ['revenue', 'gross_profit', 'gross_margin'] } });
  assert.equal(provider.requests[0]!.messages[1]!.content, prompt);
  assert.ok(result.widgets.some(w => w.dimension === 'branch'));
  assert.deepEqual(new Set(result.widgets.flatMap(w => w.series.map(s => s.metric))), new Set(['revenue', 'gross_profit', 'gross_margin']));
  validateDashboardSpec(result);
});

for (const maxRepairAttempts of [0, 1, 2]) test(`generation repair remains bounded to ${maxRepairAttempts} repairs of the plan`, async () => {
  const provider = new SequenceProvider(Array(3).fill({ titleEn: '' }));
  const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts });
  await assert.rejects(planner.generate(request), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.equal(provider.requests.length, maxRepairAttempts + 1);
  for (const repair of provider.requests.slice(1)) assert.match(repair.messages.at(-1)!.content, /DashboardGenerationPlan/);
});
