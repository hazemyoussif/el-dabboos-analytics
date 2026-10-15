import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch, tenantProfiles, validateDashboardSpec } from '@el-dabboos/domain';
import type { AnalyticsQuery, AnalyticsRepository, AnalyticsResult } from '@el-dabboos/domain';
import { DashboardExecutor, MockDashboardPlanner, dashboardTemplates, getDashboardTemplate, instantiateDashboardTemplate, resolveDatePreset } from '../src/index.ts';

const fixed = () => new Date('2026-09-30T12:00:00.000Z');
const iq = tenantProfiles['demo-iq'];
const eg = tenantProfiles['demo-eg'];
const context = { tenantId: 'demo-iq', locale: 'en' } as const;
const result = (query: AnalyticsQuery, rows: AnalyticsResult['rows']): AnalyticsResult => ({ metric: query.metric, groupBy: query.groupBy ?? null, rows,
  metadata: { sourceId: 'spy', executedAt: fixed().toISOString(), metricType: 'currency', semantics: 'additive' } });
test('reusable templates instantiate identically for both markets with symbolic dates', () => {
  assert.equal(dashboardTemplates.length, 46);
  assert.equal(new Set(dashboardTemplates.map(t => t.id)).size, 46);
  for (const template of dashboardTemplates) {
    const a = instantiateDashboardTemplate(template, iq, fixed(), 'en');
    const b = instantiateDashboardTemplate(template, eg, fixed(), 'ar');
    assert.equal(a.id, b.id);
    assert.deepEqual(a.widgets, b.widgets);
    assert.equal(a.schemaVersion, 2);
    assert.equal(a.filters.datePreset, template.datePreset);
    assert.equal(a.filters.dateRange, undefined);
    assert.doesNotThrow(() => validateDashboardSpec(a));
    assert.doesNotThrow(() => validateDashboardSpec(b));
  }
  assert.ok(getDashboardTemplate('sales-performance'));
  assert.equal(getDashboardTemplate('iraq-sales'), undefined);
});
test('collections template labels its bounded due-customer ranking in English and Arabic',()=>{
 const template=getDashboardTemplate('customer-cash-collections')!;
 const spec=instantiateDashboardTemplate(template,iq,fixed(),'en');
 const due=spec.widgets.find(widget=>widget.id==='customer-due')!;
 assert.equal(due.title?.en,'Top 100 Customers Due for Collection');assert.ok(due.title?.ar.includes('100'));
 assert.deepEqual(due.series[0]?.analysis,{topN:{limit:100,direction:'top'}});
 assert.equal(spec.widgets.find(widget=>widget.id==='customer-timing')?.series.some(series=>series.metric==='receivables_due_for_collection'),false);
});
test('date presets use governed tenant timezone at a day boundary', () => {
  const now = new Date('2026-12-31T22:30:00.000Z');
  assert.deepEqual(resolveDatePreset('current_year', iq, now), { from: '2027-01-01', to: '2027-01-01' });
  assert.deepEqual(resolveDatePreset('current_year', eg, now), { from: '2027-01-01', to: '2027-01-01' });
  const boundary = new Date('2026-12-31T21:30:00.000Z');
  assert.equal(resolveDatePreset('current_year', iq, boundary).to, '2027-01-01');
  assert.equal(resolveDatePreset('current_year', eg, boundary).to, '2026-12-31');
  assert.equal(resolveDatePreset('last_6_months', eg, fixed()).from, '2026-04-01');
});
test('executor maps every v2 series and dashboard filter to tenant-scoped queries', async () => {
  const queries: Array<{ query: AnalyticsQuery; tenantId: string }> = [];
  const repository: AnalyticsRepository = { async execute(query, ctx) { queries.push({ query, tenantId: ctx.tenantId }); return result(query, [{ key: query.groupBy ? '2026-01' : null, value: 1 }]); } };
  const spec = instantiateDashboardTemplate(getDashboardTemplate('sales-performance')!, iq, fixed(), 'en');
  spec.filters.dimensions = [{ dimension: 'branch', values: ['baghdad'] }];
  const execution = await new DashboardExecutor(repository, fixed).execute(spec, context, { timeZone: iq.timeZone });
  assert.equal(execution.metadata.failedSeries, 0);
  assert.equal(queries.length, spec.widgets.reduce((sum, widget) => sum + widget.series.length, 0));
  assert.ok(queries.every(item => item.tenantId === 'demo-iq'));
  assert.deepEqual(queries.find(item => item.query.metric === 'revenue' && item.query.groupBy === 'month')?.query, {
    metric: 'revenue', groupBy: 'month', analysis: { comparison: 'year_over_year' }, dateRange: resolveDatePreset(spec.filters.datePreset!, iq, fixed()),
    filters: [{ dimension: 'branch', values: ['baghdad'] }],
  });
});
test('multi-series grouped results align by key without inventing zero', async () => {
  const repository: AnalyticsRepository = { async execute(query) { return result(query, query.metric === 'revenue' ?
    [{ key: '2026-01', value: 10 }, { key: '2026-02', value: 20 }] :
    [{ key: '2026-02', value: 5 }, { key: '2026-03', value: 8 }]); } };
  const spec = instantiateDashboardTemplate(getDashboardTemplate('sales-performance')!, iq, fixed(), 'en');
  spec.widgets = [spec.widgets.find(w => w.id === 'revenue-profit')!];
  const execution = await new DashboardExecutor(repository, fixed).execute(spec, context, { timeZone: iq.timeZone });
  assert.deepEqual(execution.widgetResults['revenue-profit']?.alignedRows.map(row => [row.key, row.series.revenue?.value ?? null, row.series['gross-profit']?.value ?? null]), [
    ['2026-01', 10, null], ['2026-02', 20, 5], ['2026-03', null, 8],
  ]);
});
test('one failed series is isolated and other series still render', async () => {
  const repository: AnalyticsRepository = { async execute(query) {
    if (query.metric === 'gross_profit') throw new Error('source unavailable');
    return result(query, [{ key: '2026-01', value: 10 }]);
  } };
  const spec = instantiateDashboardTemplate(getDashboardTemplate('sales-performance')!, iq, fixed(), 'en');
  spec.widgets = [spec.widgets.find(w => w.id === 'revenue-profit')!];
  const execution = await new DashboardExecutor(repository, fixed).execute(spec, context, { timeZone: iq.timeZone });
  assert.equal(execution.metadata.failedSeries, 1);
  assert.equal(execution.metadata.failed, 0);
  assert.equal(execution.widgetResults['revenue-profit']?.status, 'partial');
  assert.equal(execution.widgetResults['revenue-profit']?.seriesResults['gross-profit']?.status, 'error');
  assert.equal(execution.widgetResults['revenue-profit']?.alignedRows[0]?.series.revenue?.value, 10);
});
test('multi-metric table aligns selected customers and preserves each metric value', async () => {
  const repository: AnalyticsRepository = { async execute(query) { return result(query, query.metric === 'revenue' ?
    [{ key: 'customer_001', value: 100 }, { key: 'customer_002', value: 80 }] :
    [{ key: 'customer_002', value: query.metric === 'gross_profit' ? 30 : 40 }]); } };
  const spec = instantiateDashboardTemplate(getDashboardTemplate('customer-analytics')!, iq, fixed(), 'en');
  spec.widgets = [spec.widgets.find(w => w.id === 'customer-performance')!];
  const rows = (await new DashboardExecutor(repository, fixed).execute(spec, context, { timeZone: iq.timeZone })).widgetResults['customer-performance']?.alignedRows;
  assert.deepEqual(rows?.map(row => [row.key, row.series.revenue?.value ?? null, row.series['gross-profit']?.value ?? null, row.series.outstanding?.value ?? null]), [
    ['customer_001', 100, null, null], ['customer_002', 80, 30, 40],
  ]);
});
test('alignment retains ranking and comparison metadata for every series', async () => {
  const repository: AnalyticsRepository = { async execute(query) { return result(query, query.metric === 'revenue' ?
    [{ key: 'customer_002', value: 120, rank: 1, comparisonValue: 100, absoluteChange: 20, percentageChange: 20 },
      { key: 'customer_001', value: 80, rank: 2, comparisonValue: null, absoluteChange: null, percentageChange: null }] :
    [{ key: 'customer_001', value: 30, rank: 7, comparisonValue: 20, absoluteChange: 10, percentageChange: 50 }]); } };
  const spec = instantiateDashboardTemplate(getDashboardTemplate('customer-analytics')!, iq, fixed(), 'en');
  spec.widgets = [spec.widgets.find(w => w.id === 'customer-performance')!];
  const rows = (await new DashboardExecutor(repository, fixed).execute(spec, context, { timeZone: iq.timeZone })).widgetResults['customer-performance']?.alignedRows;
  assert.deepEqual(rows?.map(row => row.key), ['customer_002', 'customer_001']);
  assert.deepEqual(rows?.[0]?.series.revenue, { value: 120, rank: 1, comparisonValue: 100, absoluteChange: 20, percentageChange: 20 });
  assert.equal(rows?.[0]?.series['gross-profit'], null);
  assert.deepEqual(rows?.[1]?.series.revenue, { value: 80, rank: 2, comparisonValue: null, absoluteChange: null, percentageChange: null });
  assert.deepEqual(rows?.[1]?.series['gross-profit'], { value: 30, rank: 7, comparisonValue: 20, absoluteChange: 10, percentageChange: 50 });
});
test('failed top N anchor makes widget error and never aligns an unrestricted union', async () => {
  const repository: AnalyticsRepository = { async execute(query) {
    if (query.metric === 'revenue') throw new Error('selection unavailable');
    return result(query, [{ key: 'customer_001', value: 20 }, { key: 'customer_999', value: 100 }]);
  } };
  const spec = instantiateDashboardTemplate(getDashboardTemplate('customer-analytics')!, iq, fixed(), 'en');
  spec.widgets = [spec.widgets.find(w => w.id === 'customer-performance')!];
  const execution = await new DashboardExecutor(repository, fixed).execute(spec, context, { timeZone: iq.timeZone });
  const widget = execution.widgetResults['customer-performance'];
  assert.equal(widget?.status, 'error');
  assert.deepEqual(widget?.alignedRows, []);
  assert.equal(widget?.seriesResults.revenue?.status, 'error');
  assert.equal(widget?.seriesResults['gross-profit']?.status, 'success');
  assert.equal(execution.metadata.failed, 1);
});
test('mock planner generates Iraqi, Egyptian, MSA and English v2 specs and edits', async () => {
  const planner = new MockDashboardPlanner(fixed);
  const prompts = [
    ['Create a sales dashboard', 'en', iq], ['اعمل لوحة للمبيعات', 'ar', iq],
    ['أريد أشوف مبيعات السنة هاي حسب الفرع', 'ar', iq], ['شكد المبيعات هذا الشهر وشنو أكثر فرع بايع؟', 'ar', iq],
    ['عايز أشوف المبيعات حسب الفرع', 'ar', eg],
  ] as const;
  for (const [prompt, locale, profile] of prompts) {
    const generated = await planner.generate({ prompt, locale, context: { tenantId: profile.id, locale }, tenantProfile: profile });
    assert.equal(generated.id, 'sales-performance');
    assert.equal(generated.schemaVersion, 2);
    assert.equal(generated.locale, locale);
  }
  const month = await planner.generate({ prompt: 'شكد المبيعات هذا الشهر وشنو أكثر فرع بايع؟', locale: 'ar', context: { ...context, locale: 'ar' }, tenantProfile: iq });
  assert.equal(month.filters.datePreset, 'current_month');
  let current = await planner.generate({ prompt: 'Create a sales dashboard', locale: 'en', context, tenantProfile: iq });
  for (const [instruction, check] of [
    ['Replace order count with average order value', (s: typeof current) => s.widgets.find(w => w.id === 'order-count')?.series[0]?.metric === 'average_order_value'],
    ['Show only Baghdad and Basra', (s: typeof current) => s.filters.dimensions?.[0]?.values.join(',') === 'baghdad,basra'],
    ['Change top customers from revenue to gross profit', (s: typeof current) => s.widgets.find(w => w.id === 'top-customers')?.series[0]?.metric === 'gross_profit'],
    ['Add a three-month moving average', (s: typeof current) => s.widgets.find(w => w.id === 'revenue-profit')?.series[0]?.analysis?.movingAverage?.window === 3],
    ['Remove outstanding receivables', (s: typeof current) => !s.widgets.some(w => w.id === 'outstanding')],
  ] as const) {
    current = applyDashboardPatch(current, await planner.edit(current, instruction, iq));
    assert.ok(check(current));
  }
  await assert.rejects(planner.generate({ prompt: 'Show website traffic', locale: 'en', context, tenantProfile: iq }));
});

test('unexpected numeric corruption fails closed, emits a safe diagnostic and never returns raw SQL to cards',async()=>{
 const diagnostics:Array<{metric:string;category:string}>=[];
 const repository:AnalyticsRepository={execute:async()=>{throw new Error('Unsafe SQL numeric output');}};
 const spec=instantiateDashboardTemplate(getDashboardTemplate('sales-performance')!,iq,fixed(),'en');spec.widgets=spec.widgets.slice(0,1);
 const execution=await new DashboardExecutor(repository,fixed,{onSeriesFailure:diagnostic=>diagnostics.push(diagnostic)}).execute(spec,context,{timeZone:iq.timeZone});
 assert.ok(diagnostics.length>0);assert.equal(diagnostics[0]!.category,'unsafe_numeric');
 for(const widget of Object.values(execution.widgetResults))for(const series of Object.values(widget.seriesResults)){assert.equal(series.status,'error');if(series.status==='error')assert.equal(series.error.message,'This metric is temporarily unavailable.');}
});
