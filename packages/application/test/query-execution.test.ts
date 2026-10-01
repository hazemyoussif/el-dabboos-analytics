import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult, DashboardSpec, DashboardWidget } from '@el-dabbous/domain';
import { DashboardExecutor, analyticsQueryIdentity, normalizeAnalyticsQuery } from '../src/index.ts';
const context: AnalyticsContext = { tenantId: 'demo-iq', locale: 'en', enforcedFilters: [{ dimension: 'branch', values: ['baghdad'] }] };
const spec = (widgets: DashboardWidget[]): DashboardSpec => ({ schemaVersion: 2, id: 'bounded', title: { en: 'Bounded', ar: 'محدود' }, locale: 'en', filters: { dateRange: { from: '2026-01-01', to: '2026-06-30' } }, layout: { columns: 12 }, widgets });
const widget = (id: string, metric: AnalyticsQuery['metric'] = 'revenue'): DashboardWidget => ({ id, type: 'kpi', series: [{ id: 'value', metric }] });
const result = (query: AnalyticsQuery): AnalyticsResult => ({ metric: query.metric, groupBy: query.groupBy ?? null, rows: [{ key: query.groupBy ? '2026-01' : null, value: 12, comparisonValue: null, rank: 1 }], metadata: { sourceId: 'fake', executedAt: '2026-01-01', metricType: 'currency', semantics: 'additive' } });
test('identical series in one widget and across widgets share a request-scoped repository call', async () => {
  let calls = 0; const repository: AnalyticsRepository = { execute: async query => { calls++; return result(query); } };
  const output = await new DashboardExecutor(repository).execute(spec([{ id: 'line', type: 'line', dimension: 'month', series: [{ id: 'a', metric: 'revenue' }, { id: 'b', metric: 'revenue' }] }, { id: 'area', type: 'area', dimension: 'month', series: [{ id: 'c', metric: 'revenue' }] }]), context);
  assert.equal(calls, 1); assert.equal(output.metadata.succeededSeries, 3);
  assert.deepEqual(output.widgetResults.line!.alignedRows[0]!.series.a, output.widgetResults.area!.alignedRows[0]!.series.c);
  const a = output.widgetResults.line!.seriesResults.a!, b = output.widgetResults.line!.seriesResults.b!;
  assert.notEqual(a, b); if (a.status === 'success' && b.status === 'success') { a.result.rows[0]!.value = 999; assert.equal(b.result.rows[0]!.value, 12); }
});
test('analysis and metric differences remain separate repository requests', async () => {
  let calls = 0; const repository: AnalyticsRepository = { execute: async query => { calls++; return result(query); } };
  const a = widget('a'); const b = widget('b'); b.series[0]!.analysis = { comparison: 'year_over_year' };
  await new DashboardExecutor(repository).execute(spec([a, b, widget('c', 'gross_profit')]), context); assert.equal(calls, 3);
});
test('normalized identity is deterministic and does not merge different filters, grouping, date, aggregation or security contexts', () => {
  const q: AnalyticsQuery = { metric: 'revenue', filters: [{ dimension: 'branch', values: ['basra', 'baghdad', 'basra'] }], analysis: { comparison: 'year_over_year', ranking: true }, groupBy: 'month', dateRange: { from: '2026-01-01', to: '2026-06-30' } };
  const key = analyticsQueryIdentity(q, context);
  assert.equal(key, analyticsQueryIdentity({ ...q, aggregation: 'sum', filters: [{ dimension: 'branch', values: ['baghdad', 'basra'] }], analysis: { ranking: true, comparison: 'year_over_year' } }, context));
  for (const other of [{ ...q, filters: [{ dimension: 'branch' as const, values: ['baghdad'] }] }, { ...q, groupBy: 'quarter' as const }, { ...q, aggregation: 'average' as const }, { ...q, dateRange: { from: '2025-01-01', to: '2025-06-30' } }]) assert.notEqual(key, analyticsQueryIdentity(other, context));
  for (const other of [{ ...context, tenantId: 'demo-eg' }, { ...context, locale: 'ar' as const }, { ...context, enforcedFilters: [{ dimension: 'branch' as const, values: ['basra'] }] }]) assert.notEqual(key, analyticsQueryIdentity(q, other));
  assert.deepEqual(normalizeAnalyticsQuery({ metric: 'revenue', analysis: {}, filters: [] }), { metric: 'revenue' });
});
test('no deduplication cache survives execution or tenant changes', async () => {
  const tenants: string[] = []; const repository: AnalyticsRepository = { execute: async (query, ctx) => { tenants.push(ctx.tenantId); return result(query); } };
  const executor = new DashboardExecutor(repository);
  for (const tenantId of ['demo-iq', 'demo-iq', 'demo-eg']) await executor.execute(spec([widget('a'), widget('b')]), { ...context, tenantId });
  assert.deepEqual(tenants, ['demo-iq', 'demo-iq', 'demo-eg']);
});
test('one shared failure remains independent in dependent series and preserves partial widgets and anchor failure', async () => {
  let calls = 0; const repository: AnalyticsRepository = { execute: async query => { calls++; if (query.metric === 'revenue') throw new Error('Unavailable'); return result(query); } };
  const output = await new DashboardExecutor(repository).execute(spec([{ id: 'a', type: 'line', dimension: 'month', series: [{ id: 'r1', metric: 'revenue' }, { id: 'r2', metric: 'revenue' }, { id: 'p', metric: 'gross_profit' }] }, { id: 'b', type: 'bar', dimension: 'branch', series: [{ id: 'r', metric: 'revenue', analysis: { topN: { direction: 'top', limit: 3 } } }, { id: 'p', metric: 'gross_profit' }] }]), context);
  assert.equal(calls, 4); assert.equal(output.widgetResults.a!.status, 'partial'); assert.equal(output.widgetResults.b!.status, 'error'); assert.deepEqual(output.widgetResults.b!.alignedRows, []);
  assert.notEqual(output.widgetResults.a!.seriesResults.r1, output.widgetResults.a!.seriesResults.r2); assert.equal(output.metadata.failedSeries, 3);
});
test('repository concurrency is bounded while out-of-order completion preserves widget/series order', async () => {
  let active = 0, peak = 0; const repository: AnalyticsRepository = { execute: async query => { active++; peak = Math.max(peak, active); await setImmediate(); if (query.metric === 'revenue') await setImmediate(); active--; return result(query); } };
  const widgets = (['revenue', 'gross_profit', 'order_count', 'net_revenue', 'maintenance_cost', 'failure_count'] as const).map((metric, index) => widget(`w${index}`, metric));
  const output = await new DashboardExecutor(repository, () => new Date('2026-01-01'), { maxConcurrency: 2 }).execute(spec(widgets), context);
  assert.equal(peak, 2); assert.equal(active, 0); assert.deepEqual(Object.keys(output.widgetResults), widgets.map(w => w.id)); assert.equal(output.metadata.succeededSeries, 6);
});
test('default limiter is eight and invalid concurrency fails before execution', async () => {
  let active = 0, peak = 0; const repository: AnalyticsRepository = { execute: async query => { active++; peak = Math.max(peak, active); await setImmediate(); active--; return result(query); } };
  const widgets = (['revenue', 'gross_profit', 'order_count', 'net_revenue', 'maintenance_cost', 'failure_count', 'stock_on_hand', 'inventory_value', 'mtbf', 'mttr', 'collected_amount', 'overdue_amount'] as const).map((metric, index) => widget(`w${index}`, metric));
  await new DashboardExecutor(repository).execute(spec(widgets), context); assert.equal(peak, 8);
  for (const maxConcurrency of [0, -1, 1.5, 65, NaN]) assert.throws(() => new DashboardExecutor(repository, undefined, { maxConcurrency }), /concurrency/);
});
