import assert from 'node:assert/strict';
import test from 'node:test';
import { productMetricCatalog, validateDashboardSpec } from '@el-dabboos/domain';
import { dashboardTemplates } from '../src/templates.ts';
import { planningEvaluationCases } from '../src/evals.ts';

test('provider-neutral evaluation cases cover dialect, digits, workflow and planning decisions', () => {
  assert.deepEqual(new Set(planningEvaluationCases.map(item => item.language)),
    new Set(['en', 'msa', 'iq', 'eg', 'iq_mixed', 'eg_mixed', 'arabic_indic_digits', 'western_digits']));
  assert.deepEqual(new Set(planningEvaluationCases.map(item => item.expectedAction)),
    new Set(['reuse_template', 'modify_template', 'create_composition', 'clarify', 'reject_unavailable']));
  assert.deepEqual(new Set(planningEvaluationCases.map(item => item.task)), new Set(['generate', 'edit']));
  for (const item of planningEvaluationCases) {
    if (item.expectedTemplateId) assert.ok(dashboardTemplates.some(template => template.id === item.expectedTemplateId));
    if (item.expectedMetrics) for (const id of item.expectedMetrics) assert.ok(productMetricCatalog.some(metric => metric.id === id && metric.availability === 'available'));
    if (item.expectedUnavailableMetric) assert.ok(productMetricCatalog.some(metric => metric.id === item.expectedUnavailableMetric && metric.availability === 'planned'));
  }
});
test('mixed currency and percentage line is invalid; a split composition remains expressible', () => {
  const base = { schemaVersion: 2, id: 'comparison', title: { en: 'Comparison', ar: 'مقارنة' }, locale: 'en',
    filters: { dateRange: { from: '2026-01-01', to: '2026-09-30' } }, layout: { columns: 2 } };
  const mixed = { id: 'mixed', type: 'line', dimension: 'month', series: [{ id: 'revenue', metric: 'revenue' }, { id: 'margin', metric: 'gross_margin' }] };
  assert.throws(() => validateDashboardSpec({ ...base, widgets: [mixed] }));
  assert.doesNotThrow(() => validateDashboardSpec({ ...base, widgets: [
    { id: 'revenue', type: 'line', dimension: 'month', series: [{ id: 'revenue', metric: 'revenue' }] },
    { id: 'margin', type: 'line', dimension: 'month', series: [{ id: 'margin', metric: 'gross_margin' }] },
  ] }));
});
