import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardSpecSchema, tenantProfiles, validateDashboardSpec } from '@el-dabboos/domain';
import { compileDashboardGenerationPlan as compile, dashboardGenerationPlanSchema, validateDashboardGenerationPlan } from '../src/generation-plan.ts';
import type { DashboardGenerationPlan, GenerationSeries, GenerationWidget } from '../src/generation-plan.ts';
import { projectProviderSchema } from '../src/provider-schema.ts';
const profile = tenantProfiles['demo-iq'];
const now = new Date('2026-10-01T00:00:00Z');
const minimal: DashboardGenerationPlan = { titleEn: 'Sales', titleAr: 'المبيعات', widgets: [{ type: 'kpi', series: [{ metric: 'revenue' }] }] };
const run = (plan = minimal) => compile(plan, profile, 'ar', now);
test('minimal bilingual KPI compiles into a deterministic canonical 12-column dashboard', () => {
  const result = run(); validateDashboardSpec(result);
  assert.equal(result.id, 'generated-dashboard'); assert.equal(result.schemaVersion, 2); assert.equal(result.locale, 'ar');
  assert.deepEqual(result.title, { en: 'Sales', ar: 'المبيعات' });
  assert.equal(result.widgets[0]!.id, 'widget-1'); assert.equal(result.widgets[0]!.series[0]!.id, 'widget-1-series-1');
  assert.deepEqual(result.layout, { columns: 12, items: [{ widgetId: 'widget-1', x: 0, y: 0, w: 4, h: 2 }] });
  assert.deepEqual(run(), result); assert.deepEqual(minimal.widgets[0], { type: 'kpi', series: [{ metric: 'revenue' }] });
});
for (const [preset, from] of [['current_year', '2026-01-01'], ['last_12_months', '2025-11-01'], ['last_6_months', '2026-05-01']] as const)
  test(`generation resolves ${preset} using existing calendar semantics`, () => {
    assert.deepEqual(run({ ...minimal, datePreset: preset }).filters.dateRange, { from, to: '2026-10-01' });
  });
test('tenant timezone sets the local day and year at a UTC boundary', () => {
  const result = compile(minimal, profile, 'en', new Date('2025-12-31T22:00:00Z'));
  assert.deepEqual(result.filters.dateRange, { from: '2026-01-01', to: '2026-01-01' });
});
test('explicit leap-year range and business filters are preserved without aliasing', () => {
  const plan = { ...minimal, dateFrom: '2024-02-29', dateTo: '2024-03-31', filters: [{ dimension: 'branch' as const, values: ['baghdad'] }] };
  const spec = run(plan); assert.deepEqual(spec.filters, { dateRange: { from: plan.dateFrom, to: plan.dateTo }, dimensions: plan.filters });
  spec.filters.dimensions![0]!.values.push('basra'); assert.equal(plan.filters[0]!.values.length, 1);
});
for (const dates of [{ dateFrom: '2024-02-29' }, { dateTo: '2024-02-29' }, { dateFrom: '2023-02-29', dateTo: '2023-03-01' },
  { dateFrom: '2024-03-31', dateTo: '2024-02-29' }, { datePreset: 'current_year' as const, dateFrom: '2024-01-01', dateTo: '2024-12-31' }])
  test(`generation rejects invalid date selection ${JSON.stringify(dates)}`, () => assert.throws(() => run({ ...minimal, ...dates })));
test('multiple widgets and series have stable unique IDs, bilingual titles and nonoverlapping layout', () => {
  const result = run({ ...minimal, widgets: [...minimal.widgets, { type: 'table', dimension: 'branch', titleEn: 'Branches', titleAr: 'الفروع', series: [{ metric: 'revenue' }, { metric: 'gross_margin' }] }] });
  assert.deepEqual(result.widgets[1]!.title, { en: 'Branches', ar: 'الفروع' });
  assert.equal(result.widgets[1]!.series[1]!.id, 'widget-2-series-2'); validateDashboardSpec(result);
  assert.equal(result.layout.items![1]!.y, 2);
});
const analyses: [GenerationSeries, object][] = [
  [{ metric: 'revenue', comparison: 'year_over_year', movingAverageWindow: 3 }, { comparison: 'year_over_year', movingAverage: { window: 3 } }],
  [{ metric: 'revenue', runningTotal: true }, { runningTotal: true }],
  [{ metric: 'revenue', percentageContribution: true }, { percentageContribution: true }],
  [{ metric: 'revenue', ranking: true, topNDirection: 'bottom', topNLimit: 10 }, { ranking: true, topN: { direction: 'bottom', limit: 10 } }],
];
for (const [series, expected] of analyses) test(`flat analysis compiles ${JSON.stringify(expected)}`, () => {
  const widget = run({ ...minimal, widgets: [{ type: 'table', dimension: 'month', series: [series] }] }).widgets[0]!;
  assert.deepEqual(widget.series[0]!.analysis, expected);
});
test('false flags and absent presentation are omitted from the canonical result', () => {
  const series = { metric: 'revenue' as const, ranking: false, runningTotal: false, percentageContribution: false };
  const widget = run({ ...minimal, widgets: [{ type: 'kpi', series: [series] }] }).widgets[0]!;
  assert.ok(!Object.hasOwn(widget.series[0]!, 'analysis')); assert.ok(!Object.hasOwn(widget, 'presentation'));
});
for (const pair of [{ topNDirection: 'top' }, { topNLimit: 3 }, { topNDirection: 'bottom', topNLimit: 0 }, { topNDirection: 'top', topNLimit: 101 }, { topNDirection: 'top', topNLimit: 2.5 }])
  test(`invalid topN pair is rejected ${JSON.stringify(pair)}`, () => assert.throws(() => run({ ...minimal, widgets: [{ type: 'bar', dimension: 'branch', series: [{ metric: 'revenue', ...pair } as GenerationSeries] }] })));
for (const widget of [
  { type: 'bar', dimension: 'branch', orientation: 'horizontal', legend: 'hide', series: [{ metric: 'revenue' }] },
  { type: 'pie', dimension: 'branch', pieVariant: 'donut', dataLabels: 'show', series: [{ metric: 'revenue' }] },
  { type: 'combo', dimension: 'month', curve: 'smooth', legend: 'show', series: [{ metric: 'revenue', mark: 'bar' }, { metric: 'gross_profit', mark: 'line' }] },
] as GenerationWidget[]) test(`${widget.type} presentation is nested canonically`, () => {
  const result = run({ ...minimal, widgets: [widget] }).widgets[0]!;
  assert.ok(result.presentation);
  if (widget.type === 'combo') assert.deepEqual(result.series.map(s => s.presentation), [{ mark: 'bar' }, { mark: 'line' }]);
});
for (const invalid of [null, {}, { ...minimal, titleEn: '' }, { ...minimal, widgets: [] }, { ...minimal, layout: {} },
  { ...minimal, widgets: [{ type: 'kpi', series: [{ metric: 'imaginary' }] }] },
  { ...minimal, widgets: [{ type: 'kpi', titleEn: 'Only English', series: [{ metric: 'revenue' }] }] },
  { ...minimal, filters: [{ dimension: 'branch', values: ['a'] }, { dimension: 'branch', values: ['b'] }] }])
  test(`malformed intent rejected (${JSON.stringify(invalid).slice(0, 75)})`, () => assert.throws(() => validateDashboardGenerationPlan(invalid)));
for (const widget of [
  { type: 'pie', dimension: 'branch', series: [{ metric: 'gross_margin' }] },
  { type: 'kpi', orientation: 'horizontal', series: [{ metric: 'revenue' }] },
  { type: 'bar', dimension: 'branch', curve: 'smooth', series: [{ metric: 'revenue' }] },
  { type: 'line', dimension: 'branch', series: [{ metric: 'revenue', movingAverageWindow: 3 }] },
  { type: 'bar', dimension: 'branch', series: [{ metric: 'revenue' }, { metric: 'gross_profit', topNDirection: 'top', topNLimit: 5 }] },
] as GenerationWidget[]) test(`canonical semantics rejects incompatible intent ${JSON.stringify(widget).slice(0, 80)}`, () => assert.throws(() => run({ ...minimal, widgets: [widget] })));
test('portable plan stays smaller and shallower than canonical DashboardSpec with no infrastructure properties', () => {
  const portable = projectProviderSchema(dashboardGenerationPlanSchema);
  const canonical = projectProviderSchema(dashboardSpecSchema);
  const depth = (value: unknown, root: Record<string, unknown>): number => {
    if (!value || typeof value !== 'object') return 0;
    const node = value as Record<string, unknown>;
    if (typeof node.$ref === 'string') return depth(node.$ref.split('/').slice(1).reduce<unknown>((current, key) => (current as Record<string, unknown>)[key], root), root);
    return 1 + Math.max(0, ...Object.entries(node).filter(([key]) => key !== '$defs').map(([, child]) => depth(child, root)));
  };
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const properties = (value as { properties?: object }).properties;
    for (const key of Object.keys(properties ?? {})) assert.ok(!['schemaVersion', 'layout', 'id', 'widgetId', 'x', 'y', 'w', 'h', 'minW', 'minH', 'tenantId', 'ownerId'].includes(key));
    for (const child of Object.values(value)) walk(child);
  };
  walk(portable); assert.ok(depth(portable, portable) < depth(canonical, canonical)); assert.ok(JSON.stringify(portable).length < JSON.stringify(canonical).length);
});
