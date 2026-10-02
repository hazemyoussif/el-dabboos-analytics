import assert from 'node:assert/strict';
import test from 'node:test';
import { governedPalettes } from '@el-dabboos/domain';
import type { DashboardSeries, DimensionId } from '@el-dabboos/domain';
import { resolveGenerationWidget } from '../src/visualization-intent.ts';
import { compileDashboardGenerationPlan, validateDashboardGenerationPlan } from '../src/generation-plan.ts';
import { tenantProfiles } from '@el-dabboos/domain';
const revenue: DashboardSeries = { id: 'revenue', metric: 'revenue' };
const profit: DashboardSeries = { id: 'profit', metric: 'gross_profit' };
const margin: DashboardSeries = { id: 'margin', metric: 'gross_margin' };
for (const [dimension, series, type] of [[undefined, [revenue], 'kpi'], ['month', [revenue], 'line'], ['date', [revenue, profit], 'line'], ['quarter', [revenue], 'line'], ['year', [revenue], 'line'], ['branch', [revenue], 'bar'], ['branch', [revenue, profit], 'bar'], ['branch', [revenue, margin], 'table'], ['month', [revenue, margin], 'table']] as const)
  test(`resolver selects ${type} for ${dimension ?? 'ungrouped'} ${series.map(s => s.metric).join('/')}`, () => {
    const input = { ...(dimension ? { dimension } : {}), series: [...series] };
    const original = structuredClone(input); const result = resolveGenerationWidget(input);
    assert.equal(result.type, type); assert.deepEqual(result, resolveGenerationWidget(input)); assert.deepEqual(input, original);
    assert.equal(result.presentation?.palette, undefined);
    assert.equal(result.presentation?.curve, type === 'line' ? 'straight' : undefined);
    assert.equal(result.presentation?.orientation, type === 'bar' ? 'horizontal' : undefined);
    if (series.length > 1 && type !== 'table') assert.equal(result.presentation?.legend, 'show');
  });
test('resolver uses the existing percentage-contribution unit policy', () => {
  const result = resolveGenerationWidget({ dimension: 'month', series: [
    { ...revenue, analysis: { percentageContribution: true } }, { id: 'orders', metric: 'order_count', analysis: { percentageContribution: true } },
  ] });
  assert.equal(result.type, 'line');
});
for (const palette of governedPalettes) test(`explicit ${palette} palette and categorical Line are retained`, () => {
  const result = resolveGenerationWidget({ dimension: 'branch', series: [revenue, profit], requestedPresentation: { type: 'line', palette } });
  assert.equal(result.type, 'line'); assert.equal(result.presentation?.palette, palette); assert.equal(result.presentation?.orientation, undefined);
});
test('explicit pie and combo get code-owned variants and series marks', () => {
  assert.equal(resolveGenerationWidget({ dimension: 'branch', series: [revenue], requestedPresentation: { type: 'pie' } }).presentation?.pieVariant, 'pie');
  const combo = resolveGenerationWidget({ dimension: 'month', series: [revenue, profit], requestedPresentation: { type: 'combo', curve: 'smooth', legend: 'hide' } });
  assert.deepEqual(combo.series.map(s => s.presentation), [{ mark: 'bar' }, { mark: 'line' }]);
  assert.equal(combo.presentation?.curve, 'smooth'); assert.equal(combo.presentation?.legend, 'hide');
});
for (const [dimension, requestedPresentation, series] of [
  ['branch', { type: 'line', orientation: 'horizontal' }, [revenue]],
  ['branch', { type: 'bar', pieVariant: 'donut' }, [revenue]],
  ['branch', { type: 'bar', curve: 'smooth' }, [revenue]],
  ['branch', { type: 'bar', dataLabels: 'show' }, [revenue]],
  [undefined, { type: 'kpi', legend: 'show' }, [revenue]],
  ['branch', { type: 'table', legend: 'hide' }, [revenue]],
  ['branch', { type: 'line' }, [{ ...revenue, mark: 'bar' }]],
  ['branch', { type: 'line' }, [revenue, margin]],
] as const) test(`invalid generation intent is rejected instead of discarded: ${JSON.stringify(requestedPresentation)}`, () => {
  const intent: unknown = { titleEn: 'Sales', titleAr: 'المبيعات', widgets: [{ ...(dimension ? { dimension: dimension as DimensionId } : {}), requestedPresentation, series: series.map(s => ({ metric: s.metric, ...('mark' in s ? { mark: s.mark } : {}) })) }] };
  assert.throws(() => { validateDashboardGenerationPlan(intent); compileDashboardGenerationPlan(intent, tenantProfiles['demo-iq'], 'en', new Date('2026-10-01T00:00:00Z')); });
});
