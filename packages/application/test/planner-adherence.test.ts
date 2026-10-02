import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch, tenantProfiles } from '@el-dabboos/domain';
import type { DashboardSpec, LLMProvider, PlannerCapabilities, StructuredOutputRequest } from '@el-dabboos/domain';
import { compileDashboardGenerationPlan, dashboardEditTargetIndex, StructuredDashboardPlanner } from '../src/index.ts';
import type { DashboardGenerationPlan } from '../src/index.ts';

const profile = tenantProfiles['demo-iq'];
const now = new Date('2026-10-02T00:00:00Z');
const capabilities: PlannerCapabilities = { metricIds: ['revenue', 'gross_profit'], templateIds: [], actions: ['ai:generate', 'ai:edit'] };
const prompt = 'Create a sales performance dashboard with three widgets: total revenue as a KPI; monthly revenue with a 3-month moving average as a line chart; top 5 branches by gross profit as horizontal blue bars';
const plan: DashboardGenerationPlan = { titleEn: 'Sales performance', titleAr: 'أداء المبيعات', widgets: [
  { series: [{ metric: 'revenue' }], requestedPresentation: { palette: 'default', type: 'kpi' } },
  { dimension: 'month', series: [{ metric: 'revenue', movingAverageWindow: 3 }], requestedPresentation: { palette: 'default', type: 'line' } },
  { dimension: 'branch', series: [{ metric: 'gross_profit', topNDirection: 'top', topNLimit: 5 }], requestedPresentation: { type: 'bar', orientation: 'horizontal', palette: 'blue' } },
] };
const generated = () => compileDashboardGenerationPlan(plan, profile, 'en', now);
const current = (): DashboardSpec => ({ ...generated(),
  filters: { dateRange: { from: '2026-01-01', to: '2026-09-30' }, dimensions: [{ dimension: 'branch', values: ['synthetic-filter-value'] }] },
  layout: { columns: 12, items: [
    { widgetId: 'widget-1', x: 0, y: 0, w: 4, h: 2 },
    { widgetId: 'widget-2', x: 2, y: 3, w: 8, h: 4 },
    { widgetId: 'widget-3', x: 0, y: 8, w: 6, h: 4 },
  ] },
});
class FixtureProvider implements LLMProvider {
  readonly requests: StructuredOutputRequest[] = [];
  constructor(private readonly output: unknown) {}
  async generateStructured(request: StructuredOutputRequest) {
    this.requests.push(request);
    return { output: structuredClone(this.output), providerId: 'fake-adherence', latencyMs: 1, attempts: 1 };
  }
}
const planner = (provider: FixtureProvider) => new StructuredDashboardPlanner(provider, { clock: () => now, maxRepairAttempts: 0 });
const request = { prompt, tenantProfile: profile, locale: 'en' as const, context: { tenantId: profile.id, locale: 'en' as const }, capabilities };

test('generation instruction requires each explicit presentation option on its corresponding widget', async () => {
  const provider = new FixtureProvider(plan);
  await planner(provider).generate(request);
  const sent = provider.requests[0]!;
  const system = sent.messages[0]!.content;
  assert.match(system, /every explicitly requested visualization type, orientation, palette and governed presentation option as required intent/);
  assert.match(system, /multi-widget requests attach each option only to the widget it describes/);
  assert.match(system, /verify no explicit presentation adjective from the request was dropped/);
  assert.ok(system.includes('"requestedPresentation":{"type":"bar","orientation":"horizontal","palette":"blue"}'));
  assert.equal(sent.messages[1]!.content, prompt);
  assert.equal(sent.responseFormat.strict, true);
});
test('hard multi-widget generation preserves explicit provider blue on only the grouped gross-profit Bar', async () => {
  const provider = new FixtureProvider(plan);
  const spec = await planner(provider).generate(request);
  const bar = spec.widgets[2]!;
  assert.equal(bar.type, 'bar'); assert.equal(bar.dimension, 'branch');
  assert.equal(bar.presentation!.palette, 'blue'); assert.equal(bar.presentation!.orientation, 'horizontal');
  assert.equal(bar.series[0]!.metric, 'gross_profit');
  assert.deepEqual(bar.series[0]!.analysis, { topN: { direction: 'top', limit: 5 } });
  assert.deepEqual(spec.widgets[1]!.series[0]!.analysis, { movingAverage: { window: 3 } });
  assert.equal(spec.widgets[0]!.presentation?.palette, 'default');
  assert.equal(spec.widgets[1]!.presentation?.palette, 'default');
});
test('blue in raw user prompt cannot replace the provider default palette', async () => {
  const omitted = structuredClone(plan); omitted.widgets[2]!.requestedPresentation!.palette = 'default';
  const provider = new FixtureProvider(omitted);
  const result = await planner(provider).generate(request);
  assert.equal(provider.requests[0]!.messages[1]!.content, prompt);
  assert.equal(result.widgets[2]!.presentation?.palette, 'default');
  assert.equal(result.widgets[2]!.presentation?.orientation, 'horizontal');
  assert.deepEqual(result, compileDashboardGenerationPlan(omitted, profile, 'en', now));
});
test('edit target index uses bilingual canonical labels and excludes business values, layout and analysis', () => {
  const spec = current(); const before = structuredClone(spec);
  const revenue = { id: 'revenue', labelEn: 'Revenue', labelAr: 'الإيرادات' };
  const profit = { id: 'gross_profit', labelEn: 'Gross profit', labelAr: 'إجمالي الربح' };
  const expected = [
    { widgetId: 'widget-1', type: 'kpi', metrics: [revenue], series: [{ seriesId: 'widget-1-series-1', metric: revenue }] },
    { widgetId: 'widget-2', type: 'line', dimension: { id: 'month', labelEn: 'Month', labelAr: 'الشهر' }, metrics: [revenue], series: [{ seriesId: 'widget-2-series-1', metric: revenue }] },
    { widgetId: 'widget-3', type: 'bar', dimension: { id: 'branch', labelEn: 'Branch', labelAr: 'الفرع' }, metrics: [profit], series: [{ seriesId: 'widget-3-series-1', metric: profit }] },
  ];
  assert.deepEqual(dashboardEditTargetIndex(spec), expected);
  assert.deepEqual(dashboardEditTargetIndex(spec), expected); assert.deepEqual(spec, before);
  assert.ok(!JSON.stringify(expected).includes('synthetic-filter-value'));
  assert.ok(!JSON.stringify(expected).includes('Sales performance'));
  const index = dashboardEditTargetIndex(spec); index[0]!.series[0]!.seriesId = 'changed'; index[0]!.metrics[0]!.labelEn = 'changed';
  assert.deepEqual(spec, before);
});
test('edit prompt puts both Revenue identities first while retaining the full current spec for broader edits', async () => {
  const spec = current();
  const provider = new FixtureProvider({ operations: [{ op: 'update_widget', widgetId: 'widget-2', changes: { presentation: { palette: 'blue' } } }] });
  await planner(provider).edit(spec, 'change the Revenue line to blue', profile, capabilities);
  const sent = provider.requests[0]!; const system = sent.messages[0]!.content;
  for (const phrase of ['all supplied descriptors: type, metric, dimension and title', 'not the first widget sharing a metric', '"Revenue line" means the Line containing revenue, not a Revenue KPI', '"branch gross profit chart" means gross_profit grouped by branch', 'only the sparse operation for that widgetId']) assert.ok(system.includes(phrase));
  assert.match(system, /user-facing labels to canonical IDs/);
  assert.match(system, /"gross profit" → gross_profit/);
  const [index, full, instruction] = sent.messages[1]!.content.split('\n');
  assert.ok(index!.startsWith('Editable widget index: '));
  assert.deepEqual(JSON.parse(index!.slice('Editable widget index: '.length)), dashboardEditTargetIndex(spec));
  assert.deepEqual(JSON.parse(full!.slice('Current DashboardSpec v2: '.length)), spec);
  assert.equal(instruction, 'Edit instruction: change the Revenue line to blue');
  assert.equal(sent.responseFormat.name, 'dashboard_edit_plan'); assert.equal(sent.responseFormat.strict, true);
});
for (const [instruction, widgetId, palette] of [
  ['change the Revenue line to blue', 'widget-2', 'blue'],
  ['Change the Revenue line to purple', 'widget-2', 'purple'],
  ['make the branch gross profit chart green', 'widget-3', 'green'],
] as const) test(`fake provider canonical reference targets exactly ${widgetId}: ${instruction}`, async () => {
  const spec = current(); const before = structuredClone(spec);
  const provider = new FixtureProvider({ operations: [{ op: 'update_widget', widgetId, changes: { presentation: { palette } } }] });
  const patch = await planner(provider).edit(spec, instruction, profile, capabilities);
  assert.equal(patch.operations.length, 1); assert.equal(patch.operations[0]!.op, 'replace');
  const next = applyDashboardPatch(spec, patch);
  const expected = structuredClone(spec); const widget = expected.widgets.find(widget => widget.id === widgetId)!;
  widget.presentation = { ...widget.presentation, palette };
  assert.deepEqual(next, expected); assert.deepEqual(spec, before);
  assert.deepEqual(next.filters, spec.filters); assert.deepEqual(next.layout, spec.layout);
  assert.deepEqual(next.widgets[0], spec.widgets[0]);
  assert.deepEqual(next.widgets[1]!.series[0]!.analysis, { movingAverage: { window: 3 } });
});
test('compact target context preserves existing one-widget palette edits', async () => {
  const spec = generated(); spec.widgets = [spec.widgets[0]!]; spec.layout = { columns: 12 };
  const provider = new FixtureProvider({ operations: [{ op: 'update_widget', widgetId: 'widget-1', changes: { presentation: { palette: 'blue' } } }] });
  const patch = await planner(provider).edit(spec, 'Make it blue', profile, capabilities);
  assert.equal(applyDashboardPatch(spec, patch).widgets[0]!.presentation!.palette, 'blue');
  assert.equal(dashboardEditTargetIndex(spec).length, 1);
  assert.equal(provider.requests.length, 1);
});

test('edit target index includes only existing explicit widget titles without aliasing', () => {
  const spec = current(); spec.widgets[2]!.title = { en: 'Profit overview', ar: 'نظرة على الربح' };
  const index = dashboardEditTargetIndex(spec);
  assert.equal(Object.hasOwn(index[0]!, 'title'), false);
  assert.equal(Object.hasOwn(index[1]!, 'title'), false);
  assert.deepEqual(index[2]!.title, spec.widgets[2]!.title);
  index[2]!.title!.en = 'changed'; assert.equal(spec.widgets[2]!.title.en, 'Profit overview');
});
test('provider omitting required palette fails rather than inventing Blue from the request', async () => {
  const invalid = JSON.parse(JSON.stringify(plan)); delete invalid.widgets[2].requestedPresentation.palette;
  const provider = new FixtureProvider(invalid);
  await assert.rejects(planner(provider).generate(request), /Provider output remained invalid/);
  assert.equal(provider.requests.length, 1);
});

test('generation guidance prefers minimal non-redundant intent and preserves only supplied metrics', async () => {
  const intent: DashboardGenerationPlan = { titleEn: 'Branch performance', titleAr: 'أداء الفروع', widgets: [
    { dimension: 'branch', series: [{ metric: 'revenue' }, { metric: 'gross_profit' }] },
  ] };
  const provider = new FixtureProvider(intent);
  const arabicPrompt = 'اريد ان ارى المبيعات و اداء الفروع مع الارباح';
  const spec = await planner(provider).generate({ ...request, prompt: arabicPrompt, locale: 'ar',
    context: { tenantId: profile.id, locale: 'ar' },
    capabilities: { ...capabilities, metricIds: ['revenue', 'gross_profit', 'net_revenue'] },
  });
  assert.ok(provider.requests[0]!.messages[0]!.content.includes(
    'Prefer the smallest non-redundant set of widgets and metrics that satisfies the request. Do not add closely related metrics or near-duplicate widgets unless the user explicitly requests them.'
  ));
  assert.equal(provider.requests[0]!.messages[1]!.content, arabicPrompt);
  assert.equal(spec.widgets.length, 1);
  assert.deepEqual(spec.widgets[0]!.series.map(series => series.metric), ['revenue', 'gross_profit']);
});
