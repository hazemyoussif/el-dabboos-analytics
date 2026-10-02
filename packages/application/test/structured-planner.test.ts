import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch, tenantProfiles, validateDashboardSpec } from '@el-dabboos/domain';
import type { DashboardSpec, LLMProvider, PlannerCapabilities, StructuredOutputRequest } from '@el-dabboos/domain';
import { StructuredDashboardPlanner } from '../src/structured-planner.ts';
import { compileDashboardGenerationPlan, dashboardGenerationPlanSchema } from '../src/generation-plan.ts';
import type { DashboardGenerationPlan } from '../src/generation-plan.ts';
import { dashboardEditPlanSchema } from '../src/edit-plan.ts';
import type { DashboardEditPlan } from '../src/edit-plan.ts';
import { projectProviderSchema } from '../src/provider-schema.ts';

const profile = tenantProfiles['demo-iq'];
const capabilities: PlannerCapabilities = { metricIds: ['revenue'], templateIds: ['sales-team', 'sales-performance'], actions: ['ai:generate', 'ai:edit'] };
const spec: DashboardSpec = { schemaVersion: 2, id: 'generated-sales', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: { dateRange: { from: '2026-01-01', to: '2026-01-31' } }, layout: { columns: 1 },
  widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
const now = new Date('2026-10-01T00:00:00Z');
const toPlan = (value: DashboardSpec): DashboardGenerationPlan => ({ titleEn: value.title.en, titleAr: value.title.ar,
  ...(value.filters.dateRange ? { dateFrom: value.filters.dateRange.from, dateTo: value.filters.dateRange.to } : {}),
  widgets: value.widgets.map(w => ({ requestedPresentation: { type: w.type, ...((({ legend, dataLabels, ...rest }) => ({ ...rest, ...(legend && legend !== 'auto' ? { legend } : {}), ...(dataLabels && dataLabels !== 'auto' ? { dataLabels } : {}) }))(w.presentation ?? {})) }, ...(w.dimension ? { dimension: w.dimension } : {}),
    series: w.series.map(s => ({ metric: s.metric })) })) } as DashboardGenerationPlan);
const plan = toPlan(spec);
const compiled = (p = plan) => compileDashboardGenerationPlan(p, profile, 'en', now);
const expectedSchema = structuredClone(dashboardGenerationPlanSchema);
expectedSchema.$defs.series.properties.metric.enum = ['revenue'];
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
test('sparse edit planning compiles canonical patch and validates the resulting dashboard authorization', async () => {
  const patch = { schemaVersion: 2 as const, operations: [{ op: 'set_title' as const, title: { en: 'Updated', ar: 'محدّث' } }] };
  const intent = { operations: [{ op: 'set_title', titleEn: 'Updated', titleAr: 'محدّث' }] };
  const provider = new SequenceProvider([intent]);
  const planner = new StructuredDashboardPlanner(provider);
  assert.deepEqual(await planner.edit(spec, 'Rename', profile, capabilities), patch);
  assert.equal(applyDashboardPatch(spec, patch).title.en, 'Updated');
  assert.deepEqual(provider.requests[0]!.responseFormat.jsonSchema, projectProviderSchema(dashboardEditPlanSchema));
  assert.ok(provider.requests[0]!.messages[1]!.content.includes('Current DashboardSpec v2'));
  const forbiddenPatch = { operations: [{ op: 'update_series', widgetId: 'revenue', seriesId: 'revenue', changes: { metric: 'outstanding_amount' } }] };
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

  const invalidPatch = { operations: [{ op: 'set_title', titleEn: '', titleAr: 'عنوان' }] };
  const editProvider = new SequenceProvider([invalidPatch]);
  const editPlanner = new StructuredDashboardPlanner(editProvider, { maxRepairAttempts: 0 });
  await assert.rejects(editPlanner.edit(spec, 'Rename', profile, capabilities), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.deepEqual(editProvider.requests[0]!.responseFormat.jsonSchema, projectProviderSchema(dashboardEditPlanSchema));
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

test('diagnostics identify semantic widget failures and edit plan schema failures', async () => {
  const incompatible = structuredClone(spec);
  incompatible.widgets[0] = { id: 'mixed', type: 'line', dimension: 'month', series: [
    { id: 'revenue', metric: 'revenue' }, { id: 'margin', metric: 'gross_margin' },
  ] };
  const events: import('../src/structured-diagnostics.ts').StructuredPlannerDiagnostic[] = [];
  const planner = new StructuredDashboardPlanner(new SequenceProvider([toPlan(incompatible)]), { maxRepairAttempts: 0, diagnostics: event => events.push(event) });
  await assert.rejects(planner.generate(request), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.equal(events[0]!.stage, 'semantic');
  assert.match(events[0]!.details[0]!.message, /Single axis requires matching metric type and unit/);

  const patch = { operations: [{ op: 'set_title', titleEn: '', titleAr: 'عنوان' }] };
  const editor = new StructuredDashboardPlanner(new SequenceProvider([patch]), { maxRepairAttempts: 0, diagnostics: event => events.push(event) });
  await assert.rejects(editor.edit(spec, 'Rename', profile, capabilities), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.equal(events[1]!.operation, 'edit');
  assert.equal(events[1]!.schemaName, 'dashboard_edit_plan');
  assert.equal(events[1]!.stage, 'schema');
  assert.ok(events[1]!.details.some(issue => issue.keyword === 'minLength'));
});

test('structured editing of manual widget IDs preserves custom layout for replace, remove, add and filters', async () => {
  const custom: DashboardSpec = { ...structuredClone(spec), id: 'manual-dashboard', layout: { columns: 12, items: [
    { widgetId: 'widget-1', x: 3, y: 2, w: 5, h: 3 }, { widgetId: 'widget-2', x: 0, y: 7, w: 8, h: 5 },
  ] }, widgets: [ { id: 'widget-1', type: 'kpi', series: [{ id: 'series-1', metric: 'revenue' }] },
    { id: 'widget-2', type: 'table', dimension: 'customer', series: [{ id: 'series-1', metric: 'revenue' }] } ] };
  const edits: DashboardEditPlan[] = [
    { operations: [{ op: 'update_series', widgetId: 'widget-1', seriesId: 'series-1', changes: { metric: 'gross_profit' } }] },
    { operations: [{ op: 'remove_widget', widgetId: 'widget-2' }] },
    { operations: [{ op: 'add_widget', widget: { series: [{ metric: 'revenue' }] } }] },
    { operations: [{ op: 'set_filters', changes: { dateRange: { from: '2026-01-01', to: '2026-02-28' } } }] },
  ];
  const provider = new SequenceProvider(edits);
  const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 0 });
  const allowed = { ...capabilities, metricIds: ['revenue', 'gross_profit'] as const };
  let current = custom;
  for (let index = 0; index < edits.length; index++) {
    const prior = structuredClone(current.layout.items!);
    const patch = await planner.edit(current, ['Change KPI', 'Remove table', 'Add revenue', 'Change date filters'][index]!, profile, allowed);
    current = applyDashboardPatch(current, patch);
    if (index === 0) assert.deepEqual(current.layout.items, prior);
    else if (index === 1) assert.deepEqual(current.layout.items, [prior[0]]);
    else if (index === 2) {
      assert.deepEqual(current.layout.items![0], prior[0]);
      assert.deepEqual(current.layout.items![1], { widgetId: 'widget-2', x: 0, y: 0, w: 4, h: 2 });
    } else assert.deepEqual(current.layout.items, prior);
  }
  assert.ok(provider.requests[0]!.messages[1]!.content.includes('"x":3,"y":2,"w":5,"h":3'));
});
test('structured generation accepts governed chart types and rejects misleading composition without weakening repair', async () => {
  for (const type of ['area', 'pie', 'treemap', 'combo'] as const) {
    const next = structuredClone(spec);
    next.widgets = [{ id: 'chart', type, dimension: ['area', 'combo'].includes(type) ? 'month' : 'branch', series: [{ id: 'revenue', metric: 'revenue' }], ...(type === 'pie' ? { presentation: { pieVariant: 'donut' as const } } : {}) }];
    if (type === 'combo') next.widgets[0]!.series.push({ id: 'revenue-2', metric: 'revenue' });
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
    const patch = { operations: [{ op: 'update_widget', widgetId: 'chart', changes: { type: ('pieVariant' in presentation ? 'pie' : 'bar') as 'pie' | 'bar', presentation } }] };
    const planner = new StructuredDashboardPlanner(new SequenceProvider([patch]));
    const returned = await planner.edit(current, 'Change visualization', profile, capabilities);
    const next = applyDashboardPatch(current, returned);
    assert.deepEqual(next.layout, current.layout); assert.deepEqual(next.filters, current.filters); assert.deepEqual(next.widgets[0]!.series, current.widgets[0]!.series);
  }
  const margin = { ...current, widgets: [{ ...current.widgets[0]!, series: [{ id: 'margin', metric: 'gross_margin' as const }] }] };
  const invalidPatch = { operations: [{ op: 'update_widget', widgetId: 'chart', changes: { type: 'pie' } }] };
  await assert.rejects(new StructuredDashboardPlanner(new SequenceProvider([invalidPatch]), { maxRepairAttempts: 0 }).edit(margin, 'Turn margin into a pie', profile, { ...capabilities, metricIds: ['gross_margin'] }), { code: 'INVALID_STRUCTURED_OUTPUT' });
});
test('Arabic sales, branch performance and profitability intent compiles governed metrics without a fixed arrangement', async () => {
  const prompt = 'اريد ان ارى المبيعات و اداء الفروع مع الارباح';
  const output: DashboardGenerationPlan = { titleEn: 'Sales and profitability', titleAr: 'المبيعات والربحية', widgets: [
    { dimension: 'month', series: [{ metric: 'revenue' }, { metric: 'gross_profit' }] },
    { dimension: 'branch', series: [{ metric: 'revenue' }, { metric: 'gross_profit' }, { metric: 'gross_margin' }] },
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

test('generation prompt distinguishes explicit business/presentation intent from deterministic defaults', async () => {
  const provider = new SequenceProvider([plan]);
  await new StructuredDashboardPlanner(provider).generate(request);
  const prompt = provider.requests[0]!.messages[0]!.content;
  assert.match(prompt, /Omit requestedPresentation entirely when the user did not request presentation/);
  assert.match(prompt, /set its required type and only type-valid options from the schema/);
  assert.match(prompt, /visualization type, orientation, palette and governed presentation option as required intent/);
  assert.match(prompt, /Include analysis only when explicitly requested/);
  assert.match(prompt, /omit comparisons, moving averages, running totals, percentage contribution, ranking and top N/);
  assert.match(prompt, /Do not invent helpful analyses or decorations/);
  assert.match(prompt, /Do not generate IDs, grid positions, layout/);
  assert.match(prompt, /only authorized metrics/);
  assert.match(prompt, /SQL, React, chart-library options/);
});
const acceptanceCases: [string, DashboardGenerationPlan, string][] = [
  ['اريد ان ارى المبيعات و اداء الفروع مع الارباح', { titleEn: 'Sales and profit', titleAr: 'المبيعات والأرباح', widgets: [
    { series: [{ metric: 'revenue' }] }, { series: [{ metric: 'gross_profit' }] },
    { dimension: 'branch', series: [{ metric: 'revenue' }, { metric: 'gross_profit' }] },
  ] }, 'bar'],
  ['I want to see the revenue, branch sales and profit using blue line charts', { titleEn: 'Sales and profit', titleAr: 'المبيعات والأرباح', widgets: [
    { dimension: 'branch', series: [{ metric: 'revenue' }, { metric: 'gross_profit' }], requestedPresentation: { type: 'line', palette: 'blue' } },
  ] }, 'line'],
  ['Show the top 5 branches by revenue as horizontal blue bars', { titleEn: 'Top branches', titleAr: 'أعلى الفروع', widgets: [
    { dimension: 'branch', series: [{ metric: 'revenue', topNDirection: 'top', topNLimit: 5 }], requestedPresentation: { type: 'bar', orientation: 'horizontal', palette: 'blue' } },
  ] }, 'bar'],
];
for (const [prompt, intent, type] of acceptanceCases) test(`controlled intent acceptance: ${prompt}`, async () => {
  const provider = new SequenceProvider([intent]); const original = structuredClone(intent);
  const result = await new StructuredDashboardPlanner(provider, { clock: () => now }).generate({ ...request, prompt,
    capabilities: { ...capabilities, metricIds: ['revenue', 'gross_profit'] } });
  assert.equal(provider.requests.length, 1); assert.deepEqual(intent, original);
  assert.equal(provider.requests[0]!.messages[1]!.content, prompt);
  const branch = result.widgets.find(widget => widget.dimension === 'branch')!;
  assert.equal(branch.type, type); validateDashboardSpec(result);
  if (prompt.startsWith('اريد')) {
    assert.ok(result.widgets.some(widget => widget.series.some(series => series.metric === 'gross_profit')));
    for (const widget of intent.widgets) { assert.equal(widget.requestedPresentation, undefined); for (const series of widget.series) assert.deepEqual(Object.keys(series), ['metric']); }
    assert.equal(branch.presentation?.palette, undefined); assert.equal(branch.presentation?.curve, undefined); assert.equal(branch.presentation?.dataLabels, undefined);
    assert.ok(result.widgets.every(widget => widget.series.every(series => series.analysis === undefined)));
  } else {
    assert.equal(branch.presentation?.palette, 'blue'); assert.ok(!JSON.stringify(intent).includes('#'));
    if (prompt.startsWith('Show')) { assert.equal(branch.presentation?.orientation, 'horizontal'); assert.deepEqual(branch.series[0]!.analysis, { topN: { direction: 'top', limit: 5 } }); }
    else assert.deepEqual(branch.series.map(series => series.metric), ['revenue', 'gross_profit']);
  }
});
test('AI palette editing stays on canonical patch replacement with unchanged layout and business intent', async () => {
  const current = { ...spec, widgets: [{ id: 'chart', type: 'line' as const, dimension: 'branch' as const, series: [{ id: 'revenue', metric: 'revenue' as const }] }] };
  const patch = { operations: [{ op: 'update_widget', widgetId: 'chart', changes: { presentation: { palette: 'blue' } } }] };
  const returned = await new StructuredDashboardPlanner(new SequenceProvider([patch])).edit(current, 'Make this chart blue', profile, capabilities);
  const changed = applyDashboardPatch(current, returned);
  assert.equal(changed.widgets[0]!.presentation?.palette, 'blue'); assert.deepEqual(changed.filters, current.filters); assert.deepEqual(changed.layout, current.layout);
  assert.deepEqual(changed.widgets[0]!.series, current.widgets[0]!.series);
});

test('Top-N system guidance maps explicit selection to the anchor series and uses one bounded bar example', async () => {
  const provider = new SequenceProvider([acceptanceCases[2]![1]]);
  const result = await new StructuredDashboardPlanner(provider, { clock: () => now }).generate({ ...request, prompt: acceptanceCases[2]![0] });
  const sent = provider.requests[0]!; const system = sent.messages[0]!.content;
  assert.equal(sent.responseFormat.strict, true); assert.equal(sent.responseFormat.name, 'dashboard_generation_plan');
  assert.ok(!JSON.stringify(sent.responseFormat.jsonSchema).includes('"mark"'));
  assert.match(system, /top N request, set topNDirection='top' and topNLimit=N/);
  assert.match(system, /bottom N set topNDirection='bottom' and topNLimit=N/);
  assert.match(system, /apply Top-N only to that first relevant series/);
  assert.match(system, /Never drop an explicit Top-N request/);
  assert.match(system, /Do not invent helpful analyses or decorations/);
  assert.match(system, /set its required type and only type-valid options from the schema/);
  assert.ok(!system.includes('series mark')); assert.ok(!system.includes('"mark"'));
  const fixture = acceptanceCases[2]![1].widgets[0]!;
  assert.deepEqual(fixture.series, [{ metric: 'revenue', topNDirection: 'top', topNLimit: 5 }]);
  assert.deepEqual(fixture.requestedPresentation, { type: 'bar', orientation: 'horizontal', palette: 'blue' });
  const widget = result.widgets[0]!;
  assert.equal(widget.dimension, 'branch'); assert.equal(widget.series[0]!.metric, 'revenue');
  assert.deepEqual(widget.series[0]!.analysis?.topN, { direction: 'top', limit: 5 });
  assert.equal(widget.series[0]!.presentation, undefined);
  assert.equal(widget.presentation?.dataLabels, undefined); assert.equal(widget.presentation?.curve, undefined);
  // A code-owned legend default is allowed; the intent fixture does not ask for it.
  assert.ok(!Object.hasOwn(fixture.requestedPresentation!, 'legend'));
});
test('safe specific visualization reasons reach bounded repair without copying private content', async () => {
  const valid = acceptanceCases[2]![1]; const invalid = structuredClone(valid);
  invalid.titleEn = 'private output title'; invalid.widgets[0]!.requestedPresentation = { type: 'combo', curve: 'smooth' };
  invalid.filters = [{ dimension: 'branch', values: ['private customer filter'] }];
  const provider = new SequenceProvider([invalid, valid]);
  const events: import('../src/structured-diagnostics.ts').StructuredPlannerDiagnostic[] = [];
  const planner = new StructuredDashboardPlanner(provider, { clock: () => now, maxRepairAttempts: 1, diagnostics: event => events.push(event) });
  const result = await planner.generate({ ...request, prompt: 'private user prompt' });
  assert.equal(result.widgets[0]!.type, 'bar'); assert.equal(provider.requests.length, 2);
  const repair = provider.requests[1]!.messages.at(-1)!.content;
  assert.match(repair, /Combo requires two to four series/);
  assert.equal(events[0]!.stage, 'semantic'); assert.match(events[0]!.details[0]!.message, /Combo requires/);
  assert.ok(repair.length < 1200); assert.ok(events[0]!.details[0]!.message.length <= 800);
  for (const token of ['private output title', 'private customer filter', 'private user prompt']) {
    assert.ok(!repair.includes(token)); assert.ok(!JSON.stringify(events).includes(token));
  }
});
test('persistent incompatible explicit presentation still fails canonical validation after bounded repair', async () => {
  const invalid = structuredClone(acceptanceCases[2]![1]); invalid.widgets[0]!.requestedPresentation = { type: 'combo' };
  const provider = new SequenceProvider([invalid, invalid]);
  await assert.rejects(new StructuredDashboardPlanner(provider, { maxRepairAttempts: 1 }).generate(request), error => {
    assert.ok(error instanceof Error); assert.equal((error as { code?: string }).code, 'INVALID_STRUCTURED_OUTPUT');
    assert.match(error.message, /Invalid dashboard widget or incompatible series/); assert.ok(!error.message.includes('Combo requires'));
    return true;
  });
  assert.equal(provider.requests.length, 2);
});

for (const maxRepairAttempts of [0, 1, 2]) test(`edit plan repair remains bounded to ${maxRepairAttempts} repairs and names the intent contract`, async () => {
  const provider = new SequenceProvider(Array(3).fill({ operations: [{ op: 'replace' }] }));
  const events: import('../src/structured-diagnostics.ts').StructuredPlannerDiagnostic[] = [];
  await assert.rejects(new StructuredDashboardPlanner(provider, { maxRepairAttempts, diagnostics: event => events.push(event) }).edit(spec, 'Make it blue', profile, capabilities), { code: 'INVALID_STRUCTURED_OUTPUT' });
  assert.equal(provider.requests.length, maxRepairAttempts + 1);
  assert.deepEqual(events.map(event => event.attempt), Array.from({ length: maxRepairAttempts + 1 }, (_, index) => index + 1));
  for (const sent of provider.requests) {
    assert.equal(sent.responseFormat.strict, true); assert.equal(sent.responseFormat.name, 'dashboard_edit_plan');
    assert.deepEqual(sent.responseFormat.jsonSchema, projectProviderSchema(dashboardEditPlanSchema));
  }
  for (const repair of provider.requests.slice(1)) {
    assert.match(repair.messages.at(-1)!.content, /DashboardEditPlan/);
    assert.ok(!repair.messages.at(-1)!.content.includes('DashboardPatch v2'));
  }
});
test('edit prompt requests sparse intent with current context; schema errors repair into canonical patch', async () => {
  const provider = new SequenceProvider([{ operations: [{ op: 'update_widget', widgetId: 'revenue', changes: { presentation: { palette: '#123456' } } }] },
    { operations: [{ op: 'update_widget', widgetId: 'revenue', changes: { presentation: { palette: 'blue' } } }] }]);
  const returned = await new StructuredDashboardPlanner(provider, { maxRepairAttempts: 1 }).edit(spec, 'Make it blue', profile, capabilities);
  assert.equal(returned.schemaVersion, 2); assert.equal(returned.operations[0]!.op, 'replace');
  const system = provider.requests[0]!.messages[0]!.content;
  for (const phrase of ['DashboardEditPlan', 'omitted fields preserve', 'Never reconstruct unchanged widgets or series', 'existing widgetId/seriesId', 'Never generate layout for semantic/presentation edits', 'only authorized metrics', 'raw colors']) assert.ok(system.includes(phrase));
  assert.ok(!system.includes('Produce only a DashboardPatch'));
  assert.equal(provider.requests.length, 2);
  assert.equal(applyDashboardPatch(spec, returned).widgets[0]!.presentation!.palette, 'blue');
});
test('edit authorization checks current dashboard before invoking provider and rejects unauthorized added metrics afterward', async () => {
  const unauthorized = structuredClone(spec); unauthorized.widgets[0]!.series[0]!.metric = 'outstanding_amount';
  const provider = new SequenceProvider([{ operations: [{ op: 'add_widget', widget: { series: [{ metric: 'outstanding_amount' }] } }] }]);
  const planner = new StructuredDashboardPlanner(provider, { maxRepairAttempts: 0 });
  await assert.rejects(planner.edit(unauthorized, 'Make it blue', profile, capabilities), { code: 'METRIC_FORBIDDEN' });
  assert.equal(provider.requests.length, 0);
  await assert.rejects(planner.edit(spec, 'Add finance', profile, capabilities), { code: 'METRIC_FORBIDDEN' });
  assert.equal(provider.requests.length, 1);
});
