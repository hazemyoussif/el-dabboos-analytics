import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDashboardPatch } from '@el-dabbous/domain';
import type { AnalyticsQuery, AnalyticsRepository, AnalyticsResult } from '@el-dabbous/domain';
import { DashboardExecutor, MockDashboardPlanner, demoDashboards } from '../src/index.ts';

const fixed = () => new Date('2026-09-30T12:00:00.000Z');
const context = { tenantId: 'demo', locale: 'en' } as const;
test('executor maps widgets and dashboard filters to canonical repository queries', async () => {
  const queries: AnalyticsQuery[] = [];
  const repository: AnalyticsRepository = { async execute(query) {
    queries.push(query);
    return { metric: query.metric, groupBy: query.groupBy ?? null, rows: [{ key: null, value: 1 }], metadata: { sourceId: 'spy', executedAt: fixed().toISOString(), metricType: 'number', semantics: 'additive' } };
  } };
  const spec = demoDashboards(fixed())[0]!;
  spec.filters.dimensions = [{ dimension: 'branch', values: ['cairo'] }];
  const result = await new DashboardExecutor(repository, fixed).execute(spec, context);
  assert.equal(result.metadata.failed, 0);
  assert.equal(queries.length, spec.widgets.length);
  assert.deepEqual(queries.find(q => q.metric === 'revenue' && q.groupBy === 'month'), {
    metric: 'revenue', groupBy: 'month', analysis: { comparison: 'year_over_year' }, dateRange: spec.filters.dateRange,
    filters: [{ dimension: 'branch', values: ['cairo'] }],
  });
});
test('one failed widget is isolated from successful widget results', async () => {
  const repository: AnalyticsRepository = { async execute(query): Promise<AnalyticsResult> {
    if (query.metric === 'gross_margin') throw new Error('source unavailable');
    return { metric: query.metric, groupBy: query.groupBy ?? null, rows: [{ key: null, value: 1 }], metadata: { sourceId: 'spy', executedAt: fixed().toISOString(), metricType: 'number', semantics: 'additive' } };
  } };
  const result = await new DashboardExecutor(repository, fixed).execute(demoDashboards(fixed())[0]!, context);
  assert.equal(result.metadata.failed, 1);
  assert.equal(result.widgetResults['gross-margin']?.status, 'error');
  assert.equal(result.widgetResults.revenue?.status, 'success');
});
test('mock planner generates English and Arabic specs and returns patch edits', async () => {
  const planner = new MockDashboardPlanner(fixed);
  const en = await planner.generate({ prompt: 'Create an executive sales dashboard for this year showing revenue, gross margin, order count, monthly revenue vs last year, top customers and outstanding receivables.', locale: 'en', context });
  const ar = await planner.generate({ prompt: 'اعمل لي لوحة لمتابعة المبيعات السنة دي فيها الإيرادات وهامش الربح وعدد الطلبات وأعلى العملاء والمديونيات', locale: 'ar', context: { ...context, locale: 'ar' } });
  assert.equal(en.id, ar.id);
  assert.equal(ar.locale, 'ar');
  let current = en;
  for (const [instruction, check] of [
    ['Replace order count with average order value', (s: typeof en) => s.widgets.find(w => w.id === 'order-count')?.metric === 'average_order_value'],
    ['Show only Cairo and Alexandria', (s: typeof en) => s.filters.dimensions?.[0]?.values.length === 2],
    ['Change top customers from revenue to gross profit', (s: typeof en) => s.widgets.find(w => w.id === 'top-customers')?.metric === 'gross_profit'],
    ['Add a three-month moving average', (s: typeof en) => s.widgets.find(w => w.id === 'monthly-revenue')?.analysis?.movingAverage?.window === 3],
    ['Remove outstanding receivables', (s: typeof en) => !s.widgets.some(w => w.id === 'outstanding')],
  ] as const) {
    current = applyDashboardPatch(current, await planner.edit(current, instruction));
    assert.ok(check(current));
  }
  await assert.rejects(planner.generate({ prompt: 'Show website traffic', locale: 'en', context }));
});
